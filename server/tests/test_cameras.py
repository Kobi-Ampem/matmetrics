import pytest
from fastapi.testclient import TestClient

from edge.cameras import CameraRoom
from edge.detect import CameraDetector
from edge.live import LiveClock
from edge.main import create_app


def body(nose, l_sh, r_sh, l_hip, r_hip):
    """A 17-point COCO pose from the points the rules use; the rest sit at the hips, unseen."""
    points = [(r_hip[0], r_hip[1], 0.0)] * 17
    points[0] = (*nose, 0.9)
    points[3] = (nose[0] - 0.02, nose[1] + 0.01, 0.9)
    points[4] = (nose[0] + 0.02, nose[1] + 0.01, 0.9)
    points[5], points[6] = (*l_sh, 0.9), (*r_sh, 0.9)
    points[11], points[12] = (*l_hip, 0.9), (*r_hip, 0.9)
    return points


STANDING = body((0.5, 0.2), (0.45, 0.3), (0.55, 0.3), (0.47, 0.5), (0.53, 0.5))
HEAD_DOWN = body((0.5, 0.88), (0.45, 0.8), (0.55, 0.8), (0.47, 0.75), (0.53, 0.75))
LEFT_SHOULDER = body((0.2, 0.68), (0.3, 0.8), (0.32, 0.64), (0.47, 0.75), (0.53, 0.75))
FLAT = body((0.2, 0.74), (0.25, 0.76), (0.27, 0.76), (0.45, 0.75), (0.47, 0.75))
KNEELING = body((0.5, 0.4), (0.45, 0.5), (0.55, 0.5), (0.47, 0.7), (0.53, 0.7))


def between(a, b, t):
    return [(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, q[2]) for p, q in zip(a, b)]


def fall(detector, end_pose, start=0.0, seconds=0.5, steps=4):
    """Stand still for a second, then move smoothly to `end_pose` and stay there a moment."""
    found = []
    for i in range(6):
        found += detector.update(start + i * 0.2, [STANDING])
    for i in range(1, steps + 1):
        found += detector.update(
            start + 1.0 + seconds * i / steps, [between(STANDING, end_pose, i / steps)]
        )
    for i in range(1, 4):
        found += detector.update(start + 1.0 + seconds + i * 0.2, [end_pose])
    return found


@pytest.mark.parametrize(
    ("pose", "kind", "level", "zone"),
    [
        (HEAD_DOWN, "neck_landing", "high", "head_neck"),
        (LEFT_SHOULDER, "shoulder_landing", "med", "shoulder_l"),
        (FLAT, "back_slam", "med", "upper_back"),
    ],
)
def test_fast_falls_are_classified(pose, kind, level, zone):
    found = fall(CameraDetector(), pose)
    assert [(c.kind, c.level, c.zone) for c in found] == [(kind, level, zone)]


def test_slow_movement_is_not_a_fall():
    # The same end position reached over four seconds: hips never drop fast enough.
    assert fall(CameraDetector(), FLAT, seconds=4.0, steps=20) == []


def test_fast_kneel_is_not_a_landing():
    # Hips drop quickly, but the body stays upright, so nothing landed.
    assert fall(CameraDetector(), KNEELING) == []


def test_one_alert_per_fall_then_cooldown():
    detector = CameraDetector()
    first = fall(detector, HEAD_DOWN, start=0.0)
    # Standing up and falling again inside the three-second cooldown raises nothing.
    again = fall(detector, HEAD_DOWN, start=2.2)
    later = fall(detector, HEAD_DOWN, start=6.0)
    assert len(first) == 1 and again == [] and len(later) == 1


def test_unseen_body_is_ignored():
    hidden = [(x, y, 0.1) for x, y, _ in HEAD_DOWN]
    assert fall(CameraDetector(), hidden) == []


def test_two_cameras_merge_into_one_alert():
    room = CameraRoom(LiveClock())
    for i in range(6):
        room.frame("cam2", [STANDING], now=i * 0.2)
        room.frame("cam3", [STANDING], now=i * 0.2 + 0.05)
    first = room.frame("cam2", [HEAD_DOWN], now=1.5)
    second = room.frame("cam3", [HEAD_DOWN], now=1.55)
    assert len(room.alerts) == 1
    alert = room.alerts[0]
    assert first[0] is second[0] is alert
    assert alert["cameras"] == ["cam2", "cam3"]
    assert alert["source"] == "combined"
    assert alert["athleteId"] == "a01"
    assert alert["clock"] == "19:27:20"  # the demo opens at 57:20 into an 18:30 session


@pytest.fixture
def client(tmp_path):
    app = create_app(db_path=tmp_path / "t.db", tick_seconds=0, https_port=8443)
    with TestClient(app) as test_client:
        yield test_client


def send(client, cam, pose, image=None):
    return client.post(
        f"/api/cameras/{cam}/frame",
        json={"people": [pose], "image": image, "width": 480, "height": 270},
    )


def test_frame_endpoint_validates(client):
    assert send(client, "cam1", STANDING).status_code == 200
    assert send(client, "cam5", STANDING).status_code == 422
    assert send(client, "cam1", STANDING[:10]).status_code == 422
    assert send(client, "cam1", STANDING, image="javascript:alert(1)").status_code == 422
    assert client.get("/api/cameras").json()["online"]["cam1"] is True


def test_frames_reach_watchers_only_and_alerts_reach_everyone(client):
    with client.websocket_connect("/ws") as coach, client.websocket_connect("/ws") as phone:
        assert coach.receive_json()["type"] == "hello"
        assert phone.receive_json()["type"] == "hello"
        coach.send_json({"watchCameras": True})
        # Any request after the opt-in proves the server has read it.
        client.get("/api/health")

        send(client, "cam1", STANDING, image="data:image/jpeg;base64,AAAA")
        frame = coach.receive_json()
        assert frame["type"] == "frame" and frame["cam"] == "cam1"

        client.post("/api/live/cameras", json={"mode": "real"})
        assert coach.receive_json()["live"]["cameraMode"] == "real"
        # The phone never got the frame: its next message is the mode change.
        assert phone.receive_json()["live"]["cameraMode"] == "real"


def test_reset_clears_real_alerts(client):
    room = client.app.state.room
    room.alerts.append({"id": "real-0-1"})
    client.post("/api/live/cameras", json={"mode": "real"})
    body = client.post("/api/demo/reset").json()
    assert room.alerts == [] and body["live"]["cameraMode"] == "simulated"


def test_join_includes_camera_link(client):
    body = client.get("/api/join").json()
    assert body["cameraUrl"].startswith("https://") and body["cameraUrl"].endswith(":8443/camera")
    assert "<svg" in body["cameraSvg"]


def test_certificate_names_the_wifi_address(tmp_path):
    from edge.tls import _covers, ensure_certificate

    cert, key = ensure_certificate(tmp_path, "192.168.1.20")
    assert _covers(cert, "192.168.1.20") and not _covers(cert, "10.0.0.5")
    # A new address (another network) makes a new certificate.
    ensure_certificate(tmp_path, "10.0.0.5")
    assert _covers(cert, "10.0.0.5")
    assert oct(key.stat().st_mode)[-3:] == "600"
