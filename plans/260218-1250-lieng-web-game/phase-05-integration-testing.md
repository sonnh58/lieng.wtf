# Phase 05 - Integration & Testing

## Context Links
- [Plan Overview](plan.md)
- All previous phase files

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 3h
- **Description**: Wire all pieces together, end-to-end testing, edge case handling, UI polish, and basic animations.

## Key Insights
- Test with multiple browser tabs (cheapest multi-player testing)
- Focus on game flow correctness over visual polish for MVP
- Edge cases: disconnect mid-game, all-fold, all-in showdown, single remaining player

## Requirements
### Functional
- Complete game flow works: lobby -> join -> deal -> bet -> showdown -> next round
- Multi-player testing: 2-6 players across browser tabs
- Disconnect/reconnect preserves game state
- All edge cases handled gracefully

### Non-Functional
- No console errors during normal gameplay
- Smooth transitions between game phases
- Responsive across tested viewports

## Architecture
No new architecture - this phase wires existing modules and verifies correctness.

## Related Code Files

### Files to Create
- `packages/shared/src/__tests__/hand-evaluator.test.ts` (optional: if time permits)
- `packages/server/src/__tests__/game-manager.test.ts` (optional: if time permits)

### Files to Modify
- Various bug fixes across all packages as found during testing

## Implementation Steps

### 1. End-to-End Game Flow Verification
1. Start dev server (client + server)
2. Open 3 browser tabs, set different player names
3. Tab 1: Create room "Test Room"
4. Tab 2 & 3: Join "Test Room"
5. Tab 1 (host): Start game
6. Verify all 3 players receive their 3 cards
7. Play through betting round (mix of to/theo/bo)
8. Verify showdown displays correct winner
9. Verify pot distributed correctly
10. Verify next round starts with rotated dealer

### 2. Edge Case Testing
1. **All players fold except one**: Winner gets pot without showdown
2. **All-in scenario**: Player with fewer chips goes all-in, others continue. Verify proportional winnings (no side pots for MVP).
<!-- Updated: Validation Session 1 - No side pots -->
3. **Disconnect during game**: Close tab, reopen, rejoin. Verify state restored.
4. **Disconnect during betting (their turn)**: Should auto-fold after 30s timeout
5. **Room host leaves**: Transfer host to next player or close room
6. **Single player in room**: Can't start game, show waiting message
7. **12 player test**: Open many tabs, verify circular layout fits all players
8. **Rapid actions**: Click buttons fast, verify rate limiter works
9. **Equal hands tiebreaker**: Force same-point hands, verify suit tiebreaker

### 3. UI Polish
1. Card dealing animation: staggered slide-in from deck position
2. Card flip animation for showdown: CSS 3D rotateY
3. Bet chip animation: slide to pot center
4. Turn indicator pulse animation
5. Winner celebration: gold highlight + pot slide animation
6. Phase transition messages: "Dang chia bai..." (Dealing...), "Vong cuoc" (Betting round), "Lat bai!" (Showdown!)
7. Sound effects (optional, stretch): card deal, chip, win jingle

### 4. Error Handling & User Feedback
1. Toast/notification system for errors ("Khong du chip" - Not enough chips)
2. Loading states during room operations
3. Connection status indicator (green dot = connected, red = disconnected)
4. "Dang ket noi lai..." (Reconnecting...) overlay on disconnect
5. Graceful handling of server restart (client auto-reconnects, show lobby)

### 5. Bug Fixes & Polish
1. Fix any issues found during testing
2. Verify all Vietnamese text is correct
3. Check mobile layout on actual phone or device emulator
4. Remove any console.log debug statements
5. Verify no memory leaks (rooms/games cleaned up properly)

## Todo List
- [ ] Test complete game flow (3+ players)
- [ ] Test all-fold edge case
- [ ] Test all-in with side pots
- [ ] Test disconnect/reconnect
- [ ] Test auto-fold on timeout
- [ ] Test room lifecycle (create, join, leave, empty cleanup)
- [ ] Add card dealing animation
- [ ] Add card flip animation
- [ ] Add turn indicator animation
- [ ] Add error toasts/notifications
- [ ] Add connection status indicator
- [ ] Add reconnection overlay
- [ ] Fix bugs found during testing
- [ ] Clean up debug logs
- [ ] Test mobile viewport

## Success Criteria
- Full game round completes without errors for 2-6 players
- Disconnect/reconnect works within grace period
- Auto-fold triggers correctly on timeout
- All edge cases handled (no crashes, no stuck states)
- Animations feel smooth (no jank)
- Vietnamese UI text is complete and correct
- No console errors during normal gameplay
- Mobile layout is usable

## Risk Assessment
- **State desync**: Client and server state diverge. Mitigate: periodically send full state snapshot, resync on any mismatch.
- **Animation performance**: Too many animations with 20 players. Mitigate: reduce animations for > 8 players.
- **Testing coverage**: Manual testing may miss edge cases. Mitigate: write unit tests for hand evaluator at minimum.

## Security Considerations
- Verify rate limiter prevents spam
- Verify cards never leak to wrong player in network tab
- Verify betting validation can't be bypassed via raw socket events

## Next Steps (Post-MVP)
- Add persistent database (PostgreSQL) for user accounts and game history
- Add authentication (guest + registered accounts)
- Add chat functionality
- Add spectator mode
- Add game statistics and leaderboard
- Add sound effects
- Add more game variants (Cao Cai, Cao Thach)
- Deploy to production (Docker + cloud hosting)
