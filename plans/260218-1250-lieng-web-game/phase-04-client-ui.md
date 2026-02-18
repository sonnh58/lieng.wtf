# Phase 04 - Client UI

## Context Links
- [Plan Overview](plan.md)
- [Tech Stack Research](research/researcher-02-tech-stack-architecture.md)
- [Socket Events](phase-03-socket-server.md) (event reference)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 7h
- **Description**: React frontend with Zustand state, Socket.io client, CSS-only playing cards, circular player layout, Vietnamese UI. Two main views: Lobby and Game Table.

## Key Insights
- Zustand stores sync with socket events (socket listener updates store directly)
- CSS-only cards: div + CSS classes for suit/rank, Unicode symbols, red/black colors
- Circular player layout via CSS transforms (position around ellipse)
- Mobile-first: portrait for phones, landscape optimization for desktop
- Vietnamese text throughout (button labels, messages, hand names)

## Requirements
### Functional
- Player name input on first visit (stored in localStorage)
- Lobby: list rooms, create room, join room
- Game table: see own cards, other players (card-backs), pot, current bet
- Betting controls: To (raise), Theo (call), Bo (fold), To Tat (all-in)
- Turn indicator + countdown timer
- Showdown: reveal all hands, highlight winner, show hand type
- Chip count display per player
- Responsive: works on mobile (360px+) and desktop

### Non-Functional
- First meaningful paint < 2s
- Smooth animations (60fps CSS transitions)
- All text in Vietnamese

## Architecture

### Module Structure
```
packages/client/src/
├── main.tsx
├── App.tsx                         # Router: Lobby vs GameTable
├── index.css                       # Tailwind + custom card styles
├── socket/
│   └── socket-client.ts            # Socket.io connection singleton
├── stores/
│   ├── connection-store.ts         # Connected status, playerId, name
│   ├── room-store.ts               # Room list, current room
│   └── game-store.ts               # Game state, cards, pot, turn
├── hooks/
│   └── use-socket-events.ts        # Wire socket events to stores
├── pages/
│   ├── lobby-page.tsx              # Room list + create room
│   └── game-page.tsx               # Game table view
├── components/
│   ├── player-name-input.tsx       # Name input modal/screen
│   ├── room-list.tsx               # Available rooms list
│   ├── create-room-dialog.tsx      # Create room form
│   ├── game-table.tsx              # Main game area (table + seats)
│   ├── player-seat.tsx             # Single player position
│   ├── playing-card.tsx            # CSS-only card component
│   ├── hand-display.tsx            # Player's 3 cards
│   ├── betting-controls.tsx        # Action buttons
│   ├── pot-display.tsx             # Center pot amount
│   ├── turn-timer.tsx              # Countdown timer ring
│   ├── showdown-result.tsx         # Hand reveal + winner
│   └── game-status-bar.tsx         # Phase indicator, messages
└── utils/
    ├── card-display.ts             # Card rank/suit to display strings
    └── format-chips.ts             # Number formatting
```

### State Management (Zustand)

**connection-store.ts**
```ts
{ connected: boolean, playerId: string | null, playerName: string, setName, socket }
```

**room-store.ts**
```ts
{ rooms: RoomSummary[], currentRoom: Room | null, setRooms, setCurrentRoom, leaveRoom }
```

**game-store.ts**
```ts
{ phase: GamePhase, myCards: Card[], players: PublicPlayer[], pot: number,
  currentBet: number, currentTurn: string | null, turnTimeLeft: number,
  showdownResults: ShowdownResult | null, ... actions }
```

## Related Code Files

### Files to Create
- `packages/client/src/socket/socket-client.ts`
- `packages/client/src/stores/connection-store.ts`
- `packages/client/src/stores/room-store.ts`
- `packages/client/src/stores/game-store.ts`
- `packages/client/src/hooks/use-socket-events.ts`
- `packages/client/src/pages/lobby-page.tsx`
- `packages/client/src/pages/game-page.tsx`
- `packages/client/src/components/player-name-input.tsx`
- `packages/client/src/components/room-list.tsx`
- `packages/client/src/components/create-room-dialog.tsx`
- `packages/client/src/components/game-table.tsx`
- `packages/client/src/components/player-seat.tsx`
- `packages/client/src/components/playing-card.tsx`
- `packages/client/src/components/hand-display.tsx`
- `packages/client/src/components/betting-controls.tsx`
- `packages/client/src/components/pot-display.tsx`
- `packages/client/src/components/turn-timer.tsx`
- `packages/client/src/components/showdown-result.tsx`
- `packages/client/src/components/game-status-bar.tsx`
- `packages/client/src/utils/card-display.ts`
- `packages/client/src/utils/format-chips.ts`

### Files to Modify
- `packages/client/src/App.tsx`
- `packages/client/src/index.css`

## Implementation Steps

### 1. Socket Client (`socket/socket-client.ts`)
1. Create socket instance: `io('http://localhost:3001', { autoConnect: false })`
2. Export `connectSocket(name)`, `disconnectSocket()`, `getSocket()`
3. Auto-reconnect enabled (Socket.io default)

### 2. Zustand Stores
1. **connection-store**: manage name (persisted to localStorage), connected state, playerId
2. **room-store**: rooms array, current room, CRUD helpers
3. **game-store**: full game state, update methods for each socket event

