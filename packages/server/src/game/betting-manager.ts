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

      case BettingAction.TO:
        if (!amount || amount < this.currentBet + this.minRaise) {
          return {
            valid: false,
            reason: `Raise must be at least ${this.currentBet + this.minRaise}`,
          };
        }
        if (player.chips < amount - playerCurrentBet) {
          return { valid: false, reason: 'Not enough chips to raise' };
        }
        return { valid: true };

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
        const prevBet = this.currentBet;
        this.currentBet = amount!;
        this.minRaise = amount! - prevBet + this.minRaise;
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
}
