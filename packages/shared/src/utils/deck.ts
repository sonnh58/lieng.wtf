import { Suit, Rank } from '../types/card';
import type { Card } from '../types/card';

/** Create a standard 52-card deck */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits = [Suit.SPADE, Suit.CLUB, Suit.HEART, Suit.DIAMOND];
  const ranks = [
    Rank.ACE, Rank.TWO, Rank.THREE, Rank.FOUR, Rank.FIVE,
    Rank.SIX, Rank.SEVEN, Rank.EIGHT, Rank.NINE, Rank.TEN,
    Rank.JACK, Rank.QUEEN, Rank.KING,
  ];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

/** Cryptographically secure random integer in [0, max) */
function secureRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

/** Fisher-Yates shuffle with crypto-secure RNG, returns new array */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/** Deal cards from top of deck */
export function dealCards(
  deck: Card[],
  count: number,
): { dealt: Card[]; remaining: Card[] } {
  return {
    dealt: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}
