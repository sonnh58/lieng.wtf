import { Rank, Suit } from '@lieng/shared';

export function rankToDisplay(rank: Rank): string {
  switch (rank) {
    case Rank.ACE:
      return 'A';
    case Rank.TWO:
      return '2';
    case Rank.THREE:
      return '3';
    case Rank.FOUR:
      return '4';
    case Rank.FIVE:
      return '5';
    case Rank.SIX:
      return '6';
    case Rank.SEVEN:
      return '7';
    case Rank.EIGHT:
      return '8';
    case Rank.NINE:
      return '9';
    case Rank.TEN:
      return '10';
    case Rank.JACK:
      return 'J';
    case Rank.QUEEN:
      return 'Q';
    case Rank.KING:
      return 'K';
    default:
      return '?';
  }
}

export function suitToDisplay(suit: Suit): string {
  switch (suit) {
    case Suit.SPADE:
      return '♠';
    case Suit.CLUB:
      return '♣';
    case Suit.HEART:
      return '♥';
    case Suit.DIAMOND:
      return '♦';
    default:
      return '?';
  }
}

export function suitToColor(suit: Suit): 'red' | 'black' {
  return suit === Suit.HEART || suit === Suit.DIAMOND ? 'red' : 'black';
}

export function handTypeToVietnamese(handType: string): string {
  if (!handType) return '—';
  switch (handType.toUpperCase()) {
    case 'SAP':
      return 'Sáp';
    case 'LIENG':
      return 'Liêng';
    case 'DI':
      return 'Ảnh';
    case 'NORMAL':
      return 'Thường';
    default:
      return handType;
  }
}
