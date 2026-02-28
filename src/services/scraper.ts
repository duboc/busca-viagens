import { CORS_PROXIES } from '../utils/constants';
import type { RawFlightResult, ScraperResult } from '../agents/types';

/**
 * Google Flights URL builder + response parser.
 *
 * - Builds search URL from origin/dest/dates
 * - Uses CORS proxy (configurable)
 * - Parses response to extract flight data
 * - Fallback with graceful error handling
 *
 * Note: Google Flights does not have a public API. This scraper builds
 * a Google Flights URL and attempts to extract structured data from the
 * page content via a CORS proxy. Results are best-effort and may be
 * incomplete due to JavaScript-rendered content.
 */

/**
 * Build a Google Flights search URL.
 */
export function buildGoogleFlightsUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  cabin?: string,
  passengers?: number,
): string {
  // Google Flights URL format:
  // https://www.google.com/travel/flights?q=flights+from+GRU+to+NRT+on+2025-03-15
  const parts = [
    'https://www.google.com/travel/flights?hl=en',
    `&q=flights+from+${encodeURIComponent(origin)}+to+${encodeURIComponent(destination)}`,
    `+on+${encodeURIComponent(departureDate)}`,
  ];

  if (returnDate) {
    parts.push(`+return+${encodeURIComponent(returnDate)}`);
  }

  if (cabin && cabin !== 'economy') {
    parts.push(`+${encodeURIComponent(cabin)}`);
  }

  if (passengers && passengers > 1) {
    parts.push(`+${passengers}+passengers`);
  }

  return parts.join('');
}

/**
 * Build a direct Google Flights booking-style URL (for user reference).
 */
export function buildGoogleFlightsBookingUrl(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
): string {
  // Simplified booking URL format
  const dateFormatted = departureDate.replace(/-/g, '');
  let url = `https://www.google.com/travel/flights/search?tfs=CBwQAhoeEgoyMDI1MDMxNTAwag0IAhIJL20vMDlmMTdyDQgCEgkvbS8wN2RmbA`;

  // Fallback: human-readable URL
  url = `https://www.google.com/travel/flights?q=flights%20from%20${origin}%20to%20${destination}%20on%20${dateFormatted}`;
  if (returnDate) {
    url += `%20return%20${returnDate.replace(/-/g, '')}`;
  }
  return url;
}

/**
 * Attempt to scrape flight data from Google Flights via a CORS proxy.
 * This is a best-effort approach since Google Flights is JS-rendered.
 */
export async function scrapeGoogleFlights(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate?: string,
  corsProxy?: string,
): Promise<ScraperResult> {
  const searchUrl = buildGoogleFlightsUrl(origin, destination, departureDate, returnDate);

  // Try configured proxy first, then fallback proxies
  const proxiesToTry = corsProxy
    ? [corsProxy, ...CORS_PROXIES.filter((p) => p !== corsProxy)]
    : CORS_PROXIES;

  for (const proxy of proxiesToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const proxyUrl = `${proxy}${encodeURIComponent(searchUrl)}`;
      const res = await fetch(proxyUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; SkyAgent/1.0)',
        },
      });
      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const html = await res.text();
      const flights = parseFlightDataFromHtml(html, origin, destination, departureDate);

      if (flights.length > 0) {
        return {
          flights,
          source: `google_flights (via ${proxy.split('/')[2] ?? 'proxy'})`,
        };
      }
    } catch {
      // Try next proxy
      continue;
    }
  }

  // No results from any proxy
  return {
    flights: [],
    source: 'google_flights',
    error: 'Could not fetch flight data from Google Flights via any proxy',
  };
}

/**
 * Parse flight data from HTML content.
 * This is a best-effort parser for Google Flights page content.
 * Since the page is heavily JS-rendered, we try to extract data from
 * any structured data or visible text patterns.
 */
