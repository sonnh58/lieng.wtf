# Lieng - Vietnamese 3-Card Poker

Real-time multiplayer Vietnamese 3-card poker (Ba Cay / Lieng) built with React, Express, Socket.IO, and Bun.

## Game Rules

Each player receives **3 cards**. Hand rankings (highest to lowest):

| Hand | Description |
|------|-------------|
| **Sap** (Trips) | Three of a kind |
| **Lieng** (Straight) | Three consecutive cards |
| **Di** (Face cards) | Three face cards (J, Q, K) |
| **Normal** | Sum of card points mod 10 (9 is best, 0 is worst) |

Betting actions: **To** (raise), **Theo** (call), **Bo** (fold), **To Tat** (all-in).

## Tech Stack

| Layer | Tech |
|-------|------|
| Client | React 18, Vite 6, Zustand, Tailwind CSS 3, Socket.IO Client |
| Server | Express 4, Socket.IO 4, Bun runtime |
| Shared | TypeScript types, game logic, hand evaluation |
| Runtime | Bun |

## Project Structure

```
packages/
├── client/     # React frontend (Vite + Tailwind)
├── server/     # Game server (Express + Socket.IO)
└── shared/     # Shared types, constants, utils
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0

### Install & Run

```bash
# Install dependencies
bun install

# Start server (with hot reload)
cd packages/server && bun dev

# Start client (in another terminal)
cd packages/client && bun dev
```

## Game Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Max Players | 12 | Per room |
| Min Players | 2 | To start a game |
| Ante | 10 | Entry cost per round |
| Min Bet | 10 | Minimum raise |
| Max Bet | 1,000 | Maximum raise |
| Starting Chips | 1,000 | Per player |
| Turn Timer | 60s | Auto-fold on timeout |

## Game Flow

1. Host creates a room with custom config
2. Players join the room
3. Host deals cards — each player gets 3 cards
4. Betting phase — players take turns: raise, call, fold, or all-in
5. Showdown — remaining players reveal hands, best hand wins the pot
6. Winner becomes dealer for the next round

## License

Private
