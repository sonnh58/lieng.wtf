# Phase 02 - Game Engine

## Context Links
- [Plan Overview](plan.md)
- [Game Rules Research](research/researcher-01-lieng-game-rules.md)
- [Tech Stack Research](research/researcher-02-tech-stack-architecture.md)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 6h
- **Description**: Core game logic. Server-authoritative: deck management, hand evaluation, betting validation, game state machine, pot management. All pure functions in shared + server packages.

## Key Insights
- Hand evaluation is pure logic - belongs in `packages/shared` so it can be tested independently
- Game state machine manages transitions: WAITING -> DEALING -> BETTING -> SHOWDOWN -> ENDED
- Betting is single-round only (simpler than poker)
- Side pots needed when all-in player has fewer chips than others' bets
- Tiebreaker uses suit hierarchy: Diamond > Heart > Club > Spade

## Requirements
### Functional
- Create and shuffle 52-card deck (Fisher-Yates)
- Deal 3 cards to each player
- Evaluate hand: detect Sap, Lieng, Anh, or calculate points (mod 10)
- Compare any two hands with full tiebreaker logic
- Validate betting actions (to/theo/bo/to-tat) against current state
- Manage pot including side pots for all-in
- Manage turn order (clockwise from dealer)
- Auto-fold on 30s timeout
- Determine winner(s) at showdown
- Distribute pot (including side pot splits)
- Rotate dealer after round

### Non-Functional
- All game logic pure functions (no side effects, easy to test)
- Hand evaluation < 1ms per hand
- Support up to 20 concurrent players

## Architecture

### Module Structure
```
packages/shared/src/
├── types/          (from Phase 1)
├── constants/      (from Phase 1)
└── utils/
    ├── deck.ts             # createDeck, shuffleDeck, dealCards
    ├── hand-evaluator.ts   # evaluateHand, compareHands
    └── hand-utils.ts       # isSap, isLieng, isDi, calculatePoints

packages/server/src/
├── game/
│   ├── game-manager.ts     # GameManager class - orchestrates full game lifecycle
│   ├── betting-manager.ts  # BettingManager - validates/processes bets, pot logic
│   ├── turn-manager.ts     # TurnManager - turn order, timer, auto-fold
│   └── pot-manager.ts      # PotManager - main pot + side pots
└── index.ts
```

### State Machine
```
WAITING (lobby, need min 2 players)
  ↓ host starts game
DEALING (server deals 3 cards each, broadcasts card-back to others)
  ↓ all cards dealt
BETTING (single round, clockwise from left of dealer)
  ↓ all players acted (or 1 remaining)
SHOWDOWN (reveal hands, determine winner)
  ↓ pot distributed
ENDED (show results, option to play again)
  ↓ auto-transition after delay
WAITING (dealer rotated)
```

## Related Code Files

### Files to Create
- `packages/shared/src/utils/deck.ts`
- `packages/shared/src/utils/hand-evaluator.ts`
- `packages/shared/src/utils/hand-utils.ts`
- `packages/server/src/game/game-manager.ts`
- `packages/server/src/game/betting-manager.ts`
- `packages/server/src/game/turn-manager.ts`
- `packages/server/src/game/pot-manager.ts`

### Files to Modify
- `packages/shared/src/index.ts` (add util exports)
- `packages/shared/src/types/game.ts` (refine types as needed)

## Implementation Steps

### 1. Deck Utilities (`packages/shared/src/utils/deck.ts`)
1. `createDeck(): Card[]` - generate all 52 cards (4 suits x 13 ranks)
2. `shuffleDeck(deck: Card[]): Card[]` - Fisher-Yates shuffle, return new array
3. `dealCards(deck: Card[], count: number): { dealt: Card[], remaining: Card[] }` - pop cards from deck

### 2. Hand Utilities (`packages/shared/src/utils/hand-utils.ts`)
1. `calculatePoints(cards: Card[]): number` - sum card values mod 10 (A=1, 2-10=face, J/Q/K=10)
2. `isSap(cards: Card[]): boolean` - three of a kind (same rank)
3. `isLieng(cards: Card[]): boolean` - three consecutive ranks. Handle A-2-3 and Q-K-A wraps
4. `isDi(cards: Card[]): boolean` - all three are J, Q, or K (called "Đĩ" in Vietnamese)
<!-- Updated: Validation Session 1 - Renamed isAnh→isDi per Vietnamese terminology -->
5. `getHighCard(cards: Card[]): Card` - highest card by rank then suit hierarchy

### 3. Hand Evaluator (`packages/shared/src/utils/hand-evaluator.ts`)
1. `evaluateHand(cards: Card[]): HandResult` - returns {type: HandType, points, highCard, rank}
   - Check Sap first (highest), then Lieng, then Di (3 face cards), then normal points
   - For Sap: rank = card rank value (A highest for Sap of Aces)
   - For Lieng: rank = highest card in straight
   - For Anh: rank determined by suit tiebreaker
   - For normal: rank = points (0-9)
