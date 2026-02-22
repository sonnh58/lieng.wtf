import { DEFAULT_TURN_TIMER } from '@lieng/shared';

/**
 * Manages turn order (clockwise from dealer+1), tracks who has acted,
 * and handles 30s turn timer with auto-fold callback.
 */
export class TurnManager {
  private playerIds: string[];
  private foldedPlayers = new Set<string>();
  private allInPlayers = new Set<string>();
  private actedPlayers = new Set<string>();
  private currentIndex: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private onTimeout: ((playerId: string) => void) | null = null;
  private turnTimerSeconds: number;

  constructor(
    playerIds: string[],
    dealerIndex: number,
    turnTimer = DEFAULT_TURN_TIMER,
  ) {
    this.playerIds = playerIds;
    this.turnTimerSeconds = turnTimer;
    // Dealer goes first
    this.currentIndex = dealerIndex;
  }

  getCurrentPlayer(): string {
    return this.playerIds[this.currentIndex];
  }

  /** Mark current player as acted and advance to next active player. Returns null if round over. */
  advance(): string | null {
    this.actedPlayers.add(this.playerIds[this.currentIndex]);
    this.clearTimer();

    if (this.isRoundComplete()) return null;

    // Find next player who can act (not folded, not all-in)
    let next = (this.currentIndex + 1) % this.playerIds.length;
    let loopGuard = 0;
    while (this.foldedPlayers.has(this.playerIds[next]) || this.allInPlayers.has(this.playerIds[next])) {
      next = (next + 1) % this.playerIds.length;
      if (++loopGuard >= this.playerIds.length) return null; // all folded/all-in
    }
    this.currentIndex = next;
    return this.playerIds[this.currentIndex];
  }

  foldPlayer(playerId: string): void {
    this.foldedPlayers.add(playerId);
    this.actedPlayers.add(playerId);
  }

  allInPlayer(playerId: string): void {
    this.allInPlayers.add(playerId);
    this.actedPlayers.add(playerId);
  }

  /** Reset acted tracking when a raise occurs (all must re-act except raiser) */
  resetActedOnRaise(raiserId: string): void {
    this.actedPlayers.clear();
    this.actedPlayers.add(raiserId);
    // Keep folded and all-in players as "acted" (they can't act again)
    for (const foldedId of this.foldedPlayers) this.actedPlayers.add(foldedId);
    for (const allInId of this.allInPlayers) this.actedPlayers.add(allInId);
  }

  isRoundComplete(): boolean {
    const activePlayers = this.getActivePlayers();
    // Only 1 player left (everyone else folded)
    if (activePlayers.length <= 1) return true;
    // All non-folded players who can still act have acted
    const canActPlayers = activePlayers.filter((id) => !this.allInPlayers.has(id));
    // If 0 or 1 player can act (rest are all-in), round is complete
    if (canActPlayers.length <= 1 && canActPlayers.every((id) => this.actedPlayers.has(id))) return true;
    // All active players have acted
    return activePlayers.every((id) => this.actedPlayers.has(id));
  }

  getActivePlayers(): string[] {
    return this.playerIds.filter((id) => !this.foldedPlayers.has(id));
  }

  isFolded(playerId: string): boolean {
    return this.foldedPlayers.has(playerId);
  }

  /** Start turn timer. Calls onTimeout callback when time expires. */
  startTimer(onTimeout: (playerId: string) => void): void {
    this.clearTimer();
    this.onTimeout = onTimeout;
    const currentPlayer = this.getCurrentPlayer();
    this.timer = setTimeout(() => {
      this.onTimeout?.(currentPlayer);
    }, this.turnTimerSeconds * 1000);
  }

  clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  destroy(): void {
    this.clearTimer();
  }

  serialize(): {
    playerIds: string[];
    currentIndex: number;
    foldedPlayers: string[];
    allInPlayers: string[];
    actedPlayers: string[];
    turnTimerSeconds: number;
  } {
    return {
      playerIds: this.playerIds,
      currentIndex: this.currentIndex,
      foldedPlayers: Array.from(this.foldedPlayers),
      allInPlayers: Array.from(this.allInPlayers),
      actedPlayers: Array.from(this.actedPlayers),
      turnTimerSeconds: this.turnTimerSeconds,
    };
  }

  static fromSnapshot(snapshot: {
    playerIds: string[];
    currentIndex: number;
    foldedPlayers: string[];
    allInPlayers: string[];
    actedPlayers: string[];
    turnTimerSeconds: number;
  }): TurnManager {
    // Use dummy dealerIndex=0; we override currentIndex directly
    const tm = new TurnManager(snapshot.playerIds, 0, snapshot.turnTimerSeconds);
    tm.currentIndex = snapshot.currentIndex;
    for (const id of snapshot.foldedPlayers) tm.foldedPlayers.add(id);
    for (const id of snapshot.allInPlayers) tm.allInPlayers.add(id);
    for (const id of snapshot.actedPlayers) tm.actedPlayers.add(id);
    return tm;
  }
}
