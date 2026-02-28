import { callGemini, parseJsonResponse } from '../services/gemini';
import { useSettingsStore } from '../stores/settingsStore';
import { RANKING_WEIGHTS } from '../utils/constants';
import type { Flight, AgentStep, RankBreakdown } from './types';

interface RankerResult {
  id: string;
  rank_score: number;
  reasoning: string;
  badges: string[];
}

interface RankerResponse {
  rankings: RankerResult[];
}

const RANKER_SYSTEM = `Você é um agente rankeador de voos. Analise os voos e forneça um ranking inteligente.

Considere:
1. Preço relativo (quanto mais barato vs média, melhor)
2. Duração total (incluindo layovers)
3. Número de paradas (direto > 1 parada > 2+)
4. Horários (evitar red-eye, preferir horários convenientes)
5. Reputação da airline
6. Confiança do dado (fonte confiável > estimativa)

Para cada voo, dê um score 0-100 e uma explicação curta em português.
Atribua badges: "best_price", "shortest", "recommended", "best_value" quando aplicável.
"best_value" = bom equilíbrio entre preço baixo e duração curta (não necessariamente o mais barato ou mais curto).`;

export async function runRankerAgent(
  apiKey: string,
  flights: Flight[],
  onStep: (step: AgentStep) => void,
): Promise<{ rankedFlights: Flight[]; tokensUsed: number; latencyMs: number }> {
  const start = Date.now();
  const settings = useSettingsStore.getState();

  if (flights.length === 0) {
    onStep({
      agent: 'ranker',
      step: 1,
      action: 'Nenhum voo para rankear',
      status: 'completed',
      timestamp: Date.now(),
    });
    return { rankedFlights: [], tokensUsed: 0, latencyMs: 0 };
  }

  onStep({
    agent: 'ranker',
    step: 1,
    action: `Rankeando ${flights.length} voos`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Apply user preferences from settings
  const userPreferences = {
    maxStops: settings.maxStops,
    preferredCabin: settings.preferredCabin,
    preferredAirlines: settings.preferredAirlines,
  };

  // First pass: local scoring with user preferences
  const localScored = flights.map((f) => ({
    ...f,
    rankBreakdown: calculateLocalScore(f, flights, userPreferences),
  }));

  // If few flights or no API key, use only local scoring
  if (flights.length <= 3 || !apiKey) {
    const ranked = localScored.map((f) => {
      const breakdown = f.rankBreakdown!;
      const score = Object.entries(RANKING_WEIGHTS).reduce(
        (acc, [key, weight]) => acc + (breakdown[key as keyof RankBreakdown] ?? 0) * weight * 100,
        0,
      );
      return { ...f, rankScore: Math.round(score) };
    });
    ranked.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
    assignBadges(ranked);
    const latencyMs = Date.now() - start;

    onStep({
      agent: 'ranker',
      step: 1,
      action: `Ranking concluído (local): ${ranked.length} voos`,
      status: 'completed',
      timestamp: Date.now(),
    });

    return { rankedFlights: ranked, tokensUsed: 0, latencyMs };
  }

  // AI-assisted ranking for larger result sets
  try {
    const preferencesHint = buildPreferencesHint(userPreferences);

    const flightSummaries = flights.map((f) => ({
      id: f.id,
      airline: f.outboundAirline,
      origin: f.outboundOrigin,
      dest: f.outboundDest,
      departure: f.outboundDeparture,
      arrival: f.outboundArrival,
      duration: f.outboundDurationMin,
      stops: f.outboundStops,
      price: f.price,
      currency: f.currency,
      confidence: f.confidence,
      source: f.source,
    }));

    const prompt = `Rankeia estes ${flights.length} voos:\n\n${JSON.stringify(flightSummaries, null, 2)}${preferencesHint}`;

    const response = await callGemini(apiKey, {
      prompt,
      systemInstruction: RANKER_SYSTEM,
      responseSchema: {
        type: 'object',
        properties: {
          rankings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                rank_score: { type: 'number' },
                reasoning: { type: 'string' },
                badges: { type: 'array', items: { type: 'string' } },
              },
              required: ['id', 'rank_score', 'reasoning', 'badges'],
            },
          },
        },
        required: ['rankings'],
      },
      temperature: 0.1,
    });

    const parsed = parseJsonResponse<RankerResponse>(response.text);
    const rankMap = new Map(parsed.rankings.map((r) => [r.id, r]));

    const ranked = localScored.map((f) => {
      const aiRank = rankMap.get(f.id);
      return {
        ...f,
        rankScore: aiRank?.rank_score ?? Math.round(
          Object.entries(RANKING_WEIGHTS).reduce(
            (acc, [key, weight]) =>
              acc + (f.rankBreakdown![key as keyof RankBreakdown] ?? 0) * weight * 100,
            0,
          ),
        ),
        rankReasoning: aiRank?.reasoning,
        badges: aiRank?.badges,
      };
    });

    ranked.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
    if (!ranked.some((f) => f.badges?.length)) {
      assignBadges(ranked);
    }

    const latencyMs = Date.now() - start;

    onStep({
      agent: 'ranker',
      step: 1,
      action: `Ranking concluído: ${ranked.length} voos, melhor preço ${formatPrice(ranked.find((f) => f.badges?.includes('best_price'))?.price ?? ranked[0]?.price, ranked[0]?.currency)}`,
      status: 'completed',
      timestamp: Date.now(),
    });

    return { rankedFlights: ranked, tokensUsed: response.tokensUsed, latencyMs };
  } catch (err) {
    // Fallback to local scoring
    const ranked = localScored.map((f) => {
      const breakdown = f.rankBreakdown!;
      const score = Object.entries(RANKING_WEIGHTS).reduce(
        (acc, [key, weight]) => acc + (breakdown[key as keyof RankBreakdown] ?? 0) * weight * 100,
        0,
      );
      return { ...f, rankScore: Math.round(score) };
    });
    ranked.sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));
    assignBadges(ranked);

    onStep({
      agent: 'ranker',
      step: 1,
      action: `Ranking concluído (fallback local): ${ranked.length} voos`,
      status: 'completed',
      detail: (err as Error).message,
      timestamp: Date.now(),
    });

    return { rankedFlights: ranked, tokensUsed: 0, latencyMs: Date.now() - start };
  }
}

