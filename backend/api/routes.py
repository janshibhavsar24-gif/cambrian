"""
FastAPI routes — REST + WebSocket interface to the Cambrian engine.
"""

import asyncio
import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from backend.core.engine import run, RunConfig, Event

app = FastAPI(title="Cambrian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory store of active runs: run_id → list of buffered events
_runs: dict[str, list[dict]] = {}


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


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
