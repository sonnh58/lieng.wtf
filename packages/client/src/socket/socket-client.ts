import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
  socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 300,
    reconnectionDelayMax: 3000,
    reconnectionAttempts: Infinity,
    transports: ['websocket'],
    upgrade: false,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
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
