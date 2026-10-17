# Adding `api.py` and `engine.py`

These two files are the core of the Python library (~30–50 KB each).

## Option A — from the project zip

1. Download `relconv-python.zip` or `relconv-full-apps.zip`.
2. Copy:

```bash
cp relconv-python/api.py    relconv/api.py
cp relconv-python/engine.py relconv/engine.py
```

## Option B — from this monorepo after a local clone of artifacts

```bash
cp /path/to/JsonClassConverter/api.py    relconv/
cp /path/to/JsonClassConverter/engine.py relconv/
git add relconv/api.py relconv/engine.py
git commit -m "Add core library"
git push
```

Then:

```bash
export PYTHONPATH=.
pip install fastapi "uvicorn[standard]" cryptography websockets pydantic requests
./scripts/run-host.sh
```
