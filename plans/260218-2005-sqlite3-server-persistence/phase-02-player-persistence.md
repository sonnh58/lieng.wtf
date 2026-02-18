# Phase 02: Player Persistence

## Context Links
- [plan.md](./plan.md) | [Phase 01](./phase-01-setup-database.md)
- `packages/server/src/managers/player-manager.ts`
- `packages/server/src/socket/socket-handler.ts`

## Overview
- **Priority:** High
- **Status:** complete
- **Description:** Persist players by unique name. On connect, lookup or create. Track wins/losses.

## Key Insights
- Current `PlayerManager` generates new nanoid on every `registerPlayer` call — need to change to lookup-by-name first
- Player `id` in DB should match the in-memory `id` to avoid mapping issues
- Chips in DB = lifetime stat tracker (not session chips which reset per room)
- Stats (wins/losses) updated at round end

## Requirements
- Functional: upsert player on connect by name, load stats, increment wins/losses on round end
- Non-functional: lookup must be fast (<2ms), no blocking of socket event loop

## Architecture

### player-queries.ts API
```typescript
findByName(name: string): PlayerRow | null
upsertPlayer(id: string, name: string): PlayerRow
incrementWins(id: string): void
incrementLosses(id: string): void
getStats(id: string): { wins: number; losses: number }
```

### Flow
1. Client sends `player:set-name` with name
2. `PlayerManager.registerPlayer()` → query `findByName(name)`
3. If found: reuse existing DB id, update socket mapping
4. If not found: insert new row with nanoid, return new player
5. On `roundEnd` event: increment wins for winners, losses for losers

## Related Code Files
- **Modify:** `packages/server/src/database/player-queries.ts` — implement all queries
- **Modify:** `packages/server/src/managers/player-manager.ts` — accept optional DB, lookup-by-name logic
- **Modify:** `packages/server/src/socket/socket-handler.ts` — pass DB to PlayerManager
- **Modify:** `packages/server/src/socket/game-handler.ts` — update stats on roundEnd

## Implementation Steps
1. Implement `player-queries.ts`:
   - `findByName(name)` — SELECT by unique name
   - `upsertPlayer(id, name)` — INSERT OR IGNORE + return existing
   - `incrementWins(id)` — UPDATE wins = wins + 1
   - `incrementLosses(id)` — UPDATE losses = losses + 1
2. Modify `PlayerManager.registerPlayer(socketId, name)`:
   - Call `findByName(sanitizedName)` first
   - If exists: use that DB record's `id` instead of generating new nanoid
   - If not: generate nanoid, insert to DB
   - Rest of registration logic unchanged
3. Add `PlayerManager` constructor param: `db?: Database` (optional for backward compat)
4. In `socket-handler.ts`: pass db instance when constructing PlayerManager
5. In `game-handler.ts` `roundEnd` listener: call `incrementWins`/`incrementLosses`

## Todo List
- [ ] Implement player-queries.ts with all 4 query functions
- [ ] Modify PlayerManager to accept DB and do lookup-by-name
- [ ] Update socket-handler.ts to pass DB
- [ ] Add stats update in game-handler.ts roundEnd
- [ ] Test: connect with same name twice -> same player ID

## Success Criteria
- Player connects with name "Alice" -> row in DB
- Player reconnects with name "Alice" -> same ID returned
- Win/loss counts increment correctly after each round
- No regressions in existing connect/disconnect flow

## Risk Assessment
- **Risk:** Name collision if two different people use same name — **Mitigation:** acceptable for this game (name = identity); could add name+password later
- **Risk:** Race condition on concurrent upsert — **Mitigation:** SQLite serializes writes; UNIQUE constraint handles duplicates

## Security Considerations
- Name sanitization already exists in `PlayerManager` (strips HTML, 2-20 chars)
- Prepared statements prevent SQL injection
- No sensitive data in players table

## Next Steps
- Phase 03 uses same pattern for rooms
