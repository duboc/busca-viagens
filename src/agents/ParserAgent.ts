import { v4 as uuid } from 'uuid';
import { convertWithRates, getCachedRates } from '../services/currency';
import { useSettingsStore } from '../stores/settingsStore';
import { getDatabase } from '../db/database';
import type { RawFlightResult, Flight, AgentStep } from './types';

/** Cache of valid airport IATA codes from the database. */
let airportCodesCache: Set<string> | null = null;

async function loadAirportCodes(): Promise<Set<string>> {
  if (airportCodesCache) return airportCodesCache;
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT iata_code FROM airports');
    const codes = new Set<string>();
    if (result[0]) {
      for (const row of result[0].values) {
        codes.add(String(row[0]).toUpperCase());
      }
    }
    airportCodesCache = codes;
    return codes;
  } catch {
    return new Set<string>();
  }
}

/** Source reliability weights for confidence scoring. */
const SOURCE_RELIABILITY: Record<string, number> = {
  amadeus: 0.95,
  google_flights: 0.7,
  gemini_search: 0.5,
  scraper: 0.4,
  unknown: 0.3,
};

function getSourceReliability(sourceUrl?: string): number {
  if (!sourceUrl) return SOURCE_RELIABILITY.unknown;
  const lowerSource = sourceUrl.toLowerCase();
  if (lowerSource.includes('amadeus')) return SOURCE_RELIABILITY.amadeus;
  if (lowerSource.includes('google') || lowerSource.includes('flights')) return SOURCE_RELIABILITY.google_flights;
  if (lowerSource.includes('gemini') || lowerSource.includes('search')) return SOURCE_RELIABILITY.gemini_search;
  if (lowerSource.includes('scraper')) return SOURCE_RELIABILITY.scraper;
  // Check for known booking sites
  if (/kayak|skyscanner|decolar|expedia|booking|momondo/i.test(lowerSource)) return 0.75;
  return SOURCE_RELIABILITY.unknown;
}

