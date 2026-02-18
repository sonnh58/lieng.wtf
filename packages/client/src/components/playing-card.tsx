import type { Card } from '@lieng/shared';
import { rankToDisplay, suitToDisplay, suitToColor } from '../utils/card-display';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SIZE = {
  xs: { card: 'w-7 h-10', text: 'text-[7px]', center: 'text-base', back: 'text-xs' },
  sm: { card: 'w-10 h-14', text: 'text-[9px]', center: 'text-xl', back: 'text-base' },
  md: { card: 'w-14 h-20 sm:w-16 sm:h-24', text: 'text-[10px] sm:text-xs', center: 'text-2xl sm:text-3xl', back: 'text-xl' },
  lg: { card: 'w-20 h-28 sm:w-24 sm:h-36', text: 'text-sm sm:text-base', center: 'text-4xl sm:text-5xl', back: 'text-3xl' },
};

export function PlayingCard({ card, faceDown = false, size = 'md' }: PlayingCardProps) {
  const s = SIZE[size];

  if (faceDown || !card) {
    return (
      <div className={`${s.card} rounded border border-[#1e3a8a] shadow-md flex items-center justify-center`}
        style={{ background: 'linear-gradient(135deg, #1e3a8a, #312e81, #1e3a8a)' }}
      >
        <div className={`text-indigo-300/60 ${s.back}`}>&#x2756;</div>
      </div>
    );
  }

  const rank = rankToDisplay(card.rank);
  const suit = suitToDisplay(card.suit);
  const isRed = suitToColor(card.suit) === 'red';
  const color = isRed ? 'text-red-500' : 'text-slate-800';

  return (
    <div className={`${s.card} bg-white rounded border border-gray-200 shadow-md relative flex flex-col`}>
      <div className={`absolute top-0 left-0.5 ${color} font-bold leading-none ${s.text}`}>
        <div>{rank}</div>
        {size !== 'xs' && <div>{suit}</div>}
      </div>
      <div className={`flex-1 flex items-center justify-center ${color} ${s.center}`}>
        {suit}
      </div>
      {size !== 'xs' && (
        <div className={`absolute bottom-0 right-0.5 ${color} font-bold leading-none rotate-180 ${s.text}`}>
          <div>{rank}</div>
          <div>{suit}</div>
        </div>
      )}
    </div>
  );
}
