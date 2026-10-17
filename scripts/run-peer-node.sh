#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../node-peer"
export SCHEMA_URL="${SCHEMA_URL:-http://127.0.0.1:8000}"
export SCHEMA_KEY_ID="${SCHEMA_KEY_ID:-node-peer}"
export SCHEMA_SECRET="${SCHEMA_SECRET:-dev-node-secret}"
export PORT="${PORT:-3000}"
if [ ! -d node_modules ]; then
  npm install
fi
echo "Starting Node PEER on :$PORT (host=$SCHEMA_URL) ..."
exec npm start
