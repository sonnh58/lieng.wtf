import { useState } from 'react';
import { getSocket } from '../socket/socket-client';

const EMOJIS = ['😂', '😭', '🔥', '💀', '🤡', '👑', '🙏', '😎'];

export function EmojiPicker() {
  const [open, setOpen] = useState(false);

  const send = (emoji: string) => {
    getSocket()?.emit('game:emoji', { emoji });
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-[--color-surface-light] border border-[--color-border] text-lg flex items-center justify-center cursor-pointer hover:brightness-125 active:brightness-90 transition-all"
      >
        😀
      </button>
      {open && (
        <div className="absolute bottom-11 right-0 bg-[--color-surface] border border-[--color-border] rounded-lg p-1.5 flex gap-1 shadow-lg z-50">
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => send(e)}
              className="w-8 h-8 text-lg flex items-center justify-center rounded hover:bg-[--color-surface-light] cursor-pointer transition-colors"
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
