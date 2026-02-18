import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { MAX_PLAYERS } from '@lieng/shared';
import { initDatabase } from './database/db';
import { deletePlayer } from './database/player-queries';
import { setupSocketHandlers } from './socket/socket-handler';

const PORT = 3001;
const CLIENT_URL = 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] },
  connectionStateRecovery: {
    maxDisconnectionDuration: 60_000,
  },
});

// Initialize SQLite database
const db = initDatabase();
console.log('Database initialized');

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', maxPlayers: MAX_PLAYERS });
});

// Dashboard: all players stats
app.get('/api/players', (_req, res) => {
  const rows = db.query(
    'SELECT id, name, avatar_url, chips, total_loaned, total_pnl, wins, losses, created_at FROM players ORDER BY total_pnl DESC',
  ).all();
  res.json(rows);
});

// Admin: delete a player
app.delete('/api/players/:id', (req, res) => {
  const deleted = deletePlayer(db, req.params.id);
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Player not found' });
  }
});

// Wire up all socket handlers
setupSocketHandlers(io, db);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
