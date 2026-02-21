import { Database } from 'bun:sqlite';

export interface PlayerRow {
  id: string;
  name: string;
  google_sub: string | null;
  avatar_url: string | null;
  chips: number;
  total_loaned: number;
  total_pnl: number;
  wins: number;
  losses: number;
  created_at: string;
}

export function findByName(db: Database, name: string): PlayerRow | null {
  return db.query<PlayerRow, [string]>('SELECT * FROM players WHERE name = ?').get(name);
}

export function upsertPlayer(db: Database, id: string, name: string): PlayerRow {
  db.query('INSERT OR IGNORE INTO players (id, name) VALUES (?, ?)').run(id, name);
  return findByName(db, name)!;
}

export function incrementWins(db: Database, id: string): void {
  db.query('UPDATE players SET wins = wins + 1 WHERE id = ?').run(id);
}

export function incrementLosses(db: Database, id: string): void {
  db.query('UPDATE players SET losses = losses + 1 WHERE id = ?').run(id);
}

export function getStats(db: Database, id: string): { wins: number; losses: number } | null {
  return db.query<{ wins: number; losses: number }, [string]>(
    'SELECT wins, losses FROM players WHERE id = ?',
  ).get(id);
}

/** Get player's wallet balance */
export function getWallet(db: Database, id: string): number {
  const row = db.query<{ chips: number }, [string]>('SELECT chips FROM players WHERE id = ?').get(id);
  return row?.chips ?? 0;
}

/** Update player's wallet balance (can go negative) */
export function updateWallet(db: Database, id: string, delta: number): number {
  db.query('UPDATE players SET chips = chips + ? WHERE id = ?').run(delta, id);
  return getWallet(db, id);
}

/** Record a chip loan and add to wallet */
export function recordLoan(db: Database, id: string, amount: number): number {
  db.query('UPDATE players SET chips = chips + ?, total_loaned = total_loaned + ? WHERE id = ?').run(amount, amount, id);
  return getWallet(db, id);
}

/** Update total PnL (profit & loss) */
export function updatePnl(db: Database, id: string, delta: number): void {
  db.query('UPDATE players SET total_pnl = total_pnl + ? WHERE id = ?').run(delta, id);
}

/** Get player stats (for lobby display) */
export function getPlayerStats(db: Database, id: string): {
  wins: number; losses: number; totalLoaned: number; totalPnl: number; walletBalance: number;
} | null {
  const row = db.query<{ wins: number; losses: number; total_loaned: number; total_pnl: number; chips: number }, [string]>(
    'SELECT wins, losses, total_loaned, total_pnl, chips FROM players WHERE id = ?',
  ).get(id);
  if (!row) return null;
  return { wins: row.wins, losses: row.losses, totalLoaned: row.total_loaned, totalPnl: row.total_pnl, walletBalance: row.chips };
}

/** Reset all players' chips, total_loaned, total_pnl, wins, losses */
export function resetAllPlayersStats(db: Database): number {
  const result = db.query(
    'UPDATE players SET chips = 0, total_loaned = 0, total_pnl = 0, wins = 0, losses = 0',
  ).run();
  return result.changes;
}

/** Delete a player by ID */
export function deletePlayer(db: Database, id: string): boolean {
  const result = db.query('DELETE FROM players WHERE id = ?').run(id);
  return result.changes > 0;
}

/** Find player by Google sub (unique Google user ID) */
export function findByGoogleSub(db: Database, googleSub: string): PlayerRow | null {
  return db.query<PlayerRow, [string]>('SELECT * FROM players WHERE google_sub = ?').get(googleSub);
}

/** Create or update a Google-authenticated player */
export function upsertGooglePlayer(
  db: Database,
  id: string,
  name: string,
  googleSub: string,
  avatarUrl: string | null,
): PlayerRow {
  const existing = findByGoogleSub(db, googleSub);
  if (existing) {
    // Update name and avatar on each login
    db.query('UPDATE players SET name = ?, avatar_url = ? WHERE google_sub = ?')
      .run(name, avatarUrl, googleSub);
    return findByGoogleSub(db, googleSub)!;
  }
  db.query('INSERT INTO players (id, name, google_sub, avatar_url) VALUES (?, ?, ?, ?)')
    .run(id, name, googleSub, avatarUrl);
  return findByGoogleSub(db, googleSub)!;
}
