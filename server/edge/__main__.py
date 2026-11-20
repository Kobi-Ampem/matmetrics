"""Run the edge server: `uv run matmetrics-edge` from the server folder."""

import argparse
import asyncio
import urllib.request
from pathlib import Path

import uvicorn

from edge.main import create_app
from edge.network import join_url, lan_ip
from edge.tls import ensure_certificate

REPO = Path(__file__).resolve().parents[2]
SERVER = REPO / "server"
WASM_DIR = REPO / "node_modules" / "@mediapipe" / "tasks-vision" / "wasm"
MODEL_PATH = SERVER / "models" / "pose_landmarker_lite.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
)


def fetch_model() -> None:
    """Download the pose model once, while there is internet, so the club never needs it."""
    if MODEL_PATH.is_file():
        return
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    print("Downloading the pose model (about 5 MB, first run only)...")
    try:
        partial = MODEL_PATH.with_suffix(".part")
        urllib.request.urlretrieve(MODEL_URL, partial)
        partial.rename(MODEL_PATH)
    except OSError as error:
        print(f"Could not download the pose model ({error}). Camera phones will not work offline.")


def main() -> None:
    parser = argparse.ArgumentParser(description="MatMetrics edge server")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--https-port", type=int, default=8443, help="for camera phones")
    parser.add_argument("--db", default=str(SERVER / "matmetrics.db"))
    parser.add_argument("--dist", default=str(REPO / "dist"), help="built frontend to serve")
    args = parser.parse_args()

    dist = Path(args.dist)
    if not (dist / "index.html").is_file():
        print(f"No built frontend in {dist}. Run `npm run build` in the repo root first.")
        dist = None
    if not WASM_DIR.is_dir():
        print("MediaPipe files missing. Run `npm install` in the repo root first.")
    fetch_model()

    ip = lan_ip()
    cert, key = ensure_certificate(SERVER / "certs", ip)
    app = create_app(
        db_path=args.db,
        dist_dir=dist,
        port=args.port,
        https_port=args.https_port,
        wasm_dir=WASM_DIR,
        model_path=MODEL_PATH,
    )
    if dist:
        print(f"\n  Coach screen:    http://localhost:{args.port}/coach/live")
        print(f"  Athlete phones:  {join_url(args.port)}")
        print(f"  Camera phones:   https://{ip}:{args.https_port}/camera\n")

    # 0.0.0.0 so phones on the same Wi-Fi can connect, not only this laptop. Two listeners:
    # plain HTTP for the coach and athlete screens, HTTPS for phones that use their camera.
    common = {"host": "0.0.0.0", "log_level": "warning"}
    servers = [
        uvicorn.Server(uvicorn.Config(app, port=args.port, **common)),
        uvicorn.Server(
            uvicorn.Config(
                app,
                port=args.https_port,
                ssl_certfile=str(cert),
                ssl_keyfile=str(key),
                **common,
            )
        ),
    ]

    async def serve() -> None:
        await asyncio.gather(*(server.serve() for server in servers))

    asyncio.run(serve())


if __name__ == "__main__":
    main()
