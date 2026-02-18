import { Rank } from '../types/card';
import type { Card } from '../types/card';
import { CARD_POINTS, SUIT_HIERARCHY } from '../constants/card-values';

/** Calculate hand points: sum of card values mod 10 */
export function calculatePoints(cards: Card[]): number {
  const sum = cards.reduce((total, card) => total + CARD_POINTS[card.rank], 0);
  return sum % 10;
}

/** Three of a kind (same rank) */
export function isSap(cards: Card[]): boolean {
  return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
}

/** Three consecutive ranks. Valid wraps: A-2-3 and Q-K-A only */
export function isLieng(cards: Card[]): boolean {
  const ranks = cards.map((c) => c.rank).sort((a, b) => a - b);

  // Normal consecutive: e.g. 5-6-7
  if (ranks[2] - ranks[1] === 1 && ranks[1] - ranks[0] === 1) {
    return true;
  }

  // Q-K-A wrap (12-13-1 sorted as 1-12-13)
  if (ranks[0] === Rank.ACE && ranks[1] === Rank.QUEEN && ranks[2] === Rank.KING) {
    return true;
  }

  // A-2-3 (sorted as 1-2-3, already caught by normal consecutive)
  return false;
}

/** All three cards are face cards (J, Q, K) - called "Đĩ" */
export function isDi(cards: Card[]): boolean {
  return cards.every(
    (c) => c.rank === Rank.JACK || c.rank === Rank.QUEEN || c.rank === Rank.KING,
  );
}

/** Get highest card by rank, then by suit hierarchy for tiebreaker */
export function getHighCard(cards: Card[]): Card {
  return cards.reduce((highest, card) => {
    // Ace is highest rank for comparison purposes
    const rankA = highest.rank === Rank.ACE ? 14 : highest.rank;
    const rankB = card.rank === Rank.ACE ? 14 : card.rank;

    if (rankB > rankA) return card;
    if (rankB === rankA && SUIT_HIERARCHY[card.suit] > SUIT_HIERARCHY[highest.suit]) {
      return card;
    }
    return highest;
  });
}
