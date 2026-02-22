import { EventEmitter } from 'node:events';
import {
  GamePhase,
  BettingAction,
  PlayerState,
  HandType,
  CARDS_PER_HAND,
  SAP_BONUS_MULTIPLIER,
  SUITED_LIENG_BONUS_MULTIPLIER,
  createDeck,
  shuffleDeck,
  dealCards,
  evaluateHand,
  compareHands,
} from '@lieng/shared';
import type { Card, Player, RoomConfig, HandResult } from '@lieng/shared';
import { PotManager } from './pot-manager';
import { TurnManager } from './turn-manager';
import { BettingManager } from './betting-manager';

export interface GameEvents {
  phaseChange: (phase: GamePhase) => void;
  playerAction: (playerId: string, action: BettingAction, amount: number) => void;
  turnChange: (playerId: string) => void;
  roundEnd: (results: RoundResult) => void;
  autoFold: (playerId: string) => void;
}

export interface RoundResult {
  winners: string[];
  hands: Map<string, HandResult>;
  payouts: Map<string, number>;
}

/**
 * Orchestrates a full game round lifecycle.
 * Emits events for the socket layer to broadcast.
 */
export class GameManager extends EventEmitter {
  private phase = GamePhase.WAITING;
  private players = new Map<string, Player>();
  private deck: Card[] = [];
  private dealerIndex = 0;
  private potManager = new PotManager();
  private turnManager: TurnManager | null = null;
  private bettingManager: BettingManager | null = null;
  private config: RoomConfig;
  private roundNumber = 0;

  constructor(config: RoomConfig) {
    super();
    this.config = config;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getPlayers(): Map<string, Player> {
    return this.players;
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  /** Clear all players (call before re-adding for a new round) */
  clearPlayers(): void {
    this.players.clear();
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId);

    // During active round: fold but keep in players map so roundEnd updates their wallet
    if (player && this.turnManager && (this.phase === GamePhase.BETTING || this.phase === GamePhase.DEALING)) {
      player.state = PlayerState.FOLDED;
      this.turnManager.foldPlayer(playerId);
      if (this.turnManager.getCurrentPlayer() === playerId) {
        this.advanceTurn();
      }
      return; // Don't delete — roundEnd will process their loss
    }

    // No active round: safe to remove immediately
    this.players.delete(playerId);
  }

  /** Start a new round: collect antes, shuffle, deal (stays in DEALING phase) */
  startRound(): boolean {
    const activePlayers = Array.from(this.players.values()).filter(
      (p) => p.chips > 0,
    );
    if (activePlayers.length < 2) return false;

    this.roundNumber++;
    this.setPhase(GamePhase.DEALING);

    // Init managers
    this.potManager.reset();
    this.bettingManager = new BettingManager(this.config.ante, this.config.minBet);

    // Collect antes
    const antes = this.bettingManager.collectAntes(activePlayers);
    for (const [playerId, amount] of antes) {
      const player = this.players.get(playerId)!;
      player.chips -= amount;
      player.bet = amount;
      player.state = PlayerState.PLAYING;
      this.potManager.addBet(playerId, amount);
    }

    // Shuffle and deal
    this.deck = shuffleDeck(createDeck());
    const playerIds = activePlayers.map((p) => p.id);

    for (const id of playerIds) {
      const { dealt, remaining } = dealCards(this.deck, CARDS_PER_HAND);
      this.deck = remaining;
      this.players.get(id)!.cards = dealt;
    }

    // Init turn manager
    this.turnManager = new TurnManager(
      playerIds,
      this.dealerIndex,
      this.config.turnTimer,
    );

    return true;
  }

  /** Transition from DEALING to BETTING phase (called after deal animation delay) */
  startBetting(): void {
    if (this.phase !== GamePhase.DEALING || !this.turnManager) return;
    this.setPhase(GamePhase.BETTING);
    this.startTurnTimer();
    this.emit('turnChange', this.turnManager.getCurrentPlayer());
  }

  /** Handle a player's betting action */
  handleAction(
    playerId: string,
    action: BettingAction,
    amount?: number,
  ): { success: boolean; reason?: string } {
    if (this.phase !== GamePhase.BETTING || !this.turnManager || !this.bettingManager) {
      return { success: false, reason: 'Not in betting phase' };
    }

    const player = this.players.get(playerId);
    if (!player) return { success: false, reason: 'Player not found' };

    // All actions require it to be player's turn
    if (this.turnManager.getCurrentPlayer() !== playerId) {
      return { success: false, reason: 'Not your turn' };
    }

    // Validate
    const validation = this.bettingManager.validateAction(player, action, amount);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Process
    const result = this.bettingManager.processAction(player, action, amount);

    player.chips -= result.chipsDelta;
    player.bet += result.chipsDelta;
    this.potManager.addBet(playerId, result.chipsDelta);

    if (action === BettingAction.BO) {
      player.state = PlayerState.FOLDED;
      this.turnManager.foldPlayer(playerId);
    } else if (action === BettingAction.TO_TAT) {
      player.state = PlayerState.ALL_IN;
      this.turnManager!.allInPlayer(playerId);
    }

    // Raise resets acted status for other players
    if (result.isRaise) {
      this.turnManager.resetActedOnRaise(playerId);
    }

    this.emit('playerAction', playerId, action, result.chipsDelta);
    this.advanceTurn();

    return { success: true };
  }

  /** Get game state filtered for a specific player (only sees own cards) */
  getStateForPlayer(playerId: string) {
    const activePlayers = this.turnManager?.getActivePlayers() ?? [];
    const playerList = Array.from(this.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      bet: p.bet,
      state: p.state,
      seatIndex: p.seatIndex,
      // Only show own cards, or all cards during showdown
      cards: p.id === playerId || this.phase === GamePhase.SHOWDOWN
        ? p.cards
        : p.cards.map(() => null),
    }));

