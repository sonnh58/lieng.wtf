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
      <div className="bg-[--color-surface] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md lg:max-w-2xl safe-bottom">
        <div className="p-3 sm:p-4 lg:p-8">
          {/* Header */}
          <h2 className="text-base lg:text-2xl font-bold text-[--color-gold] text-glow-gold text-center mb-3 lg:mb-6 tracking-wider">
            KET QUA
          </h2>

          {/* Player rows */}
          <div className="space-y-2 lg:space-y-4">
            {sortedEntries.map(([pId, hand]) => {
              const isWinner = winners.includes(pId);
              return (
                <div
                  key={pId}
                  className={`flex items-center gap-2 lg:gap-4 p-2 lg:p-4 rounded-lg border ${isWinner ? 'border-[--color-gold]/60 bg-[--color-gold]/5' : 'border-[--color-border] bg-[--color-bg]'}`}
                >
                  {/* Cards */}
                  <div className="flex gap-0.5 lg:gap-1.5 shrink-0 lg:scale-125 lg:origin-left">
                    {hand.cards.map((card, i) => (
                      <PlayingCard key={i} card={card} size="sm" />
                    ))}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[--color-text] font-semibold text-sm lg:text-lg truncate">
                        {playerNames[pId] || pId}
                      </span>
                    </div>
                    <div className="text-xs lg:text-base text-[--color-text-muted]">
                      {handTypeToVietnamese(hand.handType)}{hand.points > 0 ? ` ${hand.points}đ` : ''}
                    </div>
                  </div>
                  {/* Payout */}
                  {payouts[pId] !== undefined && (
                    <div className={`font-bold text-sm lg:text-xl shrink-0 ${payouts[pId] > 0 ? 'text-[--color-success]' : 'text-[--color-accent]'}`}>
                      {payouts[pId] > 0 ? '+' : ''}{formatChipsFull(payouts[pId])}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action */}
          <div className="mt-3 lg:mt-6">
            {isDealer ? (
              <button
                onClick={handleDeal}
                className="w-full font-bold py-2.5 lg:py-4 rounded-lg transition-all min-h-[40px] lg:min-h-[56px] cursor-pointer text-sm lg:text-lg bg-[--color-success] hover:brightness-110 active:brightness-90 text-white"
              >
                Chia bai
              </button>
            ) : (
              <p className="text-center text-[--color-text-muted] text-xs lg:text-base py-2 lg:py-3">
                Cho {playerNames[currentRoom?.hostId ?? ''] || 'nguoi thang'} chia bai...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
