import { callGemini, parseJsonResponse } from '../services/gemini';
import { searchFlightOffers, isAmadeusConfigured } from '../services/amadeus';
import { scrapeGoogleFlights } from '../services/scraper';
import { useSettingsStore } from '../stores/settingsStore';
import type {
  SearchStrategy,
  RawFlightResult,
  GeminiSearchResult,
  AgentStep,
  AmadeusSearchParams,
} from './types';

const SEARCH_SYSTEM = `Você é um agente de busca de voos. Busque informações reais e atualizadas sobre voos disponíveis.

Para cada busca, retorne TODOS os voos encontrados com:
- airline, flight_number
- departure (ISO datetime), arrival (ISO datetime)
- origin_iata, destination_iata
- price (numérico), currency
- stops (número), stop_cities (array de IATA)
- duration_minutes
- cabin_class
- booking_url (se disponível)
- source_url

Busque em sites como Google Flights, Kayak, Skyscanner, Decolar.
Retorne dados reais e precisos. Se não encontrar informações exatas,
indique isso no campo confidence da metadata.`;

const SEARCH_RESULT_SCHEMA = {
  type: 'object',
  properties: {
    flights: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          airline: { type: 'string' },
          flight_number: { type: 'string' },
          departure: { type: 'string' },
          arrival: { type: 'string' },
          origin_iata: { type: 'string' },
          destination_iata: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string' },
          stops: { type: 'integer' },
          stop_cities: { type: 'array', items: { type: 'string' } },
          duration_minutes: { type: 'integer' },
          cabin_class: { type: 'string' },
          booking_url: { type: 'string' },
          source_url: { type: 'string' },
        },
        required: ['airline', 'departure', 'arrival', 'origin_iata', 'destination_iata', 'price', 'currency'],
      },
    },
    search_metadata: {
      type: 'object',
      properties: {
        queries_used: { type: 'array', items: { type: 'string' } },
        sources_checked: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number' },
        notes: { type: 'string' },
      },
    },
  },
  required: ['flights', 'search_metadata'],
};

/** Maximum time (ms) for a single strategy search. */
const STRATEGY_TIMEOUT_MS = 30_000;

/**
 * Wrap a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout (${ms}ms) for ${label}`)),
      ms,
    );
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/**
 * Search flights using Amadeus API.
 */
async function searchAmadeus(strategy: SearchStrategy): Promise<RawFlightResult[]> {
  const settings = useSettingsStore.getState();

  if (!isAmadeusConfigured(settings.amadeusClientId, settings.amadeusClientSecret)) {
    return [];
  }

  // Map cabin class
  const cabinMap: Record<string, 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST'> = {
    economy: 'ECONOMY',
    premium_economy: 'PREMIUM_ECONOMY',
    business: 'BUSINESS',
    first: 'FIRST',
  };

  const params: AmadeusSearchParams = {
    originLocationCode: strategy.origin,
    destinationLocationCode: strategy.destination,
    departureDate: strategy.dateRange.from,
    adults: 1,
    travelClass: cabinMap[strategy.type] ?? 'ECONOMY',
    nonStop: strategy.type === 'direct' ? true : undefined,
    currencyCode: settings.currency,
    max: 20,
  };

  // If roundtrip and we have a return date
  if (strategy.dateRange.to && strategy.dateRange.to !== strategy.dateRange.from) {
    params.returnDate = strategy.dateRange.to;
  }

  const results = await searchFlightOffers(
    settings.amadeusClientId,
    settings.amadeusClientSecret,
    settings.amadeusEnv,
    params,
  );

  // Tag results with source
  return results.map((r) => ({
    ...r,
    source_url: r.source_url ?? 'amadeus',
  }));
}

/**
 * Search flights using Gemini Search grounding.
 */
async function searchGemini(
  apiKey: string,
  strategy: SearchStrategy,
): Promise<{ flights: RawFlightResult[]; tokensUsed: number }> {
  const query = strategy.searchQueries.join(' ');
  const prompt = `Busque voos: ${query}\n\nPeríodo: ${strategy.dateRange.from} a ${strategy.dateRange.to}\nOrigem: ${strategy.origin}\nDestino: ${strategy.destination}\nRetorne os resultados em JSON.`;

  const response = await callGemini(apiKey, {
    prompt,
    systemInstruction: SEARCH_SYSTEM,
    useSearch: true,
    responseSchema: SEARCH_RESULT_SCHEMA,
    temperature: 0.1,
  });

  const parsed = parseJsonResponse<GeminiSearchResult>(response.text);
  return { flights: parsed.flights, tokensUsed: response.tokensUsed };
}

/**
 * Search flights using web scraper.
 */
async function searchScraper(strategy: SearchStrategy): Promise<RawFlightResult[]> {
  const settings = useSettingsStore.getState();

  const result = await scrapeGoogleFlights(
    strategy.origin,
    strategy.destination,
    strategy.dateRange.from,
    strategy.dateRange.to !== strategy.dateRange.from ? strategy.dateRange.to : undefined,
    settings.corsProxy,
  );

  return result.flights;
}

/**
 * Execute a single strategy search across all available sources.
 */
