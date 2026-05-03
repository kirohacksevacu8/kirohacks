from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from typing import Optional
from uuid import uuid4

from backend.models.schemas import SimulationResponse


@dataclass
class SimulationJob:
    job_id: str
    total_runs: int
    phase: str = "queued"
    runs_completed: int = 0
    eta_seconds: float = 0.0
    state: str = "queued"
    error: Optional[str] = None
    http_status: int = 500
    result: Optional[SimulationResponse] = None
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


class SimulationJobStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._jobs: dict[str, SimulationJob] = {}

    def create(self, total_runs: int) -> SimulationJob:
        job = SimulationJob(job_id=uuid4().hex, total_runs=total_runs)
        with self._lock:
            self._jobs[job.job_id] = job
        return job

    def update_progress(self, job_id: str, runs_completed: int, total_runs: int, phase: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            if job.started_at is None:
                job.started_at = time.time()
            job.state = "running"
            job.phase = phase
            job.runs_completed = runs_completed
            job.total_runs = total_runs
            elapsed = max(time.time() - job.started_at, 0.001)
            rate = runs_completed / elapsed if runs_completed > 0 else 0.0
            remaining = max(total_runs - runs_completed, 0)
            job.eta_seconds = remaining / rate if rate > 0 else 0.0

    def complete(self, job_id: str, result: SimulationResponse) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.state = "complete"
            job.phase = "complete"
            job.runs_completed = job.total_runs
            job.eta_seconds = 0.0
            job.result = result
            job.completed_at = time.time()

    def fail(self, job_id: str, error: str, http_status: int = 500) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.state = "failed"
            job.phase = "failed"
            job.error = error
            job.http_status = http_status
            job.completed_at = time.time()

    def get(self, job_id: str) -> Optional[SimulationJob]:
        with self._lock:
            return self._jobs.get(job_id)

    def clear(self) -> None:
        with self._lock:
            self._jobs.clear()


job_store = SimulationJobStore()
