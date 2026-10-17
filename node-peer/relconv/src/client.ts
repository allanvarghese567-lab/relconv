/**
 * SchemaClient — pull / push / live-subscribe against a relconv Schema API.
 */
import { signedHeaders } from "./sign.ts";
import type {
  ChangeHandler,
  ModelDef,
  SchemaPayload,
  SchemaStore,
  SyncResult,
} from "./types.ts";

export interface SchemaClientOptions {
  baseUrl: string;
  keyId: string;
  secret: string;
  fetch?: typeof fetch;
}

export class SchemaClient {
  readonly base: string;
  readonly keyId: string;
  readonly secret: string;
  revision = 0;

  private readonly _fetch: typeof fetch;
  private _ws: WebSocket | null = null;
  private _stop = false;
  private _reconnectDelay = 2000;

  constructor(opts: SchemaClientOptions) {
    this.base = opts.baseUrl.replace(/\/$/, "");
    this.keyId = opts.keyId;
    this.secret = opts.secret;
    this._fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  private async call<T = unknown>(
    method: string,
    pathQs: string,
    payload?: unknown,
  ): Promise<T> {
    const body = payload !== undefined ? JSON.stringify(payload) : "";
    const headers = signedHeaders(this.secret, this.keyId, method, pathQs, body);
    const res = await this._fetch(this.base + pathQs, {
      method,
      headers,
      body: body || undefined,
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      throw new Error(
        `Schema API ${method} ${pathQs} → HTTP ${res.status}: ${JSON.stringify(data)}`,
      );
    }
    return data as T;
  }

  export(): Promise<SchemaPayload> {
    return this.call("GET", "/internal/schema/export");
  }

  async sync(store: SchemaStore): Promise<SyncResult> {
    let data: SchemaPayload;
    if (this.revision === 0) {
      data = await this.call<SchemaPayload>("GET", "/internal/schema/export");
      store.apply(data.models);
    } else {
      data = await this.call<SchemaPayload>(
        "GET",
        `/internal/schema/changes?since=${this.revision}`,
      );
      store.apply(data.models, data.removed ?? []);
    }
    this.revision = data.revision;
    store.revision = data.revision;
    return {
      revision: this.revision,
      models: data.models.map((m) => m.name),
      removed: data.removed ?? [],
    };
  }

  push(models: ModelDef[], removed: string[] = []): Promise<{ applied: string[]; revision: number }> {
    return this.call("POST", "/internal/schema/import", { models, removed });
  }

  delete(name: string): Promise<{ removed: string; revision: number }> {
    return this.call("DELETE", `/internal/schema/models/${encodeURIComponent(name)}`);
  }

  subscribe(
    store: SchemaStore,
    opts: {
      onEvent?: ChangeHandler;
      reconnect?: boolean;
      reconnectDelayMs?: number;
    } = {},
  ): void {
    if (this._ws) return;
    this._stop = false;
    this._reconnectDelay = opts.reconnectDelayMs ?? 2000;
    const reconnect = opts.reconnect !== false;

    const path = "/internal/schema/ws";
    const wsBase = this.base.replace(/^http/, "ws");
    const url = wsBase + path;

    const connect = () => {
      if (this._stop) return;

      const headers = signedHeaders(this.secret, this.keyId, "GET", path);
      const WS = (globalThis as any).WebSocket;
      if (!WS) {
        throw new Error(
          "No WebSocket global. In Node, install `ws` and set:\n" +
            "  import WebSocket from 'ws';\n" +
            "  (globalThis as any).WebSocket = WebSocket;",
        );
      }

      let socket: any;
      try {
        socket = new WS(url, { headers });
      } catch {
        socket = new WS(url);
      }
      this._ws = socket;

      const apply = (data: SchemaPayload) => {
        store.apply(data.models ?? [], data.removed ?? []);
        this.revision = data.revision ?? this.revision;
        store.revision = this.revision;
        opts.onEvent?.(data);
      };

      socket.onopen = () => {
        socket.send(JSON.stringify({ since: this.revision }));
      };

      socket.onmessage = (ev: any) => {
        const raw = typeof ev === "string" ? ev : ev?.data ?? ev?.toString?.() ?? "";
        let data: any;
        try {
          data = JSON.parse(String(raw));
        } catch {
          return;
        }
        if (data?.type === "pong") return;
        if (data && typeof data.revision === "number") apply(data);
      };

      socket.onclose = () => {
        this._ws = null;
        if (!this._stop && reconnect) {
          setTimeout(connect, this._reconnectDelay);
        }
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          /* ignore */
        }
      };
    };

    connect();
  }

  unsubscribe(): void {
    this._stop = true;
    if (this._ws) {
      try {
        this._ws.close();
      } catch {
        /* ignore */
      }
      this._ws = null;
    }
  }
}

export class MemorySchemaStore implements SchemaStore {
  revision = 0;
  models = new Map<string, ModelDef>();

  apply(models: ModelDef[], removed: string[] = []): string[] {
    const names: string[] = [];
    for (const m of models) {
      this.models.set(m.name, m);
      names.push(m.name);
    }
    for (const n of removed) {
      this.models.delete(n);
    }
    return names;
  }

  get(name: string): ModelDef | undefined {
    return this.models.get(name);
  }

  all(): ModelDef[] {
    return [...this.models.values()];
  }
}
