// ─── API Configuration (reads from .env with fallbacks) ──

export const GEMINI_MODEL =
  import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';

export const GEMINI_API_URL =
  import.meta.env.VITE_GEMINI_API_URL ||
  'https://generativelanguage.googleapis.com/v1beta/models';

export const AMADEUS_TEST_URL =
  import.meta.env.VITE_AMADEUS_TEST_URL || 'https://test.api.amadeus.com';

export const AMADEUS_PROD_URL =
  import.meta.env.VITE_AMADEUS_PROD_URL || 'https://api.amadeus.com';

export const CORS_PROXIES = [
  import.meta.env.VITE_CORS_PROXY || 'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

export const EXCHANGE_RATE_API_URL =
  import.meta.env.VITE_EXCHANGE_RATE_API_URL ||
  'https://open.er-api.com/v6/latest/USD';

// ─── Env-sourced API keys (pre-fill settings store) ──

export const ENV_GEMINI_API_KEY =
  import.meta.env.VITE_GEMINI_API_KEY || '';

export const ENV_AMADEUS_CLIENT_ID =
  import.meta.env.VITE_AMADEUS_CLIENT_ID || '';

export const ENV_AMADEUS_CLIENT_SECRET =
  import.meta.env.VITE_AMADEUS_CLIENT_SECRET || '';

export const ENV_AMADEUS_ENV: 'test' | 'production' =
  (import.meta.env.VITE_AMADEUS_ENV as 'test' | 'production') || 'test';

// ─── Defaults ──

export const DEFAULT_CURRENCY =
  import.meta.env.VITE_DEFAULT_CURRENCY || 'BRL';

export const DEFAULT_CABIN =
  import.meta.env.VITE_DEFAULT_CABIN || 'economy';

export const DEFAULT_PASSENGERS = 1;

// ─── Tuning ──

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
