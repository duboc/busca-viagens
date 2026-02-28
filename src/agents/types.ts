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
