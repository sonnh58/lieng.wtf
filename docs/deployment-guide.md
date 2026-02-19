# Deployment Guide - Lieng 2026

## Production Setup

- **Server:** `34.87.161.209` (Ubuntu 24.04, GCP)
- **User:** `sonmh`
- **Domain:** `lieng.wtf`
- **Stack:** Bun + PM2 + Nginx
- **SSH Key:** `~/.ssh/lieng-deploy`

## Architecture

```
                    lieng.wtf (port 80/443)
                         │
                      [Nginx]
                       /    \
            Static files    Proxy
           /                     \
  Client (Vite build)     Server (Bun + Express)
  ~/lieng-2026/            ~/lieng-2026/
  packages/client/dist/    packages/server/src/
                           :3001 (Socket.IO + REST)
                           └── data/lieng.db (SQLite)
```

## Quick Deploy

After code changes, run from project root:

```bash
./deploy.sh
```

This script:
1. Uploads source files via SCP
2. Installs deps + builds client on server
3. Restarts PM2 server process
4. Verifies health endpoint

## Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `3001` | Server port |
| `CLIENT_URL` | `https://lieng.wtf,http://lieng.wtf` | CORS origins (comma-separated) |
| `VITE_SERVER_URL` | `https://lieng.wtf` | Client socket connection URL (build-time) |

Configured in `~/lieng-2026/ecosystem.config.cjs` on server.

## Manual Deploy Steps

### 1. Upload Files

```bash
KEY="~/.ssh/lieng-deploy"
SERVER="sonmh@34.87.161.209"

scp -i $KEY -r packages/shared/src $SERVER:~/lieng-2026/packages/shared/
scp -i $KEY -r packages/server/src $SERVER:~/lieng-2026/packages/server/
scp -i $KEY -r packages/client/src $SERVER:~/lieng-2026/packages/client/
# + package.json, tsconfig files, vite.config.ts, etc.
```

### 2. Build Client on Server

```bash
ssh -i $KEY $SERVER << 'EOF'
export PATH="$HOME/.bun/bin:$PATH"
cd ~/lieng-2026/packages/client
VITE_SERVER_URL="https://lieng.wtf" bun run build
chmod -R 755 dist
EOF
```

### 3. Restart Server

```bash
ssh -i $KEY $SERVER "pm2 restart lieng-server"
```

## Local Development

```bash
bun install
bun run dev          # Both client + server
bun run dev:client   # Vite at http://localhost:5173
bun run dev:server   # Server at http://localhost:3001
```

## Server Management

### PM2 Commands

```bash
ssh -i ~/.ssh/lieng-deploy sonmh@34.87.161.209

pm2 list                    # Process status
pm2 logs lieng-server       # View logs
pm2 restart lieng-server    # Restart
pm2 stop lieng-server       # Stop
pm2 monit                   # Live monitoring
```

### Nginx

```bash
sudo nginx -t                  # Test config
sudo systemctl reload nginx    # Reload
sudo tail -f /var/log/nginx/error.log
```

Config: `/etc/nginx/sites-available/lieng.wtf`

### SSL

Domain behind Cloudflare — use **Cloudflare SSL** (Full mode) instead of certbot.

If DNS points directly to server (no Cloudflare proxy):
```bash
sudo certbot --nginx -d lieng.wtf
```

## SQLite Database

- **Location:** `~/lieng-2026/packages/server/data/lieng.db`
- Auto-created on first server start
- WAL mode for concurrent reads

### Backup

```bash
sqlite3 ~/lieng-2026/packages/server/data/lieng.db ".backup /tmp/lieng-backup.db"
```

### Reset

```bash
rm ~/lieng-2026/packages/server/data/lieng.db
pm2 restart lieng-server
```

## Health Check

```bash
curl https://lieng.wtf/health
# {"status":"ok","maxPlayers":12}
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Check `CLIENT_URL` in `ecosystem.config.cjs` |
| WebSocket fails | Verify Nginx `/socket.io/` proxy config has Upgrade headers |
| 500 on client | Run `chmod -R 755 ~/lieng-2026/packages/client/dist` |
| DB locked | Ensure single server process: `pm2 list` |
| Client blank page | Nginx `try_files` needs SPA fallback to `/index.html` |
| Port in use | `lsof -i :3001` to find conflict |
