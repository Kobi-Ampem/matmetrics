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


def real_room():
    clock = LiveClock()
    clock.set_camera_mode("real")
    return CameraRoom(clock)


def stage_fall(room, cam, pose, start, offset=0.0):
    """Stand for a second, then fall to `pose`, sending frames to one camera of the room."""
    found = []
    for i in range(6):
        found += room.frame(cam, [STANDING], now=start + i * 0.2 + offset)
    for i in range(1, 5):
        found += room.frame(
            cam, [between(STANDING, pose, i / 4)], now=start + 1.0 + i * 0.12 + offset
        )
    return found


def test_two_cameras_merge_into_one_alert():
    room = real_room()
    for cam, offset in (("cam2", 0.0), ("cam3", 0.05)):
        room.frame(cam, [STANDING], now=offset)  # cameras start, then settle for 3 s
    first = stage_fall(room, "cam2", HEAD_DOWN, start=2.5)
    second = stage_fall(room, "cam3", HEAD_DOWN, start=2.5, offset=0.05)
    assert len(room.alerts) == 1
    alert = room.alerts[0]
    assert first[0] is second[0] is alert
    assert alert["cameras"] == ["cam2", "cam3"]
    assert alert["source"] == "combined"
    assert alert["athleteId"] == "a01"
    assert alert["clock"] == "19:27:20"  # the demo opens at 57:20 into an 18:30 session


def test_no_alerts_while_a_camera_settles():
    room = real_room()
    # A fall in the first three seconds after the camera starts is ignored, and does not start
    # the cooldown, so a real fall straight after still counts.
    assert stage_fall(room, "cam1", HEAD_DOWN, start=0.0) == []
    assert len(stage_fall(room, "cam1", HEAD_DOWN, start=2.5)) == 1


def test_no_alerts_while_the_phone_moves():
    room = real_room()
    for i in range(16):
        room.frame("cam1", [STANDING], now=i * 0.2)  # started and settled by 3.0
    # The phone is picked up: no alert, and three more seconds of settling start.
    assert room.frame("cam1", [HEAD_DOWN], now=3.3, moving=True) == []
    assert stage_fall(room, "cam1", HEAD_DOWN, start=3.5) == []
    assert len(stage_fall(room, "cam1", HEAD_DOWN, start=5.5)) == 1


def test_no_real_alerts_in_simulated_mode():
    room = CameraRoom(LiveClock())  # starts in simulated mode
    room.frame("cam1", [STANDING], now=0.0)
    assert stage_fall(room, "cam1", HEAD_DOWN, start=2.5) == []
    assert room.alerts == []


def test_late_frames_are_dropped():
    room = real_room()
    assert room.accept("cam1", 10)
    assert room.accept("cam1", 12)
    assert not room.accept("cam1", 11)  # arrived after 12
    assert not room.accept("cam1", 12)


@pytest.fixture
def client(tmp_path):
    app = create_app(db_path=tmp_path / "t.db", tick_seconds=0, https_port=8443)
    with TestClient(app) as test_client:
        yield test_client


SEQ = iter(range(1, 10_000))


def send(client, cam, pose, **extra):
    body = {"people": [pose], "width": 1280, "height": 720, "seq": next(SEQ), "capturedAt": 1.0}
    return client.post(f"/api/cameras/{cam}/pose", json=body | extra)


JPEG = b"\xff\xd8\xff\xe0" + b"0" * 100


def test_pose_endpoint_validates(client):
    assert send(client, "cam1", STANDING).status_code == 200
    assert send(client, "cam5", STANDING).status_code == 422
    assert send(client, "cam1", STANDING[:10]).status_code == 422
    assert client.get("/api/cameras").json()["online"]["cam1"] is True


def test_image_endpoint_takes_only_small_jpegs(client):
    url = "/api/cameras/cam1/image?capturedAt=5"
    assert client.post(url, content=JPEG).status_code == 200
    assert client.post(url, content=b"<svg onload=alert(1)>").status_code == 422
    assert client.post(url, content=b"\xff\xd8" + b"0" * 300_000).status_code == 413
    assert client.post("/api/cameras/cam1/image", content=JPEG).status_code == 422  # no time


def test_server_time(client):
    assert abs(client.get("/api/time").json()["now"] - __import__("time").time() * 1000) < 5000


def test_frames_reach_watchers_only_and_alerts_reach_everyone(client):
    with client.websocket_connect("/ws") as coach, client.websocket_connect("/ws") as phone:
        assert coach.receive_json()["type"] == "hello"
        assert phone.receive_json()["type"] == "hello"
        coach.send_json({"watchCameras": True})
        # Any request after the opt-in proves the server has read it.
        client.get("/api/health")

        send(client, "cam1", STANDING, capturedAt=1000.0)
        pose = coach.receive_json()
        assert pose["type"] == "pose" and pose["cam"] == "cam1" and pose["capturedAt"] == 1000.0
        assert pose["receivedAt"] > 0

        client.post("/api/cameras/cam1/image?capturedAt=1100", content=JPEG)
        image = coach.receive_json()
        assert image["type"] == "image" and image["image"].startswith("data:image/jpeg;base64,")

        client.post("/api/live/cameras", json={"mode": "real"})
        assert coach.receive_json()["live"]["cameraMode"] == "real"
        # The phone never got the pictures: its next message is the mode change.
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
