"""
relconv PYTHON PEER
===================
Connects to the schema HOST, pulls models, stays in sync via WebSocket.

  uvicorn main:app --port 3001
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException

from relconv import SchemaMemory
from relconv.api import SchemaClient

SCHEMA_URL = os.environ.get("SCHEMA_URL", "http://127.0.0.1:8000")
KEY_ID = os.environ.get("SCHEMA_KEY_ID", "billing-api")
SECRET = os.environ.get("SCHEMA_SECRET", "dev-billing-secret")

local_memory = SchemaMemory()
client = SchemaClient(SCHEMA_URL, KEY_ID, SECRET)


def _on_push(event: dict) -> None:
    names = [m["name"] for m in event.get("models") or []]
    removed = event.get("removed") or []
    print(f"[peer] push rev={event.get('revision')} +{names} -{removed}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        result = client.sync(local_memory)
        print(f"[peer] synced rev={result['revision']} models={result['models']}", flush=True)
    except Exception as e:
        print(f"[peer] initial sync failed: {e}", flush=True)
    client.subscribe(local_memory, on_event=_on_push)
    print(f"[peer] subscribed to {SCHEMA_URL}/internal/schema/ws", flush=True)
    yield
    client.unsubscribe()


app = FastAPI(title="Billing peer", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "role": "python-peer",
        "schema_host": SCHEMA_URL,
        "revision": client.revision,
        "models": [m.name for m in local_memory.all()],
    }


@app.get("/models")
def list_models() -> dict[str, Any]:
    return {
        "revision": client.revision,
        "models": [
            {"name": m.name, "fields": m.fields, "relations": m.relations}
            for m in local_memory.all()
        ],
    }


@app.get("/models/{name}")
def get_model(name: str) -> dict[str, Any]:
    m = local_memory.get(name)
    if m is None:
        raise HTTPException(404, f"Unknown model: {name}")
    return {"name": m.name, "fields": m.fields, "relations": m.relations}


@app.post("/sync")
def force_sync() -> dict[str, Any]:
    return client.sync(local_memory)
