import os

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def _set_test_env() -> None:
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-please-change")


@pytest.fixture()
def client() -> TestClient:
    os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
    from app.db.session import Base, engine
    from app.main import create_app
    import app.db.base

    Base.metadata.create_all(bind=engine)
    app = create_app()
    with TestClient(app) as c:
        yield c
