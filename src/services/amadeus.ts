import { AMADEUS_TEST_URL, AMADEUS_PROD_URL } from '../utils/constants';
import type {
  AmadeusTokenResponse,
  AmadeusSearchParams,
  AmadeusFlightOffersResponse,
  AmadeusFlightOffer,
  RawFlightResult,
} from '../agents/types';

/**
 * Amadeus Self-Service API client.
 *
 * - Auth with client_id/client_secret -> Bearer token
 * - Flight Offers Search endpoint: /v2/shopping/flight-offers
 * - Maps Amadeus response to RawFlightResult[]
 * - Handles token refresh, rate limits, errors
 * - Supports both test and production environments
 */

interface AmadeusToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: AmadeusToken | null = null;

function getBaseUrl(env: 'test' | 'production'): string {
  return env === 'production' ? AMADEUS_PROD_URL : AMADEUS_TEST_URL;
}

/**
 * Authenticate with Amadeus and obtain a Bearer token.
 * Caches the token until it expires (with a 60s safety margin).
 */
async function authenticate(
  clientId: string,
  clientSecret: string,
  env: 'test' | 'production',
): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken;
  }

  const baseUrl = getBaseUrl(env);
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Amadeus auth failed (${res.status}): ${errText}`);
  }

  const data: AmadeusTokenResponse = await res.json();

  cachedToken = {
    accessToken: data.access_token,
    // Expire 60 seconds early to avoid edge cases
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.accessToken;
}

/**
 * Search for flight offers using the Amadeus API.
 */
export async function searchFlightOffers(
  clientId: string,
  clientSecret: string,
  env: 'test' | 'production',
  params: AmadeusSearchParams,
): Promise<RawFlightResult[]> {
  if (!clientId || !clientSecret) {
    throw new Error('Amadeus credentials not configured');
  }

  const token = await authenticate(clientId, clientSecret, env);
  const baseUrl = getBaseUrl(env);

  const queryParams = new URLSearchParams({
    originLocationCode: params.originLocationCode,
    destinationLocationCode: params.destinationLocationCode,
    departureDate: params.departureDate,
    adults: String(params.adults),
    max: String(params.max ?? 50),
  });

  if (params.returnDate) {
    queryParams.set('returnDate', params.returnDate);
  }
  if (params.travelClass) {
    queryParams.set('travelClass', params.travelClass);
  }
  if (params.nonStop !== undefined) {
    queryParams.set('nonStop', String(params.nonStop));
  }
  if (params.currencyCode) {
    queryParams.set('currencyCode', params.currencyCode);
  }
  if (params.maxPrice) {
    queryParams.set('maxPrice', String(params.maxPrice));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(
        `${baseUrl}/v2/shopping/flight-offers?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);

      if (res.status === 401) {
        // Token expired — clear cache and retry
        cachedToken = null;
        const newToken = await authenticate(clientId, clientSecret, env);
        // Retry with new token
        const retryRes = await fetch(
          `${baseUrl}/v2/shopping/flight-offers?${queryParams.toString()}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${newToken}`,
              Accept: 'application/json',
            },
          },
        );
        if (!retryRes.ok) {
          throw new Error(`Amadeus API error after token refresh: ${retryRes.status}`);
        }
        const retryData: AmadeusFlightOffersResponse = await retryRes.json();
        return mapAmadeusToRawFlights(retryData);
      }

      if (res.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = parseInt(res.headers.get('Retry-After') ?? '2', 10);
        await new Promise((r) => setTimeout(r, retryAfter * 1000));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Amadeus API error (${res.status}): ${errText}`);
      }

      const data: AmadeusFlightOffersResponse = await res.json();
      return mapAmadeusToRawFlights(data);
    } catch (err) {
      lastError = err as Error;
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error('Amadeus request failed after retries');
}

/**
 * Parse an ISO 8601 duration string (e.g., "PT12H30M") to minutes.
 */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] ?? '0', 10);
  const minutes = parseInt(match[2] ?? '0', 10);
  return hours * 60 + minutes;
}

/**
 * Map Amadeus API response to our internal RawFlightResult format.
 */
function mapAmadeusToRawFlights(response: AmadeusFlightOffersResponse): RawFlightResult[] {
  const carriers = response.dictionaries?.carriers ?? {};

  return response.data.map((offer: AmadeusFlightOffer) => {
    const outbound = offer.itineraries[0];
    const segments = outbound.segments;
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length - 1];

    const stops = segments.length - 1;
    const stopCities = stops > 0
      ? segments.slice(0, -1).map((s) => s.arrival.iataCode)
      : undefined;

    const airlineCode = offer.validatingAirlineCodes?.[0] ?? firstSeg.carrierCode;
    const airlineName = carriers[airlineCode] ?? airlineCode;

    // Determine cabin class from traveler pricings
    const cabin = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() ?? 'economy';

    // Determine baggage
    const checkedBags = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.includedCheckedBags;
    const baggageIncluded = checkedBags
      ? { carry_on: true, checked: checkedBags.quantity ?? (checkedBags.weight ? 1 : 0) }
      : undefined;

    return {
      airline: airlineName,
      flight_number: `${firstSeg.carrierCode}${firstSeg.number}`,
      departure: firstSeg.departure.at,
      arrival: lastSeg.arrival.at,
      origin_iata: firstSeg.departure.iataCode,
      destination_iata: lastSeg.arrival.iataCode,
      price: parseFloat(offer.price.grandTotal),
      currency: offer.price.currency,
      stops,
      stop_cities: stopCities,
      duration_minutes: parseDuration(outbound.duration),
      cabin_class: cabin,
      booking_url: undefined,
      source_url: 'amadeus',
      baggage_included: baggageIncluded,
      refundable: offer.pricingOptions?.fareType?.includes('PUBLISHED') ? false : undefined,
    };
  });
}

/**
 * Check if Amadeus credentials are configured.
 */
export function isAmadeusConfigured(clientId: string, clientSecret: string): boolean {
  return Boolean(clientId && clientSecret);
}

/**
 * Clear the cached authentication token (useful for testing).
 */
export function clearAmadeusToken(): void {
  cachedToken = null;
}
