import { useEffect, useRef, useState } from 'react';
import type { Player } from '@lieng/shared';
import { PlayerState } from '@lieng/shared';
import { HandDisplay } from './hand-display';
import { formatChipsFull } from '../utils/format-chips';

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  isDealer: boolean;
  turnTimeLeft: number;
  showCards?: boolean;
  /** Whether this seat is the local player (cards managed by bottom panel) */
  isMe?: boolean;
  /** Last action taken by this player */
  lastAction?: { action: string; amount?: number };
  /** Show kick button (host only, not self) */
  canKick?: boolean;
  onKick?: (playerId: string) => void;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  TO: { label: 'To', color: 'bg-green-600 text-white' },
  THEO: { label: 'Theo', color: 'bg-blue-600 text-white' },
  BO: { label: 'Bo', color: 'bg-red-600 text-white' },
  TO_TAT: { label: 'All-in', color: 'bg-yellow-500 text-black' },
};

export function PlayerSeat({
  player, isCurrentTurn, isDealer, turnTimeLeft, showCards = false, isMe = false, lastAction, canKick = false, onKick,
}: PlayerSeatProps) {
  const isFolded = player.state === PlayerState.FOLDED;
  const isAllIn = player.state === PlayerState.ALL_IN;
  const isActive = player.state === PlayerState.PLAYING;

  // Local countdown for progress bar
  const [displayTime, setDisplayTime] = useState(turnTimeLeft);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isCurrentTurn || !isActive) return;
    setDisplayTime(turnTimeLeft);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayTime((prev) => {
        if (prev <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [turnTimeLeft, isCurrentTurn, isActive]);

  const timerPct = turnTimeLeft > 0 ? (displayTime / turnTimeLeft) * 100 : 0;
  const timerColor = timerPct > 50 ? 'bg-[--color-success]' : timerPct > 25 ? 'bg-[--color-gold]' : 'bg-[--color-accent]';

  return (
    <div className="relative">
      <div
        className={`
          bg-[--color-surface] rounded-lg p-1.5 sm:p-2 min-w-[84px] sm:min-w-[120px] border
          ${isCurrentTurn ? 'border-[--color-gold] animate-turn-glow' : 'border-[--color-border]'}
          ${isFolded ? 'opacity-40' : ''}
        `}
      >
        {/* Dealer badge */}
        {isDealer && (
          <div className="absolute -top-1.5 -right-1.5 sm:-top-2 sm:-right-2 bg-[--color-gold] text-[--color-bg] text-[9px] sm:text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-yellow-600">
            D
          </div>
        )}

        {/* Kick button (host only) */}
        {canKick && (
          <button
            onClick={() => onKick?.(player.id)}
            className="absolute -top-1.5 -left-1.5 sm:-top-2 sm:-left-2 bg-red-600 hover:bg-red-500 text-white text-[9px] sm:text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-red-800 cursor-pointer z-10"
            title="Kick"
          >
            X
          </button>
        )}

        {/* Name + countdown number */}
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <div className="text-[--color-text] font-semibold text-[10px] sm:text-xs truncate max-w-[60px] sm:max-w-[90px]">
            {player.name}
          </div>
          {isCurrentTurn && isActive && (
            <span className={`text-[9px] sm:text-[10px] font-bold ${timerPct > 50 ? 'text-[--color-success]' : timerPct > 25 ? 'text-[--color-gold]' : 'text-[--color-accent]'}`}>
              {displayTime}s
            </span>
          )}
        </div>

        {/* Timer progress bar */}
        {isCurrentTurn && isActive && (
          <div className="h-[3px] rounded-full bg-[--color-border] mb-1 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
              style={{ width: `${timerPct}%` }}
            />
          </div>
        )}

        {/* Cards — for self, show face-down on seat (bottom panel handles flip) */}
        <div className="flex justify-center mb-1">
          <HandDisplay
            cards={!isMe && showCards ? player.cards || [] : []}
            faceDown={isMe || !showCards}
            size="xs"
          />
        </div>

        {/* Chips */}
        <div className="text-[--color-gold] text-[9px] sm:text-[11px] font-bold text-center">
          {formatChipsFull(player.chips)}
        </div>

        {/* Bet */}
        {player.bet > 0 && (
          <div className="text-[--color-success] text-[9px] sm:text-[10px] text-center">
            {formatChipsFull(player.bet)}
          </div>
        )}

        {/* Status */}
        {isFolded && (
          <div className="text-[--color-accent] text-[9px] sm:text-[10px] text-center font-bold">BO</div>
        )}
        {isAllIn && (
          <div className="text-[--color-gold] text-[9px] sm:text-[10px] text-center font-bold text-glow-gold">ALL-IN</div>
        )}
      </div>

      {/* Last action badge */}
      {lastAction && ACTION_LABELS[lastAction.action] && (
        <div className={`absolute -bottom-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] sm:text-[9px] font-bold whitespace-nowrap shadow-md ${ACTION_LABELS[lastAction.action].color}`}>
          {ACTION_LABELS[lastAction.action].label}
          {lastAction.action === 'TO' && lastAction.amount != null && ` ${lastAction.amount}`}
        </div>
      )}
    </div>
  );
}
