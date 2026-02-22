import { Database } from 'bun:sqlite';

export function saveGameState(db: Database, roomId: string, state: string): void {
  db.query(
    'INSERT OR REPLACE INTO game_state (room_id, state, updated_at) VALUES (?, ?, datetime(\'now\'))',
  ).run(roomId, state);
}

export function loadGameState(db: Database, roomId: string): string | null {
  const row = db.query<{ state: string }, [string]>(
    'SELECT state FROM game_state WHERE room_id = ?',
  ).get(roomId);
  return row?.state ?? null;
}

export function loadAllGameStates(db: Database): { roomId: string; state: string }[] {
  const rows = db.query<{ room_id: string; state: string }, []>(
    'SELECT room_id, state FROM game_state',
  ).all();
  return rows.map((r) => ({ roomId: r.room_id, state: r.state }));
}

export function deleteGameState(db: Database, roomId: string): void {
  db.query('DELETE FROM game_state WHERE room_id = ?').run(roomId);
}
