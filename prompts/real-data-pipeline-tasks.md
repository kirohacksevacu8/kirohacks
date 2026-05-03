# EvacuAI Real Data Pipeline — Task Breakdown

> Replaces synthetic seed data with real data from public APIs for any US region.
> Reviewed and corrected — ready for implementation.

---

## Overview

The pipeline takes a `(lat, lon, radius_km)` input and generates a complete seed data directory that plugs directly into the existing `SeedDataLoader`. Each task is a standalone Python module in `backend/data/ingest/`.

### Architecture

```
backend/data/ingest/
├── __init__.py
├── fuel.py           # Task 1 — LANDFIRE fuel grid
├── roads.py          # Task 2 — OSM road network
├── zones.py          # Task 3 — Census zones + demographics
├── shelters.py       # Task 4 — Shelter locations
├── perimeters.py     # Task 5 — Active fire perimeters
├── region.py         # Task 6 — Region config + grid bounds
├── scenarios.py      # Task 7 — Scenario presets
├── orchestrator.py   # Task 8 — Ties everything together
└── overpass.py       # Shared Overpass rate limiter (used by Tasks 2 + 4)
```

### Dependency Graph

```
Task 6 (region config + grid bounds)
  ├── Task 1 (fuel grid)        — needs grid_rows, grid_cols from Task 6
  ├── Task 2 (roads)            — needs bbox from Task 6
  ├── Task 3 (census zones)     — needs bbox from Task 6
  ├── Task 4 (shelters)         — needs bbox from Task 6, serialized after Task 2 (shared Overpass)
  ├── Task 5 (fire perimeters)  — needs bbox from Task 6, patches region_config.json on success
  └── Task 7 (scenario presets) — needs bbox from Task 6
```

---

## Task 1 — LANDFIRE Fuel Grid Fetcher

**File:** `backend/data/ingest/fuel.py`
**Complexity:** L

### Description

Fetch LANDFIRE FBFM40 (Fire Behavior Fuel Model 40) raster data for a bounding box and convert it to a NumPy fuel grid compatible with the Rothermel fire spread engine.

### Data Source

- **LANDFIRE Product Service (LPS)** — `https://lfps.usgs.gov/arcgis/rest/services/LandfireProductService/GPServer/LandfireProductService`
- Free, no auth required. Async job-based API.
- Rate limits: undocumented but generally 1 concurrent job per IP.

### API Flow

1. `POST submitJob` with bounding box + product code `FBFM40` + output format `GeoTIFF`
2. Poll `GET jobs/{jobId}` until status = `esriJobSucceeded` (can take 5–15 min)
3. Download result GeoTIFF from `jobs/{jobId}/results/output`

### Input

- `bbox: tuple[float, float, float, float]` — (min_lon, min_lat, max_lon, max_lat)
- `grid_rows: int, grid_cols: int` — target grid dimensions (from Task 6)
- `output_path: Path` — where to write `fuel_grid.npy`

### Output

- `fuel_grid.npy` — float32 array of shape `(grid_rows, grid_cols)`, values 0.0–1.5

### Conversion Logic

1. Download FBFM40 GeoTIFF (integer codes 91–204)
2. Clip to bounding box using `rasterio.mask`
3. Resample to `(grid_rows, grid_cols)` using **nearest-neighbor** resampling (NOT spline — FBFM40 is categorical)
4. Map integer fuel codes → spread rate multipliers via lookup table:

| FBFM40 Code | Fuel Type | Spread Rate |
|---|---|---|
| 91 (NB1 Urban) | Non-burnable | 0.0 |
| 92 (NB2 Snow/Ice) | Non-burnable | 0.0 |
| 93 (NB3 Agriculture) | Non-burnable | 0.0 |
| 98 (NB8 Water) | Non-burnable | 0.0 |
| 99 (NB9 Bare Ground) | Non-burnable | 0.0 |
| 1–10 | Original 13 models | 0.3–1.0 (see FBFM13 table) |
| 101–104 (GR1–GR4) | Grass | 0.4–0.8 |
| 105–109 (GR5–GR9) | Grass | 0.8–1.2 |
| 121–124 (GS1–GS4) | Grass-Shrub | 0.5–0.9 |
| 141–149 (SH1–SH9) | Shrub | 0.6–1.1 |
| 161–165 (TU1–TU5) | Timber-Understory | 0.5–0.9 |
| 181–189 (TL1–TL9) | Timber Litter | 0.3–0.7 |
| 201–204 (SB1–SB4) | Slash-Blowdown | 0.8–1.5 |
| Unknown | Default | 0.5 |

