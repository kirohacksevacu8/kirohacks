# evacu8

Wildfire evacuation intelligence for fast-moving incidents.

`evacu8` combines wildfire spread simulation, evacuation routing, seeded regional data, and an operator-facing map UI into one workflow. The goal is simple: help teams compare fire risk, road viability, shelter routing, and evacuation priority before the plan goes stale.

Built by Tohar, Vinayak, Leon, and Sai.

## Why It Exists

Static evacuation plans break when wind, road closures, and fire arrival times change. `evacu8` turns those moving pieces into a command-center view:

| Signal | What evacu8 shows |
| --- | --- |
| Fire behavior | Monte Carlo burn probability and arrival-time statistics |
| Evacuation zones | Population, priority score, cutoff time, and failure risk |
| Routes | Baseline paths, route viability, travel time, and shelter destination |
| Wind | Manual inputs, mock live wind, and a backend NWS wind client |
| Regions | Seeded California regions plus a real-data ingestion pipeline |

## Demo Fast Path

The frontend defaults to mock API mode, so the UI can be shown without a running backend.

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open the Vite URL, launch the command center, run the simulation, and use the map layers/results panel to explore routes, burn probability, and evacuation ordering.

Optional: add a Mapbox token in `frontend/.env` for the full terrain basemap.

```bash
VITE_MAPBOX_TOKEN=your_token_here
VITE_API_MODE=mock
```

## Backend CLI

The Python backend can run the seeded simulation pipeline and write compact JSON results.

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r backend/requirements.txt

python3 backend/main.py \
  --seed-dir backend/data/seed/paradise-ca \
  --lat 39.7596 \
  --lon -121.6219 \
  --wind-speed 24 \
  --wind-dir 225 \
  --wind-gust 38 \
  --humidity 14 \
  --num-runs 500 \
  --max-timesteps 180 \
  --output results
```

Output lands at:

```text
results/simulation_results.json
```

The response includes region metadata, wind inputs, burn probability grid, arrival-time percentiles, zone results, evacuation ordering, and summary statistics.

## Regional Data

Bundled seed regions live in `backend/data/seed/`:

```text
big-sur-ca
malibu-ca
paradise-ca
san-bernardino-ca
santa-rosa-ca
south-lake-tahoe-ca
```

Each region uses the same dataset contract:

```text
region_config.json
grid_bounds.json
fuel_grid.npy
road_graph.json
zones.geojson
shelters.json
scenario_presets.json
*_perimeter.geojson   # optional
```

You can generate another region with the ingestion command. It pulls together regional bounds, fuel, roads, zones, shelters, optional fire perimeter data, and scenario presets.

```bash
python3 backend/main.py ingest \
  --lat 34.0259 \
  --lon -118.7798 \
  --radius 10 \
  --fire-name "Woolsey"
```

Ingestion currently supports US coordinates only.

## Frontend

The app is a React + TypeScript + Vite command center with:

- Deck.gl and Mapbox map rendering
- Burn probability heatmap
- Zone urgency overlays
- Shelter and ignition markers
- Route paths and route viability styling
- Manual wind controls and mock live wind
- Monte Carlo run progress
- Quick compare with a shifted wind direction
- Results panel with route intelligence and evacuation ordering

Useful commands:

```bash
cd frontend
npm run dev
npm run build
npm run lint
npm run test
```

API mode is controlled through `frontend/.env`:

```bash
VITE_API_MODE=mock
VITE_API_BASE_URL=http://localhost:8000
VITE_MAPBOX_TOKEN=
```

Set `VITE_API_MODE=live` only when a compatible backend API is running.

## Backend

The backend is Python with NumPy, NetworkX, Pydantic, Shapely, GeoPandas, Rasterio, FastAPI dependencies, and a CLI entry point.

Core modules:

```text
backend/main.py                 CLI simulation and ingestion entry point
backend/simulation/fire_spread.py
backend/monte_carlo/engine.py
backend/evacuation/router.py
backend/data/loader.py
backend/data/wind_client.py
backend/data/ingest/
backend/models/schemas.py
```

Useful commands:

```bash
python3 -m pytest backend/tests -q
python3 backend/main.py --help
python3 backend/main.py ingest --help
```

## Live API Contract

The frontend live client is already wired for these endpoints:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/scenarios?region=paradise-ca` | Load scenario presets |
| `GET` | `/api/wind?lat=...&lon=...` | Fetch wind conditions |
| `POST` | `/api/simulate` | Start or run a simulation |
| `GET` | `/api/results/{job_id}` | Poll async simulation results |

Current state: the frontend adapter exists, but `backend/api/` does not yet expose the FastAPI app/routes. Use mock mode for the UI demo, or the CLI for real backend simulation output.

## Project Map

```text
.
|-- backend/
|   |-- data/
|   |   |-- ingest/
|   |   `-- seed/
|   |-- evacuation/
|   |-- models/
|   |-- monte_carlo/
|   |-- simulation/
|   |-- tests/
|   |-- main.py
|   `-- requirements.txt
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- components/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- services/
|   |   |-- stores/
|   |   `-- types/
|   |-- package.json
|   `-- vite.config.ts
|-- prompts/
|-- LICENSE
`-- README.md
```

## Status

| Area | Status |
| --- | --- |
| Frontend mock demo | Ready |
| Frontend live API client | Wired |
| Backend CLI simulation | Ready |
| Seed data loader | Ready |
| Monte Carlo fire spread | Ready |
| Baseline evacuation routing | Ready |
| Optimized routing primitives | In progress |
| FastAPI routes | Not yet implemented |
| Full frontend-to-backend live integration | Pending FastAPI routes |

## License

MIT. See `LICENSE`.
