export const GEMINI_MODEL = 'gemini-2.0-flash';
export const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

export const AMADEUS_TEST_URL = 'https://test.api.amadeus.com';
export const AMADEUS_PROD_URL = 'https://api.amadeus.com';

export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

export const DEFAULT_CURRENCY = 'BRL';
export const DEFAULT_CABIN = 'economy';
export const DEFAULT_PASSENGERS = 1;

export const CACHE_TTL = {
  flightResults: 3_600_000,
  airports: Infinity,
  geminiResponses: 1_800_000,
  exchangeRates: 21_600_000,
} as const;

export const RATE_LIMIT = {
  maxRequests: 14,
  windowMs: 60_000,
} as const;

export const RANKING_WEIGHTS = {
  price: 0.35,
  duration: 0.25,
  stops: 0.2,
  departureTime: 0.1,
  airline: 0.05,
  confidence: 0.05,
} as const;