/**
 * Build a hint string describing user preferences for the AI ranker.
 */
function buildPreferencesHint(prefs: {
  maxStops: number;
  preferredCabin: string;
  preferredAirlines: string[];
}): string {
  const parts: string[] = [];

  if (prefs.maxStops < 2) {
    parts.push(`Usuário prefere no máximo ${prefs.maxStops} parada(s)`);
  }
  if (prefs.preferredCabin && prefs.preferredCabin !== 'economy') {
    parts.push(`Cabine preferida: ${prefs.preferredCabin}`);
  }
  if (prefs.preferredAirlines.length > 0) {
    parts.push(`Companhias preferidas: ${prefs.preferredAirlines.join(', ')}`);
  }

  if (parts.length === 0) return '';
  return '\n\nPreferências do usuário:\n' + parts.map((p) => `- ${p}`).join('\n');
}

function calculateLocalScore(
  flight: Flight,
  allFlights: Flight[],
  userPrefs: { maxStops: number; preferredCabin: string; preferredAirlines: string[] },
): RankBreakdown {
  const prices = allFlights.map((f) => f.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const priceScore = 1 - (flight.price - minPrice) / priceRange;

  const durations = allFlights.map((f) => f.outboundDurationMin ?? 9999);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);
  const durRange = maxDur - minDur || 1;
  const durationScore = flight.outboundDurationMin
    ? 1 - (flight.outboundDurationMin - minDur) / durRange
    : 0.5;

  // Stops score: penalize flights exceeding user's maxStops preference
  let stopsScore: number;
  if (flight.outboundStops === 0) {
    stopsScore = 1;
  } else if (flight.outboundStops === 1) {
    stopsScore = 0.7;
  } else if (flight.outboundStops <= userPrefs.maxStops) {
    stopsScore = 0.4;
  } else {
    stopsScore = 0.1; // Exceeds user preference
  }

  // Time score: avoid red-eye flights
  let timeScore = 0.5;
  try {
    const hour = new Date(flight.outboundDeparture).getHours();
    if (hour >= 8 && hour <= 18) timeScore = 1;
    else if (hour >= 6 && hour <= 22) timeScore = 0.6;
    else timeScore = 0.2; // Red-eye
  } catch { /* keep default */ }

  // Airline score: boost preferred airlines
  let airlineScore = 0.5;
  if (userPrefs.preferredAirlines.length > 0 && flight.outboundAirline) {
    const airlineLower = flight.outboundAirline.toLowerCase();
    const isPreferred = userPrefs.preferredAirlines.some(
      (a) => airlineLower.includes(a.toLowerCase()),
    );
    airlineScore = isPreferred ? 1.0 : 0.4;
  }

  // Cabin match bonus
  if (
    userPrefs.preferredCabin &&
    flight.fareClass &&
    flight.fareClass.toLowerCase() === userPrefs.preferredCabin.toLowerCase()
  ) {
    airlineScore = Math.min(airlineScore + 0.2, 1.0);
  }

  const confidenceScore = flight.confidence;

  return {
    priceScore,
    durationScore,
    stopsScore,
    timeScore,
    airlineScore,
    confidenceScore,
  };
}

