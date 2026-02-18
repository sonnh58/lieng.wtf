/** Suit with hierarchy value (higher = stronger for tiebreakers) */
export enum Suit {
  SPADE = 0,
  CLUB = 1,
  HEART = 2,
  DIAMOND = 3,
}

/** Card rank: ACE=1, TWO=2, ... KING=13 */
export enum Rank {
  ACE = 1,
  TWO = 2,
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
}

export interface Card {
  suit: Suit;
  rank: Rank;
}
