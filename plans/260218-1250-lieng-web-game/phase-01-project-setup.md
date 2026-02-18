# Phase 01 - Project Setup

## Context Links
- [Plan Overview](plan.md)
- [Tech Stack Research](research/researcher-02-tech-stack-architecture.md)

## Overview
- **Priority**: P1 (blocking all other phases)
- **Status**: pending
- **Effort**: 3h
- **Description**: Set up npm workspaces monorepo with shared types, React client scaffold, and Express/Socket.io server scaffold. All TypeScript.

## Key Insights
- npm workspaces sufficient for this project size (no need for Nx/Turborepo)
- Shared package holds types + constants + pure game logic utils (imported by both client & server)
- Vite provides fast HMR for React dev; ts-node-dev or tsx for server hot reload

## Requirements
### Functional
- Monorepo with 3 packages: shared, client, server
- TypeScript compilation works across all packages
- Dev mode runs client + server concurrently
- Shared types importable from both client and server

### Non-Functional
- Build time < 10s for dev startup
- Hot reload on file changes

## Architecture
```
/lieng-2026
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TS config
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # Re-export all
│   │       ├── types/
│   │       │   ├── card.ts       # Card, Suit, Rank
│   │       │   ├── player.ts     # Player, PlayerState
│   │       │   ├── game.ts       # GameState, GamePhase, BettingAction
│   │       │   └── room.ts       # Room, RoomConfig
│   │       └── constants/
│   │           ├── card-values.ts    # Card point values, suit hierarchy
│   │           └── game-config.ts    # Default configs (timer, max players, etc.)
│   ├── client/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── tailwind.config.js
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       └── index.css         # Tailwind imports
│   └── server/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts          # Express + Socket.io bootstrap
```

## Related Code Files

### Files to Create
- `package.json` (modify existing - add workspaces)
- `tsconfig.base.json`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/types/card.ts`
- `packages/shared/src/types/player.ts`
- `packages/shared/src/types/game.ts`
- `packages/shared/src/types/room.ts`
- `packages/shared/src/constants/card-values.ts`
- `packages/shared/src/constants/game-config.ts`
- `packages/client/package.json`
- `packages/client/tsconfig.json`
- `packages/client/vite.config.ts`
- `packages/client/index.html`
- `packages/client/tailwind.config.js`
- `packages/client/postcss.config.js`
- `packages/client/src/main.tsx`
- `packages/client/src/App.tsx`
- `packages/client/src/index.css`
- `packages/server/package.json`
- `packages/server/tsconfig.json`
- `packages/server/src/index.ts`

### Files to Delete
- `index.js` (placeholder, no longer needed)

## Implementation Steps

### 1. Root Workspace Setup
1. Update root `package.json`: add `workspaces: ["packages/*"]`, remove `main`
2. Create `tsconfig.base.json` with strict mode, ES2022 target, module resolution bundler
3. Add root dev scripts: `"dev": "concurrently \"bun run --filter client dev\" \"bun run --filter server dev\""`
4. Install root dev deps: `concurrently`, `typescript` (via `bun add -d`)
<!-- Updated: Validation Session 1 - npm→bun -->

### 2. Shared Package
1. Create `packages/shared/package.json` with name `@lieng/shared`, main pointing to `src/index.ts`
2. Create `packages/shared/tsconfig.json` extending base
3. Define types in `src/types/`:
   - `card.ts`: `Suit` enum (DIAMOND=3, HEART=2, CLUB=1, SPADE=0), `Rank` enum (ACE=1..KING=13), `Card` interface {suit, rank}
   - `player.ts`: `Player` {id, name, chips, cards?, bet, folded, allIn, seatIndex}, `PlayerState` enum
   - `game.ts`: `GamePhase` enum (WAITING, DEALING, BETTING, SHOWDOWN, ENDED), `GameState` interface, `HandType` enum (SAP, LIENG, DI, NORMAL), `HandResult` {type, points, highCard}, `BettingAction` enum (TO, THEO, BO, TO_TAT)
   - `room.ts`: `Room` {id, name, players, config, gameState?}, `RoomConfig` {maxPlayers, ante, minBet, maxBet, turnTimer, startingChips}
   <!-- Updated: Validation Session 1 - HandType ANH→DI, added startingChips to RoomConfig -->
4. Define constants:
   - `card-values.ts`: point values per rank (A=1, 2-9=face value, 10/J/Q/K=0 points), suit hierarchy order
   - `game-config.ts`: DEFAULT_ANTE, DEFAULT_TURN_TIMER(30s), MAX_PLAYERS(12), MIN_PLAYERS(2), DEFAULT_STARTING_CHIPS(1000)
   <!-- Updated: Validation Session 1 - Fixed card values (10/J/Q/K=0), MAX_PLAYERS 20→12, added DEFAULT_STARTING_CHIPS -->
5. Create `src/index.ts` re-exporting everything

### 3. Client Package
1. Create `packages/client/package.json` with deps: react, react-dom, socket.io-client, zustand
2. Dev deps: @types/react, @types/react-dom, @vitejs/plugin-react, vite, typescript, tailwindcss, postcss, autoprefixer
3. Create `vite.config.ts` with react plugin, server proxy to backend port 3001
4. Create `tailwind.config.js` scanning `./src/**/*.{ts,tsx}`
5. Create `postcss.config.js` with tailwind + autoprefixer
6. Create `index.html` with Vietnamese lang, charset UTF-8
7. Create `src/main.tsx` (React root mount)
8. Create `src/App.tsx` (placeholder with "Lieng - Ba Cay" heading)
9. Create `src/index.css` (Tailwind directives)

### 4. Server Package
1. Create `packages/server/package.json` with deps: express, socket.io, cors
2. Dev deps: @types/express, @types/cors, tsx (for dev hot reload), typescript
3. Create `tsconfig.json` extending base, target ES2022, module NodeNext
4. Create `src/index.ts`: Express app on port 3001, Socket.io attached, CORS for client port 5173, basic health endpoint

### 5. Install & Verify
1. Run `npm install` from root
2. Run `npm run dev` - verify both client and server start
3. Verify client loads at localhost:5173
4. Verify server responds at localhost:3001
5. Verify shared types import in both client and server

## Todo List
- [ ] Update root package.json with workspaces
- [ ] Create tsconfig.base.json
- [ ] Create shared package with all types and constants
- [ ] Create client package with Vite + React + Tailwind
- [ ] Create server package with Express + Socket.io
- [ ] Install dependencies
- [ ] Verify dev mode runs both client and server
- [ ] Verify shared imports work cross-package
- [ ] Delete placeholder index.js

## Success Criteria
- `npm run dev` starts both client (5173) and server (3001)
- Client shows placeholder page
- Server responds to health check
- Shared types importable from both packages without errors
- TypeScript compiles without errors

## Risk Assessment
- **npm workspaces + TypeScript paths**: Can be tricky. Mitigate by using `"main": "src/index.ts"` in shared and letting Vite/tsx handle TS directly (no pre-compilation needed for dev)
- **Version conflicts**: Lock all shared deps to same versions across packages

## Security Considerations
- Server CORS: Only allow client origin in dev
- No secrets or env files needed for this phase

## Next Steps
- Phase 2: Implement game engine logic in shared + server packages
