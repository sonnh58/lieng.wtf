import { useMemo } from 'react';
import type { Card } from '@lieng/shared';
import { PlayingCard } from './playing-card';
import { handTypeToVietnamese } from '../utils/card-display';
import { formatChipsFull } from '../utils/format-chips';
import { getSocket } from '../socket/socket-client';
import { useConnectionStore } from '../stores/connection-store';
import { useRoomStore } from '../stores/room-store';
import { Fireworks } from './fireworks';

interface ShowdownResultProps {
  winners: string[];
  hands: Record<string, { cards: Card[]; handType: string; points: number }>;
  payouts: Record<string, number>;
  playerNames: Record<string, string>;
}

export function ShowdownResult({ winners, hands, payouts, playerNames }: ShowdownResultProps) {
  const { playerId } = useConnectionStore();
  const { currentRoom } = useRoomStore();
  const socket = getSocket();

  // Winner (new host) can deal next round
  const isDealer = currentRoom?.hostId === playerId;
  const handleDeal = () => socket?.emit('game:start');

  // Check if any winner has LIENG or SAP
  const hasSpecialHand = useMemo(() => {
    return winners.some((wId) => {
      const ht = hands[wId]?.handType;
      return ht === 'LIENG' || ht === 'SAP';
    });
  }, [winners, hands]);

  // Sort: winners first
  const sortedEntries = Object.entries(hands).sort(([a], [b]) => {
    const aWin = winners.includes(a) ? 0 : 1;
    const bWin = winners.includes(b) ? 0 : 1;
    return aWin - bWin;
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      {hasSpecialHand && <Fireworks />}
      <div className="bg-[--color-surface] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md safe-bottom">
        <div className="p-3 sm:p-4">
          {/* Header */}
          <h2 className="text-base font-bold text-[--color-gold] text-glow-gold text-center mb-3 tracking-wider">
            KET QUA
          </h2>

          {/* Player rows */}
          <div className="space-y-2">
            {sortedEntries.map(([pId, hand]) => {
              const isWinner = winners.includes(pId);
              return (
                <div
                  key={pId}
                  className={`flex items-center gap-2 p-2 rounded-lg border ${isWinner ? 'border-[--color-gold]/60 bg-[--color-gold]/5' : 'border-[--color-border] bg-[--color-bg]'}`}
                >
                  {/* Cards */}
                  <div className="flex gap-0.5 shrink-0">
                    {hand.cards.map((card, i) => (
                      <PlayingCard key={i} card={card} size="sm" />
                    ))}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[--color-text] font-semibold text-sm truncate">
                        {playerNames[pId] || pId}
                      </span>
                    </div>
                    <div className="text-xs text-[--color-text-muted]">
                      {handTypeToVietnamese(hand.handType)}{hand.points > 0 ? ` ${hand.points}đ` : ''}
                    </div>
                  </div>
                  {/* Payout */}
                  {payouts[pId] !== undefined && (
                    <div className={`font-bold text-sm shrink-0 ${payouts[pId] > 0 ? 'text-[--color-success]' : 'text-[--color-accent]'}`}>
                      {payouts[pId] > 0 ? '+' : ''}{formatChipsFull(payouts[pId])}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action */}
          <div className="mt-3">
            {isDealer ? (
              <button
                onClick={handleDeal}
                className="w-full font-bold py-2.5 rounded-lg transition-all min-h-[40px] cursor-pointer text-sm bg-[--color-success] hover:brightness-110 active:brightness-90 text-white"
              >
                Chia bai
              </button>
            ) : (
              <p className="text-center text-[--color-text-muted] text-xs py-2">
                Cho {playerNames[currentRoom?.hostId ?? ''] || 'nguoi thang'} chia bai...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
