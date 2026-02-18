import { Rank, Suit } from '../types/card';

/** Point value per rank: A=1, 2-9=face value, 10/J/Q/K=0 */
export const CARD_POINTS: Record<Rank, number> = {
  [Rank.ACE]: 1,
  [Rank.TWO]: 2,
  [Rank.THREE]: 3,
  [Rank.FOUR]: 4,
  [Rank.FIVE]: 5,
  [Rank.SIX]: 6,
  [Rank.SEVEN]: 7,
  [Rank.EIGHT]: 8,
  [Rank.NINE]: 9,
  [Rank.TEN]: 0,
  [Rank.JACK]: 0,
  [Rank.QUEEN]: 0,
  [Rank.KING]: 0,
};

/** Suit strength order for tiebreaking (higher = stronger) */
export const SUIT_HIERARCHY: Record<Suit, number> = {
  [Suit.SPADE]: 0,
  [Suit.CLUB]: 1,
  [Suit.HEART]: 2,
  [Suit.DIAMOND]: 3,
};
