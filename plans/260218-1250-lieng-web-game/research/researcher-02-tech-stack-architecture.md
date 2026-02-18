# Tech Stack & Architecture Research: Real-Time Multiplayer Card Game

**Date**: 2026-02-18
**Focus**: React + Node.js + Socket.io best practices for card games
**Scope**: Server architecture, Socket.io patterns, tech stack, UI, security

---

## 1. Server Architecture for Card Games

### Authoritative Server Pattern
- **Never trust client**: All game logic executes server-side to prevent exploits/hacks
- **Single source of truth**: Server maintains game state; clients render what server dictates
- **Benefits**: Prevents manipulation, ensures consistent state across all players, mitigates network discrepancies
- **Implementation**: Client sends actions → Server validates → Server updates state → Server broadcasts to clients

### Game State Machine Design
- **Centralized GameState**: Create gameState object per roomId containing:
  - Room metadata (id, name, player list)
  - Current game phase (waiting, dealing, betting, showdown, etc.)
  - Deck state, dealt cards, pot, active player index
  - Turn timers, betting history
- **Storage**: Use database (not in-memory) for persistence across server restarts and horizontal scaling
- **State transitions**: Validate state changes on server before broadcasting

### Room/Table Management with Socket.io
- **Built-in rooms**: Socket.io provides native room concept for grouping connections
- **Room lifecycle**: Create → Join → Leave → Destroy
- **Room metadata**: Track connected sockets, player seats, spectators, game phase
- **Broadcasting**: Use `io.to(roomId).emit(event, data)` to send updates to all room members
- **Emit to all except sender**: `socket.to(roomId).emit(event, data)`

### Handling 20 Players Per Table
- **Seat management**: Fixed seat array (0-19), track occupied/empty seats
- **Player roles**: Active players vs spectators (spectators can watch without seat)
- **Turn management**: Circular queue with active player index
- **Event throttling**: Batch non-critical updates to reduce bandwidth for large groups
- **Scalability**: Use Socket.io adapters (Redis/NATS) for multi-server deployments

### Deck Management (Server-Side)
- **Fisher-Yates shuffle**: Unbiased shuffle algorithm - O(n) time, in-place
  ```js
  function shuffle(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }
  ```
- **Deck initialization**: Create standard 52-card deck on game start
- **Deal cards**: Pop from shuffled deck array, assign to player hands
- **Card secrecy**: Never send full deck or other players' hands to client; only send visible cards
- **Burn cards**: Track discarded/burned cards separately

---

## 2. Socket.io Best Practices for Gaming

### Event Naming Conventions
- **Pattern**: Use `domain:action` format (e.g., `game:join`, `game:bet`, `card:deal`, `player:fold`)
- **Benefits**: Clear event organization, discoverable across codebase
- **Examples**:
  - `room:create`, `room:join`, `room:leave`
  - `game:start`, `game:bet`, `game:fold`, `game:end`
  - `card:deal`, `card:reveal`
  - `player:connect`, `player:disconnect`

### Room Management
- **Creating rooms**: `socket.join(roomId)` on connection with room ID
- **Leaving rooms**: `socket.leave(roomId)` on disconnect or explicit leave
- **Room events**: Listen to `disconnect` event to handle cleanup
- **Multiple rooms**: Players can be in lobby + game room simultaneously
- **Spectators**: Join room without seat assignment

### Reconnection Handling
- **Auto-reconnect**: Socket.io automatically reconnects with exponential backoff
- **Connection State Recovery (CSR)**: Enable on server to restore session after temporary disconnect
  - Server stores client state for configurable duration
  - Client sends session ID + last processed offset on reconnect
  - Server restores state if within recovery window
- **Session recovery**:
  ```js
  io.on('connection', (socket) => {
    if (socket.recovered) {
      // Connection state recovered
    } else {
      // New connection, send full state
    }
  });
  ```
- **Buffering**: Socket.io buffers packets during disconnect, sends on reconnect

### State Synchronization Strategies
- **Full state on join**: Send complete game state when player joins/reconnects
- **Delta updates**: Send only changes (e.g., new bet amount, not entire pot state)
- **Event sequencing**: Include sequence numbers to detect missed events
- **Volatile events**: Use for high-frequency updates (player positions) - only latest value matters
  ```js
  socket.volatile.emit('cursor:move', { x, y });
  ```
- **Acknowledgements**: Use for critical actions:
  ```js
  socket.emit('game:bet', { amount }, (ack) => {
    if (ack.success) { /* update UI */ }
  });
  ```

