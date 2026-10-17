/**
 * Node peer — consumes schemas from the Python host via Bearer token + WebSocket.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import WebSocket from "ws";
import { SchemaClient, MemorySchemaStore } from "../relconv/src/client.ts";

(globalThis as any).WebSocket = WebSocket;

const PORT = Number(process.env.PORT ?? 3000);
const SCHEMA_URL = process.env.SCHEMA_URL ?? "http://127.0.0.1:8000";
const KEY_ID = process.env.SCHEMA_KEY_ID ?? "node-peer";
const SECRET = process.env.SCHEMA_SECRET ?? "dev-node-secret";

const store = new MemorySchemaStore();
const client = new SchemaClient({
  baseUrl: SCHEMA_URL,
  keyId: KEY_ID,
  secret: SECRET,
});

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (url.pathname === "/health") {
    sendJson(res, 200, {
      ok: true,
      role: "node-peer",
      schemaHost: SCHEMA_URL,
      revision: store.revision,
      models: store.all().map((m) => m.name),
    });
    return;
  }
  if (url.pathname === "/models") {
    sendJson(res, 200, { revision: store.revision, models: store.all() });
    return;
  }
  if (url.pathname.startsWith("/models/")) {
    const name = decodeURIComponent(url.pathname.slice("/models/".length));
    const m = store.get(name);
    if (!m) {
      sendJson(res, 404, { error: `Unknown model: ${name}` });
      return;
    }
    sendJson(res, 200, m);
    return;
  }
  if (url.pathname === "/sync" && req.method === "POST") {
    client
      .sync(store)
      .then((r) => sendJson(res, 200, r))
      .catch((err) => sendJson(res, 502, { error: String(err) }));
    return;
  }
  sendJson(res, 404, { error: "Not found" });
});

async function main() {
  try {
    const result = await client.sync(store);
    console.log(
      `[peer] synced rev=${result.revision} models=[${result.models.join(", ")}]`,
    );
  } catch (err) {
    console.warn(
      "[peer] initial sync failed (host down?). Will rely on WS reconnect.",
      (err as Error).message,
    );
  }

  client.subscribe(store, {
    onEvent: (e) => {
      console.log(
        `[peer] push rev=${e.revision}` +
          ` +[${(e.models ?? []).map((m) => m.name).join(", ")}]` +
          ` -[${(e.removed ?? []).join(", ")}]`,
      );
    },
  });
  console.log(`[peer] subscribed to ${SCHEMA_URL}/internal/schema/ws`);

  server.listen(PORT, () => {
    console.log(`[peer] HTTP on http://127.0.0.1:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

process.on("SIGINT", () => {
  client.unsubscribe();
  process.exit(0);
});
