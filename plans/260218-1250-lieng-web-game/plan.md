---
title: "Lieng Web Game - Multiplayer Card Game"
description: "Real-time multiplayer Vietnamese card game with React + Node.js + Socket.io"
status: pending
priority: P1
effort: "24h"
branch: master
tags: [game, card-game, multiplayer, socket.io, react, typescript]
created: 2026-02-18
---

# Lieng Web Game - Implementation Plan

## Overview
Multiplayer Vietnamese "Lieng" (Ba Cay) card game. Server-authoritative architecture with React frontend and Node.js/Socket.io backend. MVP: in-memory state, no auth, no DB.

## Research
- [Game Rules](research/researcher-01-lieng-game-rules.md)
- [Tech Stack & Architecture](research/researcher-02-tech-stack-architecture.md)

## Architecture
- **Monorepo**: `packages/shared` (types+logic), `packages/client` (React), `packages/server` (Express+Socket.io)
- **State**: In-memory Maps (rooms, games). No DB for MVP.
- **Auth**: Display name only. No login for MVP.
- **Game variant**: Cao Rua (all players vs each other, winner takes pot)

## Phases

| # | Phase | Effort | Status |
|---|-------|--------|--------|
| 1 | [Project Setup](phase-01-project-setup.md) | 3h | pending |
| 2 | [Game Engine](phase-02-game-engine.md) | 6h | pending |
| 3 | [Socket Server](phase-03-socket-server.md) | 5h | pending |
| 4 | [Client UI](phase-04-client-ui.md) | 7h | pending |
| 5 | [Integration & Testing](phase-05-integration-testing.md) | 3h | pending |

## Key Dependencies
- Phase 1 must complete before all others
- Phase 2 (game engine) before Phase 3 (socket server)
- Phase 3 before Phase 4 (client needs socket events defined)
- Phase 4 + 3 can partially overlap (UI scaffolding while server builds)
- Phase 5 after all others

## Design Decisions
1. Hand ranking: Sáp > Liêng > Đĩ (Ảnh) > 9...0 points
2. A-A-A = highest Sáp. K-A-2 NOT valid Liêng. Only A-2-3 and Q-K-A wrap.
3. Point calc: 2-9=face value, 10/J/Q/K=0 points, A=1 point. Sum mod 10.
4. Tiebreaker: same points → split pot equally (per user rule). Alternatively highest card suit.
5. Single betting round per hand
6. 30s turn timer, auto-fold on timeout
7. Max 10-12 players/table (not 20)
8. CSS-only cards (no images)
9. NO side pots for MVP (simple all-in: player can only win up to their bet from each opponent)
10. Starting chips: configurable by host when creating room
11. Bun workspaces (not npm)

## Tech Stack
- React 18 + TypeScript + Vite + Tailwind CSS + Zustand
- Node.js 20 + Express + Socket.io 4 + TypeScript
- Bun workspaces monorepo

## Validation Log

### Session 1 — 2026-02-18
**Trigger:** Initial plan creation validation
**Questions asked:** 7

#### Questions & Answers

1. **[Assumptions]** Luật xếp hạng bài: Sáp vs Liêng - cái nào mạnh hơn?
   - Options: Sáp > Liêng (Recommended) | Liêng > Sáp | Sáp = Liêng
   - **Answer:** Sáp > Liêng
   - **Custom input:** User confirmed full ranking: Sáp > Liêng > Đĩ (3 J/Q/K) > 9 > 8...0. Also clarified: "Đĩ" is the correct term for 3 face cards (not "Ảnh"). Point calc: 10/J/Q/K = 0 points (not 10). Q-K-A and A-2-3 both valid Liêng. Tiebreaker: equal points → split equally; or compare highest card.
   - **Rationale:** Core game logic depends on correct ranking. "Đĩ" term used instead of "Ảnh".

2. **[Assumptions]** Bộ A-A-A (Sáp Át): Át cao nhất hay thấp nhất trong Sáp?
   - Options: A-A-A cao nhất (Recommended) | A-A-A thấp nhất
   - **Answer:** A-A-A cao nhất
   - **Rationale:** Confirms Sáp ranking order: A > K > Q > ... > 2

3. **[Assumptions]** Bộ K-A-2 có được coi là Liêng không?
   - Options: Không (Recommended) | Có
   - **Answer:** Không
   - **Rationale:** Only A-2-3 and Q-K-A are valid wraps. Simplifies Liêng detection logic.

4. **[Scope]** Mỗi người chơi bắt đầu với bao nhiêu chip?
   - Options: 1,000 chips | 10,000 chips | Tùy chỉnh bởi host
   - **Answer:** Tùy chỉnh bởi host
   - **Rationale:** Host sets starting chips in room config. Need to add to RoomConfig type and create-room UI.

5. **[Scope]** Side pot có cần implement trong MVP không?
   - Options: Có (Recommended) | Không, bỏ qua MVP
   - **Answer:** Không, bỏ qua MVP
   - **Rationale:** Simplifies PotManager significantly. All-in player can only win proportional amount.

6. **[Architecture]** Layout UI cho nhiều người chơi?
   - Options: Scroll/compact mode (Recommended) | Giới hạn 6 người/bàn | Circular luôn
   - **Answer:** Tầm 10-12 người thôi
   - **Custom input:** Max players reduced from 20 to ~12. Simplifies UI layout significantly.
   - **Rationale:** Circular layout works well up to 12. No need for compact/scroll mode.

7. **[Architecture]** Package manager nào sử dụng?
   - Options: Bun (Recommended) | npm
   - **Answer:** Bun
   - **Rationale:** Already installed in project. Faster than npm. Bun workspaces compatible with npm workspaces format.

#### Confirmed Decisions
- Sáp > Liêng > Đĩ > 9...0: confirmed ranking
- A-A-A highest Sáp: confirmed
- K-A-2 not Liêng: confirmed
- Starting chips configurable by host: new requirement
- No side pots for MVP: simplification
- Max 12 players (not 20): scope reduction
- Bun workspaces: tooling change
- "Đĩ" terminology instead of "Ảnh": terminology update
- 10/J/Q/K = 0 points (not 10): clarification on point values

#### Action Items
- [ ] Update HandType enum: ANH → DI (Đĩ)
- [ ] Update max players: 20 → 12
- [ ] Remove PotManager side pot logic, simplify to basic pot
- [ ] Add startingChips to RoomConfig type
- [ ] Add starting chips input to create-room UI
- [ ] Replace npm with bun in all scripts and docs
- [ ] Fix card point values: 10/J/Q/K = 0 points, not 10

#### Impact on Phases
- Phase 1: Update RoomConfig type to include `startingChips`. Change npm → bun in scripts. Update MAX_PLAYERS to 12. Fix card point values.
- Phase 2: Rename ANH → DI. Remove side pot logic from PotManager. Simplify pot distribution. Fix card values (10/J/Q/K = 0 pts).
- Phase 3: No major changes.
- Phase 4: Add startingChips input in create-room dialog. Update max player slider to 12. Update Vietnamese text: "Ảnh" → "Đĩ". Circular layout for max 12.
- Phase 5: Remove side pot test cases. Add test for simplified all-in.
