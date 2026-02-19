import { nanoid } from 'nanoid';
import { PlayerState } from '@lieng/shared';
import type { Player } from '@lieng/shared';
import type { Database } from 'bun:sqlite';
import { findByName, upsertPlayer, findByGoogleSub, upsertGooglePlayer } from '../database/player-queries';

export interface PlayerInfo {
  id: string;
  socketId: string;
  name: string;
  roomId: string | null;
  connected: boolean;
  isAdmin: boolean;
}

const DISCONNECT_GRACE_MS = 30_000;

/** Admin email whitelist — these Google accounts get admin privileges */
const ADMIN_EMAILS = new Set([
  'son@goonus.io',
]);

/**
 * Maps socket IDs to player info. Handles disconnect/reconnect with grace period.
 * Optionally backed by SQLite for persistent player identity.
 */
export class PlayerManager {
  /** socketId -> PlayerInfo */
  private bySocket = new Map<string, PlayerInfo>();
  /** playerId -> socketId */
  private playerToSocket = new Map<string, string>();
  /** playerId -> disconnect timer */
  private disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private db: Database | null;

  constructor(db?: Database) {
    this.db = db ?? null;
  }

  registerPlayer(socketId: string, name: string): PlayerInfo {
    const sanitized = sanitizeName(name);

    // If DB available, lookup by name first to reuse existing ID
    let id: string;
    if (this.db) {
      const existing = findByName(this.db, sanitized);
      if (existing) {
        id = existing.id;
      } else {
        id = nanoid(10);
        upsertPlayer(this.db, id, sanitized);
      }
    } else {
      id = nanoid(10);
    }

    // Clean up stale entry if same player re-registers with new socket
    this.cleanupStalePlayer(id, socketId);

    const info: PlayerInfo = {
      id,
      socketId,
      name: sanitized,
      roomId: null,
      connected: true,
      isAdmin: false,
    };
    this.bySocket.set(socketId, info);
    this.playerToSocket.set(id, socketId);
    return info;
  }

  /** Register a Google-authenticated player */
  registerGooglePlayer(socketId: string, name: string, googleSub: string, avatarUrl: string | null, email?: string): PlayerInfo {
    const sanitized = sanitizeName(name);

    let id: string;
    if (this.db) {
      const existing = findByGoogleSub(this.db, googleSub);
      if (existing) {
        id = existing.id;
        // Update name/avatar on each login
        upsertGooglePlayer(this.db, id, sanitized, googleSub, avatarUrl);
      } else {
        id = nanoid(10);
        upsertGooglePlayer(this.db, id, sanitized, googleSub, avatarUrl);
      }
    } else {
      id = nanoid(10);
    }

    // Clean up stale entry if same player re-registers with new socket
    this.cleanupStalePlayer(id, socketId);

    const info: PlayerInfo = {
      id,
      socketId,
      name: sanitized,
      roomId: null,
      connected: true,
      isAdmin: email ? ADMIN_EMAILS.has(email.toLowerCase()) : false,
    };
    this.bySocket.set(socketId, info);
    this.playerToSocket.set(id, socketId);
    return info;
  }

  /** Cancel grace timer and remove old socket entry when same player re-registers */
  private cleanupStalePlayer(playerId: string, newSocketId: string): void {
    const oldSocketId = this.playerToSocket.get(playerId);
    if (oldSocketId && oldSocketId !== newSocketId) {
      // Cancel any pending grace timer
      const timer = this.disconnectTimers.get(playerId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(playerId);
      }
      this.bySocket.delete(oldSocketId);
    }
  }

  getBySocket(socketId: string): PlayerInfo | null {
    return this.bySocket.get(socketId) ?? null;
  }

  getByPlayerId(playerId: string): PlayerInfo | null {
    const socketId = this.playerToSocket.get(playerId);
    if (!socketId) return null;
    return this.bySocket.get(socketId) ?? null;
  }

  getSocketId(playerId: string): string | null {
    return this.playerToSocket.get(playerId) ?? null;
  }

  setPlayerRoom(socketId: string, roomId: string | null): void {
    const info = this.bySocket.get(socketId);
    if (info) info.roomId = roomId;
  }

  setPlayerName(socketId: string, name: string): void {
    const info = this.bySocket.get(socketId);
    if (info) info.name = sanitizeName(name);
  }

  /**
   * Handle socket disconnect. Starts grace timer.
   * Returns playerId if player was registered, null otherwise.
   */
  handleDisconnect(
    socketId: string,
    onExpire: (playerId: string, roomId: string | null) => void,
  ): string | null {
    const info = this.bySocket.get(socketId);
    if (!info) return null;

    info.connected = false;

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(info.id);
      onExpire(info.id, info.roomId);
      this.removePlayer(socketId);
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(info.id, timer);
    return info.id;
  }

  /**
   * Reconnect a player with a new socket ID.
   * Returns the PlayerInfo if reconnection succeeds.
   */
  handleReconnect(newSocketId: string, playerId: string): PlayerInfo | null {
    const oldSocketId = this.playerToSocket.get(playerId);
    if (!oldSocketId) return null;

    const info = this.bySocket.get(oldSocketId);
    if (!info) return null;

    // Cancel grace timer
    const timer = this.disconnectTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(playerId);
    }

    // Update mappings
    this.bySocket.delete(oldSocketId);
    info.socketId = newSocketId;
    info.connected = true;
    this.bySocket.set(newSocketId, info);
    this.playerToSocket.set(playerId, newSocketId);

    return info;
  }

  removePlayer(socketId: string): void {
    const info = this.bySocket.get(socketId);
    if (!info) return;

    const timer = this.disconnectTimers.get(info.id);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(info.id);
    }

    this.playerToSocket.delete(info.id);
    this.bySocket.delete(socketId);
  }

  /** Create a Player object for the game engine */
  toGamePlayer(socketId: string, seatIndex: number): Player | null {
    const info = this.bySocket.get(socketId);
    if (!info) return null;
    return {
      id: info.id,
      name: info.name,
      chips: 0, // Set by GameManager from room config
      cards: [],
      bet: 0,
      state: PlayerState.WAITING,
      seatIndex,
    };
  }
}

/** Strip HTML tags and trim to 2-20 chars */
function sanitizeName(name: string): string {
  const clean = name.replace(/<[^>]*>/g, '').trim();
  if (clean.length < 2) return 'Player';
  return clean.slice(0, 20);
}
