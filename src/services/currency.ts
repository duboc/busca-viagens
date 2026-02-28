import { CACHE_TTL } from '../utils/constants';
import type { CurrencyRates } from '../agents/types';

/**
 * Hardcoded fallback rates (relative to USD).
 * These are approximate mid-market rates and serve as a safety net
 * when the live API is unavailable.
 */
const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  BRL: 5.15,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  CAD: 1.36,
  AUD: 1.55,
  CHF: 0.88,
  CNY: 7.24,
  KRW: 1330,
  MXN: 17.15,
  ARS: 870,
  CLP: 930,
  COP: 3950,
  PEN: 3.72,
  TRY: 32.5,
  INR: 83.1,
  THB: 35.5,
  SGD: 1.34,
  AED: 3.67,
  QAR: 3.64,
  ZAR: 18.6,
  NZD: 1.67,
  ILS: 3.65,
  SEK: 10.45,
  NOK: 10.55,
  DKK: 6.87,
  PLN: 3.98,
  HKD: 7.82,
  TWD: 31.5,
  PHP: 56.2,
  MYR: 4.72,
  IDR: 15700,
};

let cachedRates: CurrencyRates | null = null;

/**
 * Fetch live exchange rates from a free API.
 * Falls back to hardcoded rates on error.
 */
async function fetchLiveRates(): Promise<CurrencyRates> {
  // Return cached if still fresh (6 hours)
  if (cachedRates && Date.now() - cachedRates.fetchedAt < CACHE_TTL.exchangeRates) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      'https://open.er-api.com/v6/latest/USD',
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Exchange rate API error: ${res.status}`);
    }

    const data = await res.json();
    if (data.result !== 'success' || !data.rates) {
      throw new Error('Invalid exchange rate response');
    }

    cachedRates = {
      base: 'USD',
      rates: data.rates as Record<string, number>,
      fetchedAt: Date.now(),
    };
    return cachedRates;
  } catch {
    // Use fallback rates if API fails
    if (cachedRates) return cachedRates; // stale cache is better than nothing
    return {
      base: 'USD',
      rates: { ...FALLBACK_RATES },
      fetchedAt: Date.now(),
    };
  }
}

/**
 * Get the fallback rates synchronously (no network call).
 */
export function getFallbackRates(): CurrencyRates {
  return {
    base: 'USD',
    rates: { ...FALLBACK_RATES },
    fetchedAt: 0,
  };
}

/**
 * Convert an amount from one currency to another.
 * Uses live rates when available, falls back to hardcoded rates.
 */
export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  if (from === to) return amount;

  const ratesData = await fetchLiveRates();
  return convertWithRates(amount, from, to, ratesData.rates);
}

/**
 * Synchronous conversion using provided rates.
 */
export function convertWithRates(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;

  const fromRate = rates[from.toUpperCase()];
  const toRate = rates[to.toUpperCase()];

  if (!fromRate || !toRate) {
    // If we can't convert, return the original amount
    console.warn(`Currency conversion unavailable: ${from} → ${to}`);
    return amount;
  }

  // Convert from → USD → to
  const usdAmount = amount / fromRate;
  return Math.round(usdAmount * toRate * 100) / 100;
}

/**
 * Preload exchange rates (call early to warm cache).
 */
export async function preloadRates(): Promise<CurrencyRates> {
  return fetchLiveRates();
}

/**
 * Get the cached rates or fallback (synchronous).
 */
export function getCachedRates(): CurrencyRates {
  return cachedRates ?? getFallbackRates();
}

/**
 * Check if a currency code is known.
 */
export function isSupportedCurrency(code: string): boolean {
  const rates = cachedRates?.rates ?? FALLBACK_RATES;
  return code.toUpperCase() in rates;
}
