# Application prompt — relconv

## One-line summary

relconv is a rule-based schema engine that keeps model definitions (fields, relations) in sync across backend servers using HMAC bearer tokens and WebSocket push, without AI.

## Problem it solves

Multiple backend services (billing, admin, Node workers, vendor apps) need a shared, up-to-date understanding of data models. Polling is slow and wasteful. relconv gives:

1. A single **schema host** that owns `SchemaMemory`.
2. **Peers** that pull schemas and receive **instant push** when models change.
3. **Strong auth** via a compact signed token (no long-lived opaque API keys alone).

## Architecture

```
                    Schema HOST (FastAPI)
                    SchemaMemory + revision
           /internal/schema/*  +  /internal/schema/ws
           /internal/auth/validate
                           |
          +----------------+----------------+
          |                |                |
    Python peer      Node peer         Gateway
    SchemaClient     SchemaClient      soft validate
    local memory     local store       then proxy
```

## Auth model

Token format:

```
relconv1.<key_id>.<unix_ts>.<nonce>.<hmac_sha256>
```

Secret message signed by the shared service secret:

```
METHOD
path_qs
timestamp
nonce
sha256(body).hex
```

Send as: `Authorization: Bearer <token>`.

Optional: POST token + method + path_qs to `/internal/auth/validate` (gateway soft check with `soft: true` so the nonce is not consumed before the real request).

## Main components

| Component | Role |
|-----------|------|
| `relconv.engine.SchemaMemory` | In-process model registry, revision, listeners |
| `relconv.api.create_app` | FastAPI app: schema routes, WS, auth validate |
| `SchemaClient` (Python/Node) | sync, push, delete, subscribe |
| `mint_token` | Build bearer token for a request |
| Admin routes on host | Demo ops to add/remove models and trigger push |

## How to run (operator)

1. Start host: `./scripts/run-host.sh` (port 8000).
2. Start peers: `./scripts/run-peer-python.sh`, `./scripts/run-peer-node.sh`.
3. Import Postman collection; set `baseUrl`, `keyId`, `secret`.
4. Mutate host models via `POST /admin/models` and watch peers receive push.

## Design constraints

- No AI in the mapping path — deterministic rules only.
- Peers do not need DB credentials; they only need schema definitions.
- Core engine works offline; multi-server push requires network.
- One client library per language; each app only supplies URL + key + secret.

## Success criteria

- Host exposes export/changes/import/delete and WebSocket push.
- Peers stay current without polling after `subscribe()`.
- Postman can call signed APIs with one Bearer header.
- Gateway can validate tokens via `/internal/auth/validate` before forwarding.
