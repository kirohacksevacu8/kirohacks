from __future__ import annotations

import os
import threading

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from backend.api.jobs import job_store
from backend.api.services.simulation_service import fetch_wind, list_scenarios, run_simulation
from backend.data.loader import SeedDataError
from backend.models.schemas import (
    SimulationAcceptedResponse,
    SimulationProgressResponse,
    SimulationRequest,
    SimulationResultEnvelope,
    WindResponse,
)


def _cors_origins() -> list[str]:
    configured = os.getenv("CORS_ALLOW_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]


def _cors_origin_regex() -> str | None:
    configured = os.getenv("CORS_ALLOW_ORIGIN_REGEX")
    if configured is not None:
        return configured or None

    if os.getenv("CORS_ALLOW_ORIGINS"):
        return None

    return r"https://.*\.vercel\.app"


app = FastAPI(title="EvacuAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_origin_regex=_cors_origin_regex(),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/scenarios")
def get_scenarios(region: str = Query("paradise-ca", min_length=1)):
    try:
        scenarios = list_scenarios(region=region)
    except SeedDataError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return [scenario.model_dump() for scenario in scenarios]


@app.get("/api/wind", response_model=WindResponse)
def get_wind(
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
):
    return fetch_wind(lat, lon)


@app.post("/api/simulate", status_code=202, response_model=SimulationAcceptedResponse)
def simulate(request: SimulationRequest):
    try:
        # Validate the requested seed directory up front so the frontend gets a fast 404.
        run_simulation_request_precheck(request)
    except SeedDataError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    job = job_store.create(total_runs=request.num_runs)

    def worker() -> None:
        try:
            result = run_simulation(
                request,
                progress_callback=lambda completed, total, phase: job_store.update_progress(
                    job.job_id,
                    completed,
                    total,
                    phase,
                ),
            )
        except SeedDataError as exc:
            job_store.fail(job.job_id, str(exc), http_status=404)
            return
        except ValueError as exc:
            job_store.fail(job.job_id, str(exc), http_status=422)
            return
        except Exception as exc:  # pragma: no cover - protective fallback
            job_store.fail(job.job_id, str(exc), http_status=500)
            return

        job_store.complete(job.job_id, result)

    threading.Thread(target=worker, daemon=True).start()
    return SimulationAcceptedResponse(
        job_id=job.job_id,
        status="queued",
        total_runs=request.num_runs,
    )


@app.get("/api/results/{job_id}")
def get_results(job_id: str):
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found. It may have expired.")

    if job.state == "failed":
        raise HTTPException(status_code=job.http_status, detail=job.error or "Simulation failed.")

    if job.state != "complete" or job.result is None:
        progress = SimulationProgressResponse(
            job_id=job.job_id,
            status=job.phase,
            runs_completed=job.runs_completed,
            total_runs=job.total_runs,
            eta_seconds=round(job.eta_seconds, 1),
        )
        return _model_json_response(status_code=202, model=progress)

    complete = SimulationResultEnvelope(
        job_id=job.job_id,
        status="complete",
        result=job.result,
    )
    return _model_json_response(status_code=200, model=complete)


def _model_json_response(*, status_code: int, model: BaseModel) -> Response:
    return Response(
        status_code=status_code,
        content=model.model_dump_json(),
        media_type="application/json",
    )


def run_simulation_request_precheck(request: SimulationRequest) -> None:
    from backend.api.services.simulation_service import resolve_seed_dir

    resolve_seed_dir(seed_dir=request.seed_dir)