/**
 * Assign badges to ranked flights.
 *
 * - best_price: cheapest flight
 * - shortest: shortest duration
 * - recommended: highest overall rank (if not already best_price or shortest)
 * - best_value: best combination of price + duration (weighted average in top quartile for both)
 */
function assignBadges(flights: Flight[]): void {
  if (flights.length === 0) return;

  // best_price
  const cheapest = flights.reduce((a, b) => (a.price < b.price ? a : b));
  cheapest.badges = [...(cheapest.badges ?? []), 'best_price'];

  // shortest
  const shortest = flights.reduce((a, b) =>
    (a.outboundDurationMin ?? 9999) < (b.outboundDurationMin ?? 9999) ? a : b,
  );
  if (shortest.id !== cheapest.id) {
    shortest.badges = [...(shortest.badges ?? []), 'shortest'];
  }

  // best_value: good price + low duration combined
  // Score = normalized_price * 0.6 + normalized_duration * 0.4
  const prices = flights.map((f) => f.price);
  const durations = flights.map((f) => f.outboundDurationMin ?? 9999);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);
  const durRange = maxDur - minDur || 1;

  let bestValueFlight: Flight | null = null;
  let bestValueScore = -1;

  for (const f of flights) {
    // Skip flights that already have a primary badge
    if (f.id === cheapest.id || f.id === shortest.id) continue;

    const priceNorm = 1 - (f.price - minPrice) / priceRange;
    const durNorm = 1 - ((f.outboundDurationMin ?? 9999) - minDur) / durRange;
    const valueScore = priceNorm * 0.6 + durNorm * 0.4;

    if (valueScore > bestValueScore) {
      bestValueScore = valueScore;
      bestValueFlight = f;
    }
  }

  if (bestValueFlight && bestValueScore > 0.5) {
    bestValueFlight.badges = [...(bestValueFlight.badges ?? []), 'best_value'];
  }

  // recommended: top-ranked flight
  if (flights[0]) {
    const alreadyBadged = flights[0].badges?.some(
      (b) => b === 'best_price' || b === 'shortest' || b === 'best_value',
    );
    if (!alreadyBadged) {
      flights[0].badges = [...(flights[0].badges ?? []), 'recommended'];
    } else {
      // Find the first flight without a badge
      const unBadged = flights.find(
        (f) => !f.badges?.length || f.badges.length === 0,
      );
      if (unBadged) {
        unBadged.badges = [...(unBadged.badges ?? []), 'recommended'];
      } else {
        // Everyone has a badge, add recommended to the top one
        flights[0].badges = [...(flights[0].badges ?? []), 'recommended'];
      }
    }
  }
}

function formatPrice(price?: number, currency?: string): string {
  if (!price) return 'N/A';
  const curr = currency ?? 'BRL';
  if (curr === 'BRL') {
    return `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
  }
  if (curr === 'USD') {
    return `US$ ${price.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  }
  if (curr === 'EUR') {
    return `€ ${price.toLocaleString('de-DE', { minimumFractionDigits: 0 })}`;
  }
  return `${curr} ${price.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
}
