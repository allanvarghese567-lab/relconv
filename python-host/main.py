"""
relconv SCHEMA HOST
===================
Owns SchemaMemory and pushes changes to peer servers over WebSocket.

Run:
  pip install -r requirements.txt
  export BILLING_KEY=shared-secret-billing
  export ADMIN_KEY=shared-secret-admin
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from relconv import SCHEMA_MEMORY
from relconv.api import create_app

SCHEMA_MEMORY.remember(
    "authors",
    {"fields": {"id": "str", "name": "str", "email": "str", "createdAt": "str"}, "relations": {}},
    kind="class",
)
SCHEMA_MEMORY.remember(
    "posts",
    {"fields": {"id": "str", "title": "str", "body": "str", "authorId": "str", "publishedAt": "str"},
     "relations": {"authorId": "authors"}},
    kind="class",
)
SCHEMA_MEMORY.remember(
    "comments",
    {"fields": {"id": "str", "body": "str", "postId": "str", "authorId": "str"},
     "relations": {"postId": "posts", "authorId": "authors"}},
    kind="class",
)

SERVICE_KEYS = {
    "billing-api": {"secret": os.environ.get("BILLING_KEY", "dev-billing-secret"), "scopes": ["read"]},
    "admin-api": {"secret": os.environ.get("ADMIN_KEY", "dev-admin-secret"), "scopes": ["read", "write"]},
    "node-peer": {"secret": os.environ.get("NODE_PEER_KEY", "dev-node-secret"), "scopes": ["read"]},
}

app: FastAPI = create_app(memory=SCHEMA_MEMORY, service_keys=SERVICE_KEYS, hmac_max_skew=60)


class ModelIn(BaseModel):
    name: str
    fields: dict[str, str]
    relations: dict[str, str] = Field(default_factory=dict)
    kind: str = "class"


@app.get("/admin/stats")
def admin_stats() -> dict[str, Any]:
    return {
        "revision": SCHEMA_MEMORY.revision,
        "stats": SCHEMA_MEMORY.stats(),
        "models": [m.name for m in SCHEMA_MEMORY.all()],
    }


@app.get("/admin/models")
def admin_list_models() -> dict[str, Any]:
    return SCHEMA_MEMORY.to_json()


@app.post("/admin/models")
def admin_add_model(body: ModelIn) -> dict[str, Any]:
    SCHEMA_MEMORY.remember(
        body.name,
        {"fields": body.fields, "relations": body.relations},
        kind=body.kind,
    )
    return {"ok": True, "name": body.name, "revision": SCHEMA_MEMORY.revision}


@app.delete("/admin/models/{name}")
def admin_delete_model(name: str) -> dict[str, Any]:
    if not SCHEMA_MEMORY.forget(name):
        raise HTTPException(404, f"Unknown model: {name}")
    return {"ok": True, "removed": name, "revision": SCHEMA_MEMORY.revision}


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "role": "schema-host",
        "revision": SCHEMA_MEMORY.revision,
        "models": len(list(SCHEMA_MEMORY.all())),
    }