### Latency Compensation
- **Ping measurement**: Periodically measure client-server latency
  ```js
  // Client sends ping, server echoes, client calculates RTT
  const start = Date.now();
  socket.emit('ping', () => {
    const latency = Date.now() - start;
  });
  ```
- **Optimistic UI updates**: Update client UI immediately, rollback if server rejects
- **Server timestamps**: Include server time in broadcasts for client-side interpolation
- **Turn timers**: Use server time for countdown timers, not client time

---

## 3. Recommended Tech Stack

### Frontend
- **React 18+**: Concurrent features, automatic batching, Suspense
- **TypeScript 5+**: Type safety, shared types with backend
- **Build tool**: Vite (fast HMR, optimized builds)
- **Socket.io-client**: `npm install socket.io-client`
- **State management**: Zustand (lightweight, TypeScript-friendly, no boilerplate)
  - 30%+ YoY growth, 40% adoption in 2026
  - Better for game state (local, fast updates) than Redux
  - Use `useSyncExternalStore` for React 18 concurrency
- **Styling**: Tailwind CSS (utility-first, fast prototyping) or CSS Modules (scoped styles)
- **Animations**: CSS transitions for cards, Framer Motion for complex sequences

### Backend
- **Node.js 20+**: LTS version, modern JS features
- **Express**: HTTP server foundation
- **Socket.io 4+**: WebSocket abstraction with fallbacks
- **TypeScript 5+**: Shared types with frontend
- **Database**: PostgreSQL (game history, user data) + Redis (session storage, Socket.io adapter)
- **ORM**: Prisma (type-safe queries, migrations)

### Project Structure (Monorepo)
```
/lieng-2026
├── /packages
│   ├── /shared          # Shared types, constants, game logic utils
│   │   ├── /types       # Card, Player, GameState interfaces
│   │   ├── /constants   # Card values, game rules
│   │   └── /utils       # Shuffle, hand evaluation
│   ├── /client          # React frontend (Vite + TypeScript)
│   └── /server          # Node.js backend (Express + Socket.io)
├── package.json         # Workspace root
└── tsconfig.json        # Shared TS config
```
- **Monorepo tool**: npm workspaces or pnpm workspaces (simpler than Nx/Turborepo for small projects)
- **Shared types**: Import same interfaces in client/server for type safety

---

## 4. Card Game UI Patterns

### CSS-Only Playing Cards (No Images)
- **Approach**: Use Unicode card characters (♠ ♥ ♦ ♣) + CSS styling
- **Benefits**: Fast download, scalable, smooth anti-aliasing at any size
- **Implementation**:
  ```html
  <div class="card card-hearts card-9">
    <span></span><span></span>
  </div>
  ```
- **Libraries**:
  - `css-playing-cards` (Jeff Yaus): Single CSS file, all 52 cards via classes
  - Dimensions use `em` units - resize entire deck by changing base font size
- **Customization**: Easy to change colors, borders, shadows via CSS

### Table Layout for Variable Player Count
- **Circular layout**: Position players around ellipse/circle using CSS transforms
  ```css
  .player {
    position: absolute;
    transform: rotate(calc(var(--player-index) * 360deg / var(--player-count)))
              translateY(-200px)
              rotate(calc(var(--player-index) * -360deg / var(--player-count)));
  }
  ```
- **Flexbox/Grid fallback**: For simpler linear layouts on small screens
- **Responsive**: Stack vertically on mobile, circular on desktop
- **Seat indicators**: Show empty seats for joinable games

### Animations
- **Card dealing**: Stagger CSS animations with `animation-delay`
  ```css
  .card { animation: deal 0.3s ease-out; animation-delay: calc(var(--card-index) * 0.1s); }
  @keyframes deal { from { transform: translateY(-100px); opacity: 0; } }
  ```
- **Card flipping**: CSS 3D transforms (`rotateY(180deg)`)
- **Chip movement**: CSS transitions for pot updates
- **Libraries**: react-motion, Framer Motion for complex sequences

### Responsive Design
- **Mobile-first**: Design for portrait phones, enhance for desktop
- **Touch targets**: Large buttons (min 44px) for mobile
- **Landscape mode**: Optimize for phone landscape (common for games)
- **Desktop**: Show more info (player stats, hand history sidebar)

---

## 5. Security Considerations

### Server-Authoritative Design
- **Never trust client**: Client only sends player actions (bet, fold, etc.), not game state updates
- **Validate all inputs**: Check action validity before applying (e.g., can player afford bet?)
- **Example**: Client sends `game:bet` with amount → Server checks player balance, turn order, bet limits → Server updates state or rejects

