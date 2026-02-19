import { useState, useEffect } from 'react';
import { useRoomStore } from '../stores/room-store';
import { useConnectionStore } from '../stores/connection-store';
import { useGameStore } from '../stores/game-store';
import { RoomList } from '../components/room-list';
import { CreateRoomDialog } from '../components/create-room-dialog';
import { getSocket, disconnectSocket } from '../socket/socket-client';
import { showToast } from '../components/toast-notification';

interface LobbyPageProps {
  onEnterGame: () => void;
  onDashboard: () => void;
}

export function LobbyPage({ onEnterGame, onDashboard }: LobbyPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { rooms, currentRoom } = useRoomStore();
  const { playerName, avatarUrl, isAdmin } = useConnectionStore();
  const { walletBalance, totalLoaned, totalPnl } = useGameStore();
  const socket = getSocket();

  useEffect(() => {
    socket?.emit('room:list');
    const interval = setInterval(() => socket?.emit('room:list'), 3000);
    return () => clearInterval(interval);
  }, [socket]);

  useEffect(() => {
    if (currentRoom) onEnterGame();
  }, [currentRoom, onEnterGame]);

  const handleLogout = () => {
    disconnectSocket();
    useConnectionStore.getState().clearConnection();
    useConnectionStore.getState().setPlayerName('');
    useRoomStore.getState().setCurrentRoom(null);
  };

  const handleResetAllRooms = () => {
    if (!confirm('Xoa tat ca phong?')) return;
    socket?.emit('admin:reset-rooms');
    showToast('Da xoa tat ca phong', 'success');
  };

  return (
    <div className="min-h-[100dvh] bg-[--color-bg] p-3 sm:p-5">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {avatarUrl && (
                <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-[--color-gold]" />
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[--color-gold] text-glow-gold tracking-wider">
                  LIENG
                </h1>
                <p className="text-[--color-text-muted] text-sm">
                  Xin chao, <span className="text-[--color-primary] font-semibold">{playerName}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={onDashboard}
                className="flex-1 sm:flex-none bg-[--color-surface-light] hover:brightness-125 active:brightness-90 border border-[--color-border] text-[--color-gold] font-semibold py-2.5 px-4 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
              >
                Dashboard
              </button>
              <button
                onClick={() => socket?.emit('room:list')}
                className="flex-1 sm:flex-none bg-[--color-surface-light] hover:brightness-125 active:brightness-90 border border-[--color-border] text-[--color-text] font-semibold py-2.5 px-4 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
              >
                Lam moi
              </button>
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex-1 sm:flex-none bg-[--color-primary] hover:brightness-110 active:brightness-90 text-white font-semibold py-2.5 px-4 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
              >
                + Tao phong
              </button>
              {isAdmin && (
                <button
                  onClick={handleResetAllRooms}
                  className="flex-1 sm:flex-none bg-[--color-accent] hover:brightness-110 active:brightness-90 text-white font-semibold py-2.5 px-4 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
                >
                  Xoa tat ca
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex-1 sm:flex-none bg-[--color-surface-light] hover:brightness-125 active:brightness-90 border border-[--color-border] text-[--color-text-muted] font-semibold py-2.5 px-4 rounded-lg transition-all min-h-[44px] cursor-pointer text-sm"
              >
                Thoat
              </button>
            </div>
          </div>
        </div>

        {/* Wallet stats */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-[--color-text-muted]">Vi: </span>
                <span className={`font-bold ${(walletBalance ?? 0) < 0 ? 'text-[--color-accent]' : 'text-[--color-gold]'}`}>
                  {walletBalance ?? 0}
                </span>
              </div>
              <div>
                <span className="text-[--color-text-muted]">Loi/Lo: </span>
                <span className={`font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-[--color-accent]'}`}>
                  {totalPnl >= 0 ? '+' : ''}{totalPnl}
                </span>
              </div>
              <div>
                <span className="text-[--color-text-muted]">Da vay: </span>
                <span className="font-bold text-[--color-text]">{totalLoaned}</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!confirm('Xin cap 1000 chips? (tru vao vi)')) return;
                socket?.emit('wallet:request-chips');
              }}
              className="bg-[--color-gold] hover:brightness-110 active:brightness-90 text-[--color-bg] font-bold py-2 px-4 rounded-lg transition-all min-h-[40px] cursor-pointer text-sm"
            >
              Xin cap von
            </button>
          </div>
        </div>

        {/* Room list */}
        <div className="bg-[--color-surface] border border-[--color-border] rounded-xl p-4 sm:p-5">
          <h2 className="text-base sm:text-lg font-bold text-[--color-text] mb-3">Danh sach phong</h2>
          <RoomList rooms={rooms} />
        </div>
      </div>

      {showCreateDialog && <CreateRoomDialog onClose={() => setShowCreateDialog(false)} />}
    </div>
  );
}
