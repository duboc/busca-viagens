import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  ENV_GEMINI_API_KEY,
  ENV_AMADEUS_CLIENT_ID,
  ENV_AMADEUS_CLIENT_SECRET,
  ENV_AMADEUS_ENV,
  DEFAULT_CURRENCY,
  DEFAULT_CABIN,
  CORS_PROXIES,
} from '../utils/constants';

interface SettingsState {
  geminiApiKey: string;
  amadeusClientId: string;
  amadeusClientSecret: string;
  amadeusEnv: 'test' | 'production';
  corsProxy: string;
  preferredAirlines: string[];
  maxStops: number;
  preferredCabin: string;
  currency: string;
  alertCheckInterval: number;

  setGeminiApiKey: (key: string) => void;
  setAmadeusCredentials: (clientId: string, clientSecret: string) => void;
  setAmadeusEnv: (env: 'test' | 'production') => void;
  setCorsProxy: (proxy: string) => void;
  setPreferredAirlines: (airlines: string[]) => void;
  setMaxStops: (stops: number) => void;
  setPreferredCabin: (cabin: string) => void;
  setCurrency: (currency: string) => void;
  setAlertCheckInterval: (minutes: number) => void;

  /** Returns the effective API key (.env takes priority when store value is empty) */
  effectiveGeminiKey: () => string;
  effectiveAmadeusId: () => string;
  effectiveAmadeusSecret: () => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      geminiApiKey: '',
      amadeusClientId: '',
      amadeusClientSecret: '',
      amadeusEnv: ENV_AMADEUS_ENV,
      corsProxy: CORS_PROXIES[0],
      preferredAirlines: [],
      maxStops: 2,
      preferredCabin: DEFAULT_CABIN,
      currency: DEFAULT_CURRENCY,
      alertCheckInterval: 30,

      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
      setAmadeusCredentials: (clientId, clientSecret) =>
        set({ amadeusClientId: clientId, amadeusClientSecret: clientSecret }),
      setAmadeusEnv: (env) => set({ amadeusEnv: env }),
      setCorsProxy: (proxy) => set({ corsProxy: proxy }),
      setPreferredAirlines: (airlines) => set({ preferredAirlines: airlines }),
      setMaxStops: (stops) => set({ maxStops: stops }),
      setPreferredCabin: (cabin) => set({ preferredCabin: cabin }),
      setCurrency: (currency) => set({ currency }),
      setAlertCheckInterval: (minutes) =>
        set({ alertCheckInterval: minutes }),

      effectiveGeminiKey: () => get().geminiApiKey || ENV_GEMINI_API_KEY,
      effectiveAmadeusId: () => get().amadeusClientId || ENV_AMADEUS_CLIENT_ID,
      effectiveAmadeusSecret: () => get().amadeusClientSecret || ENV_AMADEUS_CLIENT_SECRET,
    }),
    { name: 'skyagent-settings' },
  ),
);