    return {
      phase: this.phase,
      pot: this.potManager.getTotal(),
      currentBet: this.bettingManager?.getCurrentBet() ?? 0,
      currentPlayer: this.turnManager?.getCurrentPlayer() ?? null,
      dealerIndex: this.dealerIndex,
      players: playerList,
      round: this.roundNumber,
    };
  }

  private advanceTurn(): void {
    if (!this.turnManager) return;

    const next = this.turnManager.advance();

    if (next === null || this.turnManager.isRoundComplete()) {
      this.resolveRound();
    } else {
      this.startTurnTimer();
      this.emit('turnChange', next);
    }
  }

  private resolveRound(): void {
    this.setPhase(GamePhase.SHOWDOWN);

    const activePlayers = this.turnManager?.getActivePlayers() ?? [];
    const hands = new Map<string, HandResult>();

    // Evaluate hands
    for (const id of activePlayers) {
      const player = this.players.get(id)!;
      hands.set(id, evaluateHand(player.cards));
    }

    // Determine winners
    const winners = this.determineWinners(activePlayers, hands);

    // Distribute pot
    const chipMap = new Map<string, number>();
    for (const [id, p] of this.players) chipMap.set(id, p.chips);
    const payouts = this.potManager.distributeToWinners(winners, chipMap);

    // Apply pot payouts
    for (const [id, amount] of payouts) {
      const player = this.players.get(id);
      if (player) player.chips += amount;
    }

    // Apply SAP / suited LIENG bonus: each opponent pays fixed penalty to holder
    this.applyHandBonuses(activePlayers, hands, payouts);

    const result: RoundResult = { winners, hands, payouts };
    this.emit('roundEnd', result);

    // Cleanup and prepare for next round
    this.endRound();
  }

  /**
   * Apply bonus penalties for SAP (×4 ante) and suited LIENG (×3 ante).
   * Each opponent pays the bonus holder directly. Chips can go below 0.
   * Mutates player.chips and the payouts map.
   */
  private applyHandBonuses(
    activePlayers: string[],
    hands: Map<string, HandResult>,
    payouts: Map<string, number>,
  ): void {
    const ante = this.config.ante;

    for (const holderId of activePlayers) {
      const hand = hands.get(holderId);
      if (!hand) continue;

      let multiplier = 0;
      if (hand.type === HandType.SAP) {
        multiplier = SAP_BONUS_MULTIPLIER;
      } else if (hand.type === HandType.LIENG && hand.isSuited) {
        multiplier = SUITED_LIENG_BONUS_MULTIPLIER;
      }
      if (multiplier === 0) continue;

      const bonusPerOpponent = ante * multiplier;

      // Collect from ALL other players in the round (including folded)
      for (const [opponentId] of this.players) {
        if (opponentId === holderId) continue;
        const opponent = this.players.get(opponentId)!;
        opponent.chips -= bonusPerOpponent;
        payouts.set(opponentId, (payouts.get(opponentId) ?? 0) - bonusPerOpponent);

        const holder = this.players.get(holderId)!;
        holder.chips += bonusPerOpponent;
        payouts.set(holderId, (payouts.get(holderId) ?? 0) + bonusPerOpponent);
      }
    }
  }

  private determineWinners(
    playerIds: string[],
    hands: Map<string, HandResult>,
  ): string[] {
    if (playerIds.length === 0) return [];
    if (playerIds.length === 1) return [playerIds[0]];

    // Sort by hand strength (best first)
    const sorted = [...playerIds].sort((a, b) =>
      compareHands(hands.get(a)!, hands.get(b)!),
    );

    // Collect all players tied with the best hand
    const bestHand = hands.get(sorted[0])!;
    const winners = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (compareHands(bestHand, hands.get(sorted[i])!) === 0) {
        winners.push(sorted[i]);
      } else {
        break;
      }
    }
    return winners;
  }

  private endRound(): void {
    // Reset player state
    for (const player of this.players.values()) {
      player.cards = [];
      player.bet = 0;
      player.state = PlayerState.WAITING;
    }

    // Rotate dealer
    const playerIds = Array.from(this.players.keys());
    this.dealerIndex = (this.dealerIndex + 1) % playerIds.length;

    this.turnManager?.destroy();
    this.turnManager = null;
    this.bettingManager = null;

    this.setPhase(GamePhase.ENDED);
    // After a brief delay, go back to WAITING
    setTimeout(() => this.setPhase(GamePhase.WAITING), 3000);
  }

  private startTurnTimer(): void {
    this.turnManager?.startTimer((playerId) => {
      this.emit('autoFold', playerId);
      this.handleAction(playerId, BettingAction.BO);
    });
  }

  private setPhase(phase: GamePhase): void {
    this.phase = phase;
    this.emit('phaseChange', phase);
  }
}
