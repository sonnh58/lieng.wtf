import type { Server } from 'socket.io';
import type { Database } from 'bun:sqlite';
import { RoomManager } from '../managers/room-manager';
import { PlayerManager } from '../managers/player-manager';
import { setupRoomHandlers } from './room-handler';
import { setupGameHandlers, setupGameEvents } from './game-handler';
import { applyRateLimiter } from '../middleware/rate-limiter';

/** Singleton managers shared across all connections */
let roomManager: RoomManager;
let playerManager: PlayerManager;

/**
 * Main socket.io connection handler.
 * Registers player, applies rate limiter, routes to sub-handlers.
 */
export function setupSocketHandlers(io: Server, db?: Database): void {
  roomManager = new RoomManager(db);
  playerManager = new PlayerManager(db);

  // Restore rooms and active games from DB on startup
  if (db) {
    roomManager.loadFromDb();
    const restoredGames = roomManager.restoreGameStates();
    for (const { roomId, gm } of restoredGames) {
      setupGameEvents(gm, roomId, io, roomManager, playerManager, db);
      // Resume game (handles both DEALING and BETTING phases)
      gm.resumeAfterRestore();
    }
  }

  io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);

    // Apply rate limiting
    applyRateLimiter(socket);

    // Setup sub-handlers
    setupRoomHandlers(socket, io, roomManager, playerManager, db);
    setupGameHandlers(socket, io, roomManager, playerManager, db);

    // Handle reconnection attempt (must come before player:set-name)
    socket.on('player:reconnect', ({ playerId }: { playerId: string }) => {
      const reconnected = playerManager.handleReconnect(socket.id, playerId);
      if (reconnected?.roomId) {
        socket.join(reconnected.roomId);

        // Re-add player to room.players (empty after server restart)
        try { roomManager.joinRoom(reconnected.roomId, playerId); } catch { /* full or missing */ }

        const room = roomManager.getRoom(reconnected.roomId);
        if (room) {
          socket.emit('room:joined', { room, playerId });
          socket.to(reconnected.roomId).emit('room:updated', { room });
        }

        // Resend game state if active
        const gm = roomManager.getGameManager(reconnected.roomId);
        if (gm) {
          const state = gm.getStateForPlayer(playerId);
          socket.emit('game:state', state);
          const myPlayer = state.players.find((p: any) => p.id === playerId);
          if (myPlayer?.cards?.length) {
            socket.emit('game:dealt', { cards: myPlayer.cards });
          }
        }
      } else {
        // Reconnect failed (expired/invalid) — tell client to re-register
        socket.emit('player:reconnect-failed');
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Disconnected: ${socket.id}`);

      playerManager.handleDisconnect(socket.id, (playerId, roomId) => {
        // Grace period expired - remove player from room
        if (roomId) {
          const gm = roomManager.getGameManager(roomId);
          if (gm) gm.removePlayer(playerId);

          const room = roomManager.leaveRoom(roomId, playerId);
          if (room) {
            io.to(roomId).emit('room:updated', { room });
          }
        }
      });
    });
  });
}

export { roomManager, playerManager };
