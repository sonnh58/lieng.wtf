---
title: "SQLite3 Server Persistence"
description: "Add bun:sqlite persistence layer for players, rooms, and game history"
status: complete
priority: P2
effort: 6h
branch: master
tags: [sqlite, persistence, server, bun]
created: 2026-02-18
---

# SQLite3 Server Persistence

## Goal
Add persistence via `bun:sqlite` so player stats, rooms, and game history survive server restarts. Keep in-memory Maps for real-time hot path; SQLite as durable backing store.

## Architecture
- New `packages/server/src/database/` module with schema, queries, and db singleton
- DB file: `packages/server/data/lieng.db` (gitignored)
- Managers gain optional DB injection; write-through on mutations, bulk-load on startup
- No new npm deps (bun:sqlite is built-in)

## Phases

| # | Phase | Status | Effort |
|---|-------|--------|--------|
| 1 | [Setup Database](phase-01-setup-database.md) | complete | 1h |
| 2 | [Player Persistence](phase-02-player-persistence.md) | complete | 1.5h |
| 3 | [Room Persistence](phase-03-room-persistence.md) | complete | 1.5h |
| 4 | [Game History](phase-04-game-history.md) | complete | 1h |
| 5 | [Integration Testing](phase-05-integration-testing.md) | complete | 1h |

## Key Decisions
- Player identified by **name** (unique constraint) — lookup-or-create on connect
- Rooms restored on server start; empty rooms auto-pruned
- Game history stores JSON blobs for hands/players/payouts (no need to query individual cards)
- In-memory Maps remain source of truth during gameplay; DB is write-behind

## Dependencies
- Bun runtime (already used)
- No additional packages
