import { useEffect, useRef, useState, useMemo } from 'react';
import { useConnectionStore } from '../stores/connection-store';
import { useGameStore } from '../stores/game-store';
import { PlayerSeat } from './player-seat';
import { PotDisplay } from './pot-display';
import { HandDisplay } from './hand-display';
import { BettingControls } from './betting-controls';
import { ShowdownResult } from './showdown-result';
import { GameStatusBar } from './game-status-bar';
import { DealingAnimation } from './dealing-animation';
import { EmojiPicker } from './emoji-picker';
import { FloatingEmoji, useFloatingEmoji } from './floating-emoji';
import { useRoomStore } from '../stores/room-store';
import { PlayerState, BettingAction } from '@lieng/shared';
import { getSocket } from '../socket/socket-client';

interface GameTableProps {
  players: any[];
  dealerIndex: number;
}

export function GameTable({ players, dealerIndex }: GameTableProps) {
  const { playerId } = useConnectionStore();
  const { currentRoom } = useRoomStore();
  const socket = getSocket();
  const {
    phase, myCards, pot, currentBet, currentTurn,
    turnTimeLeft, showdownResults, round, setShowdownResults,
    playerActions,
  } = useGameStore();
  const [flipReveal, setFlipReveal] = useState(false);
  const prevCardsLen = useRef(0);
  const { entries: emojiEntries, addEmoji } = useFloatingEmoji();

  // Listen for emoji events
  useEffect(() => {
    if (!socket) return;
    const onEmoji = ({ playerId: pid, emoji }: { playerId: string; emoji: string }) => {
      const name = players.find((p) => p.id === pid)?.name ?? '';
      addEmoji(emoji, name);
    };
    socket.on('game:emoji', onEmoji);
    return () => { socket.off('game:emoji', onEmoji); };
  }, [socket, players, addEmoji]);

  // Trigger flip reveal when cards are first received
  useEffect(() => {
    if (myCards.length > 0 && prevCardsLen.current === 0) {
      setFlipReveal(true);
    }
    if (myCards.length === 0) {
      setFlipReveal(false);
    }
    prevCardsLen.current = myCards.length;
  }, [myCards]);

  // Local countdown for my turn timer
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isMyTurn = currentTurn === playerId;

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!isMyTurn || phase !== 'BETTING') { setDisplayTime(0); return; }
    setDisplayTime(turnTimeLeft);
    timerRef.current = setInterval(() => {
      setDisplayTime((prev) => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [turnTimeLeft, isMyTurn, phase]);

  const timerPct = turnTimeLeft > 0 ? (displayTime / turnTimeLeft) * 100 : 0;

  const myPlayer = players.find((p) => p.id === playerId);
  const isBettingPhase = phase === 'BETTING';
  const isDealingPhase = phase === 'DEALING';
  const isHost = currentRoom?.hostId === playerId;
  const [preFold, setPreFold] = useState(false);

  // Auto-fold when my turn comes and pre-fold is checked
  useEffect(() => {
    if (preFold && isMyTurn && isBettingPhase && myPlayer?.state === PlayerState.PLAYING) {
      socket?.emit('game:action', { action: BettingAction.BO });
      setPreFold(false);
    }
  }, [preFold, isMyTurn, isBettingPhase, myPlayer?.state]);

  // Reset pre-fold when round ends
  useEffect(() => {
    if (phase === 'WAITING' || phase === 'DEALING') setPreFold(false);
  }, [phase]);

  const handleKick = (targetPlayerId: string) => {
    if (!confirm('Kick nguoi choi nay?')) return;
    socket?.emit('room:kick', { targetPlayerId });
  };

  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    const radiusX = 40;
    const radiusY = 34;
    return {
      left: `${50 + radiusX * Math.cos(angle)}%`,
      top: `${50 + radiusY * Math.sin(angle)}%`,
    };
  };

  const playerNames = players.reduce((acc, p) => {
    acc[p.id] = p.name;
    return acc;
  }, {} as Record<string, string>);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <GameStatusBar phase={phase} round={round} />

      {/* Table area */}
      <div className="flex-1 relative min-h-0 bg-[--color-bg]">
        {/* Felt */}
        <div className="absolute inset-2 sm:inset-4 md:inset-6 rounded-[50%] border-4 sm:border-[6px] border-[#3E2723] shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]"
          style={{ background: 'radial-gradient(ellipse at center, #2E7D32 0%, #1B5E20 60%, #0D3B0F 100%)' }}
        >
          <PotDisplay amount={pot} />
          <FloatingEmoji entries={emojiEntries} />

          {/* Flying cards animation during dealing */}
          {isDealingPhase && (
            <DealingAnimation
              playerCount={players.length}
              getPosition={getPlayerPosition}
            />
          )}

          {players.map((player, index) => (
            <div
              key={player.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
              style={getPlayerPosition(index, players.length)}
            >
              <PlayerSeat
                player={player}
                isCurrentTurn={currentTurn === player.id}
                isDealer={index === dealerIndex}
                turnTimeLeft={turnTimeLeft}
                showCards={phase === 'SHOWDOWN' || player.id === playerId}
                isMe={player.id === playerId}
                lastAction={playerActions[player.id]}
                canKick={isHost && player.id !== playerId}
                onKick={handleKick}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom panel — narrow buttons left, large cards right */}
      <div className="bg-[--color-surface] border-t border-[--color-border] p-2 sm:p-3 safe-bottom shrink-0">
        <div className="max-w-2xl mx-auto flex gap-2 items-center">
          {/* Left: compact action buttons column */}
          <div className="w-[100px] sm:w-[120px] shrink-0">
            {isDealingPhase && (
              <div className="text-center text-[--color-text-muted] text-xs py-2 animate-pulse">
                Chia bai...
              </div>
            )}

            {isBettingPhase && isMyTurn && myPlayer && myPlayer.state === PlayerState.PLAYING && (
              <BettingControls
                currentBet={currentBet}
                myChips={myPlayer.chips}
                myCurrentBet={myPlayer.bet || 0}
                minRaise={currentRoom?.config?.minBet || 10}
                allowAllIn={currentRoom?.config?.allowAllIn !== false}
              />
            )}

            {isBettingPhase && !isMyTurn && myPlayer && myPlayer.state === PlayerState.PLAYING && (
              <label className="flex items-center gap-2 py-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preFold}
                  onChange={(e) => setPreFold(e.target.checked)}
                  className="w-4 h-4 accent-[--color-accent] cursor-pointer"
                />
                <span className={`text-xs font-semibold ${preFold ? 'text-[--color-accent]' : 'text-[--color-text-muted]'}`}>
                  Bo luot
                </span>
              </label>
            )}
          </div>

          {/* Big countdown timer when it's my turn */}
          {isBettingPhase && isMyTurn && displayTime > 0 && (
            <div className="flex flex-col items-center gap-1 w-10 shrink-0">
              <div className={`text-2xl sm:text-3xl font-bold tabular-nums ${
                timerPct > 50 ? 'text-[--color-success]' : timerPct > 25 ? 'text-[--color-gold]' : 'text-[--color-accent] animate-pulse'
              }`}>
                {displayTime}
              </div>
              <div className="w-full h-1 rounded-full bg-[--color-border] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 linear ${
                    timerPct > 50 ? 'bg-[--color-success]' : timerPct > 25 ? 'bg-[--color-gold]' : 'bg-[--color-accent]'
                  }`}
                  style={{ width: `${timerPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Right: my cards — takes remaining space */}
          {myCards.length > 0 && (
            <div className="flex-1 flex justify-center">
              <HandDisplay cards={myCards} size="lg" flipReveal={flipReveal} />
            </div>
          )}

          {/* Emoji picker */}
          <div className="shrink-0">
            <EmojiPicker />
          </div>
        </div>
      </div>

      {showdownResults && (
        <ShowdownResult
          winners={showdownResults.winners}
          hands={showdownResults.hands}
          payouts={showdownResults.payouts}
          playerNames={playerNames}
        />
      )}
    </div>
  );
}
