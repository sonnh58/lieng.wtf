import { useEffect } from 'react';
import { useRoomStore } from '../stores/room-store';
import { useGameStore } from '../stores/game-store';
import { useConnectionStore } from '../stores/connection-store';
import { GameTable } from '../components/game-table';
import { getSocket } from '../socket/socket-client';

interface GamePageProps {
  onLeaveGame: () => void;
}

export function GamePage({ onLeaveGame }: GamePageProps) {
  const { currentRoom } = useRoomStore();
  const { players, dealerIndex, phase, showdownResults } = useGameStore();
  const { playerId } = useConnectionStore();
  const socket = getSocket();

  useEffect(() => {
    if (!currentRoom) onLeaveGame();
  }, [currentRoom, onLeaveGame]);

  const handleLeaveRoom = () => {
    if (socket) socket.emit('room:leave');
    useRoomStore.getState().setCurrentRoom(null);
    onLeaveGame();
  };

  if (!currentRoom) return null;

  const isHost = currentRoom.hostId === playerId;
  const canDeal = isHost && phase === 'WAITING' && currentRoom.players.length >= 2;
  const handleDeal = () => socket?.emit('game:start');

  return (
    <div className="h-[100dvh] flex flex-col bg-[--color-bg]">
      {/* Header */}
      <div className="bg-[--color-surface] border-b border-[--color-border] px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="min-w-0 mr-2">
          <h2 className="text-[--color-text] font-bold text-sm sm:text-base truncate">{currentRoom.name}</h2>
          <p className="text-[--color-text-muted] text-xs">
            {currentRoom.players.length} nguoi choi
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleLeaveRoom}
            className="bg-[--color-surface-light] hover:brightness-125 active:brightness-90 border border-[--color-border] text-[--color-text-muted] font-bold py-2 px-3 rounded-lg transition-all min-h-[40px] cursor-pointer text-sm"
          >
            Roi
          </button>
        </div>
      </div>

      {/* Game area */}
      {phase === 'WAITING' && !showdownResults ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center w-full max-w-xs">
            <div className="text-[--color-gold] text-glow-gold text-4xl sm:text-5xl font-bold mb-4 tracking-wider">
              LIENG
            </div>
            <p className="text-[--color-text-muted] mb-1 text-lg">
              {currentRoom.players.length}/{currentRoom.config.maxPlayers} nguoi choi
            </p>

            {currentRoom.players.length < 2 ? (
              <p className="text-[--color-text-muted] text-sm mt-3">Cho them nguoi choi...</p>
            ) : isHost ? (
              <button
                onClick={handleDeal}
                disabled={!canDeal}
                className="w-full font-bold py-3 rounded-xl transition-all min-h-[48px] cursor-pointer bg-[--color-success] hover:brightness-110 active:brightness-90 text-white mt-4"
              >
                Chia bai
              </button>
            ) : (
              <p className="text-[--color-text-muted] text-sm mt-3">Cho chu phong chia bai...</p>
            )}
          </div>
        </div>
      ) : (
        <GameTable players={players} dealerIndex={dealerIndex} />
      )}
    </div>
  );
}
