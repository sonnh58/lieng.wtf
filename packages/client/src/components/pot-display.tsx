import { formatChipsFull } from '../utils/format-chips';

interface PotDisplayProps {
  amount: number;
}

export function PotDisplay({ amount }: PotDisplayProps) {
  if (amount === 0) return null;

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div className="bg-[--color-surface] border-2 border-[--color-gold] rounded-full px-4 py-2 sm:px-6 sm:py-3 glow-gold">
        <div className="text-center">
          <div className="text-[9px] sm:text-[10px] text-[--color-text-muted] font-semibold uppercase tracking-wider">Pot</div>
          <div className="text-base sm:text-xl font-bold text-[--color-gold] text-glow-gold">
            {formatChipsFull(amount)}
          </div>
        </div>
      </div>
    </div>
  );
}
