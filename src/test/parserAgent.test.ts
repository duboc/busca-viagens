import { describe, it, expect, vi } from 'vitest';
import { runParserAgent } from '../agents/ParserAgent';
import type { RawFlightResult, AgentStep } from '../agents/types';

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substring(7)),
}));

function makeRawFlight(overrides: Partial<RawFlightResult> = {}): RawFlightResult {
  return {
    airline: 'LATAM',
    flight_number: 'LA3456',
    departure: '2025-06-15T08:00:00.000Z',
    arrival: '2025-06-15T12:00:00.000Z',
    origin_iata: 'GRU',
    destination_iata: 'GIG',
    price: 500,
    currency: 'BRL',
    stops: 0,
    duration_minutes: 240,
    cabin_class: 'economy',
    booking_url: 'https://latam.com/book',
    source_url: 'https://google.com/flights',
    ...overrides,
  };
}

describe('runParserAgent', () => {
  it('normalizes valid raw results into flights', () => {
    const raw = [makeRawFlight()];
    const steps: AgentStep[] = [];
    const onStep = vi.fn((step: AgentStep) => steps.push(step));

    const result = runParserAgent('search-1', raw, onStep);

    expect(result.flights).toHaveLength(1);
    const flight = result.flights[0];
    expect(flight.searchId).toBe('search-1');
    expect(flight.outboundOrigin).toBe('GRU');
    expect(flight.outboundDest).toBe('GIG');
    expect(flight.price).toBe(500);
    expect(flight.currency).toBe('BRL');
    expect(flight.outboundStops).toBe(0);
    expect(flight.source).toBe('gemini_search');
    expect(flight.refundable).toBe(false);
  });

  it('filters out entries with missing origin_iata', () => {
    const raw = [
      makeRawFlight(),
      makeRawFlight({ origin_iata: '' }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('filters out entries with missing destination_iata', () => {
    const raw = [
      makeRawFlight(),
      makeRawFlight({ destination_iata: '' }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('filters out entries with missing departure', () => {
    const raw = [
      makeRawFlight(),
      makeRawFlight({ departure: '' }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('filters out entries with missing arrival', () => {
    const raw = [
      makeRawFlight(),
      makeRawFlight({ arrival: '' }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('filters out entries with zero price', () => {
    const raw = [
      makeRawFlight(),
      makeRawFlight({ price: 0 }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('filters out entries with negative price', () => {
    const raw = [
      makeRawFlight(),
      makeRawFlight({ price: -100 }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('deduplicates similar flights (same route/day/airline, similar price)', () => {
    const raw = [
      makeRawFlight({ price: 500 }),
      makeRawFlight({ price: 510 }), // within 5% of 500 => duplicate
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(1);
  });

  it('keeps flights with different prices as separate entries', () => {
    const raw = [
      makeRawFlight({ price: 500 }),
      makeRawFlight({ price: 800 }), // more than 5% difference => keep both
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(2);
  });

  it('keeps flights on different routes', () => {
    const raw = [
      makeRawFlight({ origin_iata: 'GRU', destination_iata: 'GIG' }),
      makeRawFlight({ origin_iata: 'GRU', destination_iata: 'SSA' }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(2);
  });

  it('keeps flights on different days', () => {
    const raw = [
      makeRawFlight({ departure: '2025-06-15T08:00:00.000Z' }),
      makeRawFlight({ departure: '2025-06-16T08:00:00.000Z' }),
    ];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights).toHaveLength(2);
  });

  it('assigns higher confidence when more fields are present', () => {
    const fullFlight = makeRawFlight({
      flight_number: 'LA3456',
      booking_url: 'https://latam.com',
      duration_minutes: 240,
      cabin_class: 'economy',
      source_url: 'https://google.com/flights',
      stops: 0,
    });
    const minimalFlight = makeRawFlight({
      flight_number: undefined,
      booking_url: undefined,
      duration_minutes: undefined,
      cabin_class: undefined,
      source_url: undefined,
      stops: undefined,
      origin_iata: 'BSB',
      destination_iata: 'REC',
    });
    const onStep = vi.fn();

    const result = runParserAgent('search-1', [fullFlight, minimalFlight], onStep);
    expect(result.flights).toHaveLength(2);

    const fullResult = result.flights.find(f => f.outboundOrigin === 'GRU');
    const minResult = result.flights.find(f => f.outboundOrigin === 'BSB');

    expect(fullResult!.confidence).toBeGreaterThan(minResult!.confidence);
  });

  it('confidence is capped at 1', () => {
    const flight = makeRawFlight({
      flight_number: 'LA3456',
      booking_url: 'https://latam.com',
      duration_minutes: 240,
      cabin_class: 'economy',
      source_url: 'https://google.com/flights',
      stops: 0,
    });
    const onStep = vi.fn();

    const result = runParserAgent('search-1', [flight], onStep);
    expect(result.flights[0].confidence).toBeLessThanOrEqual(1);
  });

  it('normalizes dates to ISO format', () => {
    const raw = [makeRawFlight({ departure: '2025-06-15T08:00:00Z' })];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].outboundDeparture).toBe('2025-06-15T08:00:00.000Z');
  });

  it('keeps original date string if date is invalid', () => {
    const raw = [makeRawFlight({ departure: 'not-a-date', arrival: '2025-06-15T12:00:00.000Z' })];
    const onStep = vi.fn();

    // The flight still passes validation because departure is truthy
    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].outboundDeparture).toBe('not-a-date');
  });

  it('uppercases IATA codes', () => {
    const raw = [makeRawFlight({ origin_iata: 'gru', destination_iata: 'gig' })];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].outboundOrigin).toBe('GRU');
    expect(result.flights[0].outboundDest).toBe('GIG');
  });

  it('defaults currency to BRL when not provided', () => {
    const raw = [makeRawFlight({ currency: undefined as unknown as string })];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].currency).toBe('BRL');
  });

  it('calls onStep callback correctly', () => {
    const raw = [makeRawFlight()];
    const onStep = vi.fn();

    runParserAgent('search-1', raw, onStep);

    expect(onStep).toHaveBeenCalledTimes(4);

    // Step 1: normalizing
    expect(onStep.mock.calls[0][0]).toMatchObject({
      agent: 'parser',
      step: 1,
      status: 'running',
    });

    // Step 2: validation count
    expect(onStep.mock.calls[1][0]).toMatchObject({
      agent: 'parser',
      step: 2,
      status: 'running',
    });

    // Step 3: dedup count
    expect(onStep.mock.calls[2][0]).toMatchObject({
      agent: 'parser',
      step: 3,
      status: 'running',
    });

    // Step 4: completed
    expect(onStep.mock.calls[3][0]).toMatchObject({
      agent: 'parser',
      step: 4,
      status: 'completed',
    });
  });

  it('returns latencyMs', () => {
    const raw = [makeRawFlight()];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('handles empty input', () => {
    const onStep = vi.fn();

    const result = runParserAgent('search-1', [], onStep);
    expect(result.flights).toHaveLength(0);
    expect(onStep).toHaveBeenCalled();
  });

  it('defaults stops to 0 when not provided', () => {
    const raw = [makeRawFlight({ stops: undefined })];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].outboundStops).toBe(0);
  });

  it('calculates duration from departure/arrival when not provided', () => {
    const raw = [makeRawFlight({
      departure: '2025-06-15T08:00:00.000Z',
      arrival: '2025-06-15T12:00:00.000Z',
      duration_minutes: undefined,
    })];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].outboundDurationMin).toBe(240);
  });

  it('uppercases currency', () => {
    const raw = [makeRawFlight({ currency: 'usd' })];
    const onStep = vi.fn();

    const result = runParserAgent('search-1', raw, onStep);
    expect(result.flights[0].currency).toBe('USD');
  });
});
