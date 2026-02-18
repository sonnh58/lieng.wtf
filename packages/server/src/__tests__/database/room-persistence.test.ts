import { describe, it, expect, beforeEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initSchema } from '../../database/schema';
import { saveRoom, loadAllRooms, deleteRoom, updateRoomHost } from '../../database/room-queries';

describe('Room Persistence', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
  });

  it('should save and load a room', () => {
    const config = { maxPlayers: 6, ante: 10, startingChips: 1000, minBet: 10 };
    saveRoom(db, { id: 'r1', name: 'Test Room', hostId: 'p1', config });

    const rooms = loadAllRooms(db);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toBe('r1');
    expect(rooms[0].name).toBe('Test Room');
    expect(rooms[0].host_id).toBe('p1');

    const parsed = JSON.parse(rooms[0].config);
    expect(parsed.maxPlayers).toBe(6);
    expect(parsed.ante).toBe(10);
    expect(parsed.startingChips).toBe(1000);
  });

  it('should delete a room', () => {
    saveRoom(db, { id: 'r1', name: 'Room', hostId: 'p1', config: {} });
    deleteRoom(db, 'r1');
    expect(loadAllRooms(db)).toHaveLength(0);
  });

  it('should update room host', () => {
    saveRoom(db, { id: 'r1', name: 'Room', hostId: 'p1', config: {} });
    updateRoomHost(db, 'r1', 'p2');
    const rooms = loadAllRooms(db);
    expect(rooms[0].host_id).toBe('p2');
  });

  it('should handle multiple rooms', () => {
    saveRoom(db, { id: 'r1', name: 'Room 1', hostId: 'p1', config: {} });
    saveRoom(db, { id: 'r2', name: 'Room 2', hostId: 'p2', config: {} });
    expect(loadAllRooms(db)).toHaveLength(2);
  });
});
