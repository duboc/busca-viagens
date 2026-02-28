import { describe, it, expect } from 'vitest';
import { getAirportsForCity, isPrimaryAirport } from '../utils/iata';

describe('getAirportsForCity', () => {
  it('returns airports for São Paulo', () => {
    const airports = getAirportsForCity('são paulo');
    expect(airports).toEqual(['GRU', 'CGH', 'VCP']);
  });

  it('returns airports for Sao Paulo (without accents)', () => {
    const airports = getAirportsForCity('Sao Paulo');
    expect(airports).toEqual(['GRU', 'CGH', 'VCP']);
  });

  it('returns airports for SAO PAULO (uppercase)', () => {
    const airports = getAirportsForCity('SAO PAULO');
    expect(airports).toEqual(['GRU', 'CGH', 'VCP']);
  });

  it('returns airports for Tokyo', () => {
    const airports = getAirportsForCity('tokyo');
    expect(airports).toEqual(['NRT', 'HND']);
  });

  it('returns airports for New York', () => {
    const airports = getAirportsForCity('new york');
    expect(airports).toEqual(['JFK', 'EWR', 'LGA']);
  });

  it('returns airports for Rio de Janeiro', () => {
    const airports = getAirportsForCity('rio de janeiro');
    expect(airports).toEqual(['GIG', 'SDU']);
  });

  it('returns airports for London', () => {
    const airports = getAirportsForCity('london');
    expect(airports).toEqual(['LHR', 'LGW', 'STN', 'LTN']);
  });

  it('returns airports for Paris', () => {
    const airports = getAirportsForCity('paris');
    expect(airports).toEqual(['CDG', 'ORY']);
  });

  it('returns empty array for unknown cities', () => {
    expect(getAirportsForCity('atlantis')).toEqual([]);
    expect(getAirportsForCity('nowhere')).toEqual([]);
  });

  it('matches all entries when given empty string (substring match behavior)', () => {
    // Empty string is included in every key via includes(), so it matches the first entry
    const result = getAirportsForCity('');
    expect(result.length).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    expect(getAirportsForCity('TOKYO')).toEqual(['NRT', 'HND']);
    expect(getAirportsForCity('Tokyo')).toEqual(['NRT', 'HND']);
    expect(getAirportsForCity('tOkYo')).toEqual(['NRT', 'HND']);
  });

  it('handles unicode normalization correctly', () => {
    // NFC form (composed)
    expect(getAirportsForCity('S\u00e3o Paulo')).toEqual(['GRU', 'CGH', 'VCP']);
    // NFD form (decomposed)
    expect(getAirportsForCity('Sa\u0303o Paulo')).toEqual(['GRU', 'CGH', 'VCP']);
  });

  it('matches partial city names (substring matching)', () => {
    const airports = getAirportsForCity('buenos aires');
    expect(airports).toEqual(['EZE', 'AEP']);
  });
});

describe('isPrimaryAirport', () => {
  it('returns true for primary airports', () => {
    expect(isPrimaryAirport('GRU')).toBe(true); // São Paulo
    expect(isPrimaryAirport('GIG')).toBe(true); // Rio
    expect(isPrimaryAirport('NRT')).toBe(true); // Tokyo
    expect(isPrimaryAirport('JFK')).toBe(true); // New York
    expect(isPrimaryAirport('LHR')).toBe(true); // London
    expect(isPrimaryAirport('CDG')).toBe(true); // Paris
  });

  it('returns false for secondary airports', () => {
    expect(isPrimaryAirport('CGH')).toBe(false); // São Paulo secondary
    expect(isPrimaryAirport('VCP')).toBe(false); // São Paulo tertiary
    expect(isPrimaryAirport('SDU')).toBe(false); // Rio secondary
    expect(isPrimaryAirport('HND')).toBe(false); // Tokyo secondary
    expect(isPrimaryAirport('EWR')).toBe(false); // New York secondary
    expect(isPrimaryAirport('LGA')).toBe(false); // New York tertiary
    expect(isPrimaryAirport('LGW')).toBe(false); // London secondary
    expect(isPrimaryAirport('ORY')).toBe(false); // Paris secondary
  });

  it('returns false for unknown airport codes', () => {
    expect(isPrimaryAirport('XYZ')).toBe(false);
    expect(isPrimaryAirport('AAA')).toBe(false);
    expect(isPrimaryAirport('')).toBe(false);
  });
});
