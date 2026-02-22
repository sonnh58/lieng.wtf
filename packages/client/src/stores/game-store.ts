import { create } from 'zustand';
import type { Card, Player, GamePhase, HandResult } from '@lieng/shared';

interface ShowdownResult {
  winners: string[];
  hands: Record<string, { cards: Card[]; handType: string; points: number }>;
  payouts: Record<string, number>;
}

interface PlayerAction {
  action: string;   // BettingAction value: 'TO' | 'THEO' | 'BO' | 'TO_TAT'
  amount?: number;
}

interface GameState {
  phase: GamePhase;
  myCards: Card[];
  players: Player[];
  pot: number;
  currentBet: number;
  currentTurn: string | null;
  turnTimeLeft: number;
  showdownResults: ShowdownResult | null;
  dealerIndex: number;
  round: number;
  walletBalance: number | null;
  totalLoaned: number;
  totalPnl: number;
  readyPlayers: string[];
  playerActions: Record<string, PlayerAction>;

  setPhase: (phase: GamePhase) => void;
  setMyCards: (cards: Card[]) => void;
  setPlayers: (players: Player[]) => void;
  setPot: (pot: number) => void;
  setCurrentBet: (bet: number) => void;
  setCurrentTurn: (playerId: string | null) => void;
  setTurnTimeLeft: (time: number) => void;
  setShowdownResults: (results: ShowdownResult | null) => void;
  setDealerIndex: (index: number) => void;
  setRound: (round: number) => void;
  setWalletBalance: (balance: number) => void;
  setWalletStats: (stats: { walletBalance: number; totalLoaned: number; totalPnl: number }) => void;
  setReadyPlayers: (ids: string[]) => void;
  setPlayerAction: (playerId: string, action: PlayerAction) => void;
  clearPlayerActions: () => void;
  updateGameState: (state: Partial<GameState>) => void;
  resetGame: () => void;
}

const initialState = {
  phase: 'WAITING' as GamePhase,
  myCards: [],
  players: [],
  pot: 0,
  currentBet: 0,
  currentTurn: null,
  turnTimeLeft: 30,
  showdownResults: null,
  dealerIndex: 0,
  round: 0,
  walletBalance: null,
  totalLoaned: 0,
  totalPnl: 0,
  readyPlayers: [],
  playerActions: {},
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setMyCards: (cards) => set({ myCards: cards }),
  setPlayers: (players) => set({ players }),
  setPot: (pot) => set({ pot }),
  setCurrentBet: (bet) => set({ currentBet: bet }),
  setCurrentTurn: (playerId) => set({ currentTurn: playerId }),
  setTurnTimeLeft: (time) => set({ turnTimeLeft: time }),
  setShowdownResults: (results) => set({ showdownResults: results }),
  setDealerIndex: (index) => set({ dealerIndex: index }),
  setRound: (round) => set({ round }),
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  setWalletStats: (stats) => set({ walletBalance: stats.walletBalance, totalLoaned: stats.totalLoaned, totalPnl: stats.totalPnl }),
  setReadyPlayers: (ids) => set({ readyPlayers: ids }),
  setPlayerAction: (playerId, action) => set((prev) => ({
    playerActions: { ...prev.playerActions, [playerId]: action },
  })),
  clearPlayerActions: () => set({ playerActions: {} }),
  updateGameState: (state) => set((prev) => ({ ...prev, ...state })),
  resetGame: () => set(initialState),
}));
