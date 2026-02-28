import { v4 as uuid } from 'uuid';
import { getDatabase, saveDatabase } from '../database';
import type { PriceAlert } from '../../agents/types';

export async function createAlert(
  searchId: string,
  targetPrice: number,
  currency = 'BRL',
): Promise<PriceAlert> {
  const db = await getDatabase();
  const id = uuid();
  const now = new Date().toISOString();
  db.run(
    `INSERT INTO price_alerts (id, search_id, target_price, currency, is_active, created_at)
     VALUES (?,?,?,?,1,?)`,
    [id, searchId, targetPrice, currency, now],
  );
  saveDatabase();
  return {
    id,
    searchId,
    targetPrice,
    currency,
    isActive: true,
    createdAt: now,
  };
}

export async function getActiveAlerts(): Promise<PriceAlert[]> {
  const db = await getDatabase();
  const results = db.exec(
    'SELECT * FROM price_alerts WHERE is_active = 1 ORDER BY created_at DESC',
  );
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map((vals) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));
    return mapAlert(obj);
  });
}

export async function getAllAlerts(): Promise<PriceAlert[]> {
  const db = await getDatabase();
  const results = db.exec(
    'SELECT * FROM price_alerts ORDER BY created_at DESC',
  );
  if (!results.length) return [];
  const cols = results[0].columns;
  return results[0].values.map((vals) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => (obj[c] = vals[i]));
    return mapAlert(obj);
  });
}

export async function deactivateAlert(id: string): Promise<void> {
  const db = await getDatabase();
  db.run('UPDATE price_alerts SET is_active = 0 WHERE id = ?', [id]);
  saveDatabase();
}

export async function triggerAlert(id: string): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  db.run(
    'UPDATE price_alerts SET triggered_at = ?, is_active = 0 WHERE id = ?',
    [now, id],
  );
  saveDatabase();
}

function mapAlert(row: Record<string, unknown>): PriceAlert {
  return {
    id: row['id'] as string,
    searchId: row['search_id'] as string,
    targetPrice: row['target_price'] as number,
    currency: (row['currency'] as string) ?? 'BRL',
    isActive: !!(row['is_active'] as number),
    lastChecked: row['last_checked'] as string | undefined,
    triggeredAt: row['triggered_at'] as string | undefined,
    createdAt: row['created_at'] as string,
  };
}
