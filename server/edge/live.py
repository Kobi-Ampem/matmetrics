"""The live session clock.

The edge unit is the one source of truth for where the session is, so every screen in the
room shows the same moment. The frontend still works out alerts, poses and vitals from its
scripted session; the server only tells it which second of the session it is.
"""

from dataclasses import dataclass, field
from typing import Any, Literal

# Must match src/data/liveScript.ts: the demo opens at 57:20 (19:27:20) of a 90-minute session.
LIVE_START_SEC = 57 * 60 + 20
SESSION_LENGTH_SEC = 90 * 60

Speed = Literal[1, 4, 16]


@dataclass
class LiveClock:
    elapsed_sec: int = LIVE_START_SEC
    running: bool = True
    ended: bool = False
    speed: Speed = 1
    seen: set[str] = field(default_factory=set)
    # Bumped on every reset so screens can tell "the clock went back" from "a stale message".
    epoch: int = 0

    def tick(self) -> bool:
        """Advance one real second. Returns True when the state changed."""
        if not self.running or self.ended:
            return False
        self.elapsed_sec = min(SESSION_LENGTH_SEC, self.elapsed_sec + self.speed)
        if self.elapsed_sec >= SESSION_LENGTH_SEC:
            self.running = False
            self.ended = True
        return True

    def toggle_running(self) -> None:
        if not self.ended:
            self.running = not self.running

    def set_speed(self, speed: Speed) -> None:
        self.speed = speed

    def end(self) -> None:
        self.running = False
        self.ended = True

    def mark_seen(self, alert_id: str) -> None:
        self.seen.add(alert_id)

    def reset(self) -> None:
        epoch = self.epoch + 1
        self.__init__()
        self.epoch = epoch

    def snapshot(self) -> dict[str, Any]:
        return {
            "elapsedSec": self.elapsed_sec,
            "running": self.running,
            "ended": self.ended,
            "speed": self.speed,
            "seen": sorted(self.seen),
            "epoch": self.epoch,
        }
