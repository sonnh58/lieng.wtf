import type { RoomConfig } from '../types/room';

export const MAX_PLAYERS = 12;
export const MIN_PLAYERS = 2;
export const CARDS_PER_HAND = 3;
export const DEFAULT_TURN_TIMER = 60; // seconds
export const DEFAULT_ANTE = 10;
export const DEFAULT_MIN_BET = 10;
export const DEFAULT_MAX_BET = 50;
export const DEFAULT_STARTING_CHIPS = 1000;

/** Bonus multiplier: SAP holder collects ante × this from each opponent */
export const SAP_BONUS_MULTIPLIER = 4;
/** Bonus multiplier: Suited LIENG holder collects ante × this from each opponent */
export const SUITED_LIENG_BONUS_MULTIPLIER = 3;

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  maxPlayers: MAX_PLAYERS,
  ante: DEFAULT_ANTE,
  minBet: DEFAULT_MIN_BET,
  maxBet: DEFAULT_MAX_BET,
  turnTimer: DEFAULT_TURN_TIMER,
  startingChips: DEFAULT_STARTING_CHIPS,
};
