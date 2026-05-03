# Backend to Frontend Wiring Guide

This repo is already close to being wireable:

- The frontend has a live API client in `frontend/src/services/liveApiClient.ts`.
- The frontend types already mirror the backend schemas in `frontend/src/types/api.ts` and `backend/models/schemas.py`.
- The backend already has the simulation engine, seed-data loader, and wind client.

The main missing piece is the HTTP API layer.

## Current Contract the Frontend Already Expects

The frontend live client is already coded to call these endpoints:

1. `GET /api/scenarios?region=paradise-ca`
2. `GET /api/wind?lat=<lat>&lon=<lon>`
3. `POST /api/simulate`
4. `GET /api/results/{job_id}`

Those calls come from `frontend/src/services/liveApiClient.ts`.

## Step 1: Keep One Shared Request/Response Contract

Before adding HTTP routes, keep the backend and frontend aligned on the same payload shapes:

- Backend request model: `backend/models/schemas.py -> SimulationRequest`
- Backend response model: `backend/models/schemas.py -> SimulationResponse`
- Frontend request type: `frontend/src/types/api.ts -> SimulationRequest`
- Frontend response type: `frontend/src/types/api.ts -> SimulationResponse`

What to check:

- Field names must stay identical.
- Number ranges should match on both sides.
- Optional fields should mean the same thing on both sides.

Repo-specific mismatch to fix:

- The frontend currently validates `num_runs` as `50-1000` in `frontend/src/hooks/useSimulation.ts`.
- The backend schema currently allows `1-2000` in `backend/models/schemas.py`.

Pick one rule and make both sides match before wiring the live flow.

## Step 2: Extract the Simulation Logic Into a Reusable Backend Service

Right now the core run path lives inside `backend/main.py` in `_run_simulation(args)`.

Before wiring FastAPI, move that logic into a shared function so both the CLI and API can use it.

Suggested new file:

- `backend/api/services/simulation_service.py`

Suggested function shape:

```python
from backend.models.schemas import SimulationRequest, SimulationResponse

def run_simulation(request: SimulationRequest) -> SimulationResponse:
    ...
```

What that function should do:

1. Resolve `seed_dir`
2. Load region data with `SeedDataLoader`
3. Run `FireSpreadEngine` and `MonteCarloEngine`
4. Build routes with `EvacuationRouter`
5. Return a `SimulationResponse`

Why this matters:

- The CLI in `backend/main.py` stays usable.
- The API route does not duplicate business logic.
- Future tests only need to validate one simulation path.

## Step 3: Create the FastAPI App

There is no actual FastAPI app file in `backend/api` yet, even though `fastapi` and `uvicorn` are already in `backend/requirements.txt`.

Create a new entrypoint such as:

- `backend/api/app.py`

Suggested structure:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="EvacuAI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Why CORS is required:

- Vite runs the frontend on `http://localhost:5173`
- The backend will likely run on `http://localhost:8000`
- Without CORS, browser requests from the frontend will fail

## Step 4: Add `GET /api/scenarios`

The frontend loads scenarios on app startup in `frontend/src/App.tsx`.

Implement:

- `GET /api/scenarios?region=paradise-ca`

What it should do:

1. Read the `region` query param
2. Map it to a seed directory like `backend/data/seed/<region>/`
3. Use `SeedDataLoader(...).load_scenario_presets()`
4. Return `list[ScenarioPreset]`

Suggested behavior:

- Default `region` to `paradise-ca`
- Return `404` if the region folder does not exist
- Return `500` only for real server failures

## Step 5: Add `GET /api/wind`

The frontend uses this when the user asks for live wind in `frontend/src/hooks/useSimulation.ts`.

Implement:

- `GET /api/wind?lat=<lat>&lon=<lon>`

What it should do:

1. Validate `lat` and `lon`
2. Call `NWSWindClient().fetch(lat, lon)`
3. Return:

```json
{
  "conditions": {
    "wind_speed_mph": 10,
    "wind_direction_deg": 225,
    "wind_gust_mph": 20,
    "relative_humidity": 20
  },
  "source": "nws_live"
}
```

Important repo detail:

- `backend/data/wind_client.py` already falls back to default wind values if NWS fails.
- That means this endpoint can stay resilient even before adding caching or retries.

## Step 6: Add `POST /api/simulate`

The frontend sends a `SimulationRequest` from `frontend/src/hooks/useSimulation.ts`.

Implement:

- `POST /api/simulate`

Request body should match:

```json
{
  "ignition_lat": 39.8103,
  "ignition_lon": -121.4377,
  "wind_speed_mph": 25,
  "wind_direction_deg": 45,
  "wind_gust_mph": 40,
  "relative_humidity": 10,
  "num_runs": 500,
  "max_timesteps": 180,
  "scenario_preset": "Fast Wind Shift"
}
```

