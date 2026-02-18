# Code Review: SQLite3 Persistence Implementation

**Date:** 2026-02-18
**Scope:** packages/server/src/{database/,managers/,socket/} + __tests__
**Files reviewed:** 10 source + 4 test files | All 17 tests pass | TS clean

---

## Overall Assessment

Solid implementation. Architecture is well-structured (query layer → manager layer → handler layer), prepared statements used throughout, WAL mode enabled. Primary concerns are correctness gaps in the singleton pattern, a name-squatting security issue, missing atomicity, and unbounded data in the history table.

---

## Critical Issues

### 1. Singleton `db` leaks between tests — `closeDatabase()` only resets module-level `db` variable

**File:** `database/db.ts` lines 6, 33-38

The module-level `let db: Database | null` is process-global. Tests that call `createTestDb()` are correctly isolated (they return a new instance each time). But any test that calls `getDb()` or `initDatabase()` will poison the singleton for subsequent tests in the same process. Currently no test calls these functions, but `socket-handler.ts` does in production code — if tests ever exercise `setupSocketHandlers`, they will share state.

Mitigation: Either document that `closeDatabase()` must be called in `afterEach` for any test that exercises `getDb()`, or export a `resetDb()` helper that also nulls the singleton for test use.

### 2. Name-squatting / identity hijacking

**File:** `managers/player-manager.ts` lines 39-49

`registerPlayer` looks up by sanitized name and reuses the stored ID — no authentication. Any client can claim any name and inherit another player's stats, chip count, and win/loss record. For a casual game this may be acceptable, but it is a design decision that should be explicit.

If identity persistence is intended only for reconnection (same session, new socket), consider using a client-supplied token (e.g., UUID stored in localStorage) as the lookup key instead of a human-readable name.

---

## High Priority

### 3. `roundEnd` DB writes are not atomic — partial persist on error

**File:** `socket/game-handler.ts` lines 143-159

`incrementWins`/`incrementLosses` run N individual statements followed by `saveRound`. If the process crashes mid-loop, or any statement throws, stats are partially updated and no history row is written (or vice versa). Wrap the entire block in a transaction:

```ts
// game-handler.ts
if (db) {
  db.transaction(() => {
    const winnerSet = new Set(result.winners as string[]);
    for (const [id] of result.hands) {
      if (winnerSet.has(id)) incrementWins(db!, id);
      else incrementLosses(db!, id);
    }
    saveRound(db!, { roomId, players: room.players, hands: handsObj, winners: result.winners, payouts: payoutsObj });
  })();
}
```

### 4. `upsertPlayer` uses `INSERT OR IGNORE` then re-reads — races on first insert

**File:** `database/player-queries.ts` lines 16-19

If two sockets register the same name concurrently (possible with WAL + multiple connections), both `INSERT OR IGNORE` calls succeed on their respective SQLite write locks, but only one row is committed. The second caller then reads the winner's row, so IDs are consistent — but there is a brief window where `findByName` could theoretically return null if called between the insert and commit. The non-null assertion `findByName(db, name)!` would then throw. A safer pattern:

```ts
export function upsertPlayer(db: Database, id: string, name: string): PlayerRow {
  db.query('INSERT OR IGNORE INTO players (id, name) VALUES (?, ?)').run(id, name);
  const row = findByName(db, name);
  if (!row) throw new Error(`Failed to upsert player: ${name}`);
  return row;
}
```

### 5. `loadFromDb` performs unvalidated `JSON.parse` on `config` column

**File:** `managers/room-manager.ts` line 34

If the `config` column contains malformed JSON (manual DB edit, corruption), `JSON.parse` throws synchronously inside the startup loop, crashing the server before any room is restored. Wrap in try/catch and skip bad rows:

```ts
let config: RoomConfig;
try {
  config = JSON.parse(row.config) as RoomConfig;
} catch {
  console.warn(`Skipping room ${row.id}: invalid config JSON`);
  continue;
}
```

Similarly, `saveRound` / `getHistoryByRoom` JSON columns are never validated on read — callers in tests do `JSON.parse(entry.players)` without try/catch.

### 6. `game_history` has no retention policy — unbounded growth

**File:** `database/schema.ts` lines 21-29 / `database/history-queries.ts`

The table is append-only with no cleanup mechanism. A busy room can accumulate millions of rows over time. Consider adding a periodic cleanup job or a `created_at`-based TTL. At minimum add an index on `room_id` for the frequent `WHERE room_id = ?` query:

```sql
CREATE INDEX IF NOT EXISTS idx_game_history_room_id ON game_history (room_id);
```

---

## Medium Priority

### 7. `sanitizeName` strips HTML tags but does not prevent SQL-special characters

**File:** `managers/player-manager.ts` lines 169-173`

SQL injection is prevented by prepared statements (correct), but names like `'; DROP TABLE players; --` will be stored verbatim. This is not a SQL risk but may cause display issues in future non-parameterized contexts (e.g., logs, admin dashboards). Consider allowing only printable Unicode letters/digits/spaces.

### 8. `DEFAULT_DB_PATH` is relative — resolves against process CWD

**File:** `database/db.ts` line 8

`'packages/server/data/lieng.db'` works only when the server is started from the monorepo root. If started from `packages/server/`, the path resolves to `packages/server/packages/server/data/lieng.db`. Use `import.meta.dir` or `__dirname`-equivalent:

