import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatPrice,
  formatDuration,
  formatDateTime,
  formatDate,
  formatTime,
  formatStops,
  formatRelativeTime,
  formatDateFull,
} from '../utils/formatters';

describe('formatPrice', () => {
  it('formats BRL currency by default', () => {
    const result = formatPrice(1500);
    expect(result).toContain('1.500');
    expect(result).toContain('R$');
  });

  it('formats zero price', () => {
    const result = formatPrice(0);
    expect(result).toContain('0');
    expect(result).toContain('R$');
  });

  it('formats large BRL amount', () => {
    const result = formatPrice(10000);
    expect(result).toContain('10.000');
  });

  it('formats USD currency', () => {
    const result = formatPrice(500, 'USD');
    expect(result).toContain('500');
    expect(result).toContain('US$');
  });

  it('formats EUR currency', () => {
    const result = formatPrice(250, 'EUR');
    expect(result).toContain('250');
    // pt-BR locale formats EUR with the € symbol
    expect(result).toContain('€');
  });

  it('rounds to no decimal places', () => {
    const result = formatPrice(1234.56);
    expect(result).toContain('1.235');
  });

  it('formats small amounts', () => {
    const result = formatPrice(5);
    expect(result).toContain('5');
  });
});

describe('formatDuration', () => {
  it('formats 0 minutes', () => {
    expect(formatDuration(0)).toBe('0min');
  });

  it('formats minutes only (less than 60)', () => {
    expect(formatDuration(45)).toBe('45min');
  });

  it('formats exactly 60 minutes as hours only', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  it('formats 90 minutes as hours and minutes', () => {
    expect(formatDuration(90)).toBe('1h30');
  });

  it('formats 1440 minutes (24 hours)', () => {
    expect(formatDuration(1440)).toBe('24h');
  });

  it('pads single-digit minutes with leading zero', () => {
    expect(formatDuration(65)).toBe('1h05');
  });

  it('formats multi-hour durations', () => {
    expect(formatDuration(150)).toBe('2h30');
  });

  it('formats large durations', () => {
    expect(formatDuration(720)).toBe('12h');
  });
});

describe('formatDateTime', () => {
  it('formats ISO string to dd/MM HH:mm', () => {
    const result = formatDateTime('2025-03-15T14:30:00.000Z');
    expect(result).toMatch(/\d{2}\/\d{2} \d{2}:\d{2}/);
  });

  it('formats a specific date correctly', () => {
    // Using UTC midnight to avoid timezone ambiguity
    const result = formatDateTime('2025-01-01T12:00:00.000Z');
    expect(result).toMatch(/\d{2}\/01 \d{2}:\d{2}/);
  });
});

describe('formatDate', () => {
  it('formats ISO string to dd de MMM in Portuguese', () => {
    const result = formatDate('2025-03-15T00:00:00.000Z');
    expect(result).toMatch(/\d{2} de/);
  });

  it('formats a January date', () => {
    const result = formatDate('2025-01-20T12:00:00.000Z');
    expect(result).toMatch(/\d{2} de jan/i);
  });
});

describe('formatDateFull', () => {
  it('formats ISO string to full date in Portuguese', () => {
    const result = formatDateFull('2025-03-15T00:00:00.000Z');
    expect(result).toMatch(/\d{2} de .+ de 2025/);
  });
});

describe('formatTime', () => {
  it('formats ISO string to HH:mm', () => {
    const result = formatTime('2025-03-15T14:30:00.000Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('formats midnight', () => {
    const result = formatTime('2025-03-15T00:00:00.000Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatStops', () => {
  it('returns "Direto" for 0 stops', () => {
    expect(formatStops(0)).toBe('Direto');
  });

  it('returns "1 parada" for 1 stop', () => {
    expect(formatStops(1)).toBe('1 parada');
  });

  it('returns "2 paradas" for 2 stops', () => {
    expect(formatStops(2)).toBe('2 paradas');
  });

  it('returns "3 paradas" for 3 stops', () => {
    expect(formatStops(3)).toBe('3 paradas');
  });

  it('returns "10 paradas" for 10 stops', () => {
    expect(formatStops(10)).toBe('10 paradas');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats a recent time', () => {
    const result = formatRelativeTime('2025-06-15T11:00:00.000Z');
    expect(result).toContain('1');
  });

  it('formats an old date', () => {
    const result = formatRelativeTime('2025-01-15T12:00:00.000Z');
    expect(result).toContain('5');
  });

  it('returns a string with suffix (há)', () => {
    const result = formatRelativeTime('2025-06-14T12:00:00.000Z');
    expect(result).toContain('há');
  });
});
