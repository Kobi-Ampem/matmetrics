"""FastAPI app: REST for changes, one WebSocket that pushes every change to every screen."""

import asyncio
import contextlib
import json
import mimetypes
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Any, Literal

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import Path as PathParam
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from edge import __version__
from edge.cameras import CameraRoom
from edge.live import CameraMode, LiveClock, Speed
from edge.network import join_url, lan_ip, qr_svg
from edge.store import Store, clock_stamp

# Older Pythons do not know the .wasm type, and browsers refuse to stream WASM without it.
mimetypes.add_type("application/wasm", ".wasm")

AthleteId = PathParam(pattern=r"^a\d{2}$")
CameraId = PathParam(pattern=r"^cam[1-4]$")
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


class CameraModeIn(BaseModel):
    mode: CameraMode


# One person: 17 keypoints in COCO order, each (x, y, visibility) from 0 to 1.
Person = Annotated[list[tuple[float, float, float]], Field(min_length=17, max_length=17)]


class CameraFrameIn(BaseModel):
    people: list[Person] = Field(max_length=2)
    # A small JPEG as a data URL, or None when the phone sends keypoints only.
    image: str | None = Field(default=None, max_length=400_000, pattern=r"^data:image/jpeg;base64,")
    width: int = Field(ge=1, le=4096)
    height: int = Field(ge=1, le=4096)


class Hub:
    """Every open WebSocket, so one change can be pushed to all screens."""

    def __init__(self) -> None:
        self.sockets: set[WebSocket] = set()
        # Screens that asked for camera video. Only the coach's live page does, so athlete
        # phones are not sent four video streams they never show.
        self.watchers: set[WebSocket] = set()

    async def send_all(self, message: dict[str, Any]) -> None:
        await self._send(self.sockets, message)

    async def send_watchers(self, message: dict[str, Any]) -> None:
        await self._send(self.watchers, message)

    async def _send(self, targets: set[WebSocket], message: dict[str, Any]) -> None:
        for socket in list(targets):
            try:
                await socket.send_json(message)
            except (WebSocketDisconnect, RuntimeError, OSError):
                # The screen closed (tab shut, phone locked); stop sending to it.
                self.sockets.discard(socket)
                self.watchers.discard(socket)


def create_app(
    db_path: Path | str = "matmetrics.db",
    dist_dir: Path | str | None = None,
    tick_seconds: float = 1.0,
    port: int = 8000,
    https_port: int | None = None,
    wasm_dir: Path | str | None = None,
    model_path: Path | str | None = None,
) -> FastAPI:
    store = Store(db_path)
    clock = LiveClock()
    hub = Hub()
    room = CameraRoom(clock)
    # The app runs once per listening port (HTTP and HTTPS), so start-up and shut-down are
    # counted to start the clock once and close the database once.
    running = {"count": 0, "task": None}

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
        running["count"] += 1
        if running["count"] == 1 and tick_seconds > 0:
            running["task"] = asyncio.create_task(run_clock())
        yield
        running["count"] -= 1
        if running["count"] > 0:
            return
        task = running["task"]
        if task:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task
        store.close()

    app = FastAPI(title="MatMetrics edge server", version=__version__, lifespan=lifespan)
    app.state.store = store
    app.state.clock = clock
    app.state.room = room

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

    @app.post("/api/live/cameras")
    async def live_cameras(body: CameraModeIn) -> dict[str, Any]:
        clock.set_camera_mode(body.mode)
        await push_live()
        return clock.snapshot()

    @app.get("/api/cameras")
    async def cameras() -> dict[str, Any]:
        return {"online": room.status(), "alerts": room.alerts}

    @app.post("/api/cameras/{cam_id}/frame")
    async def camera_frame(body: CameraFrameIn, cam_id: str = CameraId) -> dict[str, Any]:
        changed = room.frame(cam_id, [list(person) for person in body.people])
        await hub.send_watchers(
            {
                "type": "frame",
                "cam": cam_id,
                "people": body.people,
                "image": body.image,
                "width": body.width,
                "height": body.height,
            }
        )
        for alert in changed:
            await hub.send_all({"type": "alert", "alert": alert})
        return {"alerts": len(changed)}

    @app.post("/api/live/seen/{alert_id}")
    async def live_seen(alert_id: str = PathParam(max_length=64)) -> dict[str, Any]:
        clock.mark_seen(alert_id)
        await push_live()
        return clock.snapshot()

    @app.post("/api/demo/reset")
    async def reset_demo() -> dict[str, Any]:
        store.reset()
        clock.reset()
        room.reset()
        await push_settings()
        await push_live()
        return {"settings": store.snapshot(), "live": clock.snapshot()}

    @app.get("/api/join")
    async def join() -> dict[str, str | None]:
        url = join_url(port)
        camera = f"https://{lan_ip()}:{https_port}/camera" if https_port else None
        return {
            "url": url,
            "svg": qr_svg(url),
            "cameraUrl": camera,
            "cameraSvg": qr_svg(camera) if camera else None,
        }

    @app.websocket("/ws")
    async def socket(ws: WebSocket) -> None:
        await ws.accept()
        hub.sockets.add(ws)
        try:
            await ws.send_json(
                {
                    "type": "hello",
                    "settings": store.snapshot(),
                    "live": clock.snapshot(),
                    "alerts": room.alerts,
                }
            )
            # Changes come in over REST. The only message a screen sends is whether it wants
            # camera video; reading also notices when the screen goes away.
            while True:
                message = await ws.receive_text()
                with contextlib.suppress(ValueError, AttributeError):
                    if json.loads(message).get("watchCameras"):
                        hub.watchers.add(ws)
                    else:
                        hub.watchers.discard(ws)
        except WebSocketDisconnect:
            pass
        finally:
            hub.sockets.discard(ws)
            hub.watchers.discard(ws)

    # The pose model, served from the edge unit so camera phones need no internet.
    if wasm_dir is not None and Path(wasm_dir).is_dir():
        app.mount("/mediapipe/wasm", StaticFiles(directory=wasm_dir), name="wasm")
    if model_path is not None:
        model = Path(model_path)

        @app.get("/mediapipe/pose_landmarker_lite.task", include_in_schema=False)
        async def pose_model() -> FileResponse:
            if not model.is_file():
                raise HTTPException(status_code=404)
            return FileResponse(model, media_type="application/octet-stream")

    if dist_dir is not None:
        mount_frontend(app, Path(dist_dir))

    return app


def mount_frontend(app: FastAPI, dist: Path) -> None:
    """Serve the built React app, so phones on the Wi-Fi need only one address."""
    root = dist.resolve()
    index = root / "index.html"

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend(path: str) -> FileResponse:
        if path.startswith(("api/", "mediapipe/")):
            raise HTTPException(status_code=404)
        file = (root / path).resolve()
        if path and file.is_file() and file.is_relative_to(root):
            return FileResponse(file)
        # Client-side routes like /coach/live all load the app's index page.
        return FileResponse(index)
