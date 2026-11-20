"""Rule-based risk detection from the camera phones' pose keypoints.

The project plan says to start with simple rules set with coaches and add machine learning as
labelled data grows. These rules look for one thing: a fast drop of the hips, then check which
part of the body ended up lowest. They are a first version for staged demos, not a trained
model, and close grappling (two bodies overlapping) will confuse them.

Coordinates are MediaPipe's: x and y from 0 to 1 across the camera image, y growing downwards.
Points follow the COCO 17-point order used everywhere else in the app.
"""

from collections import deque
from dataclasses import dataclass, field

NOSE, L_EAR, R_EAR = 0, 3, 4
L_SHOULDER, R_SHOULDER = 5, 6
L_HIP, R_HIP = 11, 12

MIN_VISIBILITY = 0.5
WINDOW_SEC = 1.0  # how far back to look for the start of a drop
DROP_TORSOS = 0.8  # hips must fall at least 0.8 torso lengths inside the window
COOLDOWN_SEC = 3.0  # one alert per person per camera per fall
MIN_TORSO = 0.03  # ignore people so far away the torso is a few pixels

Point = tuple[float, float, float]  # x, y, visibility


@dataclass
class Candidate:
    """One camera's view of a risky moment, before views are merged."""

    person: int  # 0 = left person in the image, 1 = right
    kind: str
    level: str
    zone: str | None
    description: str


@dataclass
class _Sample:
    t: float
    hip_y: float
    torso: float


@dataclass
class PersonTrack:
    history: deque[_Sample] = field(default_factory=lambda: deque(maxlen=60))
    last_alert: float = -1e9


def _mid(a: Point, b: Point) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def _seen(*points: Point) -> bool:
    return all(point[2] >= MIN_VISIBILITY for point in points)


def classify(points: list[Point]) -> Candidate | None:
    """Decide what kind of landing a body position is, at the bottom of a fall."""
    l_sh, r_sh, l_hip, r_hip = points[L_SHOULDER], points[R_SHOULDER], points[L_HIP], points[R_HIP]
    hip_x, hip_y = _mid(l_hip, r_hip)
    sh_x, sh_y = _mid(l_sh, r_sh)
    torso = max(((sh_x - hip_x) ** 2 + (sh_y - hip_y) ** 2) ** 0.5, 1e-6)

    # The lowest visible head point: nose or either ear.
    head = [points[i][1] for i in (NOSE, L_EAR, R_EAR) if points[i][2] >= MIN_VISIBILITY]
    head_y = max(head) if head else None

    if head_y is not None and head_y > hip_y + 0.15 * torso:
        return Candidate(
            0, "neck_landing", "high", "head_neck", "Landed on head and neck after a fast drop"
        )

    # A shoulder at or below hip height, and clearly lower than the other one.
    lower, side = (l_sh, "left") if l_sh[1] > r_sh[1] else (r_sh, "right")
    other = r_sh if side == "left" else l_sh
    if lower[1] > hip_y - 0.1 * torso and lower[1] - other[1] > 0.2 * torso:
        zone = "shoulder_l" if side == "left" else "shoulder_r"
        return Candidate(
            0, "shoulder_landing", "med", zone, f"Landed on {side} shoulder after a fast drop"
        )

    # Shoulders and hips at about the same height: lying flat after the fall.
    if abs(sh_y - hip_y) < 0.4 * torso:
        return Candidate(0, "back_slam", "med", "upper_back", "Hard fall flat onto the back")

    return None


class CameraDetector:
    """Keeps a short history per person for one camera and spots fast drops."""

    def __init__(self) -> None:
        self.people: list[PersonTrack] = [PersonTrack(), PersonTrack()]

    def update(self, t: float, people: list[list[Point]]) -> list[Candidate]:
        found: list[Candidate] = []
        for index, points in enumerate(people[:2]):
            if len(points) != 17:
                continue
            l_sh, r_sh, l_hip, r_hip = (points[i] for i in (L_SHOULDER, R_SHOULDER, L_HIP, R_HIP))
            if not _seen(l_sh, r_sh, l_hip, r_hip):
                continue
            hip = _mid(l_hip, r_hip)
            sh = _mid(l_sh, r_sh)
            torso = ((sh[0] - hip[0]) ** 2 + (sh[1] - hip[1]) ** 2) ** 0.5
            if torso < MIN_TORSO:
                continue

            track = self.people[index]
            track.history.append(_Sample(t, hip[1], torso))
            while track.history and t - track.history[0].t > WINDOW_SEC:
                track.history.popleft()
            if t - track.last_alert < COOLDOWN_SEC:
                continue

            # Compare with the highest hip position in the last second, scaled by the torso
            # length back then, so the rule works near the camera and far from it.
            top = min(track.history, key=lambda sample: sample.hip_y)
            if hip[1] - top.hip_y < DROP_TORSOS * top.torso:
                continue

            candidate = classify(points)
            if candidate:
                candidate.person = index
                track.last_alert = t
                found.append(candidate)
        return found