5. Save as `fuel_grid.npy`

### Technical Notes

- **Timeout:** 300s minimum — LANDFIRE jobs are slow.
- **Fallback:** If LANDFIRE is down, generate a synthetic grid using a Perlin noise pattern with mean 0.6 and range 0.0–1.2. Log a warning.
- **Dependency:** `rasterio` (requires GDAL — `brew install gdal` on macOS ARM).

### Dependencies

- Task 6 (needs grid_rows, grid_cols, bbox)

---

## Task 2 — OSM Road Network Fetcher

**File:** `backend/data/ingest/roads.py`
**Complexity:** M

### Description

Fetch road network from OpenStreetMap via Overpass API and convert to a NetworkX graph in node-link format.

### Data Source

- **Overpass API** — `https://overpass-api.de/api/interpreter`
- Free, no auth. Rate limit: slot-based (wait time = previous query duration).

### Overpass Query

```
[out:json][timeout:60];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
);
out body;
>;
out skel qt;
```

### Input

- `bbox: tuple[float, float, float, float]`
- `output_path: Path` — where to write `road_graph.json`

### Output

- `road_graph.json` — NetworkX node-link format with edge attributes:
  - `travel_time: float` — minutes, derived from road length / speed limit
  - `capacity: int` — vehicles/hour, derived from highway type

### Conversion Logic

1. Parse Overpass JSON → extract nodes and ways
2. For each way, create edges between consecutive nodes
3. Compute edge length using Haversine formula
4. Assign speed limits by highway type:
   - motorway: 65 mph, trunk: 55, primary: 45, secondary: 35, tertiary: 25, residential: 25, unclassified: 20
5. `travel_time = (length_miles / speed_mph) * 60` (minutes)
6. Assign capacity by highway type:
   - motorway: 2000, trunk: 1500, primary: 1200, secondary: 800, tertiary: 600, residential: 400, unclassified: 300
7. Build NetworkX DiGraph, export via `nx.node_link_data()`

### Technical Notes

- **Must use shared `OverpassRateLimiter`** (see `overpass.py`) — serialized with Task 4.
- **Fallback:** If Overpass is down, generate a grid graph with ~100 nodes. Log a warning.
- **Edge case:** Disconnected subgraphs are fine — the evacuation router already handles them.

### Dependencies

- Task 6 (needs bbox)

---

## Task 3 — Census Zones + Demographics Fetcher

**File:** `backend/data/ingest/zones.py`
**Complexity:** M

### Description

Fetch census block group geometries from TIGER and demographics from ACS, producing a zones GeoJSON.

### Data Sources

- **TIGER Web Map Service** — `https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_ACS2023/MapServer/10/query`
  - Free, no auth. Layer 10 = Block Groups.
- **Census ACS 5-Year API** — `https://api.census.gov/data/2022/acs/acs5`
  - Free, API key recommended (get at api.census.gov/data/key_signup.html) but works without one at lower rate limits.

### API Flow

1. Query TIGER for block group geometries intersecting the bounding box:
   ```
   GET .../query?geometry={bbox}&geometryType=esriGeometryEnvelope&outFields=GEOID,STATE,COUNTY,BLKGRP&f=geojson&outSR=4326
   ```
2. Extract unique `(STATE, COUNTY)` FIPS pairs from the TIGER response
3. For each unique (state, county) pair, query ACS for demographics:
   ```
   GET /data/2022/acs/acs5?get=B01001_001E,B01001_020E,B01001_021E,B01001_022E,B01001_023E,B01001_024E,B01001_025E,B18101_001E,B18101_004E,B18101_007E&for=block+group:*&in=state:{state_fips}+county:{county_fips}
   ```
4. Join ACS data to TIGER geometries by GEOID

### Input