export async function runParserAgent(
  searchId: string,
  rawResults: RawFlightResult[],
  onStep: (step: AgentStep) => void,
): Promise<{ flights: Flight[]; latencyMs: number }> {
  const start = Date.now();
  const settings = useSettingsStore.getState();
  const targetCurrency = settings.currency || 'BRL';

  onStep({
    agent: 'parser',
    step: 1,
    action: `Normalizando ${rawResults.length} resultados`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Load airport codes for validation
  const airportCodes = await loadAirportCodes();

  // Validate
  const valid = rawResults.filter((r) => {
    if (!r.origin_iata || !r.destination_iata) return false;
    if (!r.departure || !r.arrival) return false;
    if (!r.price || r.price <= 0) return false;
    // Validate airport codes if we have a database
    if (airportCodes.size > 0) {
      const originValid = airportCodes.has(r.origin_iata.toUpperCase()) ||
        /^[A-Z]{3}$/.test(r.origin_iata.toUpperCase());
      const destValid = airportCodes.has(r.destination_iata.toUpperCase()) ||
        /^[A-Z]{3}$/.test(r.destination_iata.toUpperCase());
      if (!originValid || !destValid) return false;
    }
    return true;
  });

  onStep({
    agent: 'parser',
    step: 2,
    action: `Validados: ${valid.length}/${rawResults.length}`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Currency normalization
  const rates = getCachedRates().rates;

  // Normalize to Flight objects
  const flights: Flight[] = valid.map((r) => {
    // Normalize price to target currency
    const sourceCurrency = r.currency?.toUpperCase() ?? 'BRL';
    let normalizedPrice = r.price;
    let normalizedCurrency = sourceCurrency;

    if (sourceCurrency !== targetCurrency) {
      const converted = convertWithRates(r.price, sourceCurrency, targetCurrency, rates);
      if (converted !== r.price) {
        normalizedPrice = converted;
        normalizedCurrency = targetCurrency;
      }
    }

    // Determine source label
    const source = inferSource(r);

    return {
      id: uuid(),
      searchId,
      source,
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
      price: normalizedPrice,
      currency: normalizedCurrency,
      pricePerPerson: normalizedPrice,
      fareClass: r.cabin_class ?? 'economy',
      baggageIncluded: r.baggage_included,
      refundable: r.refundable ?? false,
      bookingUrl: r.booking_url,
      confidence: estimateConfidence(r),
      rawData: JSON.stringify(r),
      createdAt: new Date().toISOString(),
    };
  });

  onStep({
    agent: 'parser',
    step: 3,
    action: `Moedas normalizadas para ${targetCurrency}`,
    status: 'running',
    timestamp: Date.now(),
  });

  // Deduplicate with fuzzy matching
  const deduped = deduplicateFlights(flights);
  const dupeCount = flights.length - deduped.length;

  onStep({
    agent: 'parser',
    step: 4,
    action: `Duplicatas removidas: ${dupeCount}`,
    status: 'running',
    timestamp: Date.now(),
  });

  const latencyMs = Date.now() - start;

  onStep({
    agent: 'parser',
    step: 5,
    action: `Normalização concluída: ${deduped.length} voos`,
    status: 'completed',
    timestamp: Date.now(),
  });

  return { flights: deduped, latencyMs };
}

function inferSource(r: RawFlightResult): string {
  if (r.source_url) {
    if (r.source_url.includes('amadeus')) return 'amadeus';
    if (r.source_url.includes('google')) return 'google_flights';
    if (r.source_url.includes('scraper')) return 'scraper';
  }
  return 'gemini_search';
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
    const diff = Math.round((arr - dep) / 60000);
    if (diff <= 0 || diff > 3000) return undefined;
    return diff;
  } catch {
    return undefined;
  }
}

/**
 * Estimate confidence based on data completeness and source reliability.
 *
 * Scoring breakdown:
 * - Base: 0.3
 * - flight_number present: +0.1
 * - booking_url present: +0.15 (strong signal of real data)
 * - duration_minutes present: +0.05
 * - cabin_class present: +0.05
 * - source_url present: +0.05
 * - stops defined: +0.05
 * - Source reliability bonus: +0.0 to +0.25
 */
function estimateConfidence(r: RawFlightResult): number {
  let score = 0.3;

  // Data completeness
  if (r.flight_number) score += 0.1;
  if (r.booking_url) score += 0.15;
  if (r.duration_minutes) score += 0.05;
  if (r.cabin_class) score += 0.05;
  if (r.source_url) score += 0.05;
  if (r.stops !== undefined) score += 0.05;
  if (r.baggage_included) score += 0.03;
  if (r.refundable !== undefined) score += 0.02;

  // Source reliability bonus
  const reliability = getSourceReliability(r.source_url);
  score += reliability * 0.25;

  return Math.min(Math.round(score * 100) / 100, 1);
}

/**
 * Deduplicate flights using fuzzy matching.
 *
 * Two flights are considered duplicates if:
 * - Same origin and destination
 * - Same airline (or both unknown)
 * - Departure times within 30 minutes of each other
 * - Similar price (within 5%)
 *
 * When duplicates are found, keep the one with higher confidence.
 */
function deduplicateFlights(flights: Flight[]): Flight[] {
  const results: Flight[] = [];

  for (const flight of flights) {
    let isDuplicate = false;

    for (let i = 0; i < results.length; i++) {
      const existing = results[i];

      // Must match route
      if (flight.outboundOrigin !== existing.outboundOrigin) continue;
      if (flight.outboundDest !== existing.outboundDest) continue;

      // Must match airline (or both unknown)
      const sameAirline =
        flight.outboundAirline === existing.outboundAirline ||
        (!flight.outboundAirline && !existing.outboundAirline);
      if (!sameAirline && flight.outboundAirline && existing.outboundAirline) continue;

      // Check departure time proximity (within 30 minutes)
      const depTimeDiff = getTimeDiffMinutes(
        flight.outboundDeparture,
        existing.outboundDeparture,
      );
      if (depTimeDiff === null || depTimeDiff > 30) continue;

      // Check price similarity (within 5%)
      const priceDiff = Math.abs(flight.price - existing.price) / Math.max(existing.price, 1);
      if (priceDiff > 0.05) {
        // Different prices — these might be different fare classes, keep both
        continue;
      }

      // This is a duplicate — keep the one with higher confidence
      isDuplicate = true;
      if (flight.confidence > existing.confidence) {
        results[i] = flight;
      }
      break;
    }

    if (!isDuplicate) {
      results.push(flight);
    }
  }

  return results;
}

/**
 * Get the absolute difference in minutes between two date strings.
 * Returns null if either date is invalid.
 */
function getTimeDiffMinutes(dateStr1: string, dateStr2: string): number | null {
  try {
    const d1 = new Date(dateStr1).getTime();
    const d2 = new Date(dateStr2).getTime();
    if (isNaN(d1) || isNaN(d2)) return null;
    return Math.abs(d1 - d2) / 60000;
  } catch {
    return null;
  }
}
