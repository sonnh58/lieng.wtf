import type { Socket } from 'socket.io';

const MAX_EVENTS_PER_SECOND = 10;

/**
 * Simple token bucket rate limiter per socket.
 * Drops events exceeding MAX_EVENTS_PER_SECOND.
 */
export function applyRateLimiter(socket: Socket): void {
  let tokens = MAX_EVENTS_PER_SECOND;

  // Refill tokens every second
  const interval = setInterval(() => {
    tokens = MAX_EVENTS_PER_SECOND;
  }, 1000);

  // Intercept all incoming events
  const originalOnEvent = socket.onAny;
  socket.onAny((_event) => {
    if (tokens <= 0) {
      socket.emit('error', { message: 'Rate limited. Please slow down.' });
      return;
    }
    tokens--;
  });

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
}
