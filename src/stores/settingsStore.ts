import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      amadeusClientId: '',
      amadeusClientSecret: '',
      amadeusEnv: 'test',
      corsProxy: 'https://api.allorigins.win/raw?url=',
      preferredAirlines: [],
      maxStops: 2,
      preferredCabin: 'economy',
      currency: 'BRL',
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
    }),
    { name: 'skyagent-settings' },
  ),
);
