import { describe, it, expect } from 'vitest';
import { Suit, Rank, HandType } from '../index';
import type { Card } from '../index';
import { evaluateHand, compareHands } from '../utils/hand-evaluator';
import { isSap, isLieng, isDi, calculatePoints, getHighCard } from '../utils/hand-utils';

const card = (rank: Rank, suit: Suit): Card => ({ rank, suit });

describe('hand-utils', () => {
  describe('calculatePoints', () => {
    it('A + 2 + 3 = 6 points', () => {
      expect(calculatePoints([card(Rank.ACE, Suit.HEART), card(Rank.TWO, Suit.SPADE), card(Rank.THREE, Suit.CLUB)])).toBe(6);
    });

    it('10 + J + K = 0 points (all worth 0)', () => {
      expect(calculatePoints([card(Rank.TEN, Suit.HEART), card(Rank.JACK, Suit.SPADE), card(Rank.KING, Suit.CLUB)])).toBe(0);
    });

    it('7 + 8 + 9 = 24 mod 10 = 4 points', () => {
      expect(calculatePoints([card(Rank.SEVEN, Suit.HEART), card(Rank.EIGHT, Suit.SPADE), card(Rank.NINE, Suit.CLUB)])).toBe(4);
    });

    it('9 + K + Q = 9 points', () => {
      expect(calculatePoints([card(Rank.NINE, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.QUEEN, Suit.CLUB)])).toBe(9);
    });
  });

  describe('isSap', () => {
    it('three Aces is Sáp', () => {
      expect(isSap([card(Rank.ACE, Suit.HEART), card(Rank.ACE, Suit.SPADE), card(Rank.ACE, Suit.CLUB)])).toBe(true);
    });

    it('three Kings is Sáp', () => {
      expect(isSap([card(Rank.KING, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.KING, Suit.CLUB)])).toBe(true);
    });

    it('mixed ranks is not Sáp', () => {
      expect(isSap([card(Rank.ACE, Suit.HEART), card(Rank.ACE, Suit.SPADE), card(Rank.TWO, Suit.CLUB)])).toBe(false);
    });
  });

  describe('isLieng', () => {
    it('A-2-3 is Liêng', () => {
      expect(isLieng([card(Rank.ACE, Suit.HEART), card(Rank.TWO, Suit.SPADE), card(Rank.THREE, Suit.CLUB)])).toBe(true);
    });

    it('Q-K-A is Liêng', () => {
      expect(isLieng([card(Rank.QUEEN, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.ACE, Suit.CLUB)])).toBe(true);
    });

    it('5-6-7 is Liêng', () => {
      expect(isLieng([card(Rank.FIVE, Suit.HEART), card(Rank.SIX, Suit.SPADE), card(Rank.SEVEN, Suit.CLUB)])).toBe(true);
    });

    it('K-A-2 is NOT Liêng', () => {
      expect(isLieng([card(Rank.KING, Suit.HEART), card(Rank.ACE, Suit.SPADE), card(Rank.TWO, Suit.CLUB)])).toBe(false);
    });

    it('2-4-6 is NOT Liêng', () => {
      expect(isLieng([card(Rank.TWO, Suit.HEART), card(Rank.FOUR, Suit.SPADE), card(Rank.SIX, Suit.CLUB)])).toBe(false);
    });
  });

  describe('isDi', () => {
    it('J-Q-K is Đĩ', () => {
      expect(isDi([card(Rank.JACK, Suit.HEART), card(Rank.QUEEN, Suit.SPADE), card(Rank.KING, Suit.CLUB)])).toBe(true);
    });

    it('J-J-K is Đĩ', () => {
      expect(isDi([card(Rank.JACK, Suit.HEART), card(Rank.JACK, Suit.SPADE), card(Rank.KING, Suit.CLUB)])).toBe(true);
    });

    it('10-J-Q is NOT Đĩ (10 is not face card)', () => {
      expect(isDi([card(Rank.TEN, Suit.HEART), card(Rank.JACK, Suit.SPADE), card(Rank.QUEEN, Suit.CLUB)])).toBe(false);
    });
  });

  describe('getHighCard', () => {
    it('Ace is highest', () => {
      const cards = [card(Rank.TWO, Suit.HEART), card(Rank.ACE, Suit.SPADE), card(Rank.KING, Suit.CLUB)];
      const high = getHighCard(cards);
      expect(high.rank).toBe(Rank.ACE);
    });

    it('same rank: Diamond > Heart > Club > Spade', () => {
      const cards = [card(Rank.KING, Suit.SPADE), card(Rank.KING, Suit.DIAMOND), card(Rank.KING, Suit.HEART)];
      const high = getHighCard(cards);
      expect(high.suit).toBe(Suit.DIAMOND);
    });
  });
});

