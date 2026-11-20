"""The four real cameras: latest frame from each phone, and alerts merged across views."""

import time
from dataclasses import dataclass, field
from typing import Any

from edge.detect import CameraDetector, Candidate, Point
from edge.live import LiveClock

CAMERA_IDS = ("cam1", "cam2", "cam3", "cam4")
CAMERA_LABELS = {"cam1": "CAM 1", "cam2": "CAM 2", "cam3": "CAM 3", "cam4": "CAM 4"}
STALE_SEC = 3.0  # no frame for this long and a camera counts as offline
MERGE_SEC = 2.0  # the same fall seen by two cameras within this window is one alert

# The demo has no face recognition, so the person on the left of the image is Jack Miller and
# the one on the right is his sparring partner Noah Petit, the pair on the mat at 19:27.
PEOPLE = ("a01", "a09")

# Must match src/types/index.ts DEMO_SESSION_ID and the 18:30 session start.
SESSION_ID = "s2026-11-17"
SESSION_START_SEC = 18 * 3600 + 30 * 60


@dataclass
class _Merged:
    alert: dict[str, Any]
    at: float


@dataclass
class CameraRoom:
    clock: LiveClock
    detectors: dict[str, CameraDetector] = field(
        default_factory=lambda: {cam: CameraDetector() for cam in CAMERA_IDS}
    )
    last_seen: dict[str, float] = field(default_factory=dict)
    alerts: list[dict[str, Any]] = field(default_factory=list)
    _recent: list[_Merged] = field(default_factory=list)
    _count: int = 0

    def status(self, now: float | None = None) -> dict[str, bool]:
        now = time.monotonic() if now is None else now
        return {cam: now - self.last_seen.get(cam, -1e9) < STALE_SEC for cam in CAMERA_IDS}

    def frame(
        self, cam: str, people: list[list[Point]], now: float | None = None
    ) -> list[dict[str, Any]]:
        """Take one frame's keypoints. Returns alerts that are new or gained a camera."""
        now = time.monotonic() if now is None else now
        self.last_seen[cam] = now
        changed = []
        for candidate in self.detectors[cam].update(now, people):
            changed.append(self._merge(cam, candidate, now))
        return changed

    def _merge(self, cam: str, candidate: Candidate, now: float) -> dict[str, Any]:
        athlete = PEOPLE[candidate.person]
        self._recent = [item for item in self._recent if now - item.at < MERGE_SEC]
        for item in self._recent:
            same = item.alert["athleteId"] == athlete and item.alert["kind"] == candidate.kind
            if same:
                if cam not in item.alert["cameras"]:
                    item.alert["cameras"].append(cam)
                    item.alert["source"] = "combined"
                return item.alert

        self._count += 1
        elapsed = self.clock.elapsed_sec
        wall = SESSION_START_SEC + elapsed
        alert = {
            "id": f"real-{self.clock.epoch}-{self._count}",
            "sessionId": SESSION_ID,
            "athleteId": athlete,
            "opponentId": PEOPLE[1 - candidate.person],
            "kind": candidate.kind,
            "level": candidate.level,
            "minute": round(elapsed / 60, 2),
            "clock": f"{wall // 3600:02d}:{wall // 60 % 60:02d}:{wall % 60:02d}",
            "zone": candidate.zone,
            "cameras": [cam],
            "source": "camera",
            "description": candidate.description,
            "seen": False,
        }
        self.alerts.insert(0, alert)
        self._recent.append(_Merged(alert, now))
        return alert

    def reset(self) -> None:
        self.detectors = {cam: CameraDetector() for cam in CAMERA_IDS}
        self.alerts.clear()
        self._recent.clear()
