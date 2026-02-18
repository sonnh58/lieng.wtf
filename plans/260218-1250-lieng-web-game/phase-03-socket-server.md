# Phase 03 - Socket Server

## Context Links
- [Plan Overview](plan.md)
- [Tech Stack Research](research/researcher-02-tech-stack-architecture.md)

## Overview
- **Priority**: P1
- **Status**: pending
- **Effort**: 5h
- **Description**: Socket.io server layer connecting clients to game engine. Room management, event routing, state sync, reconnection, rate limiting.

## Key Insights
- Socket.io rooms map directly to game rooms (built-in feature)
- Use `domain:action` event naming: `room:create`, `game:bet`, etc.
- Full state on join/reconnect; delta updates during gameplay
- Server-side turn timer ensures consistency regardless of client clock
- Connection State Recovery for brief disconnects; manual rejoin for longer ones

## Requirements
### Functional
- Create/join/leave/list rooms via socket events
- Start game when host triggers and >= 2 players
- Route player actions to GameManager
- Broadcast state updates to room after each action
- Handle player disconnect (grace period then auto-fold)
- Reconnect player to active game
- Turn timer enforcement (server-side)

### Non-Functional
- < 100ms event round-trip on local network
- Handle 20 players per room smoothly
- Rate limit: max 10 events/second per client

## Architecture

### Module Structure 
```
packages/server/src/
├── index.ts                    # Express + Socket.io bootstrap
├── socket/
│   ├── socket-handler.ts       # Main connection handler, event router
│   ├── room-handler.ts         # Room CRUD events
│   └── game-handler.ts         # Game action events
├── managers/
│   ├── room-manager.ts         # In-memory room store (Map<roomId, Room>)
│   └── player-manager.ts       # Socket-to-player mapping, reconnection
├── game/                       # (from Phase 2)
│   ├── game-manager.ts
│   ├── betting-manager.ts
│   ├── turn-manager.ts
│   └── pot-manager.ts
└── middleware/
    └── rate-limiter.ts         # Per-socket rate limiting
```

### Socket Events

#### Client -> Server
| Event | Payload | Description |
|-------|---------|-------------|
| `player:set-name` | `{name}` | Set display name |
| `room:create` | `{name, config?}` | Create new room |
| `room:join` | `{roomId}` | Join existing room |
| `room:leave` | `{}` | Leave current room |
| `room:list` | `{}` | Request room list |
| `game:start` | `{}` | Host starts game |
| `game:action` | `{action, amount?}` | Betting action (TO/THEO/BO/TO_TAT) |
| `game:ready` | `{}` | Ready for next round |

#### Server -> Client
| Event | Payload | Description |
|-------|---------|-------------|
| `room:list` | `Room[]` | Room list response |
| `room:joined` | `{room, playerId}` | Confirm join + player ID |
| `room:updated` | `{room}` | Room state changed (player join/leave) |
| `room:error` | `{message}` | Room operation error |
| `game:started` | `{gameState}` | Game started, initial state |
| `game:dealt` | `{cards}` | Your 3 cards (private) |
| `game:state` | `{publicState}` | Full public game state update |
| `game:turn` | `{playerId, timeLeft}` | Whose turn + timer |
| `game:action-result` | `{playerId, action, amount}` | Broadcast action taken |
| `game:showdown` | `{results}` | All hands revealed + winner |
| `game:ended` | `{winners, potDistribution}` | Round end summary |
| `game:error` | `{message}` | Invalid action feedback |
| `player:reconnected` | `{playerId}` | Player reconnected notification |

### State Sync Strategy
- **On join/reconnect**: Send full `ClientGameState` (filtered for that player)
- **During game**: Send delta events (`game:action-result`, `game:turn`)
- **Showdown**: Send full reveal (`game:showdown` with all hands)

## Related Code Files

### Files to Create
- `packages/server/src/socket/socket-handler.ts`
- `packages/server/src/socket/room-handler.ts`
- `packages/server/src/socket/game-handler.ts`
- `packages/server/src/managers/room-manager.ts`
- `packages/server/src/managers/player-manager.ts`
- `packages/server/src/middleware/rate-limiter.ts`

### Files to Modify
- `packages/server/src/index.ts` (wire up socket handlers)
- `packages/shared/src/types/room.ts` (add socket event types if needed)

## Implementation Steps

### 1. Room Manager (`managers/room-manager.ts`)
1. `RoomManager` class with `Map<string, Room>` storage
2. `createRoom(name, hostId, config?): Room` - generate ID (nanoid), create room
3. `joinRoom(roomId, player): Room` - add player, validate max players
4. `leaveRoom(roomId, playerId): Room | null` - remove player, delete room if empty
5. `listRooms(): RoomSummary[]` - return public room info (name, playerCount, status)
6. `getRoom(roomId): Room | null`

