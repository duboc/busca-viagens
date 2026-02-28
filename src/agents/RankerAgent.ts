import { callGemini, parseJsonResponse } from '../services/gemini';
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
Atribua badges: "best_price", "shortest", "recommended", "best_value" quando aplicável.`;

export async function runRankerAgent(
  apiKey: string,
  flights: Flight[],
  onStep: (step: AgentStep) => void,
): Promise<{ rankedFlights: Flight[]; tokensUsed: number; latencyMs: number }> {
  const start = Date.now();

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

  // First pass: local scoring
  const localScored = flights.map((f) => ({
    ...f,
    rankBreakdown: calculateLocalScore(f, flights),
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
    }));

    const prompt = `Rankeia estes ${flights.length} voos:\n\n${JSON.stringify(flightSummaries, null, 2)}`;

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
      action: `Ranking concluído: ${ranked.length} voos, melhor preço ${formatBRL(ranked.find((f) => f.badges?.includes('best_price'))?.price ?? ranked[0]?.price)}`,
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

function calculateLocalScore(flight: Flight, allFlights: Flight[]): RankBreakdown {
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

  const stopsScore = flight.outboundStops === 0 ? 1 : flight.outboundStops === 1 ? 0.6 : 0.2;

  let timeScore = 0.5;
  try {
    const hour = new Date(flight.outboundDeparture).getHours();
    if (hour >= 8 && hour <= 20) timeScore = 1;
    else if (hour >= 6 || hour <= 22) timeScore = 0.6;
    else timeScore = 0.2;
  } catch { /* keep default */ }

  const airlineScore = 0.5;
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

function assignBadges(flights: Flight[]): void {
  if (flights.length === 0) return;

  const cheapest = flights.reduce((a, b) => (a.price < b.price ? a : b));
  cheapest.badges = [...(cheapest.badges ?? []), 'best_price'];

  const shortest = flights.reduce((a, b) =>
    (a.outboundDurationMin ?? 9999) < (b.outboundDurationMin ?? 9999) ? a : b,
  );
  if (shortest.id !== cheapest.id) {
    shortest.badges = [...(shortest.badges ?? []), 'shortest'];
  }

  if (flights[0] && flights[0].id !== cheapest.id && flights[0].id !== shortest.id) {
    flights[0].badges = [...(flights[0].badges ?? []), 'recommended'];
  } else if (flights[0]) {
    flights[0].badges = [...(flights[0].badges ?? []), 'recommended'];
  }
}

function formatBRL(price?: number): string {
  if (!price) return 'N/A';
  return `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
}
