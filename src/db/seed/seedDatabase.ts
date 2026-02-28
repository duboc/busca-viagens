import type { Database } from 'sql.js';
import airportsData from './airports.json';
import airlinesData from './airlines.json';

export function seedDatabase(db: Database): void {
  const count = db.exec('SELECT COUNT(*) FROM airports');
  if (count[0]?.values[0]?.[0] as number > 0) return;

  db.run('BEGIN TRANSACTION');
  try {
    for (const a of airportsData) {
      db.run(
        'INSERT OR IGNORE INTO airports (iata_code, name, city, country, latitude, longitude, timezone) VALUES (?,?,?,?,?,?,?)',
        [a.iata_code, a.name, a.city, a.country, a.latitude, a.longitude, a.timezone],
      );
    }
    for (const a of airlinesData) {
      db.run(
        'INSERT OR IGNORE INTO airlines (iata_code, name, logo_url, alliance) VALUES (?,?,?,?)',
        [a.iata_code, a.name, a.logo_url, a.alliance],
      );
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}