### Input Validation
- **Type checking**: Validate data types (number for bet amount, not string)
- **Sanitization**: Remove/encode HTML characters using DOMPurify
- **Max length**: Limit string inputs (room names, chat messages)
- **Range checks**: Validate numeric ranges (bet between min/max)

### Rate Limiting
- **Prevent DoS**: Limit events per client per time window
- **Libraries**: `express-rate-limit`, `rate-limiter-flexible`
- **Per-socket limits**: Track events by `socket.id` or IP
  ```js
  const limiter = new RateLimiterMemory({ points: 10, duration: 1 }); // 10 actions/second
  ```
- **Graceful degradation**: Reject excess requests with error message, don't disconnect

### Preventing Card Peeking
- **Partial state**: Only send player their own cards + public cards
- **Event filtering**: Don't broadcast card data until reveal phase
- **Secure shuffle**: Shuffle on server with crypto-grade RNG if high stakes
- **Checksum validation**: Optionally hash game state to detect tampering (overkill for casual games)

### Additional Security
- **TLS/SSL**: Use HTTPS/WSS for encrypted communication
- **Authentication**: JWT tokens for session management
- **Replay attack prevention**: Sequence numbers or timestamps in events
- **Message integrity**: HMAC or checksums to detect tampering (advanced)

---

## Unresolved Questions
1. **Lieng game rules**: Need specific betting structure, winning conditions, card combinations
2. **Player authentication**: OAuth vs email/password vs guest play?
3. **Monetization**: Real money vs virtual chips? (affects security/compliance requirements)
4. **Scale targets**: Expected concurrent users? Determines hosting/database choices
5. **Mobile app**: Native mobile or PWA? Affects UI framework choices

---

## Sources
- [Multiplayer Card Game with Phaser/Socket.IO](https://www.freecodecamp.org/news/how-to-build-a-multiplayer-card-game-with-phaser-3-express-and-socket-io/)
- [Server-Authoritative Card Games](https://www.mplgaming.com/server-authoritative-games/)
- [Building Multiplayer Games With Node.js](https://modernweb.com/building-multiplayer-games-node-js-socket-io/)
- [Real-Time Multiplayer Tic Tac Toe](https://medium.com/@vaibhavkhushalani/building-a-real-time-multiplayer-tic-tac-toe-with-next-js-socket-io-open-source-fc0804a940a5)
- [Socket.IO Rooms Documentation](https://socket.io/docs/v3/rooms/)
- [Socket.IO Rooms Mastery Guide 2025](https://www.videosdk.live/developer-hub/socketio/socketio-rooms)
- [Game State Synchronization](https://medium.com/swlh/game-design-using-socket-io-and-deployments-on-scale-part-2-254e674bc94b)
- [Socket.IO Connection State Recovery](https://socket.io/docs/v4/connection-state-recovery)
- [Socket.IO Handling Disconnections](https://socket.io/docs/v4/tutorial/handling-disconnections)
- [Fisher-Yates Shuffle Wikipedia](https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle)
- [Scalable Real-Time Blackjack Server](https://stackademic.com/blog/building-a-scalable-real-time-blackjack-server-the-ultimate-engineering-guide)
- [CSS Playing Cards by Jeff Yaus](https://jyaus.github.io/css-playing-cards/)
- [Creating Playing Cards with CSS/HTML](https://htmyell.com/blog/creating-playing-cards-with-css-html/)
- [Socket.IO Security Best Practices](https://moldstud.com/articles/p-top-security-best-practices-for-socketio-protect-your-real-time-applications)
- [Securing Socket.IO APIs](https://www.linkedin.com/pulse/securing-your-socketio-chat-apis-best-practices-guide-aakarshit-giri-kxekc)
- [Anti-Cheat in Multiplayer JS Games](https://hashnode.com/post/how-to-make-anti-cheat-in-multiplayer-js-game-cjpvrvtam00502ns2l2kgqs18)
- [React State Management 2026](https://www.syncfusion.com/blogs/post/react-state-management-libraries)
- [State Management: Redux vs Zustand](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)
- [Why Switch from Redux to Zustand](https://www.techedubyte.com/switched-redux-zustand-react-state-management/)
- [Socket.IO Event Naming Conventions](https://community.nodebb.org/topic/9372/naming-convention-for-socket-io-message)
- [Socket.IO Application Structure](https://socket.io/docs/v4/server-application-structure/)
