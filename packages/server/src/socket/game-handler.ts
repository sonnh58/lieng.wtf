import type { Server, Socket } from 'socket.io';
import type { Database } from 'bun:sqlite';
import { BettingAction, PlayerState, GamePhase } from '@lieng/shared';
import type { RoomManager } from '../managers/room-manager';
import type { PlayerManager } from '../managers/player-manager';
import type { GameManager } from '../game/game-manager';
import { incrementWins, incrementLosses, updateWallet, updatePnl, getWallet } from '../database/player-queries';
import { saveRound } from '../database/history-queries';
import { saveGameState, deleteGameState } from '../database/game-state-queries';

/**
 * Handles game action socket events: start, action, ready.
 */
export function setupGameHandlers(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  playerManager: PlayerManager,
  db?: Database,
): void {
  // Start game
  socket.on('game:start', () => {
    const player = playerManager.getBySocket(socket.id);
    if (!player?.roomId) return socket.emit('game:error', { message: 'Not in a room' });

    const room = roomManager.getRoom(player.roomId);
    if (!room) return socket.emit('game:error', { message: 'Room not found' });
    if (room.hostId !== player.id) return socket.emit('game:error', { message: 'Only host can start' });
    if (room.players.length < 2) return socket.emit('game:error', { message: 'Need at least 2 players' });

    // Get or create game manager
    let gm = roomManager.getGameManager(room.id);
    if (!gm) {
      gm = roomManager.createGameManager(room.id)!;
      setupGameEvents(gm, room.id, io, roomManager, playerManager, db);
    }

    if (gm.getPhase() !== GamePhase.WAITING) {
      return socket.emit('game:error', { message: 'Game already in progress' });
    }

    // Clean stale players from room before starting (players whose session expired)
    room.players = room.players.filter((pid) => playerManager.getByPlayerId(pid) !== null);
    if (room.players.length < 2) return socket.emit('game:error', { message: 'Need at least 2 players' });

    // Reset and re-add players to game engine
    gm.clearPlayers();
    let addedCount = 0;
    room.players.forEach((playerId, index) => {
      const pInfo = playerManager.getByPlayerId(playerId);
      if (!pInfo) return;
      addedCount++;
      gm!.addPlayer({
        id: playerId,
        name: pInfo.name,
        chips: db ? getWallet(db, playerId) : room.config.startingChips,
        cards: [],
        bet: 0,
        state: PlayerState.WAITING,
        seatIndex: index,
      });
    });

    // Set dealer to the host (winner of previous round)
    const hostSeatIndex = room.players.indexOf(room.hostId);
    if (hostSeatIndex >= 0) {
      gm.setDealerIndex(hostSeatIndex);
    }

    console.log(`[game:start] Room ${room.id}: ${room.players.length} in room, ${addedCount} added to game engine, dealer=${hostSeatIndex}`);
    const started = gm.startRound();
    if (!started) {
      console.warn(`[game:start] startRound() returned false — addedCount=${addedCount}, players in GM:`, Array.from(gm.getPlayers().keys()));
      return socket.emit('game:error', { message: 'Failed to start round' });
    }

    // Broadcast DEALING phase state (no cards yet)
    broadcastGameState(gm, room.id, io, room.players, playerManager);
    persistState(gm, room.id, db);

    // After short delay: send cards, then transition to BETTING
    const DEAL_ANIMATION_MS = 1500;
    setTimeout(() => {
      // Send private cards to each player
      for (const playerId of room.players) {
        const socketId = playerManager.getSocketId(playerId);
        if (!socketId) continue;
        const state = gm!.getStateForPlayer(playerId);
        const myPlayer = state.players.find((p) => p.id === playerId);
        io.to(socketId).emit('game:dealt', { cards: myPlayer?.cards ?? [] });
      }

      // Transition to BETTING phase
      gm!.startBetting();
      broadcastGameState(gm!, room.id, io, room.players, playerManager);
      persistState(gm!, room.id, db);
    }, DEAL_ANIMATION_MS);
  });

  // Game action (bet/fold/call/all-in)
  socket.on('game:action', ({ action, amount }: { action: BettingAction; amount?: number }) => {
    const player = playerManager.getBySocket(socket.id);
    if (!player?.roomId) return socket.emit('game:error', { message: 'Not in a room' });

    const gm = roomManager.getGameManager(player.roomId);
    if (!gm) return socket.emit('game:error', { message: 'No active game' });

    const result = gm.handleAction(player.id, action, amount);
    if (!result.success) {
      return socket.emit('game:error', { message: result.reason });
    }

    // Broadcast action to room (show only the chips spent this action, not cumulative)
    const room = roomManager.getRoom(player.roomId)!;
    io.to(room.id).emit('game:action-result', {
      playerId: player.id,
      action,
      amount: result.chipsDelta ?? 0,
    });

    // Broadcast updated state
    broadcastGameState(gm, room.id, io, room.players, playerManager);
    persistState(gm, room.id, db);
  });

  // Emoji taunt — broadcast to room
  socket.on('game:emoji', ({ emoji }: { emoji: string }) => {
    const player = playerManager.getBySocket(socket.id);
    if (!player?.roomId) return;
    // Limit to single emoji (max 2 codepoints)
    if (!emoji || emoji.length > 4) return;
    io.to(player.roomId).emit('game:emoji', { playerId: player.id, emoji });
  });

  // Player ready for next round
  socket.on('player:ready', () => {
    const player = playerManager.getBySocket(socket.id);
    if (!player?.roomId) return;

    roomManager.setReady(player.roomId, player.id);
    const readyList = roomManager.getReadyPlayers(player.roomId);
    io.to(player.roomId).emit('game:ready-state', { readyPlayers: readyList });
  });
}

