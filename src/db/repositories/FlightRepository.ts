import { v4 as uuid } from 'uuid';
import { getDatabase, saveDatabase } from '../database';
import type { Flight } from '../../agents/types';

export async function insertFlights(flights: Flight[]): Promise<void> {
  const db = await getDatabase();
  db.run('BEGIN TRANSACTION');
  try {
    for (const f of flights) {
      db.run(
        `INSERT OR REPLACE INTO flights (
          id, search_id, source, source_url,
          outbound_airline, outbound_flight_no, outbound_departure, outbound_arrival,
          outbound_origin, outbound_dest, outbound_duration_min, outbound_stops,
          outbound_stop_cities, outbound_stop_durations,
          return_airline, return_flight_no, return_departure, return_arrival,
          return_origin, return_dest, return_duration_min, return_stops,
          return_stop_cities, return_stop_durations,
          price, currency, price_per_person, fare_class,
          baggage_included, refundable, booking_url,
          confidence, raw_data, rank_score, rank_reasoning,
          created_at, expires_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          f.id || uuid(),
          f.searchId,
          f.source,
          f.sourceUrl ?? null,
          f.outboundAirline ?? null,
          f.outboundFlightNo ?? null,
          f.outboundDeparture,
          f.outboundArrival,
          f.outboundOrigin,
          f.outboundDest,
          f.outboundDurationMin ?? null,
          f.outboundStops,
          f.outboundStopCities ? JSON.stringify(f.outboundStopCities) : null,
          f.outboundStopDurations ? JSON.stringify(f.outboundStopDurations) : null,
          f.returnAirline ?? null,
          f.returnFlightNo ?? null,
          f.returnDeparture ?? null,
          f.returnArrival ?? null,
          f.returnOrigin ?? null,
          f.returnDest ?? null,
          f.returnDurationMin ?? null,
          f.returnStops ?? 0,
          f.returnStopCities ? JSON.stringify(f.returnStopCities) : null,
          f.returnStopDurations ? JSON.stringify(f.returnStopDurations) : null,
          f.price,
          f.currency,
          f.pricePerPerson ?? null,
          f.fareClass ?? null,
          f.baggageIncluded ? JSON.stringify(f.baggageIncluded) : null,
          f.refundable ? 1 : 0,
          f.bookingUrl ?? null,
          f.confidence,
          f.rawData ?? null,
          f.rankScore ?? null,
          f.rankReasoning ?? null,
          f.createdAt,
          f.expiresAt ?? null,
        ],
      );
    }
    db.run('COMMIT');
    saveDatabase();
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

export async function getFlightsBySearch(
  searchId: string,
  orderBy: 'rank_score DESC' | 'price ASC' | 'outbound_duration_min ASC' = 'rank_score DESC',
): Promise<Flight[]> {
  const db = await getDatabase();
  const results = db.exec(
    `SELECT * FROM flights WHERE search_id = ? ORDER BY ${orderBy}`,
    [searchId],
  );
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map((vals) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));
    return mapFlight(obj);
  });
}

export async function updateFlightRank(
  id: string,
  rankScore: number,
  rankReasoning: string,
): Promise<void> {
  const db = await getDatabase();
  db.run('UPDATE flights SET rank_score = ?, rank_reasoning = ? WHERE id = ?', [
    rankScore,
    rankReasoning,
    id,
  ]);
  saveDatabase();
}

export async function getMinPriceByDate(
  searchId: string,
): Promise<Record<string, number>> {
  const db = await getDatabase();
  const results = db.exec(
    `SELECT date(outbound_departure) as dt, MIN(price) as min_price
     FROM flights WHERE search_id = ?
     GROUP BY date(outbound_departure)`,
    [searchId],
  );
  if (!results.length) return {};
  const map: Record<string, number> = {};
  for (const row of results[0].values) {
    map[row[0] as string] = row[1] as number;
  }
  return map;
}

function mapFlight(row: Record<string, unknown>): Flight {
  return {
    id: row['id'] as string,
    searchId: row['search_id'] as string,
    source: row['source'] as string,
    sourceUrl: row['source_url'] as string | undefined,
    outboundAirline: row['outbound_airline'] as string | undefined,
    outboundFlightNo: row['outbound_flight_no'] as string | undefined,
    outboundDeparture: row['outbound_departure'] as string,
    outboundArrival: row['outbound_arrival'] as string,
    outboundOrigin: row['outbound_origin'] as string,
    outboundDest: row['outbound_dest'] as string,
    outboundDurationMin: row['outbound_duration_min'] as number | undefined,
    outboundStops: (row['outbound_stops'] as number) ?? 0,
    outboundStopCities: row['outbound_stop_cities']
      ? JSON.parse(row['outbound_stop_cities'] as string)
      : undefined,
    outboundStopDurations: row['outbound_stop_durations']
      ? JSON.parse(row['outbound_stop_durations'] as string)
      : undefined,
    returnAirline: row['return_airline'] as string | undefined,
    returnFlightNo: row['return_flight_no'] as string | undefined,
    returnDeparture: row['return_departure'] as string | undefined,
    returnArrival: row['return_arrival'] as string | undefined,
    returnOrigin: row['return_origin'] as string | undefined,
    returnDest: row['return_dest'] as string | undefined,
    returnDurationMin: row['return_duration_min'] as number | undefined,
    returnStops: (row['return_stops'] as number) ?? 0,
    returnStopCities: row['return_stop_cities']
      ? JSON.parse(row['return_stop_cities'] as string)
      : undefined,
    returnStopDurations: row['return_stop_durations']
      ? JSON.parse(row['return_stop_durations'] as string)
      : undefined,
    price: row['price'] as number,
    currency: (row['currency'] as string) ?? 'BRL',
    pricePerPerson: row['price_per_person'] as number | undefined,
    fareClass: row['fare_class'] as string | undefined,
    baggageIncluded: row['baggage_included']
      ? JSON.parse(row['baggage_included'] as string)
      : undefined,
    refundable: !!(row['refundable'] as number),
    bookingUrl: row['booking_url'] as string | undefined,
    confidence: (row['confidence'] as number) ?? 0.5,
    rawData: row['raw_data'] as string | undefined,
    rankScore: row['rank_score'] as number | undefined,
    rankReasoning: row['rank_reasoning'] as string | undefined,
    createdAt: row['created_at'] as string,
    expiresAt: row['expires_at'] as string | undefined,
  };
}