- `bbox: tuple[float, float, float, float]`
- `output_path: Path`
- `census_api_key: str | None` (optional, from env var `CENSUS_API_KEY`)

### Output

- `zones.geojson` — GeoJSON FeatureCollection with properties:
  - `zone_id: str` — GEOID (e.g. "060070001001")
  - `population: int` — B01001_001E
  - `elderly_pct: float` — sum of 65+ age buckets / total pop × 100
  - `disability_pct: float` — disability estimate / total pop × 100
  - `evacuation_priority_weight: float` — `1.0 + (elderly_pct / 50) + (disability_pct / 25)`
  - `centroid_lat, centroid_lon: float` — computed from geometry centroid

### Technical Notes

- **MultiPolygon handling:** TIGER may return MultiPolygon. Convert to Polygon by keeping the largest polygon by area (using Shapely).
- **Fallback:** If Census API is down, generate 4 rectangular zones covering the bbox with synthetic population data. Log a warning.
- **Non-US regions:** Return empty FeatureCollection with a warning. Census data is US-only.

### Dependencies

- Task 6 (needs bbox)

---

## Task 4 — Shelter Locations Fetcher

**File:** `backend/data/ingest/shelters.py`
**Complexity:** S

### Description

Fetch shelter/refuge locations from OpenStreetMap via Overpass API.

### Data Source

- **Overpass API** — same as Task 2

### Overpass Query

```
[out:json][timeout:30];
(
  node["amenity"~"^(shelter|community_centre|place_of_worship|school)$"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
  node["emergency"="assembly_point"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
  node["building"="civic"]
    ({min_lat},{min_lon},{max_lat},{max_lon});
);
out body;
```

### Input

- `bbox: tuple[float, float, float, float]`
- `output_path: Path`

### Output

- `shelters.json` — JSON array matching the `Shelter` Pydantic schema:
  ```json
  [
    {
      "shelter_id": "osm_12345",
      "name": "First Baptist Church",
      "lat": 39.76,
      "lon": -121.62,
      "capacity": 200,
      "accessible": true
    }
  ]
  ```

### Conversion Logic

1. Parse Overpass response
2. Use `name` tag if present, else `"Shelter at {lat:.4f}, {lon:.4f}"`
3. Estimate capacity from `amenity` type:
   - community_centre: 500, place_of_worship: 300, school: 400, shelter: 200, civic: 600, assembly_point: 250
4. Default `accessible: true` (no reliable OSM tag for this)
5. Deduplicate by proximity (merge shelters within 50m)

### Technical Notes

- **Must use shared `OverpassRateLimiter`** — serialized after Task 2.
- **Fallback:** If no shelters found or Overpass is down, generate 2 shelters at opposite corners of the bbox. Log a warning.
- **Minimum:** Ensure at least 2 shelters exist (router needs at least 1 destination).

### Dependencies

- Task 6 (needs bbox)
- Task 2 must complete first (shared Overpass rate limiter)

---

## Task 5 — Active Fire Perimeters Fetcher

**File:** `backend/data/ingest/perimeters.py`
**Complexity:** S

### Description

Fetch current active fire perimeters from NIFC (National Interagency Fire Center).

### Data Source

- **NIFC ArcGIS Feature Service** — `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query`
- Free, no auth, no rate limits.

### API Call

```
GET .../query?geometry={bbox}&geometryType=esriGeometryEnvelope&spatialRel=esriSpatialRelIntersects&outFields=*&f=geojson&outSR=4326
```

### Input

- `bbox: tuple[float, float, float, float]`
- `output_dir: Path` — seed directory (writes file AND patches region_config.json)

### Output

- `fire_perimeter.geojson` — GeoJSON FeatureCollection (only if perimeters found)
- Patches `region_config.json` to set `"fire_perimeter_file": "fire_perimeter.geojson"` on success

### Conversion Logic

1. Query NIFC for perimeters intersecting bbox
2. If results found: write GeoJSON, patch region_config.json, return `True`
3. If no results: do nothing, return `False`

### Technical Notes

- **This is optional data.** No fallback needed — absence of fire perimeters is normal.
- **Must run after Task 6** (needs region_config.json to exist for patching).
- Task 6 always writes `fire_perimeter_file: null`. This task patches it only on success.

