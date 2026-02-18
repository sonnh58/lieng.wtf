import { Database } from 'bun:sqlite';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { initSchema } from './schema';

let db: Database | null = null;

const DEFAULT_DB_PATH = join(import.meta.dir, '../../data/lieng.db');

/** Get or create the singleton Database instance */
export function getDb(dbPath?: string): Database {
  if (db) return db;

  const path = dbPath ?? DEFAULT_DB_PATH;

  // Ensure data directory exists
  mkdirSync(dirname(path), { recursive: true });

  db = new Database(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');

  initSchema(db);
  return db;
}

/** Initialize database (call on server startup) */
export function initDatabase(dbPath?: string): Database {
  return getDb(dbPath);
}

/** Close database connection (for testing cleanup) */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Create an in-memory database (for testing) */
export function createTestDb(): Database {
  const testDb = new Database(':memory:');
  testDb.exec('PRAGMA journal_mode = WAL');
  initSchema(testDb);
  return testDb;
}
