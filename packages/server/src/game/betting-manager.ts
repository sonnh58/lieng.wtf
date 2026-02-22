import { BettingAction } from '@lieng/shared';
import type { Player } from '@lieng/shared';

export interface ActionValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Validates and processes betting actions.
 * Single betting round: players can fold, call, raise, or go all-in.
 */
export class BettingManager {
  private currentBet = 0;
  private minRaise: number;
  private playerBets = new Map<string, number>();

  constructor(
    private ante: number,
    minBet: number,
  ) {
    this.minRaise = minBet;
  }

  /** Validate if a betting action is legal for the given player */
  validateAction(
    player: Player,
    action: BettingAction,
    amount?: number,
  ): ActionValidation {
    const playerCurrentBet = this.playerBets.get(player.id) ?? 0;
    const toCall = this.currentBet - playerCurrentBet;

    switch (action) {
      case BettingAction.BO:
        return { valid: true };

      case BettingAction.THEO:
        if (player.chips < toCall) {
          return { valid: false, reason: 'Not enough chips to call' };
        }
        return { valid: true };

      case BettingAction.TO: {
        const minTotal = this.currentBet + this.minRaise;
        if (!amount || amount < minTotal) {
          return {
            valid: false,
            reason: `To toi thieu ${minTotal}`,
          };
        }
        if (amount % this.minRaise !== 0) {
          return {
            valid: false,
            reason: `So to phai la boi so cua ${this.minRaise}`,
          };
        }
        if (player.chips < amount - playerCurrentBet) {
          return { valid: false, reason: 'Khong du chip de to' };
        }
        return { valid: true };
      }

      case BettingAction.TO_TAT:
        return { valid: true };

      default:
        return { valid: false, reason: 'Unknown action' };
    }
  }

  /**
   * Process a validated action. Returns the actual chip amount deducted.
   * Caller must update player.chips and pot accordingly.
   */
  processAction(
    player: Player,
    action: BettingAction,
    amount?: number,
  ): { chipsDelta: number; isRaise: boolean } {
    const playerCurrentBet = this.playerBets.get(player.id) ?? 0;

    switch (action) {
      case BettingAction.BO:
        return { chipsDelta: 0, isRaise: false };

      case BettingAction.THEO: {
        const toCall = Math.min(this.currentBet - playerCurrentBet, player.chips);
        this.playerBets.set(player.id, playerCurrentBet + toCall);
        return { chipsDelta: toCall, isRaise: false };
      }

      case BettingAction.TO: {
        const raiseAmount = amount! - playerCurrentBet;
        this.playerBets.set(player.id, amount!);
        this.currentBet = amount!;
        // minRaise stays fixed (= minBet), no poker-style escalation
        return { chipsDelta: raiseAmount, isRaise: true };
      }

      case BettingAction.TO_TAT: {
        const allInAmount = player.chips;
        const newTotal = playerCurrentBet + allInAmount;
        this.playerBets.set(player.id, newTotal);
        const isRaise = newTotal > this.currentBet;
        if (isRaise) {
          this.currentBet = newTotal;
        }
        return { chipsDelta: allInAmount, isRaise };
      }

      default:
        return { chipsDelta: 0, isRaise: false };
    }
  }

  /** Collect antes from all players. Returns map of playerId -> ante paid. */
  collectAntes(players: Player[]): Map<string, number> {
    const collected = new Map<string, number>();
    for (const player of players) {
      const antePaid = Math.min(this.ante, player.chips);
      this.playerBets.set(player.id, antePaid);
      collected.set(player.id, antePaid);
    }
    // Set current bet to ante so raises are calculated correctly
    this.currentBet = this.ante;
    return collected;
  }

  getCurrentBet(): number {
    return this.currentBet;
  }

  getMinRaise(): number {
    return this.minRaise;
  }

  getPlayerBet(playerId: string): number {
    return this.playerBets.get(playerId) ?? 0;
  }

  reset(): void {
    this.currentBet = 0;
    this.playerBets.clear();
  }

  serialize(): {
    currentBet: number;
    minRaise: number;
    ante: number;
    playerBets: [string, number][];
  } {
    return {
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      ante: this.ante,
      playerBets: Array.from(this.playerBets.entries()),
    };
  }

  static fromSnapshot(snapshot: {
    currentBet: number;
    minRaise: number;
    ante: number;
    playerBets: [string, number][];
  }): BettingManager {
    const bm = new BettingManager(snapshot.ante, snapshot.minRaise);
    bm.currentBet = snapshot.currentBet;
    for (const [id, amount] of snapshot.playerBets) {
      bm.playerBets.set(id, amount);
    }
    return bm;
  }
}