### 2. Player Manager (`managers/player-manager.ts`)
1. `PlayerManager` class with `Map<socketId, PlayerInfo>` and `Map<playerId, socketId>`
2. `registerPlayer(socketId, name): PlayerInfo` - create player with unique ID
3. `getPlayer(socketId): PlayerInfo`
4. `handleDisconnect(socketId)` - start grace timer (30s), mark as disconnected
5. `handleReconnect(socketId, playerId)` - restore mapping, cancel grace timer
6. `removePlayer(socketId)` - clean up after grace period

### 3. Socket Handler (`socket/socket-handler.ts`)
1. Main `setupSocketHandlers(io: Server)` function
2. On `connection`: register socket, apply rate limiter middleware
3. Route events to room-handler and game-handler
4. On `disconnect`: trigger PlayerManager disconnect flow
5. Apply rate limiting middleware per socket

### 4. Room Handler (`socket/room-handler.ts`)
1. `setupRoomHandlers(socket, io, roomManager, playerManager)`
2. Handle `player:set-name` - validate name (2-20 chars, no HTML)
3. Handle `room:create` - create room, auto-join creator, join socket.io room
4. Handle `room:join` - validate room exists, not full, join socket.io room
5. Handle `room:leave` - leave socket.io room, notify others
6. Handle `room:list` - return filtered list
7. Broadcast `room:updated` to room on any change

### 5. Game Handler (`socket/game-handler.ts`)
1. `setupGameHandlers(socket, io, roomManager, playerManager)`
2. Handle `game:start`:
   - Validate: sender is host, >= 2 players, game not already running
   - Create GameManager for room
   - Start round -> deal cards
   - Send `game:dealt` (private cards) to each player individually
   - Broadcast `game:state` (public state) to room
   - Broadcast `game:turn` for first player
3. Handle `game:action`:
   - Validate: sender's turn, action valid
   - Process via GameManager
   - Broadcast `game:action-result` to room
   - If round over -> trigger showdown
   - Else broadcast `game:turn` for next player
4. Handle `game:ready` - track ready players, auto-start next round when all ready
5. GameManager event listeners:
   - On timeout -> auto-fold, broadcast
   - On showdown -> broadcast results
   - On round end -> broadcast summary

### 6. Rate Limiter (`middleware/rate-limiter.ts`)
1. Simple token bucket per socket ID
2. 10 events/second limit
3. On exceed: emit `error` event with "Rate limited" message
4. Reset bucket every second

### 7. Wire Up (`index.ts`)
1. Create Express app + HTTP server
2. Attach Socket.io with CORS config
3. Enable Connection State Recovery (maxDisconnectionDuration: 60s)
4. Create RoomManager + PlayerManager singletons
5. Call `setupSocketHandlers(io)`
6. Health check endpoint: `GET /health`

## Todo List
- [ ] Implement RoomManager (CRUD, in-memory Map)
- [ ] Implement PlayerManager (socket mapping, disconnect/reconnect)
- [ ] Implement socket-handler (connection, routing, disconnect)
- [ ] Implement room-handler (create/join/leave/list)
- [ ] Implement game-handler (start, actions, showdown flow)
- [ ] Implement rate limiter middleware
- [ ] Wire everything in index.ts
- [ ] Test room create/join/leave flow
- [ ] Test game start -> action -> showdown flow
- [ ] Test disconnect/reconnect during active game

## Success Criteria
- Create room, join with 2+ clients, see room updates
- Start game, receive private cards per player
- Process betting actions, broadcast to all players
- Showdown triggers and reveals all hands
- Disconnect player reconnects within grace period
- Rate limiter blocks excessive events
- Room cleaned up when all players leave

## Risk Assessment
- **Memory leaks**: Rooms/games not cleaned up. Mitigate: cleanup on room empty, periodic sweep of stale rooms.
- **Race conditions**: Two players acting simultaneously. Mitigate: process actions sequentially per room (single-threaded Node.js helps here).
- **Reconnection edge cases**: Player reconnects during showdown or between rounds. Mitigate: always send full state on reconnect.

## Security Considerations
- Validate all incoming event payloads (type, length, range)
- Never send other players' cards except during showdown
- Rate limit prevents event flooding
- Input sanitize player names and room names (strip HTML)
- Check player is in room before processing game actions
- Check it's player's turn before processing betting action

## Next Steps
- Phase 4: Build React client consuming these socket events
