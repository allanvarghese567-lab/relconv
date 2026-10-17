#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)"
export SCHEMA_URL="${SCHEMA_URL:-http://127.0.0.1:8000}"
export SCHEMA_KEY_ID="${SCHEMA_KEY_ID:-billing-api}"
export SCHEMA_SECRET="${SCHEMA_SECRET:-dev-billing-secret}"
echo "Starting Python PEER on :3001 (host=$SCHEMA_URL) ..."
exec python -m uvicorn python-peer.main:app --host 0.0.0.0 --port 3001 --reload
