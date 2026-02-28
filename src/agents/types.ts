export interface AirportRef {
  iata: string;
  name?: string;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface SearchPlan {
  intent: {
    origins: AirportRef[];
    destinations: AirportRef[];
    dateRanges: DateRange[];
    tripType: 'oneway' | 'roundtrip' | 'multi_city';
    passengers: number;
    cabin: string;
    budget?: { amount: number; currency: string };
    flexibility: number;
  };
  strategies: SearchStrategy[];
  reasoning: string;
  legs?: MultiCityLeg[];
}

export interface SearchStrategy {
  id: string;
  type:
    | 'direct'
    | 'one_stop'
    | 'multi_stop'
    | 'alternate_airport'
    | 'flexible_date';
  origin: string;
  destination: string;
  dateRange: DateRange;
  priority: number;
  searchQueries: string[];
  expectedSource: 'gemini_search' | 'amadeus' | 'scrape';
}

export interface RawFlightResult {
  airline?: string;
  flight_number?: string;
  departure: string;
  arrival: string;
  origin_iata: string;
  destination_iata: string;
  price: number;
  currency: string;
  stops?: number;
  stop_cities?: string[];
  duration_minutes?: number;
  cabin_class?: string;
  booking_url?: string;
  source_url?: string;
  baggage_included?: { carry_on: boolean; checked: number };
  refundable?: boolean;
}

export interface GeminiSearchResult {
  flights: RawFlightResult[];
  search_metadata: {
    queries_used: string[];
    sources_checked: string[];
    confidence: number;
    notes: string;
  };
}

export interface AgentStep {
  agent: string;
  step: number;
  action: string;
  status: 'running' | 'completed' | 'error';
  detail?: string;
  timestamp: number;
}

export interface AgentInput {
  searchId: string;
  data: unknown;
}

export interface AgentOutput {
  searchId: string;
  data: unknown;
  steps: AgentStep[];
  tokensUsed: number;
  latencyMs: number;
}

export interface RankingCriteria {
  weights: {
    price: number;
    duration: number;
    stops: number;
    departureTime: number;
    airline: number;
    confidence: number;
  };
  preferences: {
    preferredDepartureWindow?: [number, number];
    avoidRedEye?: boolean;
    preferredAirlines?: string[];
    avoidAirlines?: string[];
    maxLayoverMinutes?: number;
  };
}

export interface RankBreakdown {
  priceScore: number;
  durationScore: number;
  stopsScore: number;
  timeScore: number;
  airlineScore: number;
  confidenceScore: number;
}

export interface Flight {
  id: string;
  searchId: string;
  source: string;
  sourceUrl?: string;

  outboundAirline?: string;
  outboundFlightNo?: string;
  outboundDeparture: string;
  outboundArrival: string;
  outboundOrigin: string;
  outboundDest: string;
  outboundDurationMin?: number;
  outboundStops: number;
  outboundStopCities?: string[];
  outboundStopDurations?: number[];

  returnAirline?: string;
  returnFlightNo?: string;
  returnDeparture?: string;
  returnArrival?: string;
  returnOrigin?: string;
  returnDest?: string;
  returnDurationMin?: number;
  returnStops?: number;
  returnStopCities?: string[];
  returnStopDurations?: number[];

  price: number;
  currency: string;
  pricePerPerson?: number;
  fareClass?: string;
  baggageIncluded?: { carry_on: boolean; checked: number };
  refundable: boolean;

  bookingUrl?: string;
  confidence: number;
  rawData?: string;
  rankScore?: number;
  rankReasoning?: string;
  rankBreakdown?: RankBreakdown;
  badges?: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface Search {
  id: string;
  rawInput: string;
  parsedOrigin?: string;
  parsedDest?: string;
  dateFrom?: string;
  dateTo?: string;
  flexibilityDays: number;
  passengers: number;
  cabinClass: string;
  maxBudget?: number;
  currency: string;
  tripType: 'oneway' | 'roundtrip' | 'multi_city';
  status:
    | 'pending'
    | 'planning'
    | 'searching'
    | 'parsing'
    | 'ranking'
    | 'completed'
    | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PriceAlert {
  id: string;
  searchId: string;
  targetPrice: number;
  currency: string;
  isActive: boolean;
  lastChecked?: string;
  triggeredAt?: string;
  createdAt: string;
}

// --- Amadeus API types ---

export interface AmadeusTokenResponse {
  type: string;
  username: string;
  application_name: string;
  client_id: string;
  token_type: string;
  access_token: string;
  expires_in: number;
  state: string;
  scope: string;
}

export interface AmadeusFlightOffer {
  type: string;
  id: string;
  source: string;
  instantTicketingRequired: boolean;
  nonHomogeneous: boolean;
  oneWay: boolean;
  lastTicketingDate: string;
  numberOfBookableSeats: number;
  itineraries: AmadeusItinerary[];
  price: {
    currency: string;
    total: string;
    base: string;
    grandTotal: string;
  };
  pricingOptions: {
    fareType: string[];
    includedCheckedBagsOnly: boolean;
  };
  validatingAirlineCodes: string[];
  travelerPricings: Array<{
    travelerId: string;
    fareOption: string;
    travelerType: string;
    price: { currency: string; total: string; base: string };
    fareDetailsBySegment: Array<{
      segmentId: string;
      cabin: string;
      fareBasis: string;
      class: string;
      includedCheckedBags?: { weight?: number; weightUnit?: string; quantity?: number };
    }>;
  }>;
}

export interface AmadeusItinerary {
  duration: string;
  segments: AmadeusSegment[];
}

export interface AmadeusSegment {
  departure: { iataCode: string; terminal?: string; at: string };
  arrival: { iataCode: string; terminal?: string; at: string };
  carrierCode: string;
  number: string;
  aircraft: { code: string };
  operating?: { carrierCode: string };
  duration: string;
  id: string;
  numberOfStops: number;
  blacklistedInEU: boolean;
}

export interface AmadeusSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  currencyCode?: string;
  maxPrice?: number;
  max?: number;
}

export interface AmadeusFlightOffersResponse {
  meta: { count: number };
  data: AmadeusFlightOffer[];
  dictionaries?: {
    carriers?: Record<string, string>;
    aircraft?: Record<string, string>;
    currencies?: Record<string, string>;
    locations?: Record<string, { cityCode: string; countryCode: string }>;
  };
}

// --- Currency types ---

export interface CurrencyRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

// --- Scraper types ---

export interface ScraperResult {
  flights: RawFlightResult[];
  source: string;
  error?: string;
}

// --- Multi-city leg for PlannerAgent ---

export interface MultiCityLeg {
  origin: string;
  destination: string;
  dateRange: DateRange;
}

// --- Explore Anywhere types ---

export interface ExploreDestination {
  outboundDest: string;
  minPrice: number;
  flightCount: number;
}

// --- Alliance filter types ---

export type AllianceType = 'star_alliance' | 'skyteam' | 'oneworld';

export interface AirlineInfo {
  iataCode: string;
  name: string;
  alliance: string | null;
}
