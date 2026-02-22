#!/bin/bash
# Deploy script for lieng-2026 to lieng.wtf
# Usage: ./deploy.sh

set -e

SERVER="sonmh@34.87.161.209"
KEY="~/.ssh/lieng-deploy"
REMOTE_DIR="~/lieng-2026"
BASE="$(cd "$(dirname "$0")" && pwd)"

SSH_OPTS="-o StrictHostKeyChecking=no -i $KEY"

echo "=== Deploying lieng-2026 to lieng.wtf ==="

# Step 1: Upload source files
echo "[1/4] Uploading source files..."

# Root configs
scp $SSH_OPTS "$BASE/package.json" "$BASE/bun.lock" "$BASE/tsconfig.base.json" "$SERVER:$REMOTE_DIR/" 2>/dev/null

# Shared package
scp $SSH_OPTS -r "$BASE/packages/shared/src" "$SERVER:$REMOTE_DIR/packages/shared/"
scp $SSH_OPTS "$BASE/packages/shared/package.json" "$BASE/packages/shared/tsconfig.json" "$SERVER:$REMOTE_DIR/packages/shared/"

# Server package
scp $SSH_OPTS -r "$BASE/packages/server/src" "$SERVER:$REMOTE_DIR/packages/server/"
scp $SSH_OPTS "$BASE/packages/server/package.json" "$BASE/packages/server/tsconfig.json" "$SERVER:$REMOTE_DIR/packages/server/"

# Client package
scp $SSH_OPTS -r "$BASE/packages/client/src" "$SERVER:$REMOTE_DIR/packages/client/"
[ -d "$BASE/packages/client/public" ] && scp $SSH_OPTS -r "$BASE/packages/client/public" "$SERVER:$REMOTE_DIR/packages/client/"
for f in package.json tsconfig.json tsconfig.app.json vite.config.ts index.html postcss.config.js tailwind.config.js .env; do
  [ -f "$BASE/packages/client/$f" ] && scp $SSH_OPTS "$BASE/packages/client/$f" "$SERVER:$REMOTE_DIR/packages/client/"
done

# Step 2: Install deps + build client on server
echo "[2/4] Installing dependencies & building client..."
ssh $SSH_OPTS "$SERVER" << 'REMOTE'
set -e
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
cd ~/lieng-2026
bun install
cd packages/client
rm -rf dist
VITE_SERVER_URL="https://lieng.wtf" bun run build
chmod -R 755 dist
REMOTE

# Step 3: Restart server
echo "[3/4] Restarting server..."
ssh $SSH_OPTS "$SERVER" << 'REMOTE'
export PATH="$HOME/.bun/bin:$PATH"
cd ~/lieng-2026
pm2 restart lieng-server || pm2 start ecosystem.config.cjs
pm2 save
REMOTE

# Step 4: Verify
echo "[4/4] Verifying deployment..."
HEALTH=$(ssh $SSH_OPTS "$SERVER" "curl -s http://localhost/health")
CLIENT=$(ssh $SSH_OPTS "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost/")

echo ""
echo "=== Deployment Complete ==="
echo "  Health API: $HEALTH"
echo "  Client:     HTTP $CLIENT"
echo "  URL:        https://lieng.wtf"
