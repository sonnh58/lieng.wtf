/**
 * Manages pot collection and distribution.
 * MVP: No side pots. All-in player can only win up to their bet from each opponent.
 */
export class PotManager {
  /** Per-player total contribution to the pot */
  private contributions = new Map<string, number>();

  addBet(playerId: string, amount: number): void {
    const current = this.contributions.get(playerId) ?? 0;
    this.contributions.set(playerId, current + amount);
  }

  getTotal(): number {
    let total = 0;
    for (const amount of this.contributions.values()) {
      total += amount;
    }
    return total;
  }

  getPlayerContribution(playerId: string): number {
    return this.contributions.get(playerId) ?? 0;
  }

  /**
   * Distribute pot to winners.
   * All-in players can only win up to their contribution from each opponent.
   */
  distributeToWinners(
    winnerIds: string[],
    playerChipsMap: Map<string, number>,
  ): Map<string, number> {
    const payouts = new Map<string, number>();

    if (winnerIds.length === 0) return payouts;

    // Simple case: single winner, no all-in complications
    if (winnerIds.length === 1) {
      const winnerId = winnerIds[0];
      const winnerContrib = this.contributions.get(winnerId) ?? 0;
      let winnings = 0;

      for (const [playerId, contrib] of this.contributions) {
        // Winner can only win up to their own contribution from each player
        winnings += Math.min(contrib, winnerContrib);
      }
      payouts.set(winnerId, winnings);

      // Refund excess to other players (if they bet more than winner's all-in)
      for (const [playerId, contrib] of this.contributions) {
        if (playerId === winnerId) continue;
        const excess = contrib - Math.min(contrib, winnerContrib);
        if (excess > 0) {
          payouts.set(playerId, (payouts.get(playerId) ?? 0) + excess);
        }
      }
      return payouts;
    }

    // Multiple winners: split equally (tie case)
    const total = this.getTotal();
    const share = Math.floor(total / winnerIds.length);
    const remainder = total - share * winnerIds.length;

    winnerIds.forEach((id, i) => {
      // First winner gets remainder from rounding
      payouts.set(id, share + (i === 0 ? remainder : 0));
    });

    return payouts;
  }

  reset(): void {
    this.contributions.clear();
  }
}
