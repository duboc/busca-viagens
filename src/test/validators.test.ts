import { describe, it, expect } from 'vitest';
import {
  isValidIATA,
  isValidDate,
  isValidApiKey,
  isValidPrice,
  sanitizeInput,
} from '../utils/validators';

describe('isValidIATA', () => {
  it('accepts valid 3-letter uppercase codes', () => {
    expect(isValidIATA('GRU')).toBe(true);
    expect(isValidIATA('JFK')).toBe(true);
    expect(isValidIATA('LAX')).toBe(true);
    expect(isValidIATA('CDG')).toBe(true);
  });

  it('rejects lowercase codes', () => {
    expect(isValidIATA('gru')).toBe(false);
    expect(isValidIATA('jfk')).toBe(false);
  });

  it('rejects mixed case codes', () => {
    expect(isValidIATA('Gru')).toBe(false);
    expect(isValidIATA('gRu')).toBe(false);
  });

  it('rejects codes with wrong length', () => {
    expect(isValidIATA('AB')).toBe(false);
    expect(isValidIATA('ABCD')).toBe(false);
    expect(isValidIATA('')).toBe(false);
    expect(isValidIATA('A')).toBe(false);
  });

  it('rejects codes with numbers', () => {
    expect(isValidIATA('123')).toBe(false);
    expect(isValidIATA('A1B')).toBe(false);
    expect(isValidIATA('12C')).toBe(false);
  });

  it('rejects codes with special characters', () => {
    expect(isValidIATA('AB!')).toBe(false);
    expect(isValidIATA('A-B')).toBe(false);
    expect(isValidIATA('A B')).toBe(false);
  });
});

describe('isValidDate', () => {
  it('accepts valid ISO date strings', () => {
    expect(isValidDate('2025-03-15')).toBe(true);
    expect(isValidDate('2025-03-15T14:30:00.000Z')).toBe(true);
  });

  it('accepts valid date formats', () => {
    expect(isValidDate('March 15, 2025')).toBe(true);
    expect(isValidDate('2025/03/15')).toBe(true);
  });

  it('rejects invalid date strings', () => {
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('abc')).toBe(false);
  });

  it('rejects completely invalid strings', () => {
    expect(isValidDate('hello world')).toBe(false);
    expect(isValidDate('foobar')).toBe(false);
  });
});

describe('isValidApiKey', () => {
  it('accepts keys with 20 or more characters', () => {
    expect(isValidApiKey('12345678901234567890')).toBe(true);
    expect(isValidApiKey('a'.repeat(39))).toBe(true);
    expect(isValidApiKey('a'.repeat(100))).toBe(true);
  });

  it('accepts exactly 20 characters', () => {
    expect(isValidApiKey('12345678901234567890')).toBe(true);
  });

  it('rejects keys shorter than 20 characters', () => {
    expect(isValidApiKey('1234567890123456789')).toBe(false);
    expect(isValidApiKey('short')).toBe(false);
    expect(isValidApiKey('')).toBe(false);
    expect(isValidApiKey('a')).toBe(false);
  });
});

describe('isValidPrice', () => {
  it('accepts valid positive prices', () => {
    expect(isValidPrice(100)).toBe(true);
    expect(isValidPrice(1500.50)).toBe(true);
    expect(isValidPrice(0.01)).toBe(true);
    expect(isValidPrice(999999)).toBe(true);
  });

  it('rejects zero', () => {
    expect(isValidPrice(0)).toBe(false);
  });

  it('rejects negative prices', () => {
    expect(isValidPrice(-1)).toBe(false);
    expect(isValidPrice(-100)).toBe(false);
  });

  it('rejects prices at or above 1,000,000', () => {
    expect(isValidPrice(1_000_000)).toBe(false);
    expect(isValidPrice(2_000_000)).toBe(false);
  });

  it('accepts prices just below 1,000,000', () => {
    expect(isValidPrice(999_999)).toBe(true);
    expect(isValidPrice(999_999.99)).toBe(true);
  });
});

describe('sanitizeInput', () => {
  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
    expect(sanitizeInput('\thello\n')).toBe('hello');
  });

  it('removes < and > characters (XSS prevention)', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
  });

  it('handles mixed XSS and whitespace', () => {
    expect(sanitizeInput('  <b>bold</b>  ')).toBe('bbold/b');
  });

  it('preserves normal text', () => {
    expect(sanitizeInput('São Paulo to Tokyo')).toBe('São Paulo to Tokyo');
    expect(sanitizeInput('flight search')).toBe('flight search');
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
    expect(sanitizeInput('   ')).toBe('');
  });

  it('handles strings with only angle brackets', () => {
    expect(sanitizeInput('<>')).toBe('');
    expect(sanitizeInput('<<<>>>')).toBe('');
  });

  it('removes nested HTML tags', () => {
    expect(sanitizeInput('<div><img src=x onerror=alert(1)></div>')).toBe('divimg src=x onerror=alert(1)/div');
  });
});
