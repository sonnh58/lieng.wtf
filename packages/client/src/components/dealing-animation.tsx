/**
 * Renders flying card backs from center of the felt to each player position.
 * Each player gets 3 cards dealt round-robin with staggered timing.
 * Uses percentage-based CSS variables for responsive positioning.
 */

interface DealingAnimationProps {
  playerCount: number;
  /** getPlayerPosition(index, total) → { left: '...%', top: '...%' } */
  getPosition: (index: number, total: number) => { left: string; top: string };
}

export function DealingAnimation({ playerCount, getPosition }: DealingAnimationProps) {
  const cardsPerPlayer = 3;
  const flyingCards: { playerIdx: number; cardIdx: number; delay: number }[] = [];

  // Deal round-robin: card 1 to each player, then card 2, then card 3
  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < playerCount; p++) {
      flyingCards.push({
        playerIdx: p,
        cardIdx: c,
        delay: (c * playerCount + p) * 80,
      });
    }
  }

  return (
    <div className="absolute inset-0 z-10 pointer-events-none" style={{ containerType: 'size' }}>
      {flyingCards.map(({ playerIdx, cardIdx, delay }) => {
        const pos = getPosition(playerIdx, playerCount);
        // Target offset from center (50%, 50%) as percentage of container
        const pctX = parseFloat(pos.left) - 50;
        const pctY = parseFloat(pos.top) - 50;
        // Small rotation variation per card
        const rot = (cardIdx - 1) * 8 + (playerIdx % 3 - 1) * 4;

        return (
          <div
            key={`${playerIdx}-${cardIdx}`}
            className="absolute left-1/2 top-1/2 -ml-[14px] -mt-[20px]"
            style={{
              '--fly-x': `${pctX}cqw`,
              '--fly-y': `${pctY}cqh`,
              '--fly-rot': `${rot}deg`,
              animation: `flyToPlayer 0.5s ease-out forwards`,
              animationDelay: `${delay}ms`,
              opacity: 0,
            } as React.CSSProperties}
          >
            <div
              className="w-7 h-10 rounded border border-[#1e3a8a] shadow-lg"
              style={{ background: 'linear-gradient(135deg, #1e3a8a, #312e81, #1e3a8a)' }}
            >
              <div className="w-full h-full flex items-center justify-center text-indigo-300/60 text-xs">
                &#x2756;
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
