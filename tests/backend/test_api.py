from __future__ import annotations

from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "inference" in body["data"]


def test_system_endpoint() -> None:
    response = client.get("/api/v1/system")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "hardware" in body["data"]
