import type { RoomConfig } from '../types/room';

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;
export const CARDS_PER_HAND = 3;
export const DEFAULT_TURN_TIMER = 60; // seconds
export const DEFAULT_ANTE = 10;
export const DEFAULT_MIN_BET = 10;
export const DEFAULT_MAX_BET = 1000;
export const DEFAULT_STARTING_CHIPS = 1000;

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxPlayers: MAX_PLAYERS,
  ante: DEFAULT_ANTE,
  minBet: DEFAULT_MIN_BET,
  maxBet: DEFAULT_MAX_BET,
  turnTimer: DEFAULT_TURN_TIMER,
  startingChips: DEFAULT_STARTING_CHIPS,
};
