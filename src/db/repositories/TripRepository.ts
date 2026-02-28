import { v4 as uuid } from 'uuid';
import { getDatabase, saveDatabase } from '../database';
import type { Trip, TripItem } from '../../agents/types';

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapTrip(row: Record<string, unknown>): Trip {
  return {
    id: row['id'] as string,
    name: row['name'] as string,
    description: row['description'] as string | undefined,
    coverEmoji: (row['cover_emoji'] as string) ?? '✈️',
    startDate: row['start_date'] as string | undefined,
    endDate: row['end_date'] as string | undefined,
    totalBudget: row['total_budget'] as number | undefined,
    currency: (row['currency'] as string) ?? 'BRL',
    status: (row['status'] as Trip['status']) ?? 'planning',
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

function mapTripItem(row: Record<string, unknown>): TripItem {
  return {
    id: row['id'] as string,
    tripId: row['trip_id'] as string,
    itemType: row['item_type'] as TripItem['itemType'],
    title: row['title'] as string,
    dateStart: row['date_start'] as string | undefined,
    dateEnd: row['date_end'] as string | undefined,
    location: row['location'] as string | undefined,
    cost: (row['cost'] as number) ?? 0,
    currency: (row['currency'] as string) ?? 'BRL',
    notes: row['notes'] as string | undefined,
    bookingUrl: row['booking_url'] as string | undefined,
    flightId: row['flight_id'] as string | undefined,
    sortOrder: (row['sort_order'] as number) ?? 0,
    createdAt: row['created_at'] as string,
  };
}

function rowsToObjects(results: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map((vals) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Trip CRUD
// ---------------------------------------------------------------------------

export async function createTrip(
  name: string,
  description?: string,
  coverEmoji?: string,
  startDate?: string,
  endDate?: string,
  totalBudget?: number,
  currency?: string,
): Promise<string> {
  const db = await getDatabase();
  const id = uuid();
  db.run(
    `INSERT INTO trips (id, name, description, cover_emoji, start_date, end_date, total_budget, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      name,
      description ?? null,
      coverEmoji ?? '✈️',
      startDate ?? null,
      endDate ?? null,
      totalBudget ?? null,
      currency ?? 'BRL',
    ],
  );
  saveDatabase();
  return id;
}

export async function getTrips(): Promise<Trip[]> {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM trips ORDER BY updated_at DESC');
  return rowsToObjects(results).map(mapTrip);
}

export async function getTrip(id: string): Promise<Trip | null> {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM trips WHERE id = ?', [id]);
  const rows = rowsToObjects(results);
  return rows.length ? mapTrip(rows[0]) : null;
}

export async function updateTrip(
  id: string,
  fields: Partial<Omit<Trip, 'id' | 'createdAt'>>,
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name); }
  if (fields.description !== undefined) { sets.push('description = ?'); params.push(fields.description); }
  if (fields.coverEmoji !== undefined) { sets.push('cover_emoji = ?'); params.push(fields.coverEmoji); }
  if (fields.startDate !== undefined) { sets.push('start_date = ?'); params.push(fields.startDate); }
  if (fields.endDate !== undefined) { sets.push('end_date = ?'); params.push(fields.endDate); }
  if (fields.totalBudget !== undefined) { sets.push('total_budget = ?'); params.push(fields.totalBudget); }
  if (fields.currency !== undefined) { sets.push('currency = ?'); params.push(fields.currency); }
  if (fields.status !== undefined) { sets.push('status = ?'); params.push(fields.status); }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  db.run(`UPDATE trips SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  saveDatabase();
}

export async function deleteTrip(id: string): Promise<void> {
  const db = await getDatabase();
  db.run('DELETE FROM trip_items WHERE trip_id = ?', [id]);
  db.run('DELETE FROM trips WHERE id = ?', [id]);
  saveDatabase();
}

// ---------------------------------------------------------------------------
// Trip Item CRUD
// ---------------------------------------------------------------------------

export async function addTripItem(
  tripId: string,
  item: Omit<TripItem, 'id' | 'tripId' | 'createdAt'>,
): Promise<string> {
  const db = await getDatabase();
  const id = uuid();
  db.run(
    `INSERT INTO trip_items (id, trip_id, item_type, title, date_start, date_end, location, cost, currency, notes, booking_url, flight_id, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      tripId,
      item.itemType,
      item.title,
      item.dateStart ?? null,
      item.dateEnd ?? null,
      item.location ?? null,
      item.cost ?? 0,
      item.currency ?? 'BRL',
      item.notes ?? null,
      item.bookingUrl ?? null,
      item.flightId ?? null,
      item.sortOrder ?? 0,
    ],
  );
  // touch trip updated_at
  db.run("UPDATE trips SET updated_at = datetime('now') WHERE id = ?", [tripId]);
  saveDatabase();
  return id;
}

export async function getTripItems(tripId: string): Promise<TripItem[]> {
  const db = await getDatabase();
  const results = db.exec(
    'SELECT * FROM trip_items WHERE trip_id = ? ORDER BY sort_order, date_start',
    [tripId],
  );
  return rowsToObjects(results).map(mapTripItem);
}

export async function updateTripItem(
  id: string,
  fields: Partial<Omit<TripItem, 'id' | 'tripId' | 'createdAt'>>,
): Promise<void> {
  const db = await getDatabase();
  const sets: string[] = [];
  const params: unknown[] = [];

  if (fields.itemType !== undefined) { sets.push('item_type = ?'); params.push(fields.itemType); }
  if (fields.title !== undefined) { sets.push('title = ?'); params.push(fields.title); }
  if (fields.dateStart !== undefined) { sets.push('date_start = ?'); params.push(fields.dateStart); }
  if (fields.dateEnd !== undefined) { sets.push('date_end = ?'); params.push(fields.dateEnd); }
  if (fields.location !== undefined) { sets.push('location = ?'); params.push(fields.location); }
  if (fields.cost !== undefined) { sets.push('cost = ?'); params.push(fields.cost); }
  if (fields.currency !== undefined) { sets.push('currency = ?'); params.push(fields.currency); }
  if (fields.notes !== undefined) { sets.push('notes = ?'); params.push(fields.notes); }
  if (fields.bookingUrl !== undefined) { sets.push('booking_url = ?'); params.push(fields.bookingUrl); }
  if (fields.flightId !== undefined) { sets.push('flight_id = ?'); params.push(fields.flightId); }
  if (fields.sortOrder !== undefined) { sets.push('sort_order = ?'); params.push(fields.sortOrder); }

  if (sets.length === 0) return;

  db.run(`UPDATE trip_items SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  saveDatabase();
}

export async function deleteTripItem(id: string): Promise<void> {
  const db = await getDatabase();
  // Get tripId to touch updated_at
  const results = db.exec('SELECT trip_id FROM trip_items WHERE id = ?', [id]);
  db.run('DELETE FROM trip_items WHERE id = ?', [id]);
  if (results.length && results[0].values.length) {
    const tripId = results[0].values[0][0] as string;
    db.run("UPDATE trips SET updated_at = datetime('now') WHERE id = ?", [tripId]);
  }
  saveDatabase();
}

export async function getTripTotalCost(tripId: string): Promise<number> {
  const db = await getDatabase();
  const results = db.exec(
    'SELECT COALESCE(SUM(cost), 0) as total FROM trip_items WHERE trip_id = ?',
    [tripId],
  );
  if (!results.length || !results[0].values.length) return 0;
  return results[0].values[0][0] as number;
}

// ---------------------------------------------------------------------------
// Integration: add a flight from flight search results to a trip
// ---------------------------------------------------------------------------

export async function addFlightToTrip(tripId: string, flightId: string): Promise<string> {
  const db = await getDatabase();
  const results = db.exec('SELECT * FROM flights WHERE id = ?', [flightId]);
  if (!results.length || !results[0].values.length) {
    throw new Error(`Flight ${flightId} not found`);
  }

  const cols = results[0].columns;
  const vals = results[0].values[0];
  const flight: Record<string, unknown> = {};
  cols.forEach((c, i) => (flight[c] = vals[i]));

  const airline = (flight['outbound_airline'] as string) ?? '';
  const flightNo = (flight['outbound_flight_no'] as string) ?? '';
  const origin = (flight['outbound_origin'] as string) ?? '';
  const dest = (flight['outbound_dest'] as string) ?? '';
  const title = `${airline} ${flightNo} ${origin} → ${dest}`.trim();

  const itemId = await addTripItem(tripId, {
    itemType: 'flight',
    title,
    dateStart: flight['outbound_departure'] as string | undefined,
    dateEnd: flight['return_departure'] as string | undefined,
    location: `${origin} → ${dest}`,
    cost: (flight['price'] as number) ?? 0,
    currency: (flight['currency'] as string) ?? 'BRL',
    notes: flight['rank_reasoning'] as string | undefined,
    bookingUrl: flight['booking_url'] as string | undefined,
    flightId,
    sortOrder: 0,
  });

  return itemId;
}

// ---------------------------------------------------------------------------
// Reorder items
// ---------------------------------------------------------------------------

export async function reorderTripItems(tripId: string, itemIds: string[]): Promise<void> {
  const db = await getDatabase();
  db.run('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < itemIds.length; i++) {
      db.run('UPDATE trip_items SET sort_order = ? WHERE id = ? AND trip_id = ?', [i, itemIds[i], tripId]);
    }
    db.run("UPDATE trips SET updated_at = datetime('now') WHERE id = ?", [tripId]);
    db.run('COMMIT');
    saveDatabase();
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Get item count for a trip
// ---------------------------------------------------------------------------

export async function getTripItemCount(tripId: string): Promise<number> {
  const db = await getDatabase();
  const results = db.exec(
    'SELECT COUNT(*) as cnt FROM trip_items WHERE trip_id = ?',
    [tripId],
  );
  if (!results.length || !results[0].values.length) return 0;
  return results[0].values[0][0] as number;
}
