import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema } from '../../database/schema';
import { saveRound, getHistoryByRoom } from '../../database/history-queries';

describe('Game History', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
  });

  it('should save and retrieve a round', () => {
    saveRound(db, {
      roomId: 'r1',
      players: ['p1', 'p2'],
      hands: { p1: { type: 'LIENG', points: 0 }, p2: { type: 'NORMAL', points: 7 } },
      winners: ['p1'],
      payouts: { p1: 200, p2: -100 },
    });

    const history = getHistoryByRoom(db, 'r1');
    expect(history).toHaveLength(1);

    const entry = history[0];
    expect(entry.room_id).toBe('r1');
    expect(JSON.parse(entry.players)).toEqual(['p1', 'p2']);
    expect(JSON.parse(entry.winners)).toEqual(['p1']);
    expect(JSON.parse(entry.payouts)).toEqual({ p1: 200, p2: -100 });
  });

  it('should return history ordered by most recent first', () => {
    saveRound(db, { roomId: 'r1', players: ['p1'], hands: {}, winners: ['p1'], payouts: {} });
    saveRound(db, { roomId: 'r1', players: ['p2'], hands: {}, winners: ['p2'], payouts: {} });

    const history = getHistoryByRoom(db, 'r1');
    expect(history).toHaveLength(2);
    // Most recent (id=2) should come first
    expect(history[0].id).toBeGreaterThan(history[1].id);
  });

  it('should respect limit parameter', () => {
    for (let i = 0; i < 5; i++) {
      saveRound(db, { roomId: 'r1', players: [], hands: {}, winners: [], payouts: {} });
    }
    expect(getHistoryByRoom(db, 'r1', 3)).toHaveLength(3);
  });

  it('should scope history to room', () => {
    saveRound(db, { roomId: 'r1', players: [], hands: {}, winners: [], payouts: {} });
    saveRound(db, { roomId: 'r2', players: [], hands: {}, winners: [], payouts: {} });
    expect(getHistoryByRoom(db, 'r1')).toHaveLength(1);
    expect(getHistoryByRoom(db, 'r2')).toHaveLength(1);
  });
});
