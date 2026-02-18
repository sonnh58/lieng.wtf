import { Database } from 'bun:sqlite';

export interface GameHistoryRow {
  id: number;
  room_id: string;
  players: string; // JSON string
  hands: string; // JSON string
  winners: string; // JSON string
  payouts: string; // JSON string
  created_at: string;
}

export function saveRound(
  db: Database,
  data: {
    roomId: string;
    players: string[];
    hands: Record<string, any>;
    winners: string[];
    payouts: Record<string, number>;
  },
): void {
  db.query(
    'INSERT INTO game_history (room_id, players, hands, winners, payouts) VALUES (?, ?, ?, ?, ?)',
  ).run(
    data.roomId,
    JSON.stringify(data.players),
    JSON.stringify(data.hands),
    JSON.stringify(data.winners),
    JSON.stringify(data.payouts),
  );
}

export function getHistoryByRoom(
  db: Database,
  roomId: string,
  limit: number = 50,
): GameHistoryRow[] {
  return db
    .query<GameHistoryRow, [string, number]>(
      'SELECT * FROM game_history WHERE room_id = ? ORDER BY id DESC LIMIT ?',
    )
    .all(roomId, limit);
}
