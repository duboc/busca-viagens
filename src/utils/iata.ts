const CITY_AIRPORT_MAP: Record<string, string[]> = {
  'são paulo': ['GRU', 'CGH', 'VCP'],
  'rio de janeiro': ['GIG', 'SDU'],
  'tokyo': ['NRT', 'HND'],
  'new york': ['JFK', 'EWR', 'LGA'],
  'london': ['LHR', 'LGW', 'STN', 'LTN'],
  'paris': ['CDG', 'ORY'],
  'los angeles': ['LAX'],
  'miami': ['MIA', 'FLL'],
  'chicago': ['ORD', 'MDW'],
  'buenos aires': ['EZE', 'AEP'],
  'santiago': ['SCL'],
  'lima': ['LIM'],
  'bogota': ['BOG'],
  'mexico city': ['MEX'],
  'roma': ['FCO', 'CIA'],
  'madrid': ['MAD'],
  'barcelona': ['BCN'],
  'lisboa': ['LIS'],
  'amsterdam': ['AMS'],
  'frankfurt': ['FRA'],
  'dubai': ['DXB', 'DWC'],
  'singapore': ['SIN'],
  'hong kong': ['HKG'],
  'seoul': ['ICN', 'GMP'],
  'bangkok': ['BKK', 'DMK'],
  'sydney': ['SYD'],
  'toronto': ['YYZ', 'YTZ'],
  'brasilia': ['BSB'],
  'belo horizonte': ['CNF', 'PLU'],
  'salvador': ['SSA'],
  'recife': ['REC'],
  'fortaleza': ['FOR'],
  'curitiba': ['CWB'],
  'porto alegre': ['POA'],
  'florianopolis': ['FLN'],
  'manaus': ['MAO'],
  'belem': ['BEL'],
};

export function getAirportsForCity(city: string): string[] {
  const normalized = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, codes] of Object.entries(CITY_AIRPORT_MAP)) {
    const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalizedKey.includes(normalized) || normalized.includes(normalizedKey)) {
      return codes;
    }
  }
  return [];
}

export function isPrimaryAirport(code: string): boolean {
  for (const codes of Object.values(CITY_AIRPORT_MAP)) {
    if (codes[0] === code) return true;
  }
  return false;
}
