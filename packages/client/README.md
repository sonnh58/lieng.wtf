# Lieng Card Game - React Client

React 18 client for the Lieng (Ba Cây) multiplayer card game.

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool & dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **Socket.io-client** - Real-time communication

## Project Structure

```
src/
├── components/          # React components
│   ├── betting-controls.tsx
│   ├── create-room-dialog.tsx
│   ├── game-status-bar.tsx
│   ├── game-table.tsx
│   ├── hand-display.tsx
│   ├── player-name-input.tsx
│   ├── player-seat.tsx
│   ├── playing-card.tsx
│   ├── pot-display.tsx
│   ├── room-list.tsx
│   ├── showdown-result.tsx
│   └── turn-timer.tsx
├── hooks/              # React hooks
│   └── use-socket-events.ts
├── pages/              # Page components
│   ├── game-page.tsx
│   └── lobby-page.tsx
├── socket/             # Socket.io client
│   └── socket-client.ts
├── stores/             # Zustand stores
│   ├── connection-store.ts
│   ├── game-store.ts
│   └── room-store.ts
├── utils/              # Utility functions
│   ├── card-display.ts
│   └── format-chips.ts
├── App.tsx             # Root component with routing
├── main.tsx            # Entry point
└── index.css           # Global styles
```

## Development

### Prerequisites

- Bun runtime installed
- Server running on `http://localhost:3000`

### Install Dependencies

```bash
bun install
```

### Start Dev Server

```bash
bun run dev
```

The client will be available at `http://localhost:5173`

### Build for Production

```bash
bun run build
```

### Preview Production Build

```bash
bun run preview
```

## Features

### UI Features
- ✅ Vietnamese language interface
- ✅ CSS-only playing cards (no images)
- ✅ Circular player layout (up to 12 players)
- ✅ Real-time game updates via Socket.io
- ✅ Turn timer with visual countdown
- ✅ Betting controls (Bỏ/Theo/Tố/Tố Tất)
- ✅ Showdown results modal
- ✅ Mobile responsive design

### Game Flow
1. **Name Input** - Enter player name (saved to localStorage)
2. **Lobby** - Browse/create rooms, auto-refresh room list
3. **Game Room** - Wait for players, host starts game
4. **Playing** - Deal cards, betting rounds, showdown
5. **Results** - View winner, hand rankings, chip payouts

## Socket Events

### Outgoing (Client → Server)
- `player:set-name {name}` - Set player name
- `room:create {name, config}` - Create room
- `room:join {roomId}` - Join room
- `room:leave` - Leave room
- `room:list` - Request room list
- `game:start` - Start game (host only)
- `game:action {action, amount?}` - Betting action

### Incoming (Server → Client)
- `room:list [rooms]` - Room list update
- `room:joined {room, playerId}` - Successfully joined
- `room:updated {room}` - Room state changed
- `room:error {message}` - Room operation error
- `game:dealt {cards}` - Receive cards
- `game:state {state}` - Full game state
- `game:phase {phase}` - Phase transition
- `game:turn {playerId, timeLeft}` - Player's turn
- `game:action-result {playerId, action, amount}` - Action completed
- `game:showdown {winners, hands, payouts}` - Game results
- `game:error {message}` - Game operation error

## State Management

### Connection Store
- `connected: boolean` - Socket connection status
- `playerId: string | null` - Current player ID
- `playerName: string | null` - Player name (persisted)

### Room Store
- `rooms: Room[]` - Available rooms
- `currentRoom: Room | null` - Joined room

### Game Store
- `phase: GamePhase` - Current game phase
- `myCards: Card[]` - Player's cards
- `players: Player[]` - All players in game
- `pot: number` - Current pot amount
- `currentBet: number` - Current bet to match
- `currentTurn: string | null` - Active player ID
- `turnTimeLeft: number` - Countdown timer
- `showdownResults` - Game results

## Styling

### Color Palette
- **Green**: `#166534` - Table felt, primary actions
- **Gray**: `#1f2937` - UI backgrounds, cards
- **Yellow**: `#fbbf24` - Pot, chips, dealer badge
- **Red**: `#dc2626` - Fold action
- **Blue**: `#2563eb` - Call/check action
- **Orange**: `#ea580c` - All-in action

### Card Design
- CSS-only cards using Unicode suit symbols (♠♣♥♦)
- Red suits: Hearts, Diamonds
- Black suits: Spades, Clubs
- Card back: Blue gradient with diamond pattern

## Configuration

### Socket Connection
Default: `http://localhost:3000`

To change, edit `src/socket/socket-client.ts`:
```typescript
socket = io('YOUR_SERVER_URL', {
  // ... options
});
```

### Room Defaults
Imported from `@lieng/shared`:
- Max players: 12
- Min players: 2
- Default ante: 100
- Starting chips: 10000
- Turn timer: 30s

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Android)

## Type Safety

All types imported from `@lieng/shared` workspace package:
- `Card`, `Rank`, `Suit`
- `Player`, `PlayerState`
- `Room`, `RoomConfig`
- `GamePhase`, `HandType`, `BettingAction`

TypeScript compilation verified with zero errors.

## Vietnamese Translations

| Action | Vietnamese |
|--------|-----------|
| Fold | Bỏ |
| Check | Xem |
| Call | Theo |
| Raise | Tố |
| All-in | Tố Tất |
| Sap | Sáp |
| Lieng | Liêng |
| Di | Đĩ |
| Normal | Thường |

## License

MIT
