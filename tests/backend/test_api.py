from __future__ import annotations

from collections.abc import AsyncGenerator

from fastapi.testclient import TestClient

from backend.api import dependencies
from backend.main import app
from backend.models.schemas import ModelManifest, ModelSpec


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


def test_supporters_endpoint() -> None:
    response = client.get("/api/v1/supporters")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert body["data"]["source"] == "Ko-fi GitHub Supporters"
    assert "members" in body["data"]


def test_storage_status_endpoint() -> None:
    response = client.get("/api/v1/storage")
    assert response.status_code == 200
    body = response.json()
    assert body["ok"] is True
    assert "active_root" in body["data"]
    assert "portable_candidates" in body["data"]


def test_chat_stream_returns_error_event_when_stream_fails() -> None:
    class DummyChatService:
        def create_conversation(self, db, title: str = "New Chat"):
            class C:
                id = 777

            return C()

        def append_message(self, db, conversation_id: int, role: str, content: str, model_id: str | None = None):
            return None

        async def stream_generate(self, model_id: str, messages: list) -> AsyncGenerator[str, None]:
            raise RuntimeError("upstream stream failed")
            yield ""

    class DummyManifestLoader:
        def load(self) -> ModelManifest:
            return ModelManifest(
                models=[
                    ModelSpec(
                        id="dummy-model",
                        name="Dummy Model",
                        description="test",
                        source="local",
                        download_url="https://example.com/model.gguf",
                        filename="dummy.gguf",
                        sha256="x",
                        architecture="llama",
                        parameter_count="1b",
                        quantization="Q4_K_M",
                        required_ram_gb=0.0,
                        recommended_ram_gb=0.0,
                        required_vram_gb=0.0,
                        recommended_vram_gb=0.0,
                        context_limit=2048,
                        capabilities=["chat"],
                        backend_compatibility=["llamacpp"],
                        priority=1,
                    )
                ]
            )

    class DummyDetector:
        def detect(self):
            class Profile:
                total_ram_gb = 64.0
                gpus = []

            return Profile()

    class DummyTierSelector:
        def select_tier(self, profile):
            class Tier:
                name = "STANDARD"
                preferred_model_classes = ["1b"]

            return Tier()

    class DummySelector:
        def compatible_models(self, task_type, profile, models):
            return models

        def select(self, task_type, profile, tier, models):
            class Selection:
                selected_model_id = models[0].id

            return Selection()

    app.dependency_overrides[dependencies.get_chat_service] = lambda: DummyChatService()
    app.dependency_overrides[dependencies.get_manifest_loader] = lambda: DummyManifestLoader()
    app.dependency_overrides[dependencies.get_hardware_detector] = lambda: DummyDetector()
    app.dependency_overrides[dependencies.get_tier_selector] = lambda: DummyTierSelector()
    app.dependency_overrides[dependencies.get_model_selector] = lambda: DummySelector()

    try:
        response = client.post(
            "/api/v1/chat/stream",
            json={
                "conversation_id": None,
                "messages": [{"role": "user", "content": "Hello"}],
                "task_type": "GENERAL",
            },
        )
        assert response.status_code == 200
        assert "event: error" in response.text
        assert "upstream stream failed" in response.text
    finally:
        app.dependency_overrides.clear()
