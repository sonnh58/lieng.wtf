import { describe, it, expect } from 'vitest';
import { createDeck, shuffleDeck, dealCards } from '../utils/deck';

describe('deck utilities', () => {
  it('createDeck returns 52 unique cards', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    const keys = deck.map((c) => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('shuffleDeck returns different order', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(52);
    // Very unlikely to be same order
    const sameOrder = deck.every((c, i) => c.suit === shuffled[i].suit && c.rank === shuffled[i].rank);
    expect(sameOrder).toBe(false);
  });

  it('shuffleDeck does not mutate original', () => {
    const deck = createDeck();
    const copy = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(copy);
  });

  it('dealCards splits correctly', () => {
    const deck = createDeck();
    const { dealt, remaining } = dealCards(deck, 3);
    expect(dealt).toHaveLength(3);
    expect(remaining).toHaveLength(49);
    expect(dealt).toEqual(deck.slice(0, 3));
  });
});
