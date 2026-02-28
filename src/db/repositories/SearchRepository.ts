import { v4 as uuid } from 'uuid';
import { getDatabase, saveDatabase } from '../database';
import type { Search } from '../../agents/types';

export async function createSearch(
  rawInput: string,
  overrides: Partial<Search> = {},
): Promise<Search> {
  const db = await getDatabase();
  const id = uuid();
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO searches (id, raw_input, parsed_origin, parsed_dest, date_from, date_to,
      flexibility_days, passengers, cabin_class, max_budget, currency, trip_type, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      rawInput,
      overrides.parsedOrigin ?? null,
      overrides.parsedDest ?? null,
      overrides.dateFrom ?? null,
      overrides.dateTo ?? null,
      overrides.flexibilityDays ?? 0,
      overrides.passengers ?? 1,
      overrides.cabinClass ?? 'economy',
      overrides.maxBudget ?? null,
      overrides.currency ?? 'BRL',
      overrides.tripType ?? 'roundtrip',
      'pending',
      now,
      now,
    ],
  );
  saveDatabase();

  return {
    id,
    rawInput,
    parsedOrigin: overrides.parsedOrigin,
    parsedDest: overrides.parsedDest,
    dateFrom: overrides.dateFrom,
    dateTo: overrides.dateTo,
    flexibilityDays: overrides.flexibilityDays ?? 0,
    passengers: overrides.passengers ?? 1,
    cabinClass: overrides.cabinClass ?? 'economy',
    maxBudget: overrides.maxBudget,
    currency: overrides.currency ?? 'BRL',
    tripType: overrides.tripType ?? 'roundtrip',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateSearchStatus(
  id: string,
  status: Search['status'],
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const completedAt = status === 'completed' || status === 'failed' ? now : null;

  db.run(
    `UPDATE searches SET status = ?, updated_at = ?, completed_at = COALESCE(?, completed_at) WHERE id = ?`,
    [status, now, completedAt, id],
  );
  saveDatabase();
}

export async function updateSearchParsed(
  id: string,
  data: Partial<Pick<Search, 'parsedOrigin' | 'parsedDest' | 'dateFrom' | 'dateTo' | 'flexibilityDays' | 'passengers' | 'cabinClass' | 'maxBudget' | 'tripType'>>,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const params: unknown[] = [now];

  if (data.parsedOrigin !== undefined) { sets.push('parsed_origin = ?'); params.push(data.parsedOrigin); }
  if (data.parsedDest !== undefined) { sets.push('parsed_dest = ?'); params.push(data.parsedDest); }
  if (data.dateFrom !== undefined) { sets.push('date_from = ?'); params.push(data.dateFrom); }
  if (data.dateTo !== undefined) { sets.push('date_to = ?'); params.push(data.dateTo); }
  if (data.flexibilityDays !== undefined) { sets.push('flexibility_days = ?'); params.push(data.flexibilityDays); }
  if (data.passengers !== undefined) { sets.push('passengers = ?'); params.push(data.passengers); }
  if (data.cabinClass !== undefined) { sets.push('cabin_class = ?'); params.push(data.cabinClass); }
  if (data.maxBudget !== undefined) { sets.push('max_budget = ?'); params.push(data.maxBudget); }
  if (data.tripType !== undefined) { sets.push('trip_type = ?'); params.push(data.tripType); }

  params.push(id);
  db.run(`UPDATE searches SET ${sets.join(', ')} WHERE id = ?`, params);
  saveDatabase();
}

export async function getSearch(id: string): Promise<Search | null> {
  const db = await getDatabase();
  const stmt = db.prepare('SELECT * FROM searches WHERE id = ?');
  stmt.bind([id]);

  if (!stmt.step()) { stmt.free(); return null; }
  const row = stmt.getAsObject();
  stmt.free();
  return mapSearch(row);
}

export async function getRecentSearches(limit = 20): Promise<Search[]> {
  const db = await getDatabase();
  const results = db.exec(
    `SELECT * FROM searches ORDER BY created_at DESC LIMIT ${limit}`,
  );
  if (!results.length) return [];

  const cols = results[0].columns;
  return results[0].values.map((vals) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));
    return mapSearch(obj);
  });
}

function mapSearch(row: Record<string, unknown>): Search {
  return {
    id: row['id'] as string,
    rawInput: row['raw_input'] as string,
    parsedOrigin: row['parsed_origin'] as string | undefined,
    parsedDest: row['parsed_dest'] as string | undefined,
    dateFrom: row['date_from'] as string | undefined,
    dateTo: row['date_to'] as string | undefined,
    flexibilityDays: (row['flexibility_days'] as number) ?? 0,
    passengers: (row['passengers'] as number) ?? 1,
    cabinClass: (row['cabin_class'] as string) ?? 'economy',
    maxBudget: row['max_budget'] as number | undefined,
    currency: (row['currency'] as string) ?? 'BRL',
    tripType: (row['trip_type'] as Search['tripType']) ?? 'roundtrip',
    status: (row['status'] as Search['status']) ?? 'pending',
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
    completedAt: row['completed_at'] as string | undefined,
  };
}
