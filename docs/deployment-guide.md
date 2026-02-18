# Deployment Guide - Lieng 2026

## Prerequisites

- **Bun** >= 1.0 (runtime for server + package manager)
- **Node.js** >= 18 (optional, for `node dist/` fallback)
- A Linux/macOS server (VPS, cloud instance, etc.)

## Architecture

```
Client (React + Vite)     Server (Express + Socket.IO + SQLite)
     :5173  ──────────────>  :3001
  Static files              WebSocket + REST API
  (Nginx / CDN)             (Bun runtime)
                             └── data/lieng.db (SQLite)
```

## 1. Local Development

```bash
# Install dependencies
bun install

# Start both client + server (dev mode with hot reload)
bun run dev

# Or separately:
bun run dev:client   # Vite at http://localhost:5173
bun run dev:server   # Server at http://localhost:3001
```

## 2. Build for Production

### Client

```bash
cd packages/client
bun run build
# Output: packages/client/dist/
```

### Server

Server runs directly with Bun (no build step needed):

```bash
bun packages/server/src/index.ts
```

Or with TypeScript compilation:

```bash
cd packages/server
bun run build          # Output: packages/server/dist/
node dist/index.js     # Run with Node.js
```

## 3. Environment Configuration

The server currently uses hardcoded values. For production, set these via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server HTTP/WebSocket port |
| `CLIENT_URL` | `http://localhost:5173` | CORS allowed origin |

To enable env vars, update `packages/server/src/index.ts`:

```ts
const PORT = parseInt(process.env.PORT ?? '3001');
const CLIENT_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
```

## 4. Deploy: Single VPS (Recommended)

### Step 1: Setup Server

```bash
# SSH into your VPS
ssh user@your-server

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone <your-repo-url> lieng-2026
cd lieng-2026
bun install
```

### Step 2: Build Client

```bash
cd packages/client
bun run build
```

### Step 3: Run Server with PM2 or systemd

**Option A: PM2**

```bash
bun add -g pm2
pm2 start --interpreter bun packages/server/src/index.ts --name lieng-server
pm2 save
pm2 startup
```

**Option B: systemd**

Create `/etc/systemd/system/lieng.service`:

```ini
[Unit]
Description=Lieng Card Game Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/lieng-2026
ExecStart=/home/user/.bun/bin/bun packages/server/src/index.ts
Restart=always
RestartSec=5
Environment=PORT=3001
Environment=CLIENT_URL=https://yourdomain.com

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable lieng
sudo systemctl start lieng
```

### Step 4: Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Serve client static files
    root /path/to/lieng-2026/packages/client/dist;
    index index.html;

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy WebSocket + API to server
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:3001;
    }
}
```

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Step 5: SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 5. SQLite Database

- **Location:** `packages/server/data/lieng.db`
- **Mode:** WAL (Write-Ahead Logging) for concurrent reads
- Auto-created on first server start
- Tables: `players`, `rooms`, `game_history`

### Backup

```bash
# Hot backup (safe while server is running thanks to WAL mode)
sqlite3 packages/server/data/lieng.db ".backup /path/to/backup.db"

# Or simple file copy (stop server first for guaranteed consistency)
cp packages/server/data/lieng.db /path/to/backup.db
```

### Reset Database

```bash
rm packages/server/data/lieng.db
# Restart server — tables are auto-recreated
```

## 6. Health Check

```bash
curl http://localhost:3001/health
# {"status":"ok","maxPlayers":6}
```

## 7. Monitoring

```bash
# PM2 logs
pm2 logs lieng-server

# systemd logs
journalctl -u lieng -f

# Check DB size
ls -lh packages/server/data/lieng.db
```

## 8. Update / Redeploy

```bash
cd /path/to/lieng-2026
git pull

# Rebuild client
cd packages/client && bun run build

# Restart server
pm2 restart lieng-server
# or
sudo systemctl restart lieng
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Ensure `CLIENT_URL` matches your actual domain (with protocol) |
| WebSocket fails | Verify Nginx has `proxy_set_header Upgrade` and `Connection "upgrade"` |
| DB locked errors | Check only one server process is running |
| Client shows blank | Ensure Nginx `try_files` has SPA fallback to `/index.html` |
| Port in use | `lsof -i :3001` to find conflicting process |
