"""Run the edge server: `uv run matmetrics-edge` from the server folder."""

import argparse
from pathlib import Path

import uvicorn

from edge.main import create_app
from edge.network import join_url

REPO = Path(__file__).resolve().parents[2]


def main() -> None:
    parser = argparse.ArgumentParser(description="MatMetrics edge server")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--db", default=str(REPO / "server" / "matmetrics.db"))
    parser.add_argument("--dist", default=str(REPO / "dist"), help="built frontend to serve")
    args = parser.parse_args()

    dist = Path(args.dist)
    if not (dist / "index.html").is_file():
        print(f"No built frontend in {dist}. Run `npm run build` in the repo root first.")
        dist = None

    app = create_app(db_path=args.db, dist_dir=dist, port=args.port)
    if dist:
        print(f"\n  Coach screen:   http://localhost:{args.port}/coach/live")
        print(f"  Phones on Wi-Fi: {join_url(args.port)}\n")
    # 0.0.0.0 so phones on the same Wi-Fi can connect, not only this laptop.
    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
