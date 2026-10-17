# relconv

Rule-based **JSON ↔ object** schema engine with relational mapping, **HMAC bearer-token auth**, **WebSocket push**, and example host/peer apps (Python + Node). No AI involved.

## What this is

- **Host** owns a process-wide `SchemaMemory` and exposes:
  - `GET/POST/DELETE /internal/schema/*` (signed)
  - `WS /internal/schema/ws` (live push to peers)
  - `POST /internal/auth/validate` (gateway / token check)
- **Peers** (any backend) pull schemas once, then stay in sync over WebSocket instead of polling.
- **Auth** is a single token:

```text
Authorization: Bearer relconv1.<key_id>.<timestamp>.<nonce>.<hmac>
```

The HMAC covers: `METHOD\npath_qs\ntimestamp\nnonce\nsha256(body).hex`.

## Repo layout

```text
relconv/                 Python library (engine + FastAPI API)
python-host/             Schema host application
python-peer/             Python peer (consumer)
node-peer/               Node peer + TypeScript client
postman/                 Postman collection (auto-signs Bearer token)
scripts/                 Run scripts
PROMPT.md                Short product / architecture prompt
```

## Requirements

- Python 3.10+
- Node 18+ (for the Node peer)
- Host dependencies: `fastapi`, `uvicorn`, `cryptography`, `websockets`, `pydantic`, `requests`, `pyjwt` (optional)

```bash
pip install fastapi "uvicorn[standard]" cryptography websockets pydantic requests
```

## Run (quick)

Terminal 1 — **host**:

```bash
chmod +x scripts/*.sh
./scripts/run-host.sh
# → http://127.0.0.1:8000
```

Terminal 2 — **Python peer**:

```bash
./scripts/run-peer-python.sh
# → http://127.0.0.1:3001
```

Terminal 3 — **Node peer**:

```bash
./scripts/run-peer-node.sh
# → http://127.0.0.1:3000
```

### Env vars

| Variable | Default | Used by |
|----------|---------|---------|
| `BILLING_KEY` | `dev-billing-secret` | Host (key `billing-api`) |
| `ADMIN_KEY` | `dev-admin-secret` | Host (key `admin-api`, read+write) |
| `NODE_PEER_KEY` | `dev-node-secret` | Host (key `node-peer`) |
| `SCHEMA_URL` | `http://127.0.0.1:8000` | Peers |
| `SCHEMA_KEY_ID` | peer-specific | Peers |
| `SCHEMA_SECRET` | matches host key | Peers |

### Try live push

```bash
curl -X POST http://127.0.0.1:8000/admin/models \
  -H 'Content-Type: application/json' \
  -d '{"name":"tags","fields":{"id":"str","label":"str"},"relations":{}}'
```

Peers should log a push. Check:

```bash
curl http://127.0.0.1:3001/models
curl http://127.0.0.1:3000/models
```

## Auth (token)

Mint (Python):

```python
from relconv.api import mint_token
token = mint_token("dev-billing-secret", "billing-api", "GET", "/internal/schema/export")
# Authorization: Bearer <token>
```

Validate at auth server (soft = do not burn nonce):

```bash
curl -s -X POST http://127.0.0.1:8000/internal/auth/validate \
  -H 'Content-Type: application/json' \
  -d '{"token":"<token>","method":"GET","path_qs":"/internal/schema/export","soft":true}'
```

## Postman

1. Import `postman/relconv-schema.postman_collection.json`
2. Variables: `baseUrl`, `keyId`, `secret`
3. Pre-request script sets `Authorization: Bearer relconv1....`

For write routes use `keyId=admin-api` and `secret=dev-admin-secret`.

## Offline / vendor apps

Core `SchemaMemory` runs **fully offline**. Remote host sync and WebSocket push need network. Vendor apps can embed models or cache the last sync and keep working offline.

## License

MIT (see `LICENSE` if present).
