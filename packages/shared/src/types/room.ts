export interface RoomConfig {
  maxPlayers: number;
  ante: number;
  minBet: number;
  maxBet: number;
  turnTimer: number;
  startingChips: number;
  allowAllIn?: boolean;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  players: string[];
  config: RoomConfig;
  gameId: string | null;
}
