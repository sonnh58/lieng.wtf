import { useState } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS, DEFAULT_ROOM_CONFIG } from '@lieng/shared';
import { getSocket } from '../socket/socket-client';

interface CreateRoomDialogProps {
  onClose: () => void;
}

export function CreateRoomDialog({ onClose }: CreateRoomDialogProps) {
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(DEFAULT_ROOM_CONFIG.maxPlayers);
  const [ante, setAnte] = useState(DEFAULT_ROOM_CONFIG.ante);
  const [startingChips, setStartingChips] = useState(DEFAULT_ROOM_CONFIG.startingChips);
  const [allowAllIn, setAllowAllIn] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const socket = getSocket();
    if (!socket) return;

    const trimmed = roomName.trim();
    if (!trimmed) { setError('Nhap ten phong'); return; }
    if (trimmed.length < 3) { setError('Ten phong it nhat 3 ky tu'); return; }

    socket.emit('room:create', {
      name: trimmed,
      config: { maxPlayers, ante, startingChips, minBet: DEFAULT_ROOM_CONFIG.minBet, maxBet: DEFAULT_ROOM_CONFIG.maxBet, allowAllIn },
    });
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 bg-[--color-bg] text-[--color-text] rounded-lg border border-[--color-border] focus:outline-none focus:border-[--color-primary] focus:ring-1 focus:ring-[--color-primary] text-sm min-h-[44px] transition-colors';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 animate-fade-in">
      <div className="bg-[--color-surface] border border-[--color-border] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md safe-bottom">
        <div className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[--color-text] mb-5">Tao phong moi</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[--color-text-muted] mb-1.5">Ten phong</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => { setRoomName(e.target.value); setError(''); }}
                placeholder="VD: Phong cua toi"
                className={inputClass}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[--color-text-muted] mb-1.5">Nguoi choi</label>
                <input
                  type="number"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, parseInt(e.target.value) || MIN_PLAYERS)))}
                  min={MIN_PLAYERS} max={MAX_PLAYERS}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[--color-text-muted] mb-1.5">Ante</label>
                <input
                  type="number"
                  value={ante}
                  onChange={(e) => setAnte(Math.max(10, parseInt(e.target.value) || 10))}
                  min={10} step={10}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[--color-text-muted] mb-1.5">Chips</label>
                <input
                  type="number"
                  value={startingChips}
                  onChange={(e) => setStartingChips(Math.max(100, parseInt(e.target.value) || 100))}
                  min={100} step={100}
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowAllIn}
                onChange={(e) => setAllowAllIn(e.target.checked)}
                className="w-4 h-4 rounded accent-[--color-primary]"
              />
              <span className="text-sm text-[--color-text]">Cho phep All-in</span>
            </label>

            {error && <p className="text-[--color-accent] text-sm">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-[--color-surface-light] hover:brightness-125 active:brightness-90 border border-[--color-border] text-[--color-text-muted] font-bold py-2.5 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
              >
                Huy
              </button>
              <button
                type="submit"
                className="flex-1 bg-[--color-primary] hover:brightness-110 active:brightness-90 text-white font-bold py-2.5 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
              >
                Tao phong
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
