import { useEffect, useState } from 'react';

interface FloatingEmojiEntry {
  id: number;
  emoji: string;
  playerName: string;
}

let nextId = 0;

/** Renders floating emoji animations. Call `addEmoji` to trigger. */
export function FloatingEmoji({ entries }: { entries: FloatingEmojiEntry[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-40">
      {entries.map((e) => (
        <div
          key={e.id}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 animate-emoji-float"
        >
          <div className="text-3xl sm:text-4xl">{e.emoji}</div>
          <div className="text-[9px] text-[--color-text-muted] text-center truncate max-w-[60px]">
            {e.playerName}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Hook to manage floating emoji state */
export function useFloatingEmoji() {
  const [entries, setEntries] = useState<FloatingEmojiEntry[]>([]);

  const addEmoji = (emoji: string, playerName: string) => {
    const id = nextId++;
    setEntries((prev) => [...prev, { id, emoji, playerName }]);
    // Remove after animation ends (2s)
    setTimeout(() => {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }, 2000);
  };

  return { entries, addEmoji };
}