2. `compareHands(a: HandResult, b: HandResult): number` - negative if a wins, positive if b wins, 0 if tie
   - Compare HandType first (SAP > LIENG > DI > NORMAL)
   - Same type: compare rank/points
   - Same rank: compare suit hierarchy of high card

### 4. Pot Manager (`packages/server/src/game/pot-manager.ts`)
1. `PotManager` class (simplified - no side pots for MVP):
   - `addBet(playerId: string, amount: number)` - track individual contributions
   - `getTotal(): number` - total pot amount
   - `distributeToWinner(winnerId: string): number` - winner takes all
   - `distributeToWinners(winnerIds: string[]): Map<playerId, number>` - split equally on tie
   - `reset()` - clear for new round
   - Note: All-in player can only win from each opponent up to the amount they put in
<!-- Updated: Validation Session 1 - Removed side pot logic per MVP scope -->

### 5. Turn Manager (`packages/server/src/game/turn-manager.ts`)
1. `TurnManager` class:
   - `constructor(playerIds: string[], dealerIndex: number)` - set up turn order
   - `getCurrentPlayer(): string` - who must act
   - `advance(): string | null` - move to next non-folded player, null if round over
   - `removePlayer(id: string)` - mark as folded/out
   - `isRoundComplete(): boolean` - all active players have acted and bets equalized
   - `getActivePlayers(): string[]` - non-folded players
   - Timer: 30s countdown per turn, callback on timeout

### 6. Betting Manager (`packages/server/src/game/betting-manager.ts`)
1. `BettingManager` class:
   - `validateAction(playerId, action, amount?): {valid, reason?}` - check if action is legal
     - BO (fold): always valid on your turn
     - THEO (call): must have enough chips to match current bet
     - TO (raise): must be >= current bet + min raise
     - TO_TAT (all-in): always valid on your turn
   - `processAction(playerId, action, amount?)` - update player state, pot
   - `getCurrentBet(): number` - highest active bet
   - `getMinRaise(): number` - minimum raise amount

### 7. Game Manager (`packages/server/src/game/game-manager.ts`)
1. `GameManager` class - orchestrates full round:
   - `constructor(room: Room)` - init with room config
   - `startRound()` - collect antes, shuffle, deal, transition to BETTING
   - `handleAction(playerId, action, amount?)` - delegate to BettingManager, advance turn
   - `checkRoundEnd(): boolean` - one player left OR all acted
   - `showdown()` - evaluate all remaining hands, determine winners
   - `distributeWinnings()` - use PotManager
   - `endRound()` - rotate dealer, reset state, transition to WAITING
   - `getStateForPlayer(playerId): ClientGameState` - filtered state (hide other cards)
   - `getPublicState(): PublicGameState` - state visible to all (no hidden cards)
2. Event emitter pattern: emit events for socket layer to broadcast

## Todo List
- [ ] Implement deck utilities (create, shuffle, deal)
- [ ] Implement hand utils (isSap, isLieng, isAnh, calculatePoints)
- [ ] Implement hand evaluator (evaluateHand, compareHands)
- [ ] Implement PotManager with side pot logic
- [ ] Implement TurnManager with timer support
- [ ] Implement BettingManager with action validation
- [ ] Implement GameManager orchestrating full lifecycle
- [ ] Unit test hand evaluation edge cases
- [ ] Unit test betting validation
- [ ] Unit test pot distribution with side pots

## Success Criteria
- All 52 cards generated correctly
- Shuffle produces different results each time
- Hand evaluation correctly ranks: Sap > Lieng > Di > 9 > ... > 0
- Tiebreaker works: same points -> suit hierarchy
- Lieng detection handles A-2-3 and Q-K-A
- Betting validation rejects invalid actions
- Basic all-in logic works (no side pots for MVP)
- Turn order is clockwise, skips folded players
- Auto-fold triggers after 30s timeout

## Risk Assessment
- **Hand evaluation edge cases**: A-2-3 straight vs Q-K-A. Clarify: K-A-2 is NOT a straight (standard rule). Test thoroughly.
- **All-in edge cases**: Without side pots, all-in player can only win proportional amount from each opponent. Keep logic simple.
<!-- Updated: Validation Session 1 - Simplified risk from side pot to basic all-in -->
- **Sap ranking for Aces**: A-A-A should be highest Sap (Ace high). Confirm this matches game rules.

## Security Considerations
- Deck shuffle on server only - never expose full deck to client
- Card data only sent to owning player; others see card-back
- All betting validation server-side; client amounts are suggestions only
- Prevent duplicate actions (ignore if not player's turn)

## Next Steps
- Phase 3: Wire game engine to Socket.io events