### Dependencies

- Task 6 (needs bbox + region_config.json to exist)

---

## Task 6 — Region Config + Grid Bounds Generator

**File:** `backend/data/ingest/region.py`
**Complexity:** S

### Description

Generate `region_config.json` and `grid_bounds.json` from the input coordinates.

### Input

- `lat: float, lon: float` — center point
- `radius_km: float` — half-width of bounding box
- `cell_size_m: float` — grid cell size (default 100m)
- `output_dir: Path`

### Output

- `region_config.json`
- `grid_bounds.json`
- Returns `(bbox, grid_rows, grid_cols)` tuple for other tasks

### Logic

1. Compute bounding box from center + radius:
   - `delta_lat = radius_km / 111.0`
   - `delta_lon = radius_km / (111.0 * cos(radians(lat)))`
2. Compute grid dimensions:
   - `grid_rows = round((max_lat - min_lat) * 111_000 / cell_size_m)`
   - `grid_cols = round((max_lon - min_lon) * 111_000 * cos(radians(lat)) / cell_size_m)`
3. Reverse geocode center point for region name (use Nominatim or just `f"{lat:.2f}N, {abs(lon):.2f}W"`)
4. Write both JSON files. `fire_perimeter_file: null` always.

### Technical Notes

- **US bounds pre-flight check:** Validate lat 18–72, lon -180 to -65. Raise `IngestError` for non-US coordinates (LANDFIRE + Census are US-only).
- **Slug generation:** Use `f"{name_slug}-{lat:.4f}-{lon:.4f}"` to avoid collisions.
- **Must run first** — all other tasks depend on its output.

### Dependencies

- None (runs first)

---

## Task 7 — Scenario Presets Generator

**File:** `backend/data/ingest/scenarios.py`
**Complexity:** S

### Description

Generate reasonable scenario presets based on the region's geography.

### Input

- `bbox: tuple[float, float, float, float]`
- `center_lat: float, center_lon: float`
- `output_path: Path`

### Output

- `scenario_presets.json` — array of `ScenarioPreset` objects

### Logic

Generate 3 standard presets:
1. **"Moderate Wind"** — 10 mph SW, 15 gust, 25% humidity, ignition at center
2. **"High Wind Event"** — 25 mph NE, 40 gust, 10% humidity, ignition at NE corner of bbox
3. **"Red Flag Warning"** — 35 mph N, 55 gust, 5% humidity, ignition at N edge of bbox

### Dependencies

- Task 6 (needs bbox + center point)

---

## Task 8 — Orchestrator

**File:** `backend/data/ingest/orchestrator.py`
**Complexity:** M

### Description

Ties all fetchers together into a single `generate_seed_data()` function.

### Interface

```python
def generate_seed_data(
    lat: float,
    lon: float,
    radius_km: float = 10.0,
    cell_size_m: float = 100.0,
    census_api_key: str | None = None,
) -> Path:
    """Generate a complete seed data directory for the given location.

    Returns the path to the generated seed directory.
    Raises IngestError on failure.
    """
```

### Flow

1. **Pre-flight:** Validate US bounds (lat 18–72, lon -180 to -65)
2. **Task 6:** Generate region config + grid bounds → get `(bbox, grid_rows, grid_cols)`
3. **Parallel batch 1** (ThreadPoolExecutor):
   - Task 1: Fuel grid (pass grid_rows, grid_cols)
   - Task 3: Census zones
   - Task 7: Scenario presets
4. **Serial batch 2** (Overpass calls, serialized via rate limiter):
   - Task 2: Road network
   - Task 4: Shelters
5. **Task 5:** Fire perimeters (runs last, patches region_config.json)
6. **Validate:** Call `SeedDataLoader(seed_dir).load_all()` to verify the generated data loads correctly
7. Return seed directory path

### Error Handling

- Each task has its own fallback (synthetic data + warning)
- If a task fails AND its fallback fails, raise `IngestError` with details
- Partial results are kept — the orchestrator doesn't delete on failure

### Technical Notes

- Output directory: `backend/data/seed/{slug}/`
- Slug from Task 6 output

