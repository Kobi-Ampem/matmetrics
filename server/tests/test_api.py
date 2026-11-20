import pytest
from fastapi.testclient import TestClient

from edge.live import LIVE_START_SEC, SESSION_LENGTH_SEC
from edge.main import create_app

REVIEW = "s2026-11-17:a01"


@pytest.fixture
def client(tmp_path):
    # tick_seconds=0 turns the background clock off so tests move it by hand.
    app = create_app(db_path=tmp_path / "test.db", tick_seconds=0)
    with TestClient(app) as test_client:
        yield test_client


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"


def test_fresh_state_has_no_changes(client):
    body = client.get("/api/state").json()
    assert body["settings"] == {
        "consents": {},
        "plans": {},
        "notes": {},
        "shared": {},
        "calibrationAt": None,
        "syncWaiting": False,
    }
    assert body["live"]["elapsedSec"] == LIVE_START_SEC
    assert body["live"]["running"] is True


def test_consent_patches_merge(client):
    client.patch("/api/consents/a01", json={"shareVideo": False})
    client.patch("/api/consents/a01", json={"research": True})
    consents = client.get("/api/state").json()["settings"]["consents"]
    assert consents == {"a01": {"shareVideo": False, "research": True}}


def test_consent_rejects_unknown_fields_and_ids(client):
    assert client.patch("/api/consents/a01", json={"shareEverything": True}).status_code == 422
    assert client.patch("/api/consents/../etc", json={"research": True}).status_code == 404
    assert client.patch("/api/consents/bob", json={"research": True}).status_code == 422


def test_plan_round_trip(client):
    plan = {
        "status": "approved",
        "steps": [{"exerciseId": "jog", "minutes": 4, "reason": "Cool hall", "change": "adjusted"}],
        "notes": ["Room profile Cool hall: warm-up extended"],
    }
    assert client.put("/api/plans/a01", json=plan).status_code == 200
    assert client.get("/api/state").json()["settings"]["plans"]["a01"] == plan


def test_note_and_share(client):
    saved = client.put(f"/api/notes/{REVIEW}", json={"text": "Post the hand."}).json()
    assert len(saved["savedAt"]) == 5  # "HH:MM"
    client.put(f"/api/shared/{REVIEW}", json={"shared": True})
    settings = client.get("/api/state").json()["settings"]
    assert settings["notes"][REVIEW]["text"] == "Post the hand."
    assert settings["shared"] == {REVIEW: True}


def test_live_controls(client):
    client.post("/api/live/speed", json={"speed": 16})
    client.post("/api/live/toggle")
    client.post("/api/live/seen/f-123")
    live = client.get("/api/state").json()["live"]
    assert live["speed"] == 16
    assert live["running"] is False
    assert live["seen"] == ["f-123"]
    assert client.post("/api/live/speed", json={"speed": 3}).status_code == 422


def test_reset_clears_everything(client):
    client.patch("/api/consents/a01", json={"shareVideo": False})
    client.post("/api/system/sync")
    client.post("/api/live/end")
    body = client.post("/api/demo/reset").json()
    assert body["settings"]["consents"] == {}
    assert body["settings"]["syncWaiting"] is False
    assert body["live"]["ended"] is False
    assert body["live"]["epoch"] == 1


def test_websocket_gets_hello_then_changes(client):
    with client.websocket_connect("/ws") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"
        assert hello["live"]["elapsedSec"] == LIVE_START_SEC

        client.patch("/api/consents/a02", json={"cloudBackup": True})
        update = ws.receive_json()
        assert update["type"] == "settings"
        assert update["settings"]["consents"]["a02"] == {"cloudBackup": True}

        client.post("/api/live/speed", json={"speed": 4})
        assert ws.receive_json()["live"]["speed"] == 4


def test_clock_stops_at_session_end(client):
    clock = client.app.state.clock
    clock.set_speed(16)
    while clock.tick():
        pass
    assert clock.elapsed_sec == SESSION_LENGTH_SEC
    assert clock.ended and not clock.running


def test_join_gives_url_and_qr(client):
    body = client.get("/api/join").json()
    assert body["url"].startswith("http://") and body["url"].endswith("/athlete")
    assert "<svg" in body["svg"]


def test_serves_frontend_with_spa_fallback(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<html>app</html>")
    (dist / "assets" / "app.js").write_text("console.log(1)")
    (tmp_path / "secret.txt").write_text("nope")
    app = create_app(db_path=tmp_path / "t.db", dist_dir=dist, tick_seconds=0)
    with TestClient(app) as c:
        assert c.get("/coach/live").text == "<html>app</html>"
        assert c.get("/assets/app.js").text == "console.log(1)"
        assert "nope" not in c.get("/%2e%2e/secret.txt").text
        assert c.get("/api/nothing").status_code == 404
