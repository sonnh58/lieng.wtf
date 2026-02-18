# Phase 4 - Client UI Component Hierarchy

## Application Flow

```
App.tsx (Router)
├─ view: 'name-input'
│  └─ PlayerNameInput
│     └─ [Full-screen name form]
│
├─ view: 'lobby'
│  └─ LobbyPage
│     ├─ Header
│     ├─ RoomList
│     │  └─ [Room cards with join buttons]
│     └─ CreateRoomDialog (conditional)
│        └─ [Modal form]
│
└─ view: 'game'
   └─ GamePage
      ├─ Header (with leave/start buttons)
      └─ GameTable
         ├─ GameStatusBar
         ├─ Green felt table
         │  ├─ PotDisplay (center)
         │  └─ PlayerSeat × N (circular layout)
         │     ├─ HandDisplay (3 cards)
         │     ├─ TurnTimer (if current turn)
         │     └─ [Player info: name, chips, bet]
         ├─ Bottom controls panel
         │  ├─ HandDisplay (my cards, size: lg)
         │  └─ BettingControls (if my turn)
         │     └─ [Bỏ/Theo/Tố/Tố Tất buttons]
         └─ ShowdownResult (conditional overlay)
            └─ [Winner announcement + all hands]
```

## Component Dependencies

### Pages
- **PlayerNameInput**: stores/connection-store, socket/socket-client
- **LobbyPage**: stores/room-store, stores/connection-store, components/RoomList, components/CreateRoomDialog
- **GamePage**: stores/room-store, stores/game-store, components/GameTable

### Core Components
- **GameTable**: All game-related components, stores/game-store, stores/connection-store
- **PlayerSeat**: components/HandDisplay, components/TurnTimer, utils/format-chips
- **HandDisplay**: components/PlayingCard
- **PlayingCard**: utils/card-display
- **BettingControls**: socket/socket-client, utils/format-chips
- **ShowdownResult**: components/PlayingCard, utils/card-display, utils/format-chips

### Room Components
- **RoomList**: socket/socket-client, utils/format-chips
- **CreateRoomDialog**: socket/socket-client, @lieng/shared (constants)

### Utilities
- **card-display.ts**: @lieng/shared (Rank, Suit enums)
- **format-chips.ts**: Pure function, no dependencies

### State Management
- **connection-store.ts**: zustand, localStorage persistence
- **room-store.ts**: zustand, @lieng/shared (Room type)
- **game-store.ts**: zustand, @lieng/shared (Card, Player, GamePhase types)

### Hooks
- **use-socket-events.ts**: All stores, socket/socket-client, @lieng/shared types

## Data Flow

```
Socket Server
    ↓ events
socket-client.ts (singleton)
    ↓ emits to
use-socket-events.ts (hook)
    ↓ updates
Zustand Stores (connection, room, game)
    ↓ consumed by
React Components
    ↓ user actions
Socket Client
    ↓ emits to
Socket Server
```

## State Management Strategy

### Connection Store
- **Purpose**: Authentication state, player identity
- **Persistence**: localStorage (playerName only)
- **Consumers**: PlayerNameInput, LobbyPage, GameTable

### Room Store
- **Purpose**: Room list, current room state
- **Persistence**: None (session only)
- **Consumers**: LobbyPage, GamePage, RoomList

### Game Store
- **Purpose**: Game state (cards, players, pot, betting)
- **Persistence**: None (session only)
- **Consumers**: GameTable, BettingControls, ShowdownResult

## Socket Event Routing

### Incoming Events → Store Actions
| Socket Event | Store Action | Component Effect |
|--------------|--------------|------------------|
| `connect` | `setConnected(true)` | Enable UI |
| `disconnect` | `setConnected(false)` | Show disconnected state |
| `room:list` | `setRooms(rooms)` | Update RoomList |
| `room:joined` | `setCurrentRoom(room)` + `setPlayerId(id)` | Navigate to GamePage |
| `room:updated` | `updateRoom(room)` | Re-render room info |
| `game:dealt` | `setMyCards(cards)` | Show cards in HandDisplay |
| `game:state` | `updateGameState(state)` | Update all game UI |
| `game:turn` | `setCurrentTurn(id)` + `setTurnTimeLeft(time)` | Show turn indicator |
| `game:phase` | `setPhase(phase)` | Update GameStatusBar |
| `game:showdown` | `setShowdownResults(results)` | Show ShowdownResult modal |

### User Actions → Socket Events
| Component | User Action | Socket Event | Payload |
|-----------|-------------|--------------|---------|
| PlayerNameInput | Submit name | `player:set-name` | `{name}` |
| CreateRoomDialog | Create room | `room:create` | `{name, config}` |
| RoomList | Join room | `room:join` | `{roomId}` |
| GamePage | Leave room | `room:leave` | - |
| GamePage | Start game | `game:start` | - |
| BettingControls | Fold | `game:action` | `{action: BO}` |
| BettingControls | Call/Check | `game:action` | `{action: THEO}` |
| BettingControls | Raise | `game:action` | `{action: TO, amount}` |
| BettingControls | All-in | `game:action` | `{action: TO_TAT}` |

## CSS Architecture

### Tailwind Utilities
- Layout: `flex`, `grid`, `absolute`, `relative`
- Colors: Green palette (table), Gray (UI), Yellow (chips), Red/Blue (actions)
- Spacing: Consistent `p-*`, `m-*`, `gap-*` values
- Responsive: `md:`, `lg:` breakpoints

### Custom CSS (index.css)
- `.playing-card`: Card aspect ratio, borders, shadows
- `.playing-card-back`: Blue gradient with diamond icon
- Animations: `animate-pulse-slow`, chip stack gradient
- Input number spinner removal (cleaner UI)

## File Size Distribution

| Category | Files | Avg Lines | Total Lines |
|----------|-------|-----------|-------------|
| Stores | 3 | 45 | 135 |
| Components | 13 | 78 | 1014 |
| Pages | 3 | 72 | 216 |
| Utils | 2 | 30 | 60 |
| Hooks | 1 | 62 | 62 |
| **Total** | **22** | **68** | **1,487** |

All files under 200 lines ✅

## TypeScript Integration

### Shared Types Used
- `Card` (rank, suit)
- `Suit` enum (SPADE, CLUB, HEART, DIAMOND)
- `Rank` enum (ACE...KING)
- `Player` (id, name, chips, cards, bet, state, seatIndex)
- `PlayerState` enum (WAITING, PLAYING, FOLDED, ALL_IN)
- `Room` (id, name, hostId, players, config, gameId)
- `RoomConfig` (maxPlayers, ante, minBet, maxBet, turnTimer, startingChips)
- `GamePhase` enum (WAITING, DEALING, BETTING, SHOWDOWN, ENDED)
- `HandType` enum (SAP, LIENG, DI, NORMAL)
- `BettingAction` enum (BO, THEO, TO, TO_TAT)

### Constants Used
- `MAX_PLAYERS` (12)
- `MIN_PLAYERS` (2)
- `DEFAULT_ROOM_CONFIG` (default room settings)

---

**Diagram generated:** 2026-02-18 16:50
**Status:** ✅ Implementation complete
