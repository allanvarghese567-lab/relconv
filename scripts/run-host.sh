#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PYTHONPATH="${PYTHONPATH:-}:$(pwd)"
export BILLING_KEY="${BILLING_KEY:-dev-billing-secret}"
export ADMIN_KEY="${ADMIN_KEY:-dev-admin-secret}"
export NODE_PEER_KEY="${NODE_PEER_KEY:-dev-node-secret}"
echo "Starting schema HOST on :8000 ..."
exec python -m uvicorn python-host.main:app --host 0.0.0.0 --port 8000 --reload
