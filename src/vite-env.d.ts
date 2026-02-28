/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string;
  readonly VITE_GEMINI_MODEL: string;
  readonly VITE_GEMINI_API_URL: string;
  readonly VITE_AMADEUS_CLIENT_ID: string;
  readonly VITE_AMADEUS_CLIENT_SECRET: string;
  readonly VITE_AMADEUS_ENV: string;
  readonly VITE_AMADEUS_TEST_URL: string;
  readonly VITE_AMADEUS_PROD_URL: string;
  readonly VITE_CORS_PROXY: string;
  readonly VITE_EXCHANGE_RATE_API_URL: string;
  readonly VITE_DEFAULT_CURRENCY: string;
  readonly VITE_DEFAULT_CABIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
