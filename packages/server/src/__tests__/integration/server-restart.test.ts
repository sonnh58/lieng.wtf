import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema } from '../../database/schema';
import { upsertPlayer, findByName } from '../../database/player-queries';
import { saveRoom, loadAllRooms } from '../../database/room-queries';
import { saveRound, getHistoryByRoom } from '../../database/history-queries';
import { PlayerManager } from '../../managers/player-manager';
import { RoomManager } from '../../managers/room-manager';

describe('Server Restart Simulation', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
  });

  it('should restore rooms after restart', () => {
    // Simulate pre-restart: create room in DB
    const config = { maxPlayers: 6, ante: 10, startingChips: 1000, minBet: 10 };
    saveRoom(db, { id: 'r1', name: 'Poker Room', hostId: 'p1', config });

    // Simulate restart: new RoomManager loads from DB
    const rm = new RoomManager(db);
    rm.loadFromDb();

    const room = rm.getRoom('r1');
    expect(room).not.toBeNull();
    expect(room!.name).toBe('Poker Room');
    expect(room!.config.maxPlayers).toBe(6);
    expect(room!.players).toHaveLength(0); // Players haven't reconnected yet
  });

  it('should preserve player identity across restarts', () => {
    // Pre-restart: register player
    upsertPlayer(db, 'abc123', 'Alice');

    // Post-restart: new PlayerManager with same DB
    const pm = new PlayerManager(db);
    const info = pm.registerPlayer('socket-1', 'Alice');

    // Should reuse the same player ID from DB
    expect(info.id).toBe('abc123');
    expect(info.name).toBe('Alice');
  });

  it('should preserve game history across restarts', () => {
    // Pre-restart: save a round
    saveRound(db, {
      roomId: 'r1',
      players: ['p1', 'p2'],
      hands: { p1: { type: 'SAP' }, p2: { type: 'NORMAL', points: 5 } },
      winners: ['p1'],
      payouts: { p1: 300, p2: -150 },
    });

    // Post-restart: history still accessible
    const history = getHistoryByRoom(db, 'r1');
    expect(history).toHaveLength(1);
    expect(JSON.parse(history[0].winners)).toEqual(['p1']);
  });

  it('should handle full lifecycle: create room, play, restart, resume', () => {
    // 1. Create room via RoomManager (writes to DB)
    const rm1 = new RoomManager(db);
    const room = rm1.createRoom('Game Room', 'host1', { maxPlayers: 4 });

    // 2. Register player via PlayerManager (writes to DB)
    const pm1 = new PlayerManager(db);
    const player = pm1.registerPlayer('s1', 'Bob');

    // 3. Save a game round
    saveRound(db, {
      roomId: room.id,
      players: [player.id],
      hands: {},
      winners: [player.id],
      payouts: { [player.id]: 100 },
    });

    // 4. "Restart" — new managers, same DB
    const rm2 = new RoomManager(db);
    rm2.loadFromDb();
    const pm2 = new PlayerManager(db);

    // 5. Room restored
    expect(rm2.getRoom(room.id)).not.toBeNull();

    // 6. Player identity preserved
    const reconnected = pm2.registerPlayer('s2', 'Bob');
    expect(reconnected.id).toBe(player.id);

    // 7. History intact
    expect(getHistoryByRoom(db, room.id)).toHaveLength(1);
  });
});