async function executeStrategy(
  apiKey: string,
  strategy: SearchStrategy,
  stepNum: number,
  totalStrategies: number,
  onStep: (step: AgentStep) => void,
): Promise<{ flights: RawFlightResult[]; tokensUsed: number }> {
  const allFlights: RawFlightResult[] = [];
  let tokensUsed = 0;

  onStep({
    agent: 'searcher',
    step: stepNum,
    action: `[${stepNum}/${totalStrategies}] Buscando ${strategy.origin} → ${strategy.destination} (${strategy.type})`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Determine which sources to try based on strategy and configuration
  const sources: Array<{
    name: string;
    fn: () => Promise<{ flights: RawFlightResult[]; tokensUsed: number }>;
  }> = [];

  // Amadeus is the preferred structured data source
  if (strategy.expectedSource === 'amadeus' || isAmadeusConfigured(
    useSettingsStore.getState().amadeusClientId,
    useSettingsStore.getState().amadeusClientSecret,
  )) {
    sources.push({
      name: 'amadeus',
      fn: async () => ({ flights: await searchAmadeus(strategy), tokensUsed: 0 }),
    });
  }

  // Gemini Search is always available (primary source)
  sources.push({
    name: 'gemini_search',
    fn: async () => searchGemini(apiKey, strategy),
  });

  // Scraper as fallback
  if (strategy.expectedSource === 'scrape') {
    sources.push({
      name: 'scraper',
      fn: async () => ({ flights: await searchScraper(strategy), tokensUsed: 0 }),
    });
  }

  // Try each source, collect results
  for (const source of sources) {
    try {
      const result = await withTimeout(
        source.fn(),
        STRATEGY_TIMEOUT_MS,
        `${source.name}: ${strategy.origin}-${strategy.destination}`,
      );

      // Tag each flight with its source
      const taggedFlights = result.flights.map((f) => ({
        ...f,
        source_url: f.source_url ?? source.name,
      }));

      allFlights.push(...taggedFlights);
      tokensUsed += result.tokensUsed;

      // If we got good results from a structured source, we can skip scraper
      if (source.name === 'amadeus' && taggedFlights.length >= 5) {
        break;
      }
    } catch (err) {
      console.warn(`Source ${source.name} failed for ${strategy.origin}-${strategy.destination}:`, (err as Error).message);
      // Continue to next source
    }
  }

  // If no results from any primary source, try scraper as ultimate fallback
  if (allFlights.length === 0 && !sources.some((s) => s.name === 'scraper')) {
    try {
      const scraperFlights = await withTimeout(
        searchScraper(strategy),
        STRATEGY_TIMEOUT_MS,
        `scraper-fallback: ${strategy.origin}-${strategy.destination}`,
      );
      allFlights.push(...scraperFlights.map((f) => ({
        ...f,
        source_url: f.source_url ?? 'google_flights',
      })));
    } catch {
      // Scraper fallback also failed — that's ok
    }
  }

  onStep({
    agent: 'searcher',
    step: stepNum,
    action: `[${stepNum}/${totalStrategies}] ${strategy.origin} → ${strategy.destination}: ${allFlights.length} voos encontrados`,
    status: allFlights.length > 0 ? 'completed' : 'error',
    detail: allFlights.length > 0
      ? `Fontes: ${[...new Set(allFlights.map((f) => f.source_url ?? 'unknown'))].join(', ')}`
      : 'Nenhum resultado encontrado em nenhuma fonte',
    timestamp: Date.now(),
  });

  return { flights: allFlights, tokensUsed };
}

export async function runSearcherAgent(
  apiKey: string,
  strategies: SearchStrategy[],
  onStep: (step: AgentStep) => void,
): Promise<{ results: RawFlightResult[]; tokensUsed: number; latencyMs: number }> {
  const start = Date.now();
  const allResults: RawFlightResult[] = [];
  let totalTokens = 0;
  const totalStrategies = strategies.length;

  const priorityGroups = new Map<number, SearchStrategy[]>();
  for (const s of strategies) {
    const group = priorityGroups.get(s.priority) ?? [];
    group.push(s);
    priorityGroups.set(s.priority, group);
  }

  const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => a - b);

  let completedCount = 0;
  for (const priority of sortedPriorities) {
    const group = priorityGroups.get(priority)!;

    const batchResults = await Promise.allSettled(
      group.map(async (strategy) => {
        completedCount++;
        const result = await executeStrategy(
          apiKey,
          strategy,
          completedCount,
          totalStrategies,
          onStep,
        );
        return result;
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value.flights);
        totalTokens += result.value.tokensUsed;
      }
    }

    // Early termination if we have enough results from high-priority strategies
    if (allResults.length >= 50 && priority > 1) break;
  }

  const latencyMs = Date.now() - start;

  onStep({
    agent: 'searcher',
    step: 0,
    action: `Busca concluída: ${allResults.length} resultados brutos (${completedCount}/${totalStrategies} estratégias)`,
    status: 'completed',
    timestamp: Date.now(),
  });

  return { results: allResults, tokensUsed: totalTokens, latencyMs };
}
