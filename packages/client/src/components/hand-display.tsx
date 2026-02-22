import { useState, useEffect } from 'react';
import type { Card } from '@lieng/shared';
import { evaluateHand, HandType } from '@lieng/shared';
import { PlayingCard } from './playing-card';

const HAND_TYPE_LABEL: Record<string, string> = {
  [HandType.SAP]: 'Sap',
  [HandType.LIENG]: 'Lieng',
  [HandType.DI]: 'Anh',
  [HandType.NORMAL]: '',
};

const HAND_TYPE_COLOR: Record<string, string> = {
  [HandType.SAP]: 'text-[--color-accent] text-glow-gold',
  [HandType.LIENG]: 'text-[--color-gold] text-glow-gold',
  [HandType.DI]: 'text-[--color-success]',
  [HandType.NORMAL]: 'text-[--color-text]',
};

interface HandDisplayProps {
  cards: Card[];
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** When true, cards start face-down and flip on tap */
  flipReveal?: boolean;
}

export function HandDisplay({ cards, faceDown = false, size = 'md', flipReveal = false }: HandDisplayProps) {
  const displayCards = [...cards];
  while (displayCards.length < 3) displayCards.push(undefined as any);

  const [revealed, setRevealed] = useState<boolean[]>([false, false, false]);

  // Reset when cards are cleared (new round)
  useEffect(() => {
    if (cards.length === 0) {
      setRevealed([false, false, false]);
    }
  }, [cards]);

  const handleFlip = (index: number) => {
    if (revealed[index]) return;
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const allRevealed = revealed[0] && revealed[1] && revealed[2] && cards.length >= 3;

  // No flip animation — render normally
  if (!flipReveal || faceDown) {
    return (
      <div className="flex gap-0.5 sm:gap-1">
        {displayCards.slice(0, 3).map((card, i) => (
          <PlayingCard key={i} card={card} faceDown={faceDown || !card} size={size} />
        ))}
      </div>
    );
  }

  // Evaluate hand result once all cards revealed
  const handResult = allRevealed ? evaluateHand(cards) : null;

  // Flip reveal mode: tap each card to flip it face-up
  return (
    <div className="flex flex-col items-center">
      <div className="flex gap-1 sm:gap-1.5">
        {displayCards.slice(0, 3).map((card, i) => (
          <div
            key={i}
            className={`card-flip-container ${!revealed[i] ? 'cursor-pointer' : ''}`}
            onClick={() => handleFlip(i)}
          >
            <div className="relative" style={{ perspective: '600px' }}>
              <div className={`card-flip-inner ${revealed[i] ? 'flipped' : ''}`}>
                <div className="card-flip-front">
                  <PlayingCard card={card} faceDown={false} size={size} />
                </div>
                <div className="card-flip-back">
                  <PlayingCard faceDown size={size} />
                </div>
              </div>
              {/* Invisible placeholder to maintain layout size */}
              <div className="invisible">
                <PlayingCard faceDown size={size} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hand result after all 3 cards flipped */}
      {handResult && (
        <div className={`mt-1.5 text-center animate-fade-in font-bold text-sm sm:text-base ${HAND_TYPE_COLOR[handResult.type]}`}>
          {handResult.type === HandType.NORMAL
            ? `${handResult.points} diem`
            : `${HAND_TYPE_LABEL[handResult.type]}!`
          }
        </div>
      )}

      {/* Flip all + hint */}
      {!allRevealed && cards.length >= 3 && (
        <button
          onClick={() => setRevealed([true, true, true])}
          className="mt-1.5 px-3 py-1 rounded-lg bg-[--color-surface-light] hover:brightness-125 active:brightness-90 border border-[--color-border] text-[--color-text] text-[10px] sm:text-xs font-semibold cursor-pointer transition-all"
        >
          Lat tat ca
        </button>
      )}
    </div>
  );
}
