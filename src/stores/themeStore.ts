import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: () => ResolvedTheme;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',

      setTheme: (theme: Theme) => set({ theme }),

      toggleTheme: () => {
        const current = get().theme;
        const next: Theme =
          current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        set({ theme: next });
      },

      resolvedTheme: () => {
        const { theme } = get();
        if (theme === 'system') return getSystemTheme();
        return theme;
      },
    }),
    { name: 'skyagent-theme' },
  ),
);