```ts
import { join } from 'path';
const DEFAULT_DB_PATH = join(import.meta.dir, '../../data/lieng.db');
```

### 9. `setupSocketHandlers` called multiple times resets singletons silently

**File:** `socket/socket-handler.ts` lines 10-11, 17-24

`roomManager` and `playerManager` are module-level vars re-assigned on each call. If `setupSocketHandlers` is ever called more than once (e.g., hot reload in dev), all in-memory state is wiped silently. Either guard against re-initialization or make managers true singletons.

### 10. `rooms` table — no FK constraint on `host_id` → `players.id`

**File:** `database/schema.ts`

`host_id` has no `REFERENCES players(id)` constraint and no `ON DELETE` behavior. A host can be deleted from `players` while their rooms persist with a dangling reference. Since SQLite FK enforcement requires `PRAGMA foreign_keys = ON` (not enabled here), add it to `db.ts` if FK integrity is desired.

### 11. `player:reconnect` handler does not validate `playerId` shape

**File:** `socket/socket-handler.ts` lines 37-62

`playerId` from the client is used directly in `handleReconnect` with no format validation. A client can send `{ playerId: null }` or an excessively long string. Add a guard:

```ts
socket.on('player:reconnect', ({ playerId }: { playerId: string }) => {
  if (typeof playerId !== 'string' || playerId.length > 20) {
    return socket.emit('player:reconnect-failed');
  }
  ...
});
```

---

## Low Priority

### 12. Query objects recreated on every call — consider caching prepared statements

**File:** all `*-queries.ts` files

`db.query(sql)` on bun:sqlite compiles a new prepared statement each invocation. For hot paths (every action, every roundEnd), cache the compiled statement as a module-level or class-level variable. Bun's `Database.prepare()` returns a reusable `Statement`. Minor for a card game, but worth noting.

### 13. `broadcastGameState` typed as `any` for `gm` parameter

**File:** `socket/game-handler.ts` line 183

`gm: any` loses type safety. Use `GameManager` type.

### 14. Tests do not close DB in `afterEach`

**File:** all test files

`:memory:` DBs are GC'd but explicit `db.close()` in `afterEach` avoids file-descriptor leaks if tests ever switch to file-based DBs, and makes lifecycle explicit.

---

## Edge Cases Found During Review

- **Concurrent registration of identical names:** Two sockets sending `player:set-name` with `"Alice"` simultaneously. The `INSERT OR IGNORE` serializes at the SQLite write lock, but both callers end up with the same `id`. Both `PlayerInfo` entries map to the same `playerId` — `playerToSocket` will be overwritten by whichever resolves second, breaking the first socket's routing.
- **Host leaves mid-game:** `leaveRoom` transfers host to `players[0]` and persists. If a game is active, `GameManager` state is not notified — the game continues with the old `hostId` reference cached in `GameManager`. Acceptable if `GameManager` does not use `hostId`, but worth confirming.
- **`reconnect` after grace-period expiry:** Client sends `player:reconnect` after the 30s timer fires. `handleReconnect` returns `null` (old socket entry removed), `reconnect-failed` is emitted. Client must re-register, which creates a new `PlayerInfo` — but DB still has the original `id`. On re-register with the same name, the original `id` is recovered. This is correct behavior but not covered by a test.
- **`getHistoryByRoom` with limit=0:** Passes `LIMIT 0` to SQLite — returns 0 rows. Callers should validate `limit >= 1`.

---

## Positive Observations

- Parameterized queries throughout — no string concatenation in SQL
- WAL + `busy_timeout` is correct for a multi-reader game server
- Write-through pattern (memory-first, async-safe DB writes) is appropriate for socket.io workload
- `createTestDb()` cleanly avoids hitting the singleton — good test hygiene
- `sanitizeName` guards against XSS in name field before storage
- Append-only `game_history` is the correct model for audit/replay
- Manager constructors accept optional `db` — good for unit testing without DB

---

## Recommended Actions (Priority Order)

1. **Wrap `roundEnd` DB writes in a transaction** (correctness, data integrity)
2. **Fix `DEFAULT_DB_PATH` to use absolute path** (correctness, deployment)
3. **Guard `JSON.parse(row.config)` in `loadFromDb`** (crash prevention on startup)
4. **Add `idx_game_history_room_id` index** (performance, scalability)
5. **Replace non-null assertion in `upsertPlayer`** with explicit error throw
6. **Validate `playerId` in `player:reconnect` handler** (security)
7. **Decide on name-based identity model** — document or replace with token-based auth
8. **Add `afterEach(() => db.close())` in test files**
9. **Add retention/cleanup for `game_history`**
10. **Enable `PRAGMA foreign_keys = ON`** if FK integrity is desired

---

## Metrics

- Type Coverage: ~95% (one `any` in `broadcastGameState`, one in `roundEnd` result handler)
- Test Coverage: Query layer well-covered; manager integration partially covered; socket handlers not covered
- Linting Issues: 0 reported (TS clean)

---

## Unresolved Questions

1. Is name-based player identity intentional (casual/no-auth game), or should a client token be used to prevent impersonation?
2. Is there a plan to expose `game_history` via a REST/socket API endpoint? If so, pagination and indexes become urgent.
3. Is `setupSocketHandlers` ever called more than once in production (e.g., dev hot-reload)? If yes, the singleton reset is a latent bug.
4. Does `GameManager` reference `hostId` internally? If so, host-transfer mid-game needs to propagate to the game engine.
