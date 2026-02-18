import { create } from 'zustand';
import type { Room } from '@lieng/shared';

interface RoomState {
  rooms: Room[];
  currentRoom: Room | null;
  /** Room ID from URL hash — used to rejoin on F5 */
  pendingRoomId: string | null;
  setRooms: (rooms: Room[]) => void;
  setCurrentRoom: (room: Room | null) => void;
  updateRoom: (room: Room) => void;
  setPendingRoomId: (roomId: string | null) => void;
}

/** Extract room ID from URL hash: #/room/{id} -> id */
function getRoomIdFromHash(): string | null {
  const match = window.location.hash.match(/^#\/room\/(.+)$/);
  return match ? match[1] : null;
}

export const useRoomStore = create<RoomState>((set) => ({
  rooms: [],
  currentRoom: null,
  pendingRoomId: getRoomIdFromHash(),
  setRooms: (rooms) => set({ rooms }),
  setCurrentRoom: (room) => {
    // Sync URL hash with room state
    if (room) {
      window.history.replaceState(null, '', `#/room/${room.id}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
    set({ currentRoom: room, pendingRoomId: null });
  },
  updateRoom: (room) =>
    set((state) => ({
      currentRoom: state.currentRoom?.id === room.id ? room : state.currentRoom,
      rooms: state.rooms.map((r) => (r.id === room.id ? room : r)),
    })),
  setPendingRoomId: (roomId) => set({ pendingRoomId: roomId }),
}));
