# Phase 01: Setup Database

## Context Links
- [plan.md](./plan.md)
- Server entry: `packages/server/src/index.ts`
- Bun SQLite docs: https://bun.sh/docs/api/sqlite

## Overview
- **Priority:** High (blocks all other phases)
- **Status:** complete
- **Description:** Create database module with schema, migrations, and singleton connection

## Key Insights
- `bun:sqlite` is synchronous, WAL mode recommended for concurrent reads
- Single file DB at `packages/server/data/lieng.db`
- Schema versioning via simple `user_version` pragma

## Requirements
- Functional: init DB on server start, create tables if not exist, WAL mode
- Non-functional: <5ms overhead per write, no blocking of socket events

## Architecture

```
packages/server/src/database/
  db.ts              # singleton Database instance + init
  schema.ts          # CREATE TABLE statements, migrations
  player-queries.ts  # prepared statements for players table
  room-queries.ts    # prepared statements for rooms table
  history-queries.ts # prepared statements for game_history table
```

### Schema

```sql
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  chips INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  config TEXT NOT NULL,  -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id TEXT NOT NULL,
  players TEXT NOT NULL,  -- JSON array of player IDs
  hands TEXT NOT NULL,    -- JSON {playerId: handResult}
  winners TEXT NOT NULL,  -- JSON array of winner IDs
  payouts TEXT NOT NULL,  -- JSON {playerId: amount}
  created_at TEXT DEFAULT (datetime('now'))
);
```

## Related Code Files
- **Create:** `packages/server/src/database/db.ts`
- **Create:** `packages/server/src/database/schema.ts`
- **Create:** `packages/server/src/database/player-queries.ts`
- **Create:** `packages/server/src/database/room-queries.ts`
- **Create:** `packages/server/src/database/history-queries.ts`
- **Modify:** `packages/server/src/index.ts` — call `initDatabase()` on startup
- **Modify:** `.gitignore` — add `packages/server/data/`

## Implementation Steps
1. Create `packages/server/src/database/` directory
2. Create `db.ts`: export `getDb()` singleton using `new Database("packages/server/data/lieng.db")`, enable WAL mode, set busy_timeout
3. Create `schema.ts`: export `initSchema(db)` that runs CREATE TABLE IF NOT EXISTS for all 3 tables
4. Create query files with prepared statement wrappers (one per table)
5. Create `packages/server/data/.gitkeep` and add `packages/server/data/*.db` to `.gitignore`
6. Call `initDatabase()` in `index.ts` before `setupSocketHandlers(io)`

## Todo List
- [ ] Create database directory structure
- [ ] Implement `db.ts` singleton with WAL mode
- [ ] Implement `schema.ts` with all 3 table schemas
- [ ] Create empty query files (populated in phases 2-4)
- [ ] Add `.gitignore` entry for DB files
- [ ] Wire `initDatabase()` into server startup

## Success Criteria
- Server starts, creates `lieng.db` in data dir
- Tables exist with correct schema
- WAL mode enabled
- No impact on existing socket functionality

## Risk Assessment
- **Risk:** DB file permissions on different OS — **Mitigation:** mkdir -p on init
- **Risk:** Bun version compatibility — **Mitigation:** bun:sqlite stable since Bun 1.0

## Security Considerations
- DB file should not be web-accessible (it's outside public dir)
- No user-supplied SQL — all queries use prepared statements
- Gitignore DB files to prevent accidental commit of player data

## Next Steps
- Phase 02 depends on query files created here