You have two valid implementation options.

### Option A: Start Synchronous First

Return `200 OK` with the full `SimulationResponse`.

Why this is a good first step:

- The frontend already supports immediate `200` responses.
- It is the fastest path to get real data on the screen.
- You can prove the contract before adding job polling.

### Option B: Add Async Jobs for Progress Polling

Return `202 Accepted` with a job payload:

```json
{
  "job_id": "abc123",
  "status": "running",
  "total_runs": 500
}
```

This matches the polling flow already implemented in `frontend/src/services/liveApiClient.ts`.

If you choose async, the route should:

1. Create a job id
2. Store job state in memory
3. Start the simulation in a background task
4. Update `runs_completed` as work progresses
5. Save the final `SimulationResponse`

## Step 7: Add `GET /api/results/{job_id}` If You Use Async Jobs

The frontend polls this endpoint every second when `POST /api/simulate` returns `202`.

Implement:

- `GET /api/results/{job_id}`

Return `202` while running:

```json
{
  "job_id": "abc123",
  "status": "running",
  "runs_completed": 240,
  "total_runs": 500,
  "eta_seconds": 12
}
```

Return `200` when complete:

```json
{
  "job_id": "abc123",
  "status": "complete",
  "result": { "...full SimulationResponse..." }
}
```

Return `404` when the job id is unknown or expired.

Important frontend behavior:

- `frontend/src/services/liveApiClient.ts` already handles `404`
- It also handles `500` with one retry
- It times out polling after 60 seconds

## Step 8: Keep Region Resolution Simple

The easiest way to wire regions is to treat the seed folder as the source of truth.

Suggested mapping:

- `paradise-ca` -> `backend/data/seed/paradise-ca/`
- `malibu-ca` -> `backend/data/seed/malibu-ca/`
- `santa-rosa-ca` -> `backend/data/seed/santa-rosa-ca/`
- and so on

Good rule:

- If the request contains `seed_dir`, prefer it only for trusted internal use
- For public API calls, prefer a safe `region` slug and map it server-side

That avoids exposing arbitrary file paths over the API.

## Step 9: Run the Backend Locally

Install backend dependencies:

```bash
pip install -r backend/requirements.txt
```

Run the API server:

```bash
uvicorn backend.api.app:app --reload --host 0.0.0.0 --port 8000
```

Expected backend base URL:

- `http://localhost:8000`

## Step 10: Switch the Frontend to Live Mode

The frontend currently defaults to mock mode in `frontend/.env.example`.

Set these values in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_API_MODE=live
VITE_MAPBOX_TOKEN=
```

Then start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Expected frontend URL:

- `http://localhost:5173`

## Step 11: Verify the Wiring End to End

Run this checklist in order:

1. Open the frontend and confirm the app loads without CORS errors
2. Confirm scenario presets load on startup
3. Toggle live wind and confirm `GET /api/wind` updates the UI
4. Run a simulation and confirm the request reaches `POST /api/simulate`
5. Confirm results render in the map and results panel
6. If using async jobs, confirm polling hits `GET /api/results/{job_id}`
7. Confirm invalid request values return `422` and show field errors in the UI

## Step 12: Add a Small Backend Test Layer

Once the routes exist, add API tests for the contract the frontend depends on.

Suggested test coverage:

1. `GET /api/scenarios` returns a non-empty array for `paradise-ca`
2. `GET /api/wind` returns `conditions` plus `source`
3. `POST /api/simulate` accepts a valid request
4. Invalid request payloads return `422`
5. `GET /api/results/{job_id}` returns `404` for unknown jobs

Use `fastapi.testclient.TestClient` for this.

## Repo-Specific Notes

- `backend/api/__init__.py` exists, but there is no API server file yet.
- `backend/data/loader.py` is already the right place to load scenarios and seed data.
- `backend/data/wind_client.py` is already the right place to source live wind.
- `frontend/src/services/api.ts` switches between mock and live mode based on `VITE_API_MODE`.
- `frontend/src/services/liveApiClient.ts` already supports both synchronous `200` responses and async `202` polling.
- `frontend/src/features/map/MapView.tsx` expects route coordinates from the backend in `[lat, lon]` order and converts them to `[lon, lat]` for rendering, so keep that backend format consistent.

## Recommended Implementation Order

If you want the shortest path to a working demo, build it in this order:

1. Extract shared simulation logic from `backend/main.py`
2. Create `backend/api/app.py`
3. Add CORS
4. Add `GET /api/scenarios`
5. Add `GET /api/wind`
6. Add synchronous `POST /api/simulate`
7. Switch `frontend/.env` to `VITE_API_MODE=live`
8. Verify the full flow
9. Only then add async job polling if you still need progress updates

That sequence gets real backend data into the UI with the least risk.
