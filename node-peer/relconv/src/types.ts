/** Model definition as exported by the Python schema API. */
export interface ModelDef {
  name: string;
  fields: Record<string, string>;
  relations?: Record<string, string>;
  aliases?: string[];
  kinds?: string[];
  rev?: number;
}

/** Full export / changes payload. */
export interface SchemaPayload {
  revision: number;
  models: ModelDef[];
  removed?: string[];
}

export interface SyncResult {
  revision: number;
  models: string[];
  removed: string[];
}

export type ChangeHandler = (event: SchemaPayload) => void;

/** Minimal in-memory schema store a host backend can implement. */
export interface SchemaStore {
  /** Apply models and removals; return names applied. */
  apply(models: ModelDef[], removed?: string[]): string[];
  /** Current revision known locally (for incremental sync). */
  revision: number;
}
