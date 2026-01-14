# Backend (FastAPI)

## Local dev (no Docker)

1. Create and activate a virtual environment
2. Install dependencies:

```bash
pip install -r requirements.txt
```

3. Run migrations:

```bash
alembic upgrade head
```

4. Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

## Docs

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

