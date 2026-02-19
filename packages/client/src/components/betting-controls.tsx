import { useState, useEffect } from 'react';
import { BettingAction } from '@lieng/shared';
import { getSocket } from '../socket/socket-client';
import { formatChips } from '../utils/format-chips';

interface BettingControlsProps {
  currentBet: number;
  myChips: number;
  myCurrentBet: number;
  minRaise: number;
  disabled?: boolean;
  allowAllIn?: boolean;
}

export function BettingControls({
  currentBet, myChips, myCurrentBet, minRaise, disabled = false, allowAllIn = true,
}: BettingControlsProps) {
  const socket = getSocket();

  const callAmount = currentBet - myCurrentBet;
  // Minimum total to raise = currentBet + minRaise; increment = that minus what we already bet
  const minRaiseIncrement = currentBet + minRaise - myCurrentBet;
  const [raiseInput, setRaiseInput] = useState(String(minRaiseIncrement));
  // Sync default input when bet state changes (e.g. opponent raises)
  useEffect(() => { setRaiseInput(String(minRaiseIncrement)); }, [minRaiseIncrement]);

  const canCall = callAmount > 0 && myChips >= callAmount;
  const canRaise = myChips > minRaiseIncrement;
  const canCheck = currentBet === myCurrentBet;

  const emit = (action: BettingAction, amount?: number) => {
    if (!socket || disabled) return;
    socket.emit('game:action', { action, amount });
  };

  const btnClass = 'w-full font-bold py-2 rounded-lg transition-all min-h-[36px] cursor-pointer text-xs';

  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => emit(BettingAction.BO)}
        disabled={disabled}
        className={`${btnClass} bg-[--color-accent] hover:brightness-110 active:brightness-90 disabled:opacity-40 text-white`}
      >
        Bo
      </button>
      <button
        onClick={() => emit(BettingAction.THEO)}
        disabled={disabled || (!canCheck && !canCall)}
        className={`${btnClass} bg-[--color-primary] hover:brightness-110 active:brightness-90 disabled:opacity-40 text-white`}
      >
        {canCheck ? 'Xem' : `Theo`}
      </button>
      {canRaise && (
        <div className="flex gap-1">
          <input
            type="number"
            value={raiseInput}
            onChange={(e) => setRaiseInput(e.target.value)}
            onBlur={() => {
              const val = parseInt(raiseInput) || minRaiseIncrement;
              setRaiseInput(String(Math.max(minRaiseIncrement, Math.min(val, myChips))));
            }}
            min={minRaiseIncrement}
            max={myChips}
            className="w-12 px-1 py-1 bg-[--color-bg] text-[--color-text] rounded border border-[--color-border] focus:outline-none focus:border-[--color-primary] text-xs text-center"
          />
          <button
            onClick={() => { const amt = parseInt(raiseInput) || 0; if (amt >= minRaiseIncrement) emit(BettingAction.TO, myCurrentBet + amt); }}
            disabled={disabled || (parseInt(raiseInput) || 0) < minRaiseIncrement}
            className={`flex-1 ${btnClass} bg-[--color-success] hover:brightness-110 active:brightness-90 disabled:opacity-40 text-white`}
          >
            To
          </button>
        </div>
      )}
      {allowAllIn && (
        <button
          onClick={() => emit(BettingAction.TO_TAT)}
          disabled={disabled}
          className={`${btnClass} bg-gradient-to-r from-[--color-gold] to-amber-500 hover:brightness-110 active:brightness-90 disabled:opacity-40 text-[--color-bg]`}
        >
          All-in
        </button>
      )}
    </div>
  );
}
