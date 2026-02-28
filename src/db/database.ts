import initSqlJs, { type Database } from 'sql.js';
import { runMigrations } from './migrations';
import { seedDatabase } from './seed/seedDatabase';

const DB_KEY = 'skyagent_db';
let db: Database | null = null;
let initPromise: Promise<Database> | null = null;

export async function getDatabase(): Promise<Database> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = initializeDatabase();
  db = await initPromise;
  return db;
}

async function initializeDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      `https://sql.js.org/dist/${file}`,
  });

  const saved = localStorage.getItem(DB_KEY);
  if (saved) {
    try {
      const buf = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
      const instance = new SQL.Database(buf);
      return instance;
    } catch {
      // corrupted — start fresh
    }
  }

  const instance = new SQL.Database();
  runMigrations(instance);
  seedDatabase(instance);
  saveDatabase(instance);
  return instance;
}

export function saveDatabase(instance?: Database): void {
  const target = instance ?? db;
  if (!target) return;
  const data = target.export();
  const binary = String.fromCharCode(...data);
  localStorage.setItem(DB_KEY, btoa(binary));
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase(db);
    db.close();
    db = null;
    initPromise = null;
  }
}
