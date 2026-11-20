"""SQLite storage for what coaches and athletes change during a demo.

The mock athletes, sessions and default plans live in the frontend. The server only stores
changes on top of them (consent toggles, approved plans, coach notes, shared reviews), so a
reset is just "delete every change".
"""

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS consent_overrides (
    athlete_id   TEXT PRIMARY KEY,
    share_vitals INTEGER,
    share_video  INTEGER,
    research     INTEGER,
    cloud_backup INTEGER,
    updated_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS warmup_plans (
    athlete_id TEXT PRIMARY KEY,
    status     TEXT NOT NULL,
    steps      TEXT NOT NULL,
    notes      TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS review_notes (
    review_key TEXT PRIMARY KEY,
    text       TEXT NOT NULL,
    saved_at   TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shared_reviews (
    review_key TEXT PRIMARY KEY,
    shared     INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS system_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

# API field name -> column name for the four consent toggles.
CONSENT_FIELDS = {
    "shareVitals": "share_vitals",
    "shareVideo": "share_video",
    "research": "research",
    "cloudBackup": "cloud_backup",
}


def clock_stamp() -> str:
    """The "19:42" style time the app shows next to saved items."""
    return datetime.now().strftime("%H:%M")


class Store:
    def __init__(self, path: Path | str) -> None:
        self._db = sqlite3.connect(str(path), check_same_thread=False)
        self._db.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock:
            self._db.executescript(SCHEMA)

    def close(self) -> None:
        self._db.close()

    def snapshot(self) -> dict[str, Any]:
        """Everything the frontend needs to rebuild its settings, in its own shape."""
        with self._lock:
            consents: dict[str, dict[str, bool]] = {}
            for row in self._db.execute("SELECT * FROM consent_overrides"):
                patch = {
                    field: bool(row[column])
                    for field, column in CONSENT_FIELDS.items()
                    if row[column] is not None
                }
                consents[row["athlete_id"]] = patch

            plans = {
                row["athlete_id"]: {
                    "status": row["status"],
                    "steps": json.loads(row["steps"]),
                    "notes": json.loads(row["notes"]),
                }
                for row in self._db.execute("SELECT * FROM warmup_plans")
            }
            notes = {
                row["review_key"]: {"text": row["text"], "savedAt": row["saved_at"]}
                for row in self._db.execute("SELECT * FROM review_notes")
            }
            shared = {
                row["review_key"]: bool(row["shared"])
                for row in self._db.execute("SELECT * FROM shared_reviews")
            }
            meta = {
                row["key"]: row["value"] for row in self._db.execute("SELECT * FROM system_meta")
            }

        return {
            "consents": consents,
            "plans": plans,
            "notes": notes,
            "shared": shared,
            "calibrationAt": meta.get("calibration_at"),
            "syncWaiting": meta.get("sync_waiting") == "1",
        }

    def update_consent(self, athlete_id: str, patch: dict[str, bool]) -> None:
        columns = {CONSENT_FIELDS[field]: int(value) for field, value in patch.items()}
        if not columns:
            return
        names = ", ".join(columns)
        marks = ", ".join("?" for _ in columns)
        # Keep toggles set earlier: only the columns in this patch change.
        updates = ", ".join(f"{name} = excluded.{name}" for name in columns)
        with self._lock, self._db:
            self._db.execute(
                f"INSERT INTO consent_overrides (athlete_id, {names}, updated_at) "
                f"VALUES (?, {marks}, ?) "
                f"ON CONFLICT(athlete_id) DO UPDATE SET {updates}, updated_at = excluded.updated_at",
                (athlete_id, *columns.values(), datetime.now().isoformat()),
            )

    def save_plan(
        self, athlete_id: str, status: str, steps: list[dict[str, Any]], notes: list[str]
    ) -> None:
        with self._lock, self._db:
            self._db.execute(
                "INSERT OR REPLACE INTO warmup_plans VALUES (?, ?, ?, ?, ?)",
                (
                    athlete_id,
                    status,
                    json.dumps(steps),
                    json.dumps(notes),
                    datetime.now().isoformat(),
                ),
            )

    def save_note(self, review_key: str, text: str) -> str:
        saved_at = clock_stamp()
        with self._lock, self._db:
            self._db.execute(
                "INSERT OR REPLACE INTO review_notes VALUES (?, ?, ?)", (review_key, text, saved_at)
            )
        return saved_at

    def set_shared(self, review_key: str, shared: bool) -> None:
        with self._lock, self._db:
            self._db.execute(
                "INSERT OR REPLACE INTO shared_reviews VALUES (?, ?)", (review_key, int(shared))
            )

    def set_meta(self, key: str, value: str) -> None:
        with self._lock, self._db:
            self._db.execute("INSERT OR REPLACE INTO system_meta VALUES (?, ?)", (key, value))

    def reset(self) -> None:
        with self._lock, self._db:
            for table in (
                "consent_overrides",
                "warmup_plans",
                "review_notes",
                "shared_reviews",
                "system_meta",
            ):
                self._db.execute(f"DELETE FROM {table}")
