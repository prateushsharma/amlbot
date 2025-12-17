
import Database from "better-sqlite3";

export const db = new Database("aml.db");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_user_id INTEGER UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracked_addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  chain TEXT,
  address TEXT,
  label TEXT,
  min_amount REAL DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  last_seen_cursor TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tracked_address_id INTEGER,
  chain TEXT,
  tx_hash_or_sig TEXT,
  timestamp DATETIME,
  direction TEXT,
  amount REAL,
  asset TEXT,
  sent_to_telegram BOOLEAN DEFAULT 0
);
`);
