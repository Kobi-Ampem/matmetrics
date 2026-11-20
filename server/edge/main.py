"""FastAPI app: REST for changes, one WebSocket that pushes every change to every screen."""

import asyncio
import contextlib
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Literal

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import Path as PathParam
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from edge import __version__
from edge.live import LiveClock, Speed
from edge.network import join_url, qr_svg
from edge.store import Store, clock_stamp

AthleteId = PathParam(pattern=r"^a\d{2}$")
# Reviews are keyed "<sessionId>:<athleteId>", e.g. "s2026-11-17:a01".
ReviewKey = PathParam(pattern=r"^s\d{4}-\d{2}-\d{2}:a\d{2}$")


class ConsentPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    shareVitals: bool | None = None
    shareVideo: bool | None = None
    research: bool | None = None
    cloudBackup: bool | None = None


class WarmupStep(BaseModel):
    exerciseId: str
    minutes: int = Field(ge=1, le=30)
    reason: str
    change: Literal["standard", "added", "adjusted"]


class PlanIn(BaseModel):
    status: Literal["suggested", "approved", "standard"]
    steps: list[WarmupStep] = Field(max_length=20)
    notes: list[str] = Field(max_length=20)


class NoteIn(BaseModel):
    text: str = Field(max_length=4000)


class SharedIn(BaseModel):
    shared: bool


class SpeedIn(BaseModel):
    speed: Speed


class Hub:
    """Every open WebSocket, so one change can be pushed to all screens."""

    def __init__(self) -> None:
        self.sockets: set[WebSocket] = set()

    async def send_all(self, message: dict[str, Any]) -> None:
        for socket in list(self.sockets):
            try:
                await socket.send_json(message)
            except (WebSocketDisconnect, RuntimeError, OSError):
                # The screen closed (tab shut, phone locked); stop sending to it.
                self.sockets.discard(socket)


def create_app(
    db_path: Path | str = "matmetrics.db",
    dist_dir: Path | str | None = None,
    tick_seconds: float = 1.0,
    port: int = 8000,
) -> FastAPI:
    store = Store(db_path)
    clock = LiveClock()
    hub = Hub()

    async def push_settings() -> None:
        await hub.send_all({"type": "settings", "settings": store.snapshot()})

    async def push_live() -> None:
        await hub.send_all({"type": "live", "live": clock.snapshot()})

    async def run_clock() -> None:
        while True:
            await asyncio.sleep(tick_seconds)
            if clock.tick():
                await push_live()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        task = asyncio.create_task(run_clock()) if tick_seconds > 0 else None
        yield
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        store.close()

    app = FastAPI(title="MatMetrics edge server", version=__version__, lifespan=lifespan)
    app.state.store = store
    app.state.clock = clock

    @app.get("/api/health")
    async def health() -> dict[str, Any]:
        return {"status": "ok", "edge": "MatMetrics Edge 01", "version": __version__}

    @app.get("/api/state")
    async def state() -> dict[str, Any]:
        return {"settings": store.snapshot(), "live": clock.snapshot()}

    @app.patch("/api/consents/{athlete_id}")
    async def update_consent(patch: ConsentPatch, athlete_id: str = AthleteId) -> dict[str, Any]:
        store.update_consent(athlete_id, patch.model_dump(exclude_none=True))
        await push_settings()
        return store.snapshot()["consents"].get(athlete_id, {})

    @app.put("/api/plans/{athlete_id}")
    async def save_plan(plan: PlanIn, athlete_id: str = AthleteId) -> dict[str, str]:
        steps = [step.model_dump() for step in plan.steps]
        store.save_plan(athlete_id, plan.status, steps, plan.notes)
        await push_settings()
        return {"status": plan.status}

    @app.put("/api/notes/{review_key}")
    async def save_note(note: NoteIn, review_key: str = ReviewKey) -> dict[str, str]:
        saved_at = store.save_note(review_key, note.text)
        await push_settings()
        return {"text": note.text, "savedAt": saved_at}

    @app.put("/api/shared/{review_key}")
    async def set_shared(body: SharedIn, review_key: str = ReviewKey) -> dict[str, bool]:
        store.set_shared(review_key, body.shared)
        await push_settings()
        return {"shared": body.shared}

    @app.post("/api/system/calibration")
    async def calibrated() -> dict[str, str]:
        stamp = clock_stamp()
        store.set_meta("calibration_at", stamp)
        await push_settings()
        return {"calibrationAt": stamp}

    @app.post("/api/system/sync")
    async def request_sync() -> dict[str, bool]:
        store.set_meta("sync_waiting", "1")
        await push_settings()
        return {"syncWaiting": True}

    @app.post("/api/live/toggle")
    async def live_toggle() -> dict[str, Any]:
        clock.toggle_running()
        await push_live()
        return clock.snapshot()

    @app.post("/api/live/speed")
    async def live_speed(body: SpeedIn) -> dict[str, Any]:
        clock.set_speed(body.speed)
        await push_live()
        return clock.snapshot()

    @app.post("/api/live/end")
    async def live_end() -> dict[str, Any]:
        clock.end()
        await push_live()
        return clock.snapshot()

    @app.post("/api/live/seen/{alert_id}")
    async def live_seen(alert_id: str = PathParam(max_length=64)) -> dict[str, Any]:
        clock.mark_seen(alert_id)
        await push_live()
        return clock.snapshot()

    @app.post("/api/demo/reset")
    async def reset_demo() -> dict[str, Any]:
        store.reset()
        clock.reset()
        await push_settings()
        await push_live()
        return {"settings": store.snapshot(), "live": clock.snapshot()}

    @app.get("/api/join")
    async def join() -> dict[str, str]:
        url = join_url(port)
        return {"url": url, "svg": qr_svg(url)}

    @app.websocket("/ws")
    async def socket(ws: WebSocket) -> None:
        await ws.accept()
        hub.sockets.add(ws)
        try:
            await ws.send_json(
                {"type": "hello", "settings": store.snapshot(), "live": clock.snapshot()}
            )
            # Screens only listen; changes come in over REST. Reading keeps the socket open
            # and notices when the screen goes away.
            while True:
                await ws.receive_text()
        except WebSocketDisconnect:
            pass
        finally:
            hub.sockets.discard(ws)

    if dist_dir is not None:
        mount_frontend(app, Path(dist_dir))

    return app


def mount_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the built React app, so phones on the Wi-Fi need only one address."""
    root = dist.resolve()
    index = root / "index.html"

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404)
        file = (root / path).resolve()
        if path and file.is_file() and file.is_relative_to(root):
            return FileResponse(file)
        # Client-side routes like /coach/live all load the app's index page.
        return FileResponse(index)
