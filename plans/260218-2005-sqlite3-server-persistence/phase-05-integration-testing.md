# Phase 05: Integration Testing

## Context Links
- [plan.md](./plan.md) | All previous phases
- All files modified in phases 1-4

## Overview
- **Priority:** Medium
- **Status:** complete
- **Description:** Verify persistence works end-to-end: player lookup, room restore, history recording.

## Key Insights
- Tests should use in-memory SQLite (`:memory:`) for isolation and speed
- Bun has built-in test runner (`bun test`)
- Focus on integration tests (DB + Manager together), not unit tests of SQL

## Requirements
- Functional: test all CRUD paths, test server restart simulation, test data integrity
- Non-functional: tests run in <5s, no side effects between tests

## Architecture

### Test Structure
```
packages/server/src/__tests__/
  database/
    player-persistence.test.ts
    room-persistence.test.ts
    game-history.test.ts
  integration/
    server-restart.test.ts
```

### Test Strategy
- Each test file creates fresh `:memory:` DB, runs `initSchema`
- Player tests: register, lookup-by-name, stats increment
- Room tests: create, load, delete, config round-trip
- History tests: save round, query by room
- Restart test: populate DB, create new managers from DB, verify state

## Related Code Files
- **Create:** `packages/server/src/__tests__/database/player-persistence.test.ts`
- **Create:** `packages/server/src/__tests__/database/room-persistence.test.ts`
- **Create:** `packages/server/src/__tests__/database/game-history.test.ts`
- **Create:** `packages/server/src/__tests__/integration/server-restart.test.ts`

## Implementation Steps
1. Create test directory structure
2. **Player persistence tests:**
   - Test: upsert new player -> row created with correct fields
   - Test: upsert existing name -> returns same ID
   - Test: incrementWins/Losses -> counts update
   - Test: findByName with nonexistent name -> returns null
3. **Room persistence tests:**
   - Test: saveRoom -> loadAllRooms returns it
   - Test: deleteRoom -> loadAllRooms empty
   - Test: config JSON round-trip (all RoomConfig fields preserved)
   - Test: updateRoomHost -> host_id changes
4. **Game history tests:**
   - Test: saveRound -> getHistoryByRoom returns entry
   - Test: multiple rounds -> ordered by most recent first
   - Test: limit parameter works
5. **Server restart simulation:**
   - Create DB, add players + rooms
   - Construct new PlayerManager + RoomManager with same DB
   - Call loadFromDb()
   - Verify rooms restored, player lookup works
6. Add `"test"` script to `packages/server/package.json`: `"test": "bun test"`

## Todo List
- [ ] Create test directory structure
- [ ] Write player persistence tests
- [ ] Write room persistence tests
- [ ] Write game history tests
- [ ] Write server restart integration test
- [ ] Add test script to package.json
- [ ] All tests pass

## Success Criteria
- All tests pass with `bun test`
- Coverage of all query functions
- Server restart simulation proves data survives
- No test pollution (each test uses isolated DB)

## Risk Assessment
- **Risk:** `:memory:` DB behaves differently from file DB — **Mitigation:** same SQLite engine, only difference is persistence
- **Risk:** Bun test runner quirks — **Mitigation:** use standard describe/it/expect pattern

## Security Considerations
- Tests use in-memory DB, no file cleanup needed
- No test data leaks to production

## Next Steps
- After all tests pass, feature is ready for merge
