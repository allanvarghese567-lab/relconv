"""relconv: rule-based JSON <-> object engine with relational mapping.

No AI involved. Core features: model registry with alias detection, signed and
AES-GCM encrypted IDs, RDBMS loading, CRUD over API or credentials, ordered
transactional sync, temporary staging memory, and a process-wide schema memory.
The FastAPI layer lives in ``relconv.api`` (install the ``api`` extra).
"""
from importlib import resources as _res

from .engine import (  # noqa: F401
    SCHEMA_MEMORY,
    CrudSource,
    DataStore,
    DbBackend,
    Entity,
    IdCodec,
    MemoryBackend,
    ModelDef,
    ModelRegistry,
    PostgresCrud,
    RestCrud,
    SchemaMemory,
    SupabaseCrud,
    SyncPlan,
    TempBackend,
    TempEntry,
    TempMemory,
    TokenCodec,
    schema_from_class,
    schema_from_json,
)

__version__ = "0.1.0"


def read_sql(name: str) -> str:
    """Return a bundled SQL script: 'get_schema.sql' or 'temp_models.sql'."""
    return (_res.files(__package__) / "sql" / name).read_text(encoding="utf-8")