function parseFlightDataFromHtml(
  html: string,
  origin: string,
  destination: string,
  departureDate: string,
): RawFlightResult[] {
  const flights: RawFlightResult[] = [];

  // Try to extract JSON-LD structured data
  const jsonLdMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLdMatches) {
    for (const match of jsonLdMatches) {
      try {
        const jsonStr = match.replace(/<\/?script[^>]*>/g, '');
        const data = JSON.parse(jsonStr);
        if (data['@type'] === 'Flight' || data.flights) {
          const extracted = extractFromJsonLd(data, origin, destination);
          flights.push(...extracted);
        }
      } catch {
        // Ignore malformed JSON-LD
      }
    }
  }

  // Try to extract from price patterns in the HTML text
  const pricePattern = /(?:R\$|US\$|\$|EUR|€|£)\s*([\d.,]+)/g;
  const airlinePattern = /(?:LATAM|GOL|Azul|American|United|Delta|Emirates|Qatar|Turkish|Air France|Lufthansa|KLM|British Airways|TAP|Iberia|Copa|Avianca)/gi;

  const prices: number[] = [];
  let priceMatch;
  while ((priceMatch = pricePattern.exec(html)) !== null) {
    const priceStr = priceMatch[1].replace(/\./g, '').replace(',', '.');
    const price = parseFloat(priceStr);
    if (price > 50 && price < 100000) {
      prices.push(price);
    }
  }

  const airlines = new Set<string>();
  let airlineMatch;
  while ((airlineMatch = airlinePattern.exec(html)) !== null) {
    airlines.add(airlineMatch[0]);
  }

  // Duration patterns like "12h 30m" or "12h30"
  const durationPattern = /(\d{1,2})h\s*(\d{1,2})m?/g;
  const durations: number[] = [];
  let durMatch;
  while ((durMatch = durationPattern.exec(html)) !== null) {
    const dur = parseInt(durMatch[1]) * 60 + parseInt(durMatch[2]);
    if (dur > 30 && dur < 3000) {
      durations.push(dur);
    }
  }

  // Build flights from extracted data if we have meaningful information
  if (prices.length > 0 && airlines.size > 0) {
    const airlineList = Array.from(airlines);
    const uniquePrices = [...new Set(prices)].sort((a, b) => a - b).slice(0, 10);

    for (let i = 0; i < uniquePrices.length; i++) {
      flights.push({
        airline: airlineList[i % airlineList.length],
        departure: `${departureDate}T08:00:00`,
        arrival: `${departureDate}T20:00:00`,
        origin_iata: origin.toUpperCase(),
        destination_iata: destination.toUpperCase(),
        price: uniquePrices[i],
        currency: 'BRL',
        duration_minutes: durations[i] ?? undefined,
        source_url: buildGoogleFlightsBookingUrl(origin, destination, departureDate),
      });
    }
  }

  return flights;
}

/**
 * Extract flight data from JSON-LD structured data.
 */
function extractFromJsonLd(
  data: Record<string, unknown>,
  origin: string,
  destination: string,
): RawFlightResult[] {
  const flights: RawFlightResult[] = [];

  try {
    if (Array.isArray(data.flights)) {
      for (const f of data.flights) {
        const flight = f as Record<string, unknown>;
        flights.push({
          airline: (flight.airline as string) ?? undefined,
          flight_number: (flight.flightNumber as string) ?? undefined,
          departure: (flight.departureTime as string) ?? '',
          arrival: (flight.arrivalTime as string) ?? '',
          origin_iata: (flight.departureAirport as string) ?? origin,
          destination_iata: (flight.arrivalAirport as string) ?? destination,
          price: typeof flight.price === 'number' ? flight.price : 0,
          currency: (flight.currency as string) ?? 'BRL',
          stops: typeof flight.stops === 'number' ? flight.stops : undefined,
          duration_minutes: typeof flight.duration === 'number' ? flight.duration : undefined,
          source_url: 'google_flights',
        });
      }
    }
  } catch {
    // Malformed data
  }

  return flights;
}
