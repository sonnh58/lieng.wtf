import type { Card } from './card';

export enum GamePhase {
  WAITING = 'WAITING',
  DEALING = 'DEALING',
  BETTING = 'BETTING',
  SHOWDOWN = 'SHOWDOWN',
  ENDED = 'ENDED',
}

/** Hand ranking: SAP (trips) > LIENG (straight) > DI (3 face cards) > NORMAL (points) */
export enum HandType {
  SAP = 'SAP',
  LIENG = 'LIENG',
  DI = 'DI',
  NORMAL = 'NORMAL',
}

export interface HandResult {
  type: HandType;
  /** Point value 0-9 (only relevant for NORMAL hands) */
  points: number;
  /** Highest card by rank for tiebreaking (SAP/LIENG/DI) */
  highCard: Card;
  /** Card with highest suit, then rank — for NORMAL tiebreaker */
  bestSuitCard: Card;
  /** Whether all 3 cards share the same suit */
  isSuited: boolean;
}

export enum BettingAction {
  /** Raise */
  TO = 'TO',
  /** Call / follow */
  THEO = 'THEO',
  /** Fold */
  BO = 'BO',
  /** All-in */
  TO_TAT = 'TO_TAT',
}

export interface GameState {
  id: string;
  phase: GamePhase;
  dealerIndex: number;
  currentPlayerIndex: number;
  pot: number;
  currentBet: number;
  players: string[];
  round: number;
}
