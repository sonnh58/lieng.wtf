import { HandType } from '../types/game';
import type { Card } from '../types/card';
import type { HandResult } from '../types/game';
import { SUIT_HIERARCHY } from '../constants/card-values';
import { Rank } from '../types/card';
import { isSap, isLieng, isDi, isSuited, calculatePoints, getHighCard } from './hand-utils';

/** Numeric rank for HandType comparison (higher = stronger) */
const HAND_TYPE_RANK: Record<HandType, number> = {
  [HandType.SAP]: 4,
  [HandType.LIENG]: 3,
  [HandType.DI]: 2,
  [HandType.NORMAL]: 1,
};

/** Evaluate a 3-card hand and return its result */
export function evaluateHand(cards: Card[]): HandResult {
  const highCard = getHighCard(cards);
  const suited = isSuited(cards);

  if (isSap(cards)) {
    return { type: HandType.SAP, points: 0, highCard, isSuited: suited };
  }

  if (isLieng(cards)) {
    return { type: HandType.LIENG, points: 0, highCard, isSuited: suited };
  }

  if (isDi(cards)) {
    return { type: HandType.DI, points: 0, highCard, isSuited: suited };
  }

  return {
    type: HandType.NORMAL,
    points: calculatePoints(cards),
    highCard,
    isSuited: suited,
  };
}

/**
 * Compare two hands. Returns:
 * - negative if `a` wins
 * - positive if `b` wins
 * - 0 if tie (equal points, same high card rank+suit)
 */
export function compareHands(a: HandResult, b: HandResult): number {
  // Compare hand type first
  const typeA = HAND_TYPE_RANK[a.type];
  const typeB = HAND_TYPE_RANK[b.type];
  if (typeA !== typeB) return typeB - typeA;

  // Same hand type - compare by sub-ranking
  if (a.type === HandType.SAP) {
    // Sap: compare rank (A highest)
    return compareSapRank(a, b);
  }

  if (a.type === HandType.LIENG) {
    // Lieng: compare high card rank then suit
    return compareCards(a.highCard, b.highCard);
  }

  if (a.type === HandType.DI) {
    // Đĩ: compare high card
    return compareCards(a.highCard, b.highCard);
  }

  // NORMAL: compare points, then suit of high card
  if (a.points !== b.points) return b.points - a.points;
  return SUIT_HIERARCHY[b.highCard.suit] - SUIT_HIERARCHY[a.highCard.suit];
}

/** Compare Sáp rank (A-A-A is highest) */
function compareSapRank(a: HandResult, b: HandResult): number {
  const rankA = a.highCard.rank === Rank.ACE ? 14 : a.highCard.rank;
  const rankB = b.highCard.rank === Rank.ACE ? 14 : b.highCard.rank;
  if (rankA !== rankB) return rankB - rankA;
  // Same rank sáp: compare by suit of high card
  return SUIT_HIERARCHY[b.highCard.suit] - SUIT_HIERARCHY[a.highCard.suit];
}

/** Compare two cards: rank first (A=14), then suit hierarchy */
function compareCards(a: Card, b: Card): number {
  const rankA = a.rank === Rank.ACE ? 14 : a.rank;
  const rankB = b.rank === Rank.ACE ? 14 : b.rank;
  if (rankA !== rankB) return rankB - rankA;
  return SUIT_HIERARCHY[b.suit] - SUIT_HIERARCHY[a.suit];
}
