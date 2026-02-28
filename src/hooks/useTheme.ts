import { useEffect, useSyncExternalStore } from 'react';
import { useThemeStore } from '../stores/themeStore';
import type { ResolvedTheme } from '../stores/themeStore';

/** Subscribe to system color-scheme changes. */
function subscribeMediaQuery(callback: () => void) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSystemSnapshot(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Hook that reads the theme store and applies the `dark` class
 * to `document.documentElement`. Also listens for system
 * `prefers-color-scheme` changes when the theme is set to 'system'.
 *
 * Should be called once in the root Layout component.
 */
export function useTheme(): ResolvedTheme {
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);

  // Listen for system preference changes so we re-render when it toggles.
  const systemTheme = useSyncExternalStore(subscribeMediaQuery, getSystemSnapshot);

  // Compute the actual resolved theme.
  const effective: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (effective === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [effective]);

  return effective;
}