### 3. Socket Event Hook (`hooks/use-socket-events.ts`)
1. Custom hook that listens to all server events
2. On `room:list` -> update roomStore
3. On `room:joined` -> set currentRoom, navigate to game page
4. On `game:dealt` -> set myCards in gameStore
5. On `game:state` -> update full public state
6. On `game:turn` -> set currentTurn + start timer
7. On `game:action-result` -> update player states
8. On `game:showdown` -> set showdown results
9. On `game:ended` -> show round summary
10. On `game:error` -> show toast/alert
11. Cleanup listeners on unmount

### 4. Player Name Input (`components/player-name-input.tsx`)
1. Full-screen overlay on first visit
2. Text input: "Nhap ten cua ban" (Enter your name)
3. Save to localStorage + connectionStore
4. Connect socket after name set

### 5. Lobby Page (`pages/lobby-page.tsx`)
1. Header: "Lieng - Phong Cho" (Lobby)
2. Room list component showing: room name, player count, status
3. "Tao Phong" (Create Room) button -> dialog
4. Click room -> join room
5. Auto-refresh room list every 5s

### 6. Create Room Dialog (`components/create-room-dialog.tsx`)
1. Room name input
2. Config: max players (2-12), ante amount, starting chips
<!-- Updated: Validation Session 1 - Max 12 players, added startingChips config -->
3. "Tao" (Create) button

### 7. Playing Card Component (`components/playing-card.tsx`)
1. Props: `{ card?: Card, faceDown?: boolean, small?: boolean }`
2. Face-down: card-back pattern (CSS gradient/pattern)
3. Face-up: rank + suit symbol, red for hearts/diamonds, black for clubs/spades
4. Responsive sizing via em units
5. CSS classes: `.card`, `.card-red`, `.card-black`, `.card-back`
6. Display: rank in corners, large suit symbol in center

### 8. Game Table (`components/game-table.tsx`)
1. Green felt background (CSS gradient)
2. Circular/oval layout for player seats
3. Center: pot display
4. Bottom: own cards (face-up) + betting controls
5. Other players: card-backs + name + chip count + bet amount
6. CSS transform-based circular positioning using player count

### 9. Player Seat (`components/player-seat.tsx`)
1. Props: `{ player, isCurrentTurn, isMe, position }`
2. Show: name, chip count, bet amount, cards (face-up if me or showdown, else back)
3. Turn indicator: glowing border or highlight
4. Folded: dimmed/grayed out
5. All-in badge
6. Dealer chip indicator

### 10. Betting Controls (`components/betting-controls.tsx`)
1. Only show when it's my turn
2. Buttons: "Bo" (Fold), "Theo {amount}" (Call), "To" (Raise) with amount slider/input, "To Tat" (All-in)
3. Disable invalid actions (e.g., can't call if not enough chips)
4. Show current bet to match
5. Raise input: min/max validation
6. Emit `game:action` on click

### 11. Turn Timer (`components/turn-timer.tsx`)
1. Circular countdown (CSS animation, 30s)
2. Show seconds remaining
3. Warning color at < 10s
4. Attached to current player's seat

### 12. Showdown Result (`components/showdown-result.tsx`)
1. Overlay/modal showing all remaining players' hands
2. Hand type labels in Vietnamese: "Sáp", "Liêng", "Đĩ", "X điểm"
<!-- Updated: Validation Session 1 - Ảnh→Đĩ terminology -->
3. Winner highlighted with gold border
4. Pot amount won
5. "Choi lai" (Play again) / "Roi phong" (Leave) buttons

### 13. Styling & Responsive
1. Tailwind utilities for layout, spacing, colors
2. Custom CSS for card styling, table felt, animations
3. Mobile: stacked layout, cards at bottom, compact seats
4. Desktop: oval table, larger cards, more info visible
5. Dark theme (card table aesthetic): dark green/navy background

## Todo List
- [ ] Set up socket client singleton
- [ ] Create Zustand stores (connection, room, game)
- [ ] Implement socket event hook
- [ ] Build player name input screen
- [ ] Build lobby page with room list
- [ ] Build create room dialog
- [ ] Build CSS-only playing card component
- [ ] Build game table with circular player layout
- [ ] Build player seat component
- [ ] Build betting controls
- [ ] Build turn timer
- [ ] Build showdown result overlay
- [ ] Add Vietnamese text throughout
- [ ] Style with Tailwind + custom card CSS
- [ ] Test responsive on mobile viewport
- [ ] Test full game flow in UI

## Success Criteria
- Player enters name, sees lobby with room list
- Create/join room navigates to game table
- Cards render correctly (all 52 cards, red/black suits)
- Circular layout positions players around table
- Betting controls enable/disable correctly per turn
- Timer counts down visually
- Showdown reveals hands with Vietnamese labels
- Works on 360px mobile and 1920px desktop

## Risk Assessment
- **CSS card rendering**: Edge cases with card size on small screens. Mitigate: use em units, test on small viewports.
- **Circular layout**: Max 12 players. Ellipse layout should fit comfortably. Test with 10-12.
<!-- Updated: Validation Session 1 - Reduced max from 20 to 12 -->
- **Socket event sync**: Stale state if events missed. Mitigate: full state resync on reconnect, sequence numbers.

## Security Considerations
- Never display other players' cards (unless showdown)
- Sanitize player names displayed in UI (XSS prevention)
- Don't store sensitive data in localStorage (only display name)
- Socket connection over WSS in production

## Next Steps
- Phase 5: Integration testing and polish