describe('hand-evaluator', () => {
  describe('evaluateHand', () => {
    it('detects Sáp', () => {
      const result = evaluateHand([card(Rank.SEVEN, Suit.HEART), card(Rank.SEVEN, Suit.SPADE), card(Rank.SEVEN, Suit.CLUB)]);
      expect(result.type).toBe(HandType.SAP);
    });

    it('detects Liêng', () => {
      const result = evaluateHand([card(Rank.EIGHT, Suit.HEART), card(Rank.NINE, Suit.SPADE), card(Rank.TEN, Suit.CLUB)]);
      expect(result.type).toBe(HandType.LIENG);
    });

    it('detects Đĩ (non-consecutive face cards)', () => {
      // J-J-K: all face cards but not consecutive → Đĩ
      const result = evaluateHand([card(Rank.JACK, Suit.HEART), card(Rank.JACK, Suit.SPADE), card(Rank.KING, Suit.CLUB)]);
      expect(result.type).toBe(HandType.DI);
    });

    it('J-Q-K is Liêng (consecutive trumps Đĩ)', () => {
      const result = evaluateHand([card(Rank.JACK, Suit.HEART), card(Rank.QUEEN, Suit.SPADE), card(Rank.KING, Suit.CLUB)]);
      expect(result.type).toBe(HandType.LIENG);
    });

    it('detects NORMAL with correct points', () => {
      const result = evaluateHand([card(Rank.TWO, Suit.HEART), card(Rank.FIVE, Suit.SPADE), card(Rank.KING, Suit.CLUB)]);
      expect(result.type).toBe(HandType.NORMAL);
      expect(result.points).toBe(7); // 2 + 5 + 0 = 7
    });
  });

  describe('compareHands', () => {
    it('Sáp beats Liêng', () => {
      const sap = evaluateHand([card(Rank.TWO, Suit.HEART), card(Rank.TWO, Suit.SPADE), card(Rank.TWO, Suit.CLUB)]);
      const lieng = evaluateHand([card(Rank.ACE, Suit.HEART), card(Rank.TWO, Suit.SPADE), card(Rank.THREE, Suit.CLUB)]);
      expect(compareHands(sap, lieng)).toBeLessThan(0); // negative = a wins
    });

    it('Liêng beats Đĩ (non-consecutive face cards)', () => {
      const lieng = evaluateHand([card(Rank.FIVE, Suit.HEART), card(Rank.SIX, Suit.SPADE), card(Rank.SEVEN, Suit.CLUB)]);
      const di = evaluateHand([card(Rank.JACK, Suit.HEART), card(Rank.JACK, Suit.SPADE), card(Rank.KING, Suit.CLUB)]);
      expect(compareHands(lieng, di)).toBeLessThan(0);
    });

    it('Đĩ beats 9 points', () => {
      const di = evaluateHand([card(Rank.JACK, Suit.HEART), card(Rank.JACK, Suit.SPADE), card(Rank.KING, Suit.CLUB)]);
      const nine = evaluateHand([card(Rank.NINE, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.QUEEN, Suit.CLUB)]);
      expect(compareHands(di, nine)).toBeLessThan(0);
    });

    it('9 points beats 8 points', () => {
      const nine = evaluateHand([card(Rank.NINE, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.QUEEN, Suit.CLUB)]);
      const eight = evaluateHand([card(Rank.EIGHT, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.QUEEN, Suit.CLUB)]);
      expect(compareHands(nine, eight)).toBeLessThan(0);
    });

    it('same points: higher suit wins', () => {
      const a = evaluateHand([card(Rank.NINE, Suit.DIAMOND), card(Rank.TEN, Suit.SPADE), card(Rank.TEN, Suit.CLUB)]);
      const b = evaluateHand([card(Rank.NINE, Suit.SPADE), card(Rank.TEN, Suit.HEART), card(Rank.TEN, Suit.CLUB)]);
      // Both 9 points. a has 9♦ (highcard), b has 10♥ as high card...
      // Actually let's make it simpler
      const c = evaluateHand([card(Rank.FIVE, Suit.DIAMOND), card(Rank.FOUR, Suit.SPADE), card(Rank.TEN, Suit.CLUB)]);
      const d = evaluateHand([card(Rank.FIVE, Suit.SPADE), card(Rank.FOUR, Suit.HEART), card(Rank.TEN, Suit.CLUB)]);
      // Both 9 points. c highCard=5♦, d highCard=10♣... hmm 10 is higher rank
      // Let me use same ranks different suits
      const e = evaluateHand([card(Rank.ACE, Suit.DIAMOND), card(Rank.THREE, Suit.SPADE), card(Rank.FIVE, Suit.CLUB)]);
      const f = evaluateHand([card(Rank.ACE, Suit.SPADE), card(Rank.THREE, Suit.HEART), card(Rank.FIVE, Suit.CLUB)]);
      // Both 9 points. e highCard=A♦, f highCard=A♠. Diamond > Spade
      expect(compareHands(e, f)).toBeLessThan(0);
    });

    it('Sáp of Aces beats Sáp of Kings', () => {
      const aces = evaluateHand([card(Rank.ACE, Suit.HEART), card(Rank.ACE, Suit.SPADE), card(Rank.ACE, Suit.CLUB)]);
      const kings = evaluateHand([card(Rank.KING, Suit.HEART), card(Rank.KING, Suit.SPADE), card(Rank.KING, Suit.CLUB)]);
      expect(compareHands(aces, kings)).toBeLessThan(0);
    });
  });
});
