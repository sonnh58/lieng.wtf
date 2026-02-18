import { Database } from 'bun:sqlite';

export interface RoomRow {
  id: string;
  name: string;
  host_id: string;
  config: string; // JSON string
  created_at: string;
}

export function saveRoom(
  db: Database,
  room: { id: string; name: string; hostId: string; config: object },
): void {
  db.query('INSERT OR REPLACE INTO rooms (id, name, host_id, config) VALUES (?, ?, ?, ?)').run(
    room.id,
    room.name,
    room.hostId,
    JSON.stringify(room.config),
  );
}

export function updateRoomHost(db: Database, roomId: string, hostId: string): void {
  db.query('UPDATE rooms SET host_id = ? WHERE id = ?').run(hostId, roomId);
}

export function deleteRoom(db: Database, roomId: string): void {
  db.query('DELETE FROM rooms WHERE id = ?').run(roomId);
}

export function loadAllRooms(db: Database): RoomRow[] {
  return db.query<RoomRow, []>('SELECT * FROM rooms').all();
}
