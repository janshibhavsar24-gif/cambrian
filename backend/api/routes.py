"""
FastAPI routes — REST + WebSocket interface to the Cambrian engine.
"""

import json
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from backend.core.engine import run, RunConfig, Event

app = FastAPI(title="Cambrian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


PROJECT_ROOT = Path(__file__).parent.parent.parent
REPORTS_DIR = (PROJECT_ROOT / "reports").resolve()


@app.get("/api/report")
def get_report(path: str) -> PlainTextResponse:
    """Return the markdown content of a report file by path."""
    report_path = (PROJECT_ROOT / path).resolve()
    if not str(report_path).startswith(str(REPORTS_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
    if not report_path.exists() or not report_path.is_file():
        raise HTTPException(status_code=404, detail="Report not found")
    return PlainTextResponse(report_path.read_text())


@app.websocket("/ws/run")
async def run_websocket(websocket: WebSocket) -> None:
    """
    WebSocket endpoint. Client sends a JSON message to start a run:
        {"problem": "...", "generations": 3}

    Server streams events back in real time:
        {"type": "seed",   "data": {...}}
        {"type": "combat", "data": {...}}
        {"type": "cull",   "data": {...}}
        {"type": "evolve", "data": {...}}
        {"type": "done",   "data": {...}}
        {"type": "report", "data": {"path": "reports/cambrian_*.md"}}
        {"type": "error",  "data": {"message": "..."}}
    """
    await websocket.accept()

    try:
        raw = await websocket.receive_text()
        payload = json.loads(raw)
        problem = payload.get("problem", "").strip()
        generations = int(payload.get("generations", 3))

        if not problem:
            await websocket.send_json({"type": "error", "data": {"message": "problem is required"}})
            return

        async def on_event(event: Event) -> None:
            await websocket.send_json({"type": event.type, "data": event.data})

        config = RunConfig(problem=problem, generations=generations)
        population, log, report_path = await run(config, on_event)

        await websocket.send_json({
            "type": "report",
            "data": {"path": str(report_path)},
        })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "data": {"message": str(e)}})
        except Exception:
            pass
