# Phase 04: Game History

## Context Links
- [plan.md](./plan.md) | [Phase 01](./phase-01-setup-database.md)
- `packages/server/src/game/game-manager.ts` — `roundEnd` event
- `packages/server/src/socket/game-handler.ts` — `setupGameEvents` listener

## Overview
- **Priority:** Medium
- **Status:** complete
- **Description:** Record every completed round to game_history table for stats/replay.

## Key Insights
- `roundEnd` event already emits `{ winners, hands: Map, payouts: Map }` — perfect hook point
- Maps need conversion to plain objects before JSON.stringify
- History is append-only, never updated
- Can be used later for leaderboards, replay, analytics

## Requirements
- Functional: save round result on every roundEnd, queryable by room_id
- Non-functional: write must not block next round start (bun:sqlite is sync but fast <1ms)

## Architecture

### history-queries.ts API
```typescript
saveRound(data: {
  roomId: string;
  players: string[];       // player IDs in round
  hands: Record<string, any>;  // {playerId: {type, points, highCard}}
  winners: string[];
  payouts: Record<string, number>;
}): void

getHistoryByRoom(roomId: string, limit?: number): GameHistoryRow[]
```

### Data Flow
1. `game-handler.ts` `roundEnd` listener fires
2. Convert `result.hands` Map -> plain object (already done for socket emit)
3. Convert `result.payouts` Map -> plain object (already done)
4. Call `saveRound()` with room ID + converted data
5. All JSON fields stored as TEXT via `JSON.stringify()`

## Related Code Files
- **Modify:** `packages/server/src/database/history-queries.ts` — implement queries
- **Modify:** `packages/server/src/socket/game-handler.ts` — add `saveRound()` call in `roundEnd` listener

## Implementation Steps
1. Implement `history-queries.ts`:
   - `saveRound(data)` — INSERT with JSON.stringify for all JSON fields
   - `getHistoryByRoom(roomId, limit=50)` — SELECT with ORDER BY created_at DESC
2. In `game-handler.ts` `setupGameEvents` function, inside `roundEnd` listener:
   - After existing showdown emit logic (which already converts Maps to objects)
   - Call `saveRound({ roomId, players: room.players, hands: handsObj, winners: result.winners, payouts: payoutsObj })`
3. Optionally: add REST endpoint `GET /api/rooms/:roomId/history` for client to fetch

## Todo List
- [ ] Implement history-queries.ts with saveRound and getHistoryByRoom
- [ ] Add saveRound call in game-handler.ts roundEnd listener
- [ ] (Optional) Add REST endpoint for history retrieval
- [ ] Test: play a round, check DB has history entry

## Success Criteria
- Every completed round creates a game_history row
- JSON fields contain valid, parseable data
- `getHistoryByRoom` returns correct results ordered by time

## Risk Assessment
- **Risk:** DB grows large over time — **Mitigation:** add periodic cleanup (delete entries older than 30 days) or VACUUM
- **Risk:** JSON blob size — **Mitigation:** 3-player hands + payouts is <1KB, negligible

## Security Considerations
- No PII in game history (just player IDs and game data)
- Read endpoint (if added) should be room-scoped, no cross-room leakage

## Next Steps
- Phase 05 verifies all persistence end-to-end
