import os

os.environ.setdefault("APP_ENV", "local")
os.environ.setdefault(
    "SUPABASE_JWT_SECRET",
    "test-supabase-jwt-secret-32-bytes-minimum",
)

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)
