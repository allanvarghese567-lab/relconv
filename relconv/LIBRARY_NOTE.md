# Core library files

The full implementations of `api.py` and `engine.py` are large. They are included in:

- The `relconv-python.zip` / `relconv-full-apps.zip` artifacts from the project setup
- Or copy from your local development tree:

```bash
# from the repo root, if you have the files locally:
cp /path/to/JsonClassConverter/api.py relconv/
cp /path/to/JsonClassConverter/engine.py relconv/
```

After placing them:

```bash
export PYTHONPATH=.
pip install fastapi "uvicorn[standard]" cryptography websockets pydantic requests
./scripts/run-host.sh
```
