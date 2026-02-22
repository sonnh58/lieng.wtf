#!/bin/bash
# Deploy CLIENT ONLY for lieng-2026 to lieng.wtf (no server restart)
# Usage: ./deploy-client.sh

set -e

SERVER="sonmh@34.87.161.209"
KEY="~/.ssh/lieng-deploy"
REMOTE_DIR="~/lieng-2026"
BASE="$(cd "$(dirname "$0")" && pwd)"

SSH_OPTS="-o StrictHostKeyChecking=no -i $KEY"

echo "=== Deploying CLIENT to lieng.wtf (no server restart) ==="

# Step 1: Upload shared + client source files
echo "[1/3] Uploading source files..."

# Root configs (needed for bun install)
scp $SSH_OPTS "$BASE/package.json" "$BASE/bun.lock" "$BASE/tsconfig.base.json" "$SERVER:$REMOTE_DIR/" 2>/dev/null

# Shared package (client depends on it)
scp $SSH_OPTS -r "$BASE/packages/shared/src" "$SERVER:$REMOTE_DIR/packages/shared/"
scp $SSH_OPTS "$BASE/packages/shared/package.json" "$BASE/packages/shared/tsconfig.json" "$SERVER:$REMOTE_DIR/packages/shared/"

# Client package
scp $SSH_OPTS -r "$BASE/packages/client/src" "$SERVER:$REMOTE_DIR/packages/client/"
[ -d "$BASE/packages/client/public" ] && scp $SSH_OPTS -r "$BASE/packages/client/public" "$SERVER:$REMOTE_DIR/packages/client/"
for f in package.json tsconfig.json tsconfig.app.json vite.config.ts index.html postcss.config.js tailwind.config.js .env; do
  [ -f "$BASE/packages/client/$f" ] && scp $SSH_OPTS "$BASE/packages/client/$f" "$SERVER:$REMOTE_DIR/packages/client/"
done

# Step 2: Install deps + build client on server
echo "[2/3] Building client..."
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

# Step 3: Verify
echo "[3/3] Verifying..."
CLIENT=$(ssh $SSH_OPTS "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost/")

echo ""
echo "=== Client Deploy Complete ==="
echo "  Client: HTTP $CLIENT"
echo "  URL:    https://lieng.wtf"
