import type { Database } from 'sql.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS airports (
  iata_code    TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  country      TEXT NOT NULL,
  latitude     REAL,
  longitude    REAL,
  timezone     TEXT
);

CREATE TABLE IF NOT EXISTS airlines (
  iata_code    TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  logo_url     TEXT,
  alliance     TEXT
);

CREATE TABLE IF NOT EXISTS searches (
  id              TEXT PRIMARY KEY,
  raw_input       TEXT NOT NULL,
  parsed_origin   TEXT,
  parsed_dest     TEXT,
  date_from       TEXT,
  date_to         TEXT,
  flexibility_days INTEGER DEFAULT 0,
  passengers      INTEGER DEFAULT 1,
  cabin_class     TEXT DEFAULT 'economy',
  max_budget      REAL,
  currency        TEXT DEFAULT 'BRL',
  trip_type       TEXT DEFAULT 'roundtrip',
  status          TEXT DEFAULT 'pending',
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  completed_at    TEXT
);

CREATE TABLE IF NOT EXISTS search_plans (
  id              TEXT PRIMARY KEY,
  search_id       TEXT NOT NULL REFERENCES searches(id),
  plan_json       TEXT NOT NULL,
  strategy_count  INTEGER,
  reasoning       TEXT,
  created_at      TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS flights (
  id              TEXT PRIMARY KEY,
  search_id       TEXT NOT NULL REFERENCES searches(id),
  source          TEXT NOT NULL,
  source_url      TEXT,
  outbound_airline     TEXT,
  outbound_flight_no   TEXT,
  outbound_departure   TEXT NOT NULL,
  outbound_arrival     TEXT NOT NULL,
  outbound_origin      TEXT NOT NULL,
  outbound_dest        TEXT NOT NULL,
  outbound_duration_min INTEGER,
  outbound_stops       INTEGER DEFAULT 0,
  outbound_stop_cities TEXT,
  outbound_stop_durations TEXT,
  return_airline       TEXT,
  return_flight_no     TEXT,
  return_departure     TEXT,
  return_arrival       TEXT,
  return_origin        TEXT,
  return_dest          TEXT,
  return_duration_min  INTEGER,
  return_stops         INTEGER DEFAULT 0,
  return_stop_cities   TEXT,
  return_stop_durations TEXT,
  price            REAL NOT NULL,
  currency         TEXT DEFAULT 'BRL',
  price_per_person REAL,
  fare_class       TEXT,
  baggage_included TEXT,
  refundable       INTEGER DEFAULT 0,
  booking_url      TEXT,
  confidence       REAL,
  raw_data         TEXT,
  rank_score       REAL,
  rank_reasoning   TEXT,
  created_at       TEXT DEFAULT (datetime('now')),
  expires_at       TEXT
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id           TEXT PRIMARY KEY,
  search_id    TEXT REFERENCES searches(id),
  agent_name   TEXT NOT NULL,
  step         INTEGER,
  action       TEXT NOT NULL,
  input_data   TEXT,
  output_data  TEXT,
  tokens_used  INTEGER,
  latency_ms   INTEGER,
  status       TEXT DEFAULT 'success',
  error_msg    TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS price_alerts (
  id           TEXT PRIMARY KEY,
  search_id    TEXT NOT NULL REFERENCES searches(id),
  target_price REAL NOT NULL,
  currency     TEXT DEFAULT 'BRL',
  is_active    INTEGER DEFAULT 1,
  last_checked TEXT,
  triggered_at TEXT,
  created_at   TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_flights_search ON flights(search_id);
CREATE INDEX IF NOT EXISTS idx_flights_price ON flights(price);
CREATE INDEX IF NOT EXISTS idx_flights_outbound ON flights(outbound_departure);
CREATE INDEX IF NOT EXISTS idx_flights_rank ON flights(rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_search ON agent_logs(search_id, agent_name);
CREATE INDEX IF NOT EXISTS idx_searches_status ON searches(status);
CREATE INDEX IF NOT EXISTS idx_airports_city ON airports(city);
`;

export function runMigrations(db: Database): void {
  const statements = SCHEMA.split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  db.run('BEGIN TRANSACTION');
  try {
    for (const stmt of statements) {
      db.run(stmt + ';');
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  }
}
