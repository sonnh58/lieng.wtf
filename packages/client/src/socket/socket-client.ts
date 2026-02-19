import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(playerName: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    // Set player name on connection
    socket?.emit('player:set-name', { name: playerName });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
