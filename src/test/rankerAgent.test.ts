import { describe, it, expect, vi } from 'vitest';
import { runRankerAgent } from '../agents/RankerAgent';
import type { Flight, AgentStep } from '../agents/types';

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: 'flight-' + Math.random().toString(36).substring(7),
    searchId: 'search-1',
    source: 'gemini_search',
    outboundAirline: 'LATAM',
    outboundFlightNo: 'LA3456',
    outboundDeparture: '2025-06-15T10:00:00.000Z',
    outboundArrival: '2025-06-15T14:00:00.000Z',
    outboundOrigin: 'GRU',
    outboundDest: 'GIG',
    outboundDurationMin: 240,
    outboundStops: 0,
    price: 500,
    currency: 'BRL',
    refundable: false,
    confidence: 0.8,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('runRankerAgent - local scoring (no API key)', () => {
  it('handles empty flights array', async () => {
    const onStep = vi.fn();
    const result = await runRankerAgent('', [], onStep);

    expect(result.rankedFlights).toHaveLength(0);
    expect(result.tokensUsed).toBe(0);
    expect(result.latencyMs).toBe(0);
    expect(onStep).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: 'ranker',
        status: 'completed',
      }),
    );
  });

  it('ranks a single flight', async () => {
    const flights = [makeFlight()];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);

    expect(result.rankedFlights).toHaveLength(1);
    expect(result.rankedFlights[0].rankScore).toBeDefined();
    expect(result.tokensUsed).toBe(0);
  });

  it('cheapest flight gets best_price badge', async () => {
    const flights = [
      makeFlight({ id: 'expensive', price: 1000 }),
      makeFlight({ id: 'cheap', price: 200 }),
      makeFlight({ id: 'mid', price: 600 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const cheap = result.rankedFlights.find(f => f.id === 'cheap');

    expect(cheap!.badges).toContain('best_price');
  });

  it('shortest flight gets shortest badge', async () => {
    const flights = [
      makeFlight({ id: 'long', outboundDurationMin: 600, price: 200 }),
      makeFlight({ id: 'short', outboundDurationMin: 60, price: 800 }),
      makeFlight({ id: 'mid', outboundDurationMin: 300, price: 500 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const short = result.rankedFlights.find(f => f.id === 'short');

    expect(short!.badges).toContain('shortest');
  });

  it('assigns recommended badge', async () => {
    const flights = [
      makeFlight({ id: 'a', price: 500, outboundDurationMin: 300 }),
      makeFlight({ id: 'b', price: 200, outboundDurationMin: 600 }),
      makeFlight({ id: 'c', price: 800, outboundDurationMin: 60 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const hasBadge = result.rankedFlights.some(f => f.badges?.includes('recommended'));

    expect(hasBadge).toBe(true);
  });

  it('price scoring: cheapest flight scores higher on price', async () => {
    const flights = [
      makeFlight({ id: 'expensive', price: 2000, outboundDurationMin: 240, outboundStops: 0 }),
      makeFlight({ id: 'cheap', price: 200, outboundDurationMin: 240, outboundStops: 0 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const cheap = result.rankedFlights.find(f => f.id === 'cheap');
    const expensive = result.rankedFlights.find(f => f.id === 'expensive');

    expect(cheap!.rankBreakdown!.priceScore).toBeGreaterThan(expensive!.rankBreakdown!.priceScore);
  });

  it('duration scoring: shortest flight scores higher on duration', async () => {
    const flights = [
      makeFlight({ id: 'long', outboundDurationMin: 600, price: 500 }),
      makeFlight({ id: 'short', outboundDurationMin: 60, price: 500 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const short = result.rankedFlights.find(f => f.id === 'short');
    const long = result.rankedFlights.find(f => f.id === 'long');

    expect(short!.rankBreakdown!.durationScore).toBeGreaterThan(long!.rankBreakdown!.durationScore);
  });

  it('stops scoring: direct > 1 stop > 2 stops', async () => {
    const flights = [
      makeFlight({ id: 'direct', outboundStops: 0, price: 500 }),
      makeFlight({ id: 'one-stop', outboundStops: 1, price: 500 }),
      makeFlight({ id: 'two-stops', outboundStops: 2, price: 500 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const direct = result.rankedFlights.find(f => f.id === 'direct');
    const oneStop = result.rankedFlights.find(f => f.id === 'one-stop');
    const twoStops = result.rankedFlights.find(f => f.id === 'two-stops');

    expect(direct!.rankBreakdown!.stopsScore).toBe(1);
    expect(oneStop!.rankBreakdown!.stopsScore).toBe(0.6);
    expect(twoStops!.rankBreakdown!.stopsScore).toBe(0.2);
  });

  it('ranks flights in descending order of score', async () => {
    const flights = [
      makeFlight({ id: 'worst', price: 2000, outboundDurationMin: 600, outboundStops: 2 }),
      makeFlight({ id: 'best', price: 200, outboundDurationMin: 60, outboundStops: 0 }),
      makeFlight({ id: 'mid', price: 800, outboundDurationMin: 300, outboundStops: 1 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const scores = result.rankedFlights.map(f => f.rankScore!);

    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
    }
  });

  it('uses local scoring when no API key provided', async () => {
    const flights = [
      makeFlight({ id: 'a', price: 500 }),
      makeFlight({ id: 'b', price: 300 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);

    expect(result.tokensUsed).toBe(0);
    expect(result.rankedFlights).toHaveLength(2);
    expect(result.rankedFlights.every(f => f.rankScore !== undefined)).toBe(true);
  });

  it('uses local scoring when 3 or fewer flights even with API key', async () => {
    const flights = [
      makeFlight({ id: 'a', price: 500 }),
      makeFlight({ id: 'b', price: 300 }),
      makeFlight({ id: 'c', price: 700 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('fake-api-key-for-test', flights, onStep);

    expect(result.tokensUsed).toBe(0);
    expect(result.rankedFlights).toHaveLength(3);
  });

  it('calls onStep callback for local ranking', async () => {
    const flights = [makeFlight()];
    const onStep = vi.fn();

    await runRankerAgent('', flights, onStep);

    expect(onStep).toHaveBeenCalled();
    const lastCall = onStep.mock.calls[onStep.mock.calls.length - 1][0];
    expect(lastCall.agent).toBe('ranker');
    expect(lastCall.status).toBe('completed');
  });

  it('returns latencyMs', async () => {
    const flights = [makeFlight()];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('handles flights without duration gracefully', async () => {
    const flights = [
      makeFlight({ id: 'with-dur', outboundDurationMin: 240 }),
      makeFlight({ id: 'without-dur', outboundDurationMin: undefined }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    expect(result.rankedFlights).toHaveLength(2);

    const withoutDur = result.rankedFlights.find(f => f.id === 'without-dur');
    expect(withoutDur!.rankBreakdown!.durationScore).toBe(0.5);
  });

  it('time scoring: daytime departures score higher', async () => {
    const flights = [
      makeFlight({ id: 'day', outboundDeparture: '2025-06-15T10:00:00.000Z', price: 500 }),
      makeFlight({ id: 'night', outboundDeparture: '2025-06-15T03:00:00.000Z', price: 500 }),
    ];
    const onStep = vi.fn();

    const result = await runRankerAgent('', flights, onStep);
    const day = result.rankedFlights.find(f => f.id === 'day');
    const night = result.rankedFlights.find(f => f.id === 'night');

    expect(day!.rankBreakdown!.timeScore).toBeGreaterThanOrEqual(night!.rankBreakdown!.timeScore);
  });
});
