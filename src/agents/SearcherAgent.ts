import { callGemini, parseJsonResponse } from '../services/gemini';
import type {
  SearchStrategy,
  RawFlightResult,
  GeminiSearchResult,
  AgentStep,
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

export async function runSearcherAgent(
  apiKey: string,
  strategies: SearchStrategy[],
  onStep: (step: AgentStep) => void,
): Promise<{ results: RawFlightResult[]; tokensUsed: number; latencyMs: number }> {
  const start = Date.now();
  const allResults: RawFlightResult[] = [];
  let totalTokens = 0;

  const priorityGroups = new Map<number, SearchStrategy[]>();
  for (const s of strategies) {
    const group = priorityGroups.get(s.priority) ?? [];
    group.push(s);
    priorityGroups.set(s.priority, group);
  }

  const sortedPriorities = Array.from(priorityGroups.keys()).sort((a, b) => a - b);

  let strategyIndex = 0;
  for (const priority of sortedPriorities) {
    const group = priorityGroups.get(priority)!;

    const batchResults = await Promise.allSettled(
      group.map(async (strategy) => {
        strategyIndex++;
        const stepNum = strategyIndex + 1;

        onStep({
          agent: 'searcher',
          step: stepNum,
          action: `Buscando ${strategy.origin} → ${strategy.destination} (${strategy.type})`,
          status: 'running',
          timestamp: Date.now(),
        });

        const query = strategy.searchQueries.join(' ');
        const prompt = `Busque voos: ${query}\n\nPeríodo: ${strategy.dateRange.from} a ${strategy.dateRange.to}\nOrigem: ${strategy.origin}\nDestino: ${strategy.destination}\nRetorne os resultados em JSON.`;

        try {
          const response = await callGemini(apiKey, {
            prompt,
            systemInstruction: SEARCH_SYSTEM,
            useSearch: true,
            responseSchema: SEARCH_RESULT_SCHEMA,
            temperature: 0.1,
          });

          const parsed = parseJsonResponse<GeminiSearchResult>(response.text);
          totalTokens += response.tokensUsed;

          onStep({
            agent: 'searcher',
            step: stepNum,
            action: `${strategy.origin} → ${strategy.destination}: ${parsed.flights.length} voos encontrados`,
            status: 'completed',
            detail: `Confiança: ${Math.round((parsed.search_metadata.confidence ?? 0.5) * 100)}%`,
            timestamp: Date.now(),
          });

          return parsed.flights;
        } catch (err) {
          onStep({
            agent: 'searcher',
            step: stepNum,
            action: `Erro na busca ${strategy.origin} → ${strategy.destination}`,
            status: 'error',
            detail: (err as Error).message,
            timestamp: Date.now(),
          });
          return [];
        }
      }),
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        allResults.push(...result.value);
      }
    }

    if (allResults.length >= 50 && priority > 1) break;
  }

  const latencyMs = Date.now() - start;

  onStep({
    agent: 'searcher',
    step: 0,
    action: `Busca concluída: ${allResults.length} resultados brutos`,
    status: 'completed',
    timestamp: Date.now(),
  });

  return { results: allResults, tokensUsed: totalTokens, latencyMs };
}