/** Set up GameManager event listeners for broadcasting */
export function setupGameEvents(
  gm: GameManager,
  roomId: string,
  io: Server,
  roomManager: RoomManager,
  playerManager: PlayerManager,
  db?: Database,
): void {
  gm.on('turnChange', (playerId: string) => {
    const room = roomManager.getRoom(roomId);
    const timeLeft = room?.config?.turnTimer ?? 30;
    io.to(roomId).emit('game:turn', { playerId, timeLeft });
  });

  gm.on('autoFold', (playerId: string) => {
    io.to(roomId).emit('game:action-result', {
      playerId,
      action: BettingAction.BO,
      amount: 0,
      auto: true,
    });
  });

  gm.on('roundEnd', (result: any) => {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    // Build hands and payouts objects
    const handsObj: Record<string, any> = {};
    for (const [id, hand] of result.hands) {
      const player = gm.getPlayers().get(id);
      handsObj[id] = {
        handType: hand.type,
        points: hand.points,
        highCard: hand.highCard,
        cards: player?.cards ?? [],
      };
    }
    const payoutsObj: Record<string, number> = {};
    for (const [id, amount] of result.payouts) {
      payoutsObj[id] = amount;
    }

    // Persist to DB atomically: player stats + game history
    if (db) {
      try {
        db.transaction(() => {
          const winnerSet = new Set(result.winners as string[]);
          // Track wins/losses for ALL players (including folded)
          for (const [id] of gm.getPlayers()) {
            if (winnerSet.has(id)) {
              incrementWins(db!, id);
            } else {
              incrementLosses(db!, id);
            }
          }

          // Update wallet + PnL for ALL players (including folded)
          for (const [id, player] of gm.getPlayers()) {
            const payout = payoutsObj[id] ?? 0;
            const totalBet = player.bet ?? 0;
            // Net P&L: payout - what they put in
            const netPnl = payout - totalBet;
            if (netPnl !== 0) {
              updateWallet(db!, id, netPnl);
              updatePnl(db!, id, netPnl);
            }
          }

          saveRound(db!, {
            roomId,
            players: room.players,
            hands: handsObj,
            winners: result.winners,
            payouts: payoutsObj,
          });
        })();
      } catch (err) {
        console.error('Failed to persist round result:', err);
      }
    }

    // Round complete — remove persisted state
    if (db) {
      try { deleteGameState(db, roomId); } catch (err) {
        console.error('Failed to delete game state:', err);
      }
    }

    // Transfer deal rights to winner for next round
    if (result.winners.length > 0 && room.players.includes(result.winners[0])) {
      room.hostId = result.winners[0];
      io.to(roomId).emit('room:updated', { room });
    }

    io.to(roomId).emit('game:showdown', {
      winners: result.winners,
      hands: handsObj,
      payouts: payoutsObj,
    });

    // Broadcast final state to each player
    for (const playerId of room.players) {
      const socketId = playerManager.getSocketId(playerId);
      if (!socketId) continue;
      const state = gm.getStateForPlayer(playerId);
      io.to(socketId).emit('game:state', state);
    }
  });

  gm.on('phaseChange', (phase: string) => {
    io.to(roomId).emit('game:phase', { phase });
  });
}

/** Persist game state to SQLite */
function persistState(gm: GameManager, roomId: string, db?: Database): void {
  if (!db) return;
  try {
    saveGameState(db, roomId, JSON.stringify(gm.serialize()));
  } catch (err) {
    console.error('Failed to persist game state:', err);
  }
}

/** Send filtered game state to each player individually */
function broadcastGameState(
  gm: any,
  roomId: string,
  io: Server,
  playerIds: string[],
  playerManager: PlayerManager,
): void {
  for (const playerId of playerIds) {
    const socketId = playerManager.getSocketId(playerId);
    if (!socketId) continue;
    const state = gm.getStateForPlayer(playerId);
    io.to(socketId).emit('game:state', state);
  }
}
