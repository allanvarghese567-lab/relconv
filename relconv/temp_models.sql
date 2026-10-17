-- Server-side temporary memory for the converter engine (DbBackend).
create table if not exists engine_temp_models (
  id         text primary key,
  scope      text not null,
  slot       text not null,
  kind       text not null,
  name       text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists engine_temp_models_scope_slot on engine_temp_models (scope, slot);
