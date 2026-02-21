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

/** Inline confirmation dialog */
function ConfirmDialog({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
      <div
        className="bg-[--color-surface] border border-[--color-border] rounded-xl p-4 mx-4 max-w-xs w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[--color-text] text-sm text-center mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-[--color-surface-light] hover:brightness-125 text-[--color-text-muted] font-semibold text-xs cursor-pointer border border-[--color-border]"
          >
            Huy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-[--color-primary] hover:brightness-110 text-white font-semibold text-xs cursor-pointer"
          >
            Xac nhan
          </button>
        </div>
      </div>
    </div>
  );
}

export function BettingControls({
  currentBet, myChips, myCurrentBet, minRaise, disabled = false, allowAllIn = false,
}: BettingControlsProps) {
  const socket = getSocket();

  const callAmount = currentBet - myCurrentBet;
  const minRaiseIncrement = currentBet + minRaise - myCurrentBet;
  const [raiseInput, setRaiseInput] = useState(String(minRaiseIncrement));
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);

  useEffect(() => { setRaiseInput(String(minRaiseIncrement)); }, [minRaiseIncrement]);

  const canCall = callAmount > 0 && myChips >= callAmount;
  const canRaise = myChips > minRaiseIncrement;
  const canCheck = currentBet === myCurrentBet;

  const emit = (action: BettingAction, amount?: number) => {
    if (!socket || disabled) return;
    socket.emit('game:action', { action, amount });
  };

  const askConfirm = (message: string, action: () => void) => setConfirm({ message, action });

  const btnClass = 'w-full font-bold py-2 rounded-lg transition-all min-h-[36px] cursor-pointer text-xs';

  return (
    <>
      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          onConfirm={() => { confirm.action(); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="flex flex-col gap-1.5">
        <button
          onClick={() => askConfirm('Bo bai?', () => emit(BettingAction.BO))}
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
          <>
            {/* Quick raise buttons: x5 and x10 base ante */}
            <div className="flex gap-1">
              {[5, 10].map((mult) => {
                const quickAmt = minRaise * mult;
                const total = myCurrentBet + quickAmt;
                const canQuick = quickAmt >= minRaiseIncrement && quickAmt <= myChips;
                return (
                  <button
                    key={mult}
                    onClick={() => askConfirm(`To ${quickAmt}?`, () => emit(BettingAction.TO, total))}
                    disabled={disabled || !canQuick}
                    className={`flex-1 ${btnClass} bg-[--color-surface-light] hover:brightness-125 active:brightness-90 disabled:opacity-40 text-[--color-text] border border-[--color-border]`}
                  >
                    x{mult}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1 items-center justify-center">
              <button
                onClick={() => {
                  const cur = parseInt(raiseInput) || minRaiseIncrement;
                  setRaiseInput(String(Math.max(minRaiseIncrement, cur - minRaise)));
                }}
                className="w-8 h-8 flex items-center justify-center rounded bg-[--color-surface-light] hover:brightness-125 active:brightness-90 text-[--color-text] font-bold text-sm cursor-pointer border border-[--color-border]"
              >
                −
              </button>
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
                className="flex-1 px-1 py-1 bg-[--color-bg] text-[--color-text] rounded border border-[--color-border] focus:outline-none focus:border-[--color-primary] text-xs text-center"
              />
              <button
                onClick={() => {
                  const cur = parseInt(raiseInput) || minRaiseIncrement;
                  setRaiseInput(String(Math.min(myChips, cur + minRaise)));
                }}
                className="w-8 h-8 flex items-center justify-center rounded bg-[--color-surface-light] hover:brightness-125 active:brightness-90 text-[--color-text] font-bold text-sm cursor-pointer border border-[--color-border]"
              >
                +
              </button>
            </div>
            <button
              onClick={() => {
                const amt = parseInt(raiseInput) || 0;
                if (amt >= minRaiseIncrement) askConfirm(`To ${amt}?`, () => emit(BettingAction.TO, myCurrentBet + amt));
              }}
              disabled={disabled || (parseInt(raiseInput) || 0) < minRaiseIncrement}
              className={`${btnClass} bg-[--color-success] hover:brightness-110 active:brightness-90 disabled:opacity-40 text-white`}
            >
              To
            </button>
          </>
        )}
      </div>
    </>
  );
}
