import { v4 as uuid } from 'uuid';
import type { RawFlightResult, Flight, AgentStep } from './types';

export function runParserAgent(
  searchId: string,
  rawResults: RawFlightResult[],
  onStep: (step: AgentStep) => void,
): { flights: Flight[]; latencyMs: number } {
  const start = Date.now();

  onStep({
    agent: 'parser',
    step: 1,
    action: `Normalizando ${rawResults.length} resultados`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Validate
  const valid = rawResults.filter((r) => {
    if (!r.origin_iata || !r.destination_iata) return false;
    if (!r.departure || !r.arrival) return false;
    if (!r.price || r.price <= 0) return false;
    return true;
  });

  onStep({
    agent: 'parser',
    step: 2,
    action: `Validados: ${valid.length}/${rawResults.length}`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Normalize to Flight objects
  const flights: Flight[] = valid.map((r) => ({
    id: uuid(),
    searchId,
    source: 'gemini_search',
    sourceUrl: r.source_url,
    outboundAirline: r.airline,
    outboundFlightNo: r.flight_number,
    outboundDeparture: normalizeDate(r.departure),
    outboundArrival: normalizeDate(r.arrival),
    outboundOrigin: r.origin_iata.toUpperCase(),
    outboundDest: r.destination_iata.toUpperCase(),
    outboundDurationMin: r.duration_minutes ?? calculateDuration(r.departure, r.arrival),
    outboundStops: r.stops ?? 0,
    outboundStopCities: r.stop_cities,
    price: r.price,
    currency: r.currency?.toUpperCase() ?? 'BRL',
    pricePerPerson: r.price,
    fareClass: r.cabin_class ?? 'economy',
    baggageIncluded: r.baggage_included,
    refundable: r.refundable ?? false,
    bookingUrl: r.booking_url,
    confidence: estimateConfidence(r),
    rawData: JSON.stringify(r),
    createdAt: new Date().toISOString(),
  }));

  // Deduplicate
  const deduped = deduplicateFlights(flights);
  const dupeCount = flights.length - deduped.length;

  onStep({
    agent: 'parser',
    step: 3,
    action: `Duplicatas removidas: ${dupeCount}`,
    status: 'running',
    timestamp: Date.now(),
  });

  const latencyMs = Date.now() - start;

  onStep({
    agent: 'parser',
    step: 4,
    action: `Normalização concluída: ${deduped.length} voos`,
    status: 'completed',
    timestamp: Date.now(),
  });

  return { flights: deduped, latencyMs };
}

function normalizeDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString();
  } catch {
    return dateStr;
  }
}

function calculateDuration(departure: string, arrival: string): number | undefined {
  try {
    const dep = new Date(departure).getTime();
    const arr = new Date(arrival).getTime();
    if (isNaN(dep) || isNaN(arr)) return undefined;
    return Math.round((arr - dep) / 60000);
  } catch {
    return undefined;
  }
}

function estimateConfidence(r: RawFlightResult): number {
  let score = 0.5;
  if (r.flight_number) score += 0.1;
  if (r.booking_url) score += 0.1;
  if (r.duration_minutes) score += 0.05;
  if (r.cabin_class) score += 0.05;
  if (r.source_url) score += 0.1;
  if (r.stops !== undefined) score += 0.05;
  return Math.min(score, 1);
}

function deduplicateFlights(flights: Flight[]): Flight[] {
  const seen = new Map<string, Flight>();

  for (const f of flights) {
    const day = f.outboundDeparture.split('T')[0];
    const key = `${f.outboundOrigin}-${f.outboundDest}-${day}-${f.outboundAirline ?? 'unknown'}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, f);
    } else {
      // Same route/day/airline — keep higher confidence, or lower price if same confidence
      const priceDiff = Math.abs(f.price - existing.price) / existing.price;
      if (priceDiff < 0.05) {
        // Similar price — keep higher confidence
        if (f.confidence > existing.confidence) {
          seen.set(key, f);
        }
      } else {
        // Different prices — these are different results, keep both
        const altKey = key + '-' + f.price.toFixed(0);
        seen.set(altKey, f);
      }
    }
  }

  return Array.from(seen.values());
}
