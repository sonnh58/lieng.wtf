import type { Card } from './card';

export enum PlayerState {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
  FOLDED = 'FOLDED',
  ALL_IN = 'ALL_IN',
}

export interface Player {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  bet: number;
  state: PlayerState;
  seatIndex: number;
}
