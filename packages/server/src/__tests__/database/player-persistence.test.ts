import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema } from '../../database/schema';
import { findByName, upsertPlayer, incrementWins, incrementLosses, getStats } from '../../database/player-queries';

describe('Player Persistence', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
  });

  it('should upsert a new player and find by name', () => {
    const row = upsertPlayer(db, 'p1', 'Alice');
    expect(row.id).toBe('p1');
    expect(row.name).toBe('Alice');
    expect(row.wins).toBe(0);
    expect(row.losses).toBe(0);
  });

  it('should return same ID for existing name', () => {
    upsertPlayer(db, 'p1', 'Alice');
    const row = upsertPlayer(db, 'p2', 'Alice');
    // INSERT OR IGNORE means p2 is ignored, existing p1 returned
    expect(row.id).toBe('p1');
  });

  it('should return null for nonexistent name', () => {
    expect(findByName(db, 'Ghost')).toBeNull();
  });

  it('should increment wins', () => {
    upsertPlayer(db, 'p1', 'Alice');
    incrementWins(db, 'p1');
    incrementWins(db, 'p1');
    const stats = getStats(db, 'p1');
    expect(stats!.wins).toBe(2);
    expect(stats!.losses).toBe(0);
  });

  it('should increment losses', () => {
    upsertPlayer(db, 'p1', 'Alice');
    incrementLosses(db, 'p1');
    const stats = getStats(db, 'p1');
    expect(stats!.losses).toBe(1);
  });
});
