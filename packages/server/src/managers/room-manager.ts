import { nanoid } from 'nanoid';
import { DEFAULT_ROOM_CONFIG, MAX_PLAYERS, GamePhase } from '@lieng/shared';
import type { Room, RoomConfig } from '@lieng/shared';
import type { Database } from 'bun:sqlite';
import { GameManager } from '../game/game-manager';
import { saveRoom, updateRoomHost, deleteRoom, loadAllRooms } from '../database/room-queries';
import { loadAllGameStates, deleteGameState } from '../database/game-state-queries';

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  hasGame: boolean;
}

/**
 * In-memory room store with optional SQLite write-through.
 * Manages room CRUD and associated GameManager instances.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();
  private games = new Map<string, GameManager>();
  /** roomId -> Set of playerIds who are ready */
  private readyPlayers = new Map<string, Set<string>>();
  private db: Database | null;

  constructor(db?: Database) {
    this.db = db ?? null;
  }

  /** Restore rooms from database on startup */
  loadFromDb(): void {
    if (!this.db) return;
    const rows = loadAllRooms(this.db);
    let restored = 0;
    for (const row of rows) {
      try {
        const config = JSON.parse(row.config) as RoomConfig;
        const room: Room = {
          id: row.id,
          name: row.name,
          hostId: row.host_id,
          players: [], // Players rejoin via socket
          config,
          gameId: null,
        };
        this.rooms.set(row.id, room);
        restored++;
      } catch {
        console.warn(`Skipping room ${row.id}: malformed config JSON`);
      }
    }
    if (restored > 0) {
      console.log(`Restored ${restored} room(s) from database`);
    }
  }

  /**
   * Restore active game states from DB.
   * Call after loadFromDb(). Returns restored room IDs for event wiring.
   */
  restoreGameStates(): { roomId: string; gm: GameManager }[] {
    if (!this.db) return [];
    const rows = loadAllGameStates(this.db);
    const restored: { roomId: string; gm: GameManager }[] = [];

    for (const { roomId, state } of rows) {
      const room = this.rooms.get(roomId);
      if (!room) {
        // Room no longer exists — clean up stale state
        deleteGameState(this.db!, roomId);
        continue;
      }

      try {
        const snapshot = JSON.parse(state);
        const gm = GameManager.deserialize(snapshot, room.config);
        this.games.set(roomId, gm);
        restored.push({ roomId, gm });
      } catch (err) {
        console.warn(`Skipping game state for room ${roomId}: invalid snapshot`);
        deleteGameState(this.db!, roomId);
      }
    }

    if (restored.length > 0) {
      console.log(`Restored ${restored.length} active game(s) from database`);
    }
    return restored;
  }

  createRoom(name: string, hostId: string, config?: Partial<RoomConfig>): Room {
    const id = nanoid(8);
    const room: Room = {
      id,
      name: name.slice(0, 30),
      hostId,
      players: [hostId],
      config: { ...DEFAULT_ROOM_CONFIG, ...config },
      gameId: null,
    };
    this.rooms.set(id, room);

    // Write-through to DB
    if (this.db) {
      saveRoom(this.db, { id, name: room.name, hostId, config: room.config });
    }

    return room;
  }

  joinRoom(roomId: string, playerId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Room not found');
    // Idempotent: if player already in room, just return it
    if (room.players.includes(playerId)) return room;
    if (room.players.length >= room.config.maxPlayers) throw new Error('Room is full');
    room.players.push(playerId);
    return room;
  }

  leaveRoom(roomId: string, playerId: string): Room | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    room.players = room.players.filter((id) => id !== playerId);

    // Delete empty room
    if (room.players.length === 0) {
      this.games.get(roomId)?.removeAllListeners();
      this.games.delete(roomId);
      this.rooms.delete(roomId);

      // Remove from DB
      if (this.db) {
        deleteRoom(this.db, roomId);
      }

      return null;
    }

    // Transfer host if host left
    if (room.hostId === playerId) {
      room.hostId = room.players[0];
      if (this.db) {
        updateRoomHost(this.db, roomId, room.hostId);
      }
    }

    return room;
  }

  /** Admin: delete all rooms, kick all players, clean DB */
  resetAllRooms(io?: any): number {
    const count = this.rooms.size;
    for (const [roomId] of this.rooms) {
      this.games.get(roomId)?.removeAllListeners();
      this.games.delete(roomId);
      if (this.db) deleteRoom(this.db, roomId);
      // Kick everyone from socket room
      if (io) io.in(roomId).socketsLeave(roomId);
    }
    this.rooms.clear();
    return count;
  }

  getRoom(roomId: string): Room | null {
    return this.rooms.get(roomId) ?? null;
  }

  listRooms(): Room[] {
    const games = this.games;
    return Array.from(this.rooms.values()).map((room) => {
      const gm = games.get(room.id);
      const active = gm ? gm.getPhase() !== GamePhase.WAITING && gm.getPhase() !== GamePhase.ENDED : false;
      return { ...room, gameId: active ? room.id : null };
    });
  }

  /** Get or create GameManager for a room */
  getGameManager(roomId: string): GameManager | null {
    return this.games.get(roomId) ?? null;
  }

  createGameManager(roomId: string): GameManager | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const gm = new GameManager(room.config);
    this.games.set(roomId, gm);
    return gm;
  }

  /** Mark player as ready in a room */
  setReady(roomId: string, playerId: string): void {
    if (!this.readyPlayers.has(roomId)) {
      this.readyPlayers.set(roomId, new Set());
    }
    this.readyPlayers.get(roomId)!.add(playerId);
  }

  /** Check if all players in room are ready (excluding host who presses start) */
  areAllReady(roomId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.length < 2) return false;
    const readySet = this.readyPlayers.get(roomId);
    if (!readySet) return false;
    // All non-host players must be ready
    return room.players.every((pId) => pId === room.hostId || readySet.has(pId));
  }

  /** Get ready player IDs for a room */
  getReadyPlayers(roomId: string): string[] {
    return Array.from(this.readyPlayers.get(roomId) ?? []);
  }

  /** Clear ready state for a room (called on round start) */
  clearReady(roomId: string): void {
    this.readyPlayers.delete(roomId);
  }

  /** Find which room a player is in */
  findPlayerRoom(playerId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.players.includes(playerId)) return room;
    }
    return null;
  }
}
