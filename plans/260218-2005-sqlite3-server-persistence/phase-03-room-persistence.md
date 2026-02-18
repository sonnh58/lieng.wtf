# Phase 03: Room Persistence

## Context Links
- [plan.md](./plan.md) | [Phase 01](./phase-01-setup-database.md) | [Phase 02](./phase-02-player-persistence.md)
- `packages/server/src/managers/room-manager.ts`
- `packages/server/src/socket/socket-handler.ts`

## Overview
- **Priority:** Medium
- **Status:** complete
- **Description:** Save rooms to SQLite on create/join/leave. Reload non-empty rooms on server restart.

## Key Insights
- Rooms are ephemeral during gameplay (in-memory Map is source of truth)
- Persistence allows resuming lobby state after restart — players see their room still exists
- Game state (mid-round) is NOT persisted — only room metadata and player list
- Empty rooms should be deleted from DB (already deleted from memory in `leaveRoom`)

## Requirements
- Functional: save room on create, update on join/leave, delete when empty, load all on startup
- Non-functional: write-through (sync after each mutation), startup load < 50ms

## Architecture

### room-queries.ts API
```typescript
saveRoom(room: { id, name, hostId, config }): void
updateRoomHost(roomId: string, hostId: string): void
deleteRoom(roomId: string): void
loadAllRooms(): RoomRow[]
```

### Startup Flow
1. Server starts -> `initDatabase()`
2. Load all rooms from DB -> reconstruct in-memory Map
3. For each room: create Room object, add to `RoomManager.rooms`
4. Players will reconnect via socket and rejoin rooms

### Runtime Flow
- `createRoom()` -> insert to DB
- `joinRoom()` -> no DB write needed (player list is transient; room itself exists)
- `leaveRoom()` -> if empty, delete from DB; if host changed, update host
- Note: player list NOT stored in rooms table (it's session-based)

## Related Code Files
- **Modify:** `packages/server/src/database/room-queries.ts` — implement queries
- **Modify:** `packages/server/src/managers/room-manager.ts` — add DB write-through, `loadFromDb()` method
- **Modify:** `packages/server/src/socket/socket-handler.ts` — call `roomManager.loadFromDb()` on init

## Implementation Steps
1. Implement `room-queries.ts`:
   - `saveRoom({ id, name, hostId, config })` — INSERT with JSON.stringify(config)
   - `updateRoomHost(roomId, hostId)` — UPDATE host_id
   - `deleteRoom(roomId)` — DELETE
   - `loadAllRooms()` — SELECT * with JSON.parse(config)
2. Add `RoomManager` constructor param: `db?: Database`
3. Add `RoomManager.loadFromDb()`:
   - Call `loadAllRooms()`
   - For each: create Room object with empty players array, add to Map
   - Log count of restored rooms
4. Modify `createRoom()`: after inserting to Map, call `saveRoom()`
5. Modify `leaveRoom()`: if room deleted, call `deleteRoom()`; if host changed, call `updateRoomHost()`
6. In `socket-handler.ts`: construct RoomManager with db, call `loadFromDb()` before socket setup

## Todo List
- [ ] Implement room-queries.ts with all 4 query functions
- [ ] Add DB param to RoomManager constructor
- [ ] Implement loadFromDb() method
- [ ] Add write-through in createRoom()
- [ ] Add write-through in leaveRoom()
- [ ] Wire up in socket-handler.ts
- [ ] Test: create room, restart server, room appears in list

## Success Criteria
- Create room -> row in DB with config JSON
- Restart server -> room reloaded (empty player list, but room exists)
- Delete room (last player leaves) -> row removed from DB
- Config JSON round-trips correctly (maxPlayers, ante, etc.)

## Risk Assessment
- **Risk:** Stale rooms accumulate if server crashes before cleanup — **Mitigation:** add startup pruning (delete rooms older than 24h)
- **Risk:** Room restored but no players can rejoin (lost socket state) — **Mitigation:** rooms with 0 players auto-prune after timeout

## Security Considerations
- Config stored as JSON — validate on load to prevent malformed data
- Room IDs are nanoid (not sequential) — no enumeration attack

## Next Steps
- Phase 04 adds game history tracking