### Dependencies

- All other tasks

---

## Task 9 — CLI Command

**File:** Extend `backend/main.py`
**Complexity:** S

### Description

Add an `ingest` subcommand to the existing CLI.

### Interface

```bash
python backend/main.py ingest \
  --lat 34.0522 --lon -118.2437 \
  --radius 15 \
  --cell-size 100

# Output:
# ✓ Generated seed data: backend/data/seed/los-angeles-34.0522--118.2437/
# ✓ Validated with SeedDataLoader
```

### Dependencies

- Task 8 (orchestrator)

---

## Task 10 — API Endpoint

**File:** Add to `backend/api/routes.py`
**Complexity:** S

### Description

Add `POST /api/ingest` endpoint to trigger seed data generation.

### Interface

```
POST /api/ingest
{
  "lat": 34.0522,
  "lon": -118.2437,
  "radius_km": 15.0
}

→ 202 Accepted
{
  "status": "generating",
  "region_slug": "los-angeles-34.0522--118.2437",
  "message": "Seed data generation started. This may take several minutes."
}
```

### Technical Notes

- Use FastAPI `BackgroundTasks` to run generation async
- **Known limitation:** No status polling endpoint in MVP. Client must poll `GET /api/regions` until the new slug appears.
- **Depends on:** FastAPI app being fully wired (README Task 12)

### Dependencies

- Task 8 (orchestrator)

---

## Task 11 — Shared Overpass Rate Limiter

**File:** `backend/data/ingest/overpass.py`
**Complexity:** S

### Description

Thread-safe rate limiter for Overpass API calls, shared between Tasks 2 and 4.

### Interface

```python
class OverpassClient:
    """Thread-safe Overpass API client with slot-based rate limiting."""

    def query(self, overpass_ql: str, timeout: int = 60) -> dict:
        """Execute an Overpass query, respecting rate limits."""
```

### Logic

- `threading.Lock` to serialize requests
- Track last request timestamp + duration
- Wait `max(0, last_duration - elapsed)` before next request
- Retry on 429 with exponential backoff (max 3 retries)

### Dependencies

- None (utility module)

---

## Task 12 — Integration Tests

**File:** `backend/tests/test_ingest.py`
**Complexity:** M

### Description

End-to-end tests for the data pipeline.

### Test Cases

1. **test_generate_seed_data_paradise** — Generate for Paradise, CA coords. Verify all 7 files exist. Load with `SeedDataLoader` and verify no errors.
2. **test_fuel_grid_shape** — Verify fuel grid shape matches grid_bounds dimensions.
3. **test_road_graph_valid** — Verify road graph loads as NetworkX, has travel_time/capacity edges.
4. **test_zones_have_demographics** — Verify zones have population, elderly_pct, disability_pct.
5. **test_shelters_minimum** — Verify at least 2 shelters exist.
6. **test_non_us_coords_rejected** — Verify IngestError for non-US coordinates.
7. **test_fallbacks_work** — Mock API failures, verify synthetic fallbacks produce valid seed data.

### Technical Notes

- Use `pytest` with `tmp_path` fixture for output directories
- Mock external APIs in unit tests; have one slow integration test marked `@pytest.mark.slow` that hits real APIs
- Add `requests-mock` or `responses` to test dependencies

### Dependencies

- All tasks complete

---

## Implementation Order

```
Phase 1 (parallel):  Task 11 (Overpass client) + Task 6 (region config)
Phase 2 (parallel):  Task 1 (fuel) + Task 2 (roads) + Task 3 (zones) + Task 7 (scenarios)
Phase 3 (serial):    Task 4 (shelters, after Task 2 for Overpass)
Phase 4:             Task 5 (perimeters)
Phase 5:             Task 8 (orchestrator)
Phase 6 (parallel):  Task 9 (CLI) + Task 10 (API endpoint)
Phase 7:             Task 12 (integration tests)
```

## New Dependencies

Add to `backend/requirements.txt`:
```
rasterio>=1.3.0
shapely>=2.0.0
```

> **Note:** `rasterio` requires GDAL system library. On macOS ARM: `brew install gdal`.
> `requests` and `numpy` are already in requirements.
