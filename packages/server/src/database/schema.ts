import { Database } from 'bun:sqlite';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  google_sub TEXT UNIQUE,
  avatar_url TEXT,
  chips INTEGER DEFAULT 0,
  total_loaned INTEGER DEFAULT 0,
  total_pnl INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  players TEXT NOT NULL,
  hands TEXT NOT NULL,
  winners TEXT NOT NULL,
  payouts TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_history_room_id ON game_history (room_id);
`;

/** Run CREATE TABLE IF NOT EXISTS for all tables */
export function initSchema(db: Database): void {
  db.exec(SCHEMA_SQL);
  // Migrations for existing DBs
  const migrations = [
    'ALTER TABLE players ADD COLUMN google_sub TEXT UNIQUE',
    'ALTER TABLE players ADD COLUMN avatar_url TEXT',
    'ALTER TABLE players ADD COLUMN total_loaned INTEGER DEFAULT 0',
    'ALTER TABLE players ADD COLUMN total_pnl INTEGER DEFAULT 0',
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }
}
