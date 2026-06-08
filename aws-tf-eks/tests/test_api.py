import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture()
def client():
    """TestClient with the full lifespan completed and startup delay skipped."""
    with patch("asyncio.sleep", new_callable=AsyncMock):
        with TestClient(app) as c:
            yield c
    app.is_ready = False  # reset so other tests start from a clean state


def test_hello(client):
    response = client.get("/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello!"}


def test_alive(client):
    response = client.get("/alive")
    assert response.status_code == 200
    assert response.json() == {"message": "alive"}


def test_ready_after_startup(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json() == {"message": "ready"}


def test_ready_before_startup():
    """Before startup completes, /ready returns 503 so Kubernetes withholds traffic."""
    with patch("asyncio.sleep", new_callable=AsyncMock):
        with TestClient(app, raise_server_exceptions=False) as client:
            # lifespan has run and set is_ready=True; override to simulate the
            # window between container start and startup completion
            app.is_ready = False
            response = client.get("/ready")
    assert response.status_code == 503
    assert response.json() == {"message": "not ready"}
