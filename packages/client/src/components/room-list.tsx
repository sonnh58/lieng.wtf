import type { Room } from '@lieng/shared';
import { getSocket } from '../socket/socket-client';
import { formatChips } from '../utils/format-chips';

interface RoomListProps {
  rooms: Room[];
}

export function RoomList({ rooms }: RoomListProps) {
  const socket = getSocket();

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('room:join', { roomId });
  };

  if (rooms.length === 0) {
    return (
      <div className="text-center text-[--color-text-muted] py-10">
        <p className="text-base">Chua co phong nao</p>
        <p className="text-sm mt-1 opacity-60">Tao phong moi de bat dau</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rooms.map((room) => {
        const isFull = room.players.length >= room.config.maxPlayers;
        const isInProgress = room.gameId !== null;

        return (
          <div
            key={room.id}
            className="bg-[--color-bg] rounded-xl p-3.5 border border-[--color-border] hover:border-[--color-primary] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-[--color-text] font-bold text-sm truncate mr-2">{room.name}</h3>
              <span className="text-[--color-text-muted] text-xs shrink-0">
                {room.players.length}/{room.config.maxPlayers}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[--color-text-muted] mb-3">
              <span>Ante: <span className="text-[--color-gold]">{formatChips(room.config.ante)}</span></span>
              <span>Chips: <span className="text-[--color-gold]">{formatChips(room.config.startingChips)}</span></span>
            </div>

            {isInProgress && (
              <div className="text-[--color-success] text-xs font-semibold mb-2">Dang choi...</div>
            )}

            <button
              onClick={() => handleJoinRoom(room.id)}
              disabled={isFull || isInProgress}
              className="w-full bg-[--color-primary] hover:brightness-110 active:brightness-90 disabled:bg-[--color-surface-light] disabled:text-[--color-text-muted] disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
            >
              {isFull ? 'Day' : isInProgress ? 'Dang choi' : 'Vao phong'}
            </button>
          </div>
        );
      })}
    </div>
  );
}
