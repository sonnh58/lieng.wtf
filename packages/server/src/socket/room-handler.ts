import type { Server, Socket } from 'socket.io';
import type { Database } from 'bun:sqlite';
import type { RoomManager } from '../managers/room-manager';
import type { PlayerManager } from '../managers/player-manager';
import type { RoomConfig } from '@lieng/shared';
import { getWallet, recordLoan, getPlayerStats } from '../database/player-queries';

/**
 * Handles room CRUD socket events: create, join, leave, list, set-name.
 */
export function setupRoomHandlers(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  playerManager: PlayerManager,
  db?: Database,
): void {
  // Set display name (also registers player if not yet registered)
  socket.on('player:set-name', ({ name }: { name: string }) => {
    if (!name || typeof name !== 'string') return;
    const existing = playerManager.getBySocket(socket.id);
    if (existing) {
      playerManager.setPlayerName(socket.id, name);
    } else {
      playerManager.registerPlayer(socket.id, name);
    }
  });

  // Google Sign-In: decode JWT credential, register/find player
  socket.on('player:google-auth', ({ credential }: { credential: string }) => {
    try {
      // Decode Google ID token (JWT) payload — base64url decode
      const parts = credential.split('.');
      if (parts.length !== 3) {
        return socket.emit('player:google-auth-error', { message: 'Invalid token' });
      }
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
      );
      const { sub, name, picture, email } = payload;
      if (!sub || !name) {
        return socket.emit('player:google-auth-error', { message: 'Invalid token payload' });
      }

      // Only allow @goonus.io emails
      if (!email || !email.endsWith('@goonus.io')) {
        return socket.emit('player:google-auth-error', { message: 'Chi cho phep email @goonus.io' });
      }

      // Register player with Google identity
      const playerInfo = playerManager.registerGooglePlayer(socket.id, name, sub, picture ?? null);
      socket.emit('player:google-auth-success', {
        playerId: playerInfo.id,
        name: playerInfo.name,
        avatarUrl: picture ?? null,
      });
    } catch (err: any) {
      console.error('Google auth error:', err);
      socket.emit('player:google-auth-error', { message: 'Authentication failed' });
    }
  });

  // List rooms
  socket.on('room:list', () => {
    socket.emit('room:list', roomManager.listRooms());
  });

  // Create room
  socket.on('room:create', ({ name, config }: { name: string; config?: Partial<RoomConfig> }) => {
    const player = playerManager.getBySocket(socket.id);
    if (!player) return socket.emit('room:error', { message: 'Set your name first' });

    // Auto-leave current room if already in one
    if (player.roomId) {
      const oldRoomId = player.roomId;
      const oldRoom = roomManager.leaveRoom(oldRoomId, player.id);
      const gm = roomManager.getGameManager(oldRoomId);
      if (gm) gm.removePlayer(player.id);
      playerManager.setPlayerRoom(socket.id, null);
      socket.leave(oldRoomId);
      if (oldRoom) io.to(oldRoomId).emit('room:updated', { room: oldRoom });
    }

    try {
      const room = roomManager.createRoom(name || `${player.name}'s Room`, player.id, config);
      playerManager.setPlayerRoom(socket.id, room.id);
      socket.join(room.id);
      socket.emit('room:joined', { room, playerId: player.id });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  });

  // Join room
  socket.on('room:join', ({ roomId }: { roomId: string }) => {
    const player = playerManager.getBySocket(socket.id);
    if (!player) return socket.emit('room:error', { message: 'Set your name first' });

    // Auto-leave current room if already in one
    if (player.roomId) {
      const oldRoomId = player.roomId;
      const oldRoom = roomManager.leaveRoom(oldRoomId, player.id);
      const gm = roomManager.getGameManager(oldRoomId);
      if (gm) gm.removePlayer(player.id);
      playerManager.setPlayerRoom(socket.id, null);
      socket.leave(oldRoomId);
      if (oldRoom) io.to(oldRoomId).emit('room:updated', { room: oldRoom });
    }

    // Check wallet balance before joining
    if (db) {
      const wallet = getWallet(db, player.id);
      if (wallet <= 0) {
        return socket.emit('room:error', { message: 'So du khong du, hay vay them chip' });
      }
    }

    try {
      const room = roomManager.joinRoom(roomId, player.id);
      playerManager.setPlayerRoom(socket.id, room.id);
      socket.join(room.id);
      socket.emit('room:joined', { room, playerId: player.id });
      socket.to(room.id).emit('room:updated', { room });
    } catch (err: any) {
      socket.emit('room:error', { message: err.message });
    }
  });

  // Admin: reset all rooms
  socket.on('admin:reset-rooms', () => {
    const player = playerManager.getBySocket(socket.id);
    if (!player || player.name.toLowerCase() !== 'admin') {
      return socket.emit('room:error', { message: 'Unauthorized' });
    }
    const count = roomManager.resetAllRooms(io);
    console.log(`Admin "${player.name}" reset all rooms (${count} removed)`);
    io.emit('room:list', roomManager.listRooms());
  });

  // Get wallet + stats
  socket.on('wallet:get', () => {
    const player = playerManager.getBySocket(socket.id);
    if (!player) return;
    if (!db) return socket.emit('wallet:stats', { balance: 0, totalLoaned: 0, totalPnl: 0, wins: 0, losses: 0 });
    const stats = getPlayerStats(db, player.id);
    socket.emit('wallet:stats', stats ?? { balance: 0, totalLoaned: 0, totalPnl: 0, wins: 0, losses: 0 });
  });

  // Request chips (xin cap von) — loan tracked separately
  socket.on('wallet:request-chips', () => {
    const player = playerManager.getBySocket(socket.id);
    if (!player) return;
    if (!db) return socket.emit('wallet:error', { message: 'DB not available' });

    const amount = 1000; // Default loan amount
    const newBalance = recordLoan(db, player.id, amount);
    console.log(`[wallet] ${player.name} loaned ${amount} chips, wallet balance: ${newBalance}`);
    const stats = getPlayerStats(db, player.id);
    socket.emit('wallet:stats', stats ?? { balance: newBalance, totalLoaned: amount, totalPnl: 0, wins: 0, losses: 0 });
    socket.emit('wallet:chips-granted', { amount });
  });

  // Leave room
  socket.on('room:leave', () => {
    const player = playerManager.getBySocket(socket.id);
    if (!player?.roomId) return;

    const roomId = player.roomId;
    const room = roomManager.leaveRoom(roomId, player.id);

    // Remove player from game if active
    const gm = roomManager.getGameManager(roomId);
    if (gm) gm.removePlayer(player.id);

    playerManager.setPlayerRoom(socket.id, null);
    socket.leave(roomId);

    if (room) {
      io.to(roomId).emit('room:updated', { room });
    }
  });
}
