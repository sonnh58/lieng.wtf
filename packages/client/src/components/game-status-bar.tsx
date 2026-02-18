import type { GamePhase } from '@lieng/shared';

interface GameStatusBarProps {
  phase: GamePhase;
  round: number;
}

const PHASE: Record<GamePhase, { label: string; color: string }> = {
  WAITING: { label: 'Cho nguoi choi', color: 'bg-[--color-surface-light]' },
  DEALING: { label: 'Chia bai', color: 'bg-indigo-600' },
  BETTING: { label: 'Vong cuoc', color: 'bg-[--color-success]' },
  SHOWDOWN: { label: 'Lat bai', color: 'bg-[--color-gold]' },
  ENDED: { label: 'Ket thuc', color: 'bg-[--color-accent]' },
};

export function GameStatusBar({ phase, round }: GameStatusBarProps) {
  const { label, color } = PHASE[phase];
  const showRound = phase !== 'WAITING' && phase !== 'ENDED';

  return (
    <div className={`${color} text-white px-3 py-1.5 text-center font-semibold text-xs sm:text-sm shrink-0 ${phase === 'SHOWDOWN' ? 'text-[--color-bg]' : ''}`}>
      {label} {showRound && `- Vong ${round}`}
    </div>
  );
}
