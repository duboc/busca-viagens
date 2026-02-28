import { v4 as uuid } from 'uuid';
import { getDatabase, saveDatabase } from '../database';
import type { PriceHistoryEntry } from '../../agents/types';

export async function recordPrice(
  origin: string,
  destination: string,
  departureDate: string,
  price: number,
  currency = 'BRL',
  source?: string,
): Promise<void> {
  const db = await getDatabase();
  db.run(
    `INSERT INTO price_history (id, origin, destination, departure_date, price, currency, source)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [uuid(), origin, destination, departureDate, price, currency, source ?? null],
  );
  saveDatabase();
}

export async function getPriceHistory(
  origin: string,
  destination: string,
  dateFrom?: string,
  dateTo?: string,
): Promise<PriceHistoryEntry[]> {
  const db = await getDatabase();
  let query = `SELECT id, origin, destination, departure_date, price, currency, source, recorded_at
               FROM price_history
               WHERE origin = ? AND destination = ?`;
  const params: (string | number)[] = [origin, destination];

  if (dateFrom) {
    query += ` AND departure_date >= ?`;
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ` AND departure_date <= ?`;
    params.push(dateTo);
  }

  query += ` ORDER BY departure_date ASC, recorded_at ASC`;

  const results = db.exec(query, params);
  if (!results.length) return [];

  return results[0].values.map((row) => ({
    id: row[0] as string,
    origin: row[1] as string,
    destination: row[2] as string,
    departureDate: row[3] as string,
    price: row[4] as number,
    currency: (row[5] as string) ?? 'BRL',
    source: row[6] as string | undefined,
    recordedAt: row[7] as string,
  }));
}

export async function getAveragePriceByDayOfWeek(
  origin: string,
  destination: string,
): Promise<{ dayOfWeek: number; avgPrice: number }[]> {
  const db = await getDatabase();
  // SQLite strftime('%w') returns 0=Sunday..6=Saturday
  const results = db.exec(
    `SELECT CAST(strftime('%w', departure_date) AS INTEGER) as dow, AVG(price) as avg_price
     FROM price_history
     WHERE origin = ? AND destination = ?
     GROUP BY dow
     ORDER BY dow`,
    [origin, destination],
  );
  if (!results.length) return [];

  return results[0].values.map((row) => ({
    dayOfWeek: row[0] as number,
    avgPrice: row[1] as number,
  }));
}

export async function getMonthlyPriceMap(
  origin: string,
  destination: string,
  year: number,
  month: number,
): Promise<Record<number, number>> {
  const db = await getDatabase();
  const monthStr = String(month).padStart(2, '0');
  const results = db.exec(
    `SELECT CAST(strftime('%d', departure_date) AS INTEGER) as day, MIN(price) as min_price
     FROM price_history
     WHERE origin = ? AND destination = ?
       AND strftime('%Y', departure_date) = ?
       AND strftime('%m', departure_date) = ?
     GROUP BY day
     ORDER BY day`,
    [origin, destination, String(year), monthStr],
  );
  if (!results.length) return {};

  const map: Record<number, number> = {};
  for (const row of results[0].values) {
    map[row[0] as number] = row[1] as number;
  }
  return map;
}

export async function recordPricesFromFlights(): Promise<number> {
  const db = await getDatabase();

  // Check how many we already have to avoid duplicates
  const existing = db.exec(`SELECT COUNT(*) FROM price_history`);
  const existingCount = existing.length > 0 ? (existing[0].values[0][0] as number) : 0;

  // Get all flights that haven't been recorded yet
  // We use a subquery to skip routes/dates that already have price_history entries
  const results = db.exec(
    `SELECT outbound_origin, outbound_dest, date(outbound_departure) as dep_date,
            price, currency, source, created_at
     FROM flights
     WHERE outbound_origin IS NOT NULL AND outbound_dest IS NOT NULL`,
  );

  if (!results.length || !results[0].values.length) return 0;

  let count = 0;
  db.run('BEGIN TRANSACTION');
  try {
    for (const row of results[0].values) {
      const origin = row[0] as string;
      const destination = row[1] as string;
      const departureDate = row[2] as string;
      const price = row[3] as number;
      const currency = (row[4] as string) ?? 'BRL';
      const source = row[5] as string;

      // Check for duplicates: same route, date, and price
      const dup = db.exec(
        `SELECT COUNT(*) FROM price_history
         WHERE origin = ? AND destination = ? AND departure_date = ? AND price = ?`,
        [origin, destination, departureDate, price],
      );
      const hasDup = dup.length > 0 && (dup[0].values[0][0] as number) > 0;

      if (!hasDup) {
        db.run(
          `INSERT INTO price_history (id, origin, destination, departure_date, price, currency, source)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [uuid(), origin, destination, departureDate, price, currency, source],
        );
        count++;
      }
    }
    db.run('COMMIT');
    if (count > 0) saveDatabase();
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }

  return count;
}

export async function getAveragePriceByMonth(
  origin: string,
  destination: string,
): Promise<{ month: number; avgPrice: number }[]> {
  const db = await getDatabase();
  const results = db.exec(
    `SELECT CAST(strftime('%m', departure_date) AS INTEGER) as m, AVG(price) as avg_price
     FROM price_history
     WHERE origin = ? AND destination = ?
     GROUP BY m
     ORDER BY m`,
    [origin, destination],
  );
  if (!results.length) return [];

  return results[0].values.map((row) => ({
    month: row[0] as number,
    avgPrice: row[1] as number,
  }));
}
