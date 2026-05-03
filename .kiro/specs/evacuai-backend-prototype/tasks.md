# Implementation Plan: EvacuAI Backend Prototype

## Overview

This plan implements the EvacuAI wildfire simulation and evacuation optimization backend in Python. The architecture is region-agnostic: any geographic region providing a conformant Region Dataset can be loaded and simulated. Paradise, CA ships as the bundled default.

The plan is structured for a **4-person hackathon team** with maximized parallelism. After a shared scaffolding phase, work splits into four independent lanes that converge for integration.

**Implementation language:** Python (NumPy, SciPy, NetworkX, FastAPI, Pydantic, Hypothesis)

### Parallelization Strategy

```
Phase 1: Scaffolding (all together)
  └─ Project structure + Pydantic schemas (foundation for everything)

Phase 2: Parallel Lanes (4 developers simultaneously)
  ├─ Lane A: Fire Spread Engine
  ├─ Lane B: Region Data (seed files + loader + region_config)
  ├─ Lane C: Evacuation Router (baseline)
  └─ Lane D: NWS Wind Client

Phase 3: Convergence (sequential, needs all lanes)
  └─ Monte Carlo Engine → CLI (with ingest subcommand) → API (with ingest endpoints) → Optimized Routing → Viability Scoring → Polish
```

## Tasks

---

### Phase 1 — Scaffolding (All Team Members)

- [ ] 1. Scaffold project structure and dependencies
  - Create `/backend` directory with modules: `simulation/`, `monte_carlo/`, `evacuation/`, `data/`, `data/ingest/`, `api/`, `models/`
  - Add `__init__.py` files for all packages
  - Create `requirements.txt` with pinned dependencies: numpy, scipy, networkx, fastapi, uvicorn, pydantic, shapely, requests, rasterio, pytest, hypothesis, pytest-cov, httpx
  - Create `main.py` CLI entry point stub
  - Create `backend/tests/` directory with `__init__.py` and `conftest.py`
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 2. Implement Pydantic data models and schemas
  - [ ] 2.1 Create all Pydantic models in `backend/models/schemas.py`
    - Implement region config models: `BoundingBox`, `DefaultIgnitionPoint`, `RegionConfig`
    - Implement `GridBounds`, `WindConditions`, `Zone`, `Shelter`, `ScenarioPreset`, `CostWeights`
    - Implement `SimulationRequest` with worldwide lat/lon validation (lat: -90.0 to 90.0, lon: -180.0 to 180.0), optional `seed_dir` field, and `max_timesteps` field (ge=1, le=1440, default=180)
    - Implement result models: `BurnProbabilityMap`, `ArrivalTimeStats` (with None fill for cells that never ignited), `RouteResult` (with `viability_score` and `strategy` fields), `ZoneResult` (with `cutoff_time`, `failure_risk_pct`, `geometry` fields)
    - Implement response models: `SimulationResponse` (includes `region_name`, `max_timesteps`), `SimulationSummary`, `WindResponse`
    - Implement ingestion models: `IngestRequest` with US-only lat/lon validation (lat: 18.0–72.0, lon: -180.0 to -65.0) and `radius_km` (1.0–50.0, default 10.0), `IngestResponse` with `status`, `region_slug`, `warnings` fields, `IngestStatusResponse` with `status` ("generating"|"complete"|"failed"), `progress_pct`, `completed_files`, `warnings` fields
    - _Requirements: 8.3, 6.2, 6.5, 6.6, 10.1, 10.2, 10.3, 10.4, 11.3_

  - [ ]* 2.2 Write property test for worldwide coordinate acceptance
    - **Property 17: Worldwide Coordinate Acceptance**
    - Generate random lat in [-90.0, 90.0] and lon in [-180.0, 180.0], verify SimulationRequest accepts them
    - Generate random lat outside [-90.0, 90.0] or lon outside [-180.0, 180.0], verify validator rejects them
    - **Validates: Requirements 6.2**

  - [ ]* 2.3 Write property test for region config schema validation
    - **Property 16: Region Config Schema Validation**
    - Generate random JSON objects with varying field presence/types, verify RegionConfig accepts valid objects and rejects invalid ones with descriptive errors
    - **Validates: Requirements 11.3, 11.10**

  - [ ]* 2.4 Write property test for serialization round-trip
    - **Property 14: Simulation Output Serialization Round-Trip**
    - Use Hypothesis `builds` strategy to generate valid `SimulationResponse` objects, serialize to JSON, deserialize back, and verify equivalence
    - **Validates: Requirements 10.5**

- [ ] 3. Checkpoint — Schemas ready for parallel work
  - Ensure all tests pass, ask the user if questions arise.
  - Verify all Pydantic models import cleanly and validate correctly.
  - Verify `IngestRequest` rejects non-US coordinates and `SimulationRequest` accepts worldwide coordinates.

---

### Phase 2 — Parallel Lanes (4 Developers Simultaneously)

> **All four lanes can run in parallel after Phase 1 completes.** Each lane only depends on `models/schemas.py` (completed in Phase 1). No lane shares implementation files with another.

#### Lane A: Fire Spread Engine (Developer 1)

> **Depends on: Phase 1 (schemas only)**
> **Files: `backend/simulation/fire_spread.py`, tests**
> **No shared files with Lanes B, C, D**

- [ ] 4. Implement fire spread simulation engine
  - [ ] 4.1 Create `backend/simulation/fire_spread.py` with `FireSpreadEngine` class
    - Implement `__init__` accepting `fuel_grid` (float32 NumPy array) and `grid_bounds` (GridBounds)
    - Implement lat/lon to grid coordinate conversion using grid_bounds metadata
    - Implement `run()` method with parameters: `ignition_point` (lat, lon), `wind_speed_mph`, `wind_direction_deg`, `relative_humidity`, `max_timesteps`
    - Implement spread rate formula: `spread_rate = R0 * fuel_multiplier * wind_factor * moisture_factor` where R0=0.05 km/min
    - Implement wind factor: `exp(0.1783 * wind_speed_mph * cos(wind_angle_to_cell))` with 8-neighbor (Moore) connectivity
    - Implement wind direction convention: convert meteorological direction (degrees *from* which wind blows) to downwind direction via `downwind = (wind_direction_deg + 180) % 360`, then compute `angle = neighbor_bearing - downwind_direction` for cosine weighting
    - Implement moisture factor: `1 - (relative_humidity / 100) * 0.8` — humidity values are percentages in range 0–100 (not decimal fractions)
    - Implement spread rate to ignition probability conversion: `ignition_probability = min(1.0, spread_rate * timestep_duration_min)` where `timestep_duration_min = 1.0`, bounding probability at 1.0
    - Use NumPy vectorized operations (scipy.ndimage or manual NumPy slicing) for neighbor spread probability computation (avoid Python-level cell iteration)
    - Enforce non-burnable cells (fuel_multiplier == 0.0, FBFM40 codes 91–99) never ignite
    - Record ignition timestep per cell (-1 for unburned)
    - Return `FireSpreadResult` with `burn_mask`, `ignition_times`, and `cells_burned`
    - Validate ignition point is within grid bounds and on a burnable cell; raise `ValueError` if not
    - Validate wind parameters (non-negative speed, humidity 0–100); raise `ValueError` for invalid params
    - Handle edge case: simulation produces no burned cells → return valid result with zero-count burn map
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.8_

  - [ ]* 4.2 Write property test for spread rate formula correctness
    - **Property 1: Spread Rate Formula and Ignition Probability Correctness**
    - Generate random (wind_speed ≥0, wind_angle 0–360°, humidity 0–100%, fuel_multiplier 0.0–1.5) tuples
    - Verify computed spread rate equals `R0 * fuel_multiplier * exp(0.1783 * wind_speed * cos(angle)) * (1 - humidity/100 * 0.8)`
    - Verify ignition probability equals `min(1.0, spread_rate * 1.0)` and is always in [0.0, 1.0]
    - **Validates: Requirements 1.2, 1.4**

  - [ ]* 4.3 Write property test for downwind propagation bias
    - **Property 2: Downwind Propagation Bias**
    - For random wind directions (meteorological convention) and a burning cell, convert to downwind via `(wind_dir + 180) % 360`, verify the neighbor whose bearing is closest to downwind has the highest spread probability and the neighbor closest to upwind has the lowest
    - **Validates: Requirements 1.3**

  - [ ]* 4.4 Write property test for non-burnable cell invariant
    - **Property 3: Non-Burnable Cell Invariant**
    - Generate random fuel grids with some 0.0 cells, run simulation, verify all 0.0-fuel cells have ignition_time == -1
    - **Validates: Requirements 1.5**

  - [ ]* 4.5 Write property test for ignition time consistency
    - **Property 4: Ignition Time Consistency**
    - Run simulation on random small grids, verify `burn_mask[i,j] == True` iff `ignition_times[i,j] >= 0` for all cells
    - **Validates: Requirements 1.6**

#### Lane B: Region Data — Real Data Ingestion, Config, and Loader (Developer 2)

> **Depends on: Phase 1 (schemas only)**
> **Files: `backend/data/loader.py`, `backend/data/ingest/*`, `backend/data/seed/paradise-ca/*`, tests**
> **No shared files with Lanes A, C, D**

- [ ] 5. Build real data ingestion pipeline and generate Paradise region dataset
  - [ ] 5.1 Implement data ingestion pipeline at `backend/data/ingest/`
    - Create `backend/data/ingest/overpass.py` — shared thread-safe Overpass API rate limiter with slot-based throttling and retry on 429
    - Create `backend/data/ingest/region.py` — generate `region_config.json` and `grid_bounds.json` from center coordinate + radius. Compute bbox, grid dimensions, reverse geocode for region name. US bounds validation (lat 18–72, lon -180 to -65).
    - Create `backend/data/ingest/fuel.py` — fetch LANDFIRE FBFM40 raster data via LPS API (`lfps.usgs.gov`), convert GeoTIFF to `fuel_grid.npy` with FBFM40 code → spread rate multiplier mapping. Requires `rasterio`.
    - Create `backend/data/ingest/roads.py` — fetch road network from Overpass API, build NetworkX DiGraph with `travel_time` and `capacity` edge attributes derived from highway class. Uses shared Overpass rate limiter.
    - Create `backend/data/ingest/zones.py` — fetch block group geometries from TIGER Web Map Service, demographics from Census ACS 5-Year API, join on GEOID, compute `elderly_pct`, `disability_pct`, `evacuation_priority_weight`. Output `zones.geojson`.
    - Create `backend/data/ingest/shelters.py` — fetch shelter/refuge locations from Overpass API (amenity=shelter|community_centre|place_of_worship|school, emergency=assembly_point, building=civic). Estimate capacity by type, deduplicate by proximity. Uses shared Overpass rate limiter.
    - Create `backend/data/ingest/perimeters.py` — fetch active fire perimeters from NIFC ArcGIS REST API. Optional — patches `region_config.json` on success.
    - Create `backend/data/ingest/scenarios.py` — generate 3 standard scenario presets (Moderate Wind, High Wind Event, Red Flag Warning) based on region geography.
    - Create `backend/data/ingest/orchestrator.py` — `generate_seed_data(lat, lon, radius_km)` that runs all fetchers in dependency order, validates output with `SeedDataLoader`, returns `SingleRunResult`-style output with seed directory path. Implement progress tracking: update a status dict with `progress_pct` and `completed_files` as each module completes, for use by the API ingest status endpoint.
    - When a real data source API is temporarily unavailable, log a warning and document as degraded data quality — fallback SHALL NOT be the default mode
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.8, 12.9, 12.10_

  - [ ] 5.1b Generate Paradise, CA Region Dataset from real data
    - Run the ingestion pipeline for Paradise, CA (lat=39.7596, lon=-121.6219, radius_km=15)
    - Store output at `backend/data/seed/paradise-ca/`
    - Verify `fuel_grid.npy` is derived from real LANDFIRE FBFM40 data
    - Verify `road_graph.json` is derived from real OpenStreetMap data
    - Verify `zones.geojson` is derived from real US Census + TIGER data
    - Verify `shelters.json` is derived from real OpenStreetMap amenity data
    - Verify `camp_fire_perimeter.geojson` is derived from real NIFC WFIGS data
    - Create `scenario_presets.json` with 3 presets: Fast Wind Shift, Night Evacuation, School Zone — each with region-specific ignition points and wind parameters as specified in Req 9.4
    - Ensure `region_config.json` has `region_name: "Paradise, CA"`, bounding box (min_lat: 39.65, max_lat: 39.90, min_lon: -121.75, max_lon: -121.40), Camp Fire origin (lat: 39.8103, lon: -121.4377) as default ignition point
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 11.1, 11.2, 11.3, 12.11_

  - [ ] 5.2 Implement `backend/data/loader.py` with `SeedDataLoader` class
    - Implement `__init__` accepting configurable `seed_dir` parameter, defaulting to `backend/data/seed/paradise-ca/`
    - Define `REQUIRED_FILES` class attribute listing all 7 required files: region_config.json, fuel_grid.npy, grid_bounds.json, road_graph.json, zones.geojson, shelters.json, scenario_presets.json
    - Implement `load_region_config()` — load and validate `region_config.json` against `RegionConfig` Pydantic model; raise `SeedDataError` if missing or schema validation fails
    - Implement `validate_required_files()` — check all REQUIRED_FILES exist, raise `SeedDataError` listing ALL missing files (not just the first)
    - Implement `load_fuel_grid()` — load `fuel_grid.npy` as float32 NumPy array, validate values in [0.0, 1.5]; raise `SeedDataError` on range violation
    - Implement `load_grid_bounds()` — load `grid_bounds.json`, return `GridBounds` model
    - Implement `load_fire_perimeter(filename)` — load fire perimeter GeoJSON using filename from `region_config.fire_perimeter_file`, rasterize polygon to binary burn mask using Shapely at 100m resolution
    - Implement `load_road_graph()` — load `road_graph.json` as NetworkX DiGraph with `travel_time`, `capacity`, and `highway` edge attributes; raise `SeedDataError` if required attributes missing
    - Implement `load_zones()` — load `zones.geojson`, return list of `Zone` models; raise `SeedDataError` if required fields missing
    - Implement `load_shelters()` — load `shelters.json`, return list of `Shelter` models
    - Implement `load_scenario_presets()` — load `scenario_presets.json`, return list of `ScenarioPreset` models
    - Implement `load_all()` — orchestrate: validate region_config → validate required files → load all data. Return `SeedData` containing all loaded data. Raise `SeedDataError` with file path and problem description on failure
    - Handle seed_dir path not existing: raise `SeedDataError` with "directory not found" message
    - Handle fire_perimeter_file specified in config but file not found: raise `SeedDataError` with expected path
    - Use `default_ignition_point` from region_config when no ignition point specified by user
    - Use `bounding_box` from region_config for grid initialization (not hardcoded ranges)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7, 11.8, 11.9, 11.10, 11.11, 11.12_

  - [ ]* 5.3 Write property test for region dataset validation completeness
    - **Property 15: Region Dataset Validation Completeness**
    - Create temp directories with random subsets of required files, verify SeedDataLoader raises error listing exactly the missing files when any are absent, and succeeds when all are present
    - **Validates: Requirements 11.1, 11.8, 11.9**

  - [ ]* 5.4 Write unit tests for seed data loading
    - Test successful loading of each file type and verify structure/types
    - Test configurable seed_dir (custom path accepted, default to paradise-ca)
    - Test fire perimeter filename read from region_config.json
    - Test error handling for missing files (raises `SeedDataError` listing all missing)
    - Test error handling for malformed data (wrong dtypes, invalid JSON, invalid region_config)
    - Test seed_dir path not existing raises `SeedDataError`
    - Test fuel grid values outside [0.0, 1.5] raises `SeedDataError`
    - Test road graph missing required edge attributes raises `SeedDataError`
    - Test zone missing required fields raises `SeedDataError`
    - _Requirements: 3.8, 3.9, 3.10, 11.4, 11.5, 11.8, 11.9, 11.10_

#### Lane C: Evacuation Router — Baseline (Developer 3)

> **Depends on: Phase 1 (schemas only)**
> **Files: `backend/evacuation/router.py`, tests**
> **No shared files with Lanes A, B, D**

- [ ] 6. Implement baseline evacuation routing
  - [ ] 6.1 Create `backend/evacuation/router.py` with `EvacuationRouter` class
    - Implement `__init__` accepting `road_graph` (NetworkX DiGraph), `zones` (list[Zone]), `shelters` (list[Shelter])
    - Implement `compute_baseline_routes()` — Dijkstra shortest-path by `travel_time` weight to nearest shelter per zone centroid
    - Return per-zone `BaselineRouteResult` with ordered node ID list, path coordinates (lat, lon pairs), total travel_time, and shelter_id
    - Handle disconnected graph: log warning, compute routes only for reachable zone-shelter pairs
    - Handle no path to any shelter: mark zone with `failure_risk_pct = 100.0`, `cutoff_time = 0`
    - _Requirements: 5.1, 5.2_

  - [ ]* 6.2 Write property test for baseline routing correctness
    - **Property 9: Baseline Routing Correctness**
    - Generate random small graphs with zones and shelters, verify baseline route matches Dijkstra shortest path and total_travel_time equals sum of edge weights
    - **Validates: Requirements 5.1, 5.2**

  - [ ]* 6.3 Write unit tests for baseline routing
    - Test routing on a known small graph with expected shortest paths
    - Test disconnected graph handling (warning logged, reachable pairs computed)
    - Test no-path-to-shelter case (failure_risk_pct = 100.0)
    - _Requirements: 5.1, 5.2_

#### Lane D: NWS Wind Client (Developer 4)

> **Depends on: Phase 1 (schemas only)**
> **Files: `backend/data/wind_client.py`, tests**
> **No shared files with Lanes A, B, C**

- [ ] 7. Implement NWS wind client
  - [ ] 7.1 Create `backend/data/wind_client.py` with `NWSWindClient` class
    - Implement grid coordinate resolution: `GET https://api.weather.gov/points/{lat},{lon}` → extract gridId, gridX, gridY
    - Implement hourly forecast fetch: `GET https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}/forecast/hourly` → parse first period
    - Parse wind speed/gust strings (e.g., "14 mph") to float values
    - Convert compass direction strings (N, NE, E, SE, S, SW, W, NW) to degrees (0°, 45°, ..., 315°)
    - Set `User-Agent: EvacuAI/1.0` header on all requests
    - On API failure or timeout (>10s): return `FALLBACK_WIND` (10 mph, SW/225°, gust 20 mph, humidity 20%) and log warning
    - Support manual override: if override provided, skip API call and return override values
    - Works for any valid lat/lon worldwide (non-US coordinates trigger fallback)
    - Handle unparseable wind speed strings: log warning, use fallback value for that field
    - Handle missing expected fields in NWS response: log warning, return fallback wind
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 7.2 Write property test for wind string parsing round-trip
    - **Property 8: Wind String Parsing Round-Trip**
    - Generate random float values, format as "{N} mph", parse back, verify original value within floating-point tolerance
    - **Validates: Requirements 4.3**

  - [ ]* 7.3 Write unit tests for NWS wind client
    - Test compass direction conversion for all 8 directions
    - Test fallback behavior on API failure (mock requests)
    - Test manual override skips API call
    - Test non-US coordinates trigger fallback
    - Test unparseable wind speed string uses fallback value
    - Test missing NWS response fields trigger fallback
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

- [ ] 8. Checkpoint — All parallel lanes complete
  - Ensure all tests pass across all four lanes, ask the user if questions arise.
  - Verify: fire spread engine runs on a small grid, seed data loads from paradise-ca, baseline routes compute on road graph, wind client returns fallback on mock failure.

---

### Phase 3 — Convergence (Sequential, Builds on All Lanes)

> **All tasks below depend on Phase 2 completion.** Dependencies are noted per task.

- [ ] 9. Implement Monte Carlo stochastic engine
  - **Depends on: 4 (fire spread), 5 (data loader), 6 (evacuation router)**
  - [ ] 9.1 Create `backend/monte_carlo/engine.py` with `MonteCarloEngine` class
    - Implement `__init__` accepting `fire_engine`, `road_graph`, `zones`, `shelters`
    - Implement `run()` with stochastic sampling: wind_speed ~ Normal(μ, σ=3) clamped to [0, gust], wind_dir ~ Normal(μ, σ=15) wrapping at 360°, civ_delay ~ Uniform(2, 15), road_closure ~ Beta(1.5, 8.5) per edge per run keyed by `(source, target)` node ID pair
    - `wind_gust_mph` serves exclusively as upper bound on sampled wind speed — does NOT appear in Rothermel formula
    - All humidity values are percentages in range 0–100 (not decimal fractions)
    - Use `numpy.random.SeedSequence` for deterministic per-run seeding from master seed
    - Create `SingleRunResult` dataclass (internal, not Pydantic) with fields: `run_index`, `fire_grid` (burn_mask bool array), `ignition_times`, `optimized_routes` (dict[str, OptimizedRouteResult]), `civ_delay` (float, minutes)
    - Store per-run results as `list[SingleRunResult]` for viability scoring
    - Aggregate results: `burn_probability_map[i,j] = count_ignited[i,j] / num_runs`
    - Compute arrival time statistics: mean, median computed only over runs where cell ignited; cells that never ignite use None
    - Return `MonteCarloResult` with burn_probability_map, arrival_time_stats, per-zone results, run metadata
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 9.2 Write property test for Monte Carlo sampling bounds
    - **Property 5: Monte Carlo Sampling Bounds**
    - Generate random (wind_speed μ, wind_gust, num_runs) tuples, verify all sampled wind speeds in [0, gust], delays in [2, 15], road closures in [0, 1], and exactly N runs executed
    - **Validates: Requirements 2.1, 2.2, 2.4, 2.5**

  - [ ]* 9.3 Write property test for burn probability map bounds
    - **Property 6: Burn Probability Map Bounds**
    - Generate random sets of binary burn masks, aggregate, verify all cell values in [0.0, 1.0] and equal count_ignited / num_runs
    - **Validates: Requirements 2.6**

  - [ ]* 9.4 Write property test for deterministic seeding
    - **Property 7: Deterministic Seeding**
    - Run Monte Carlo twice with same seed and scenario, verify identical burn probability maps, arrival time stats, and per-zone results
    - **Validates: Requirements 2.7**

- [ ] 10. Wire CLI entry point with ingest subcommand
  - **Depends on: 9 (Monte Carlo), 5 (data loader + ingestion pipeline)**
  - [ ] 10.1 Implement `backend/main.py` CLI with argparse
    - Accept simulation arguments: `--lat`, `--lon`, `--wind-speed`, `--wind-dir`, `--humidity`, `--num-runs` (default 500), `--output`, `--seed`, `--max-timesteps` (default 180), `--seed-dir`
    - Load Region Dataset via `SeedDataLoader` using `--seed-dir` (default: `backend/data/seed/paradise-ca/`)
    - Use `default_ignition_point` from `region_config.json` when no lat/lon specified
    - Run Monte Carlo engine with provided or default parameters
    - Write results JSON to configurable output directory
    - Print stdout summary: region name, mean cells burned, simulation duration, runs completed
    - Handle errors: invalid args → usage help + exit 1, invalid --seed-dir → stderr "Region dataset directory not found: {path}" + exit 1, seed data failure → stderr + exit 1, output dir not writable → stderr + exit 1
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.5, 11.11_

  - [ ] 10.1b Implement CLI `ingest` subcommand
    - Add `ingest` subcommand to argparse: `python backend/main.py ingest --lat {lat} --lon {lon} --radius {radius_km}`
    - Accept `--lat` (required, float), `--lon` (required, float), `--radius` (optional, float, default 10.0 km)
    - Validate US-only coordinates (lat 18–72, lon -180 to -65); reject non-US with descriptive error
    - Call `orchestrator.generate_seed_data(lat, lon, radius_km)` from the ingestion pipeline
    - Print progress to stdout as each data source completes
    - On success, print the generated seed directory path
    - On partial failure (some APIs unavailable), print warnings and continue with available data
    - _Requirements: 12.8, 12.9, 12.10_

  - [ ]* 10.2 Write unit tests for CLI argument parsing and output
    - Test various argument combinations including --seed-dir
    - Test default region loads when --seed-dir not provided
    - Test JSON file is written and stdout summary includes region name
    - Test error handling for invalid arguments and invalid --seed-dir
    - Test `ingest` subcommand argument parsing (lat, lon, radius)
    - Test `ingest` subcommand rejects non-US coordinates
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.9_

- [ ] 11. Checkpoint — MVP pipeline validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `python backend/main.py --num-runs 10` completes without error using Paradise default and produces a results JSON with burn probability map and baseline routes.
  - Verify `python backend/main.py ingest --lat 39.76 --lon -121.62 --radius 10` triggers the ingestion pipeline.

- [ ] 12. Implement FastAPI application and endpoints (including ingestion)
  - **Depends on: 10 (CLI wired), 7 (wind client), 5.1 (ingestion pipeline)**
  - [ ] 12.1 Create `backend/api/app.py` with FastAPI application factory
    - Configure CORS middleware to allow cross-origin requests
    - Register routes from `backend/api/routes.py`
    - _Requirements: 6.9_

  - [ ] 12.2 Create `backend/api/routes.py` with endpoint definitions
    - Implement `POST /api/simulate` — accept `SimulationRequest` (includes optional `seed_dir`), run full pipeline, return `SimulationResponse` with `region_name`
    - Reject absolute `seed_dir` paths with HTTP 400: `{"error": "Invalid seed_dir", "detail": "Absolute paths are not allowed"}` to prevent directory traversal
    - Invalid seed_dir (directory not found) returns HTTP 400: `{"error": "Region dataset not found", "detail": "Directory {seed_dir} does not exist"}`
    - Seed data errors return HTTP 500 with `{"error": "...", "detail": "..."}`
    - Implement `GET /api/wind` — accept `lat`, `lon` query params (worldwide), fetch wind via `NWSWindClient`, return `WindResponse`
    - Implement `GET /api/scenarios` — accept optional `seed_dir` query param, return list of `ScenarioPreset` from specified Region Dataset (default: paradise-ca)
    - Implement `POST /api/ingest` — accept `IngestRequest` (lat, lon, radius_km with US-only validation), trigger ingestion pipeline via `BackgroundTasks`, return `IngestResponse` with `status="generating"`, `region_slug`, and `warnings`. Create initial entry in module-level `dict[str, IngestStatusResponse]` for status tracking. Background task updates progress dict as each ingest module completes.
    - Implement `GET /api/ingest/{region_slug}/status` — read from module-level status dict, return `IngestStatusResponse` with `status` ("generating"|"complete"|"failed"), `progress_pct`, `completed_files`, `warnings`. Return 404 if region_slug not found.
    - Non-US coordinates in `POST /api/ingest` return HTTP 422 via Pydantic validation (lat 18–72, lon -180 to -65)
    - Pydantic validation returns HTTP 422 with descriptive errors for invalid inputs (including out-of-range lat/lon)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.10_

  - [ ]* 12.3 Write unit tests for API endpoints
    - Test valid `POST /api/simulate` returns correct schema with `region_name` (use httpx TestClient, small run count)
    - Test `POST /api/simulate` with `seed_dir` parameter loads specified region
    - Test `POST /api/simulate` with absolute `seed_dir` returns 400
    - Test invalid payloads return 422 (including out-of-range worldwide lat/lon)
    - Test `GET /api/wind` with mocked NWS returns valid `WindResponse`
    - Test `GET /api/scenarios` returns preset list (default and with seed_dir param)
    - Test CORS headers are present
    - Test invalid seed_dir returns 400
    - Test `POST /api/ingest` with valid US coordinates returns 202 with `IngestResponse`
    - Test `POST /api/ingest` with non-US coordinates returns 422
    - Test `GET /api/ingest/{region_slug}/status` returns progress for known slug
    - Test `GET /api/ingest/{region_slug}/status` returns 404 for unknown slug
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.9, 6.10_

- [ ] 13. Implement optimized evacuation routing
  - **Depends on: 6 (baseline router), 9 (Monte Carlo)**
  - [ ] 13.1 Extend `EvacuationRouter` with optimized cost-function routing
    - Implement `compute_optimized_routes()` with multi-factor cost: `cost = α*travel_time + β*congestion + γ*fire_exposure + δ*road_closure`
    - Default weights: α=1.0, β=0.5, γ=2.0, δ=1.5 (configurable via `CostWeights`)
    - Compute `fire_exposure` per edge as fraction of grid cells along edge's geographic path burning at estimated traversal time, using the per-run Fire_Grid state (not aggregated Burn_Probability_Map). Value in [0.0, 1.0].
    - Implement single-pass greedy assignment for congestion: zones routed in descending `priority_score` order; after each zone assigned, congestion on all edges in that route updated before next zone routes. Already-assigned zones NOT re-routed. `congestion = evacuating_population_on_edge / edge_capacity`.
    - Accept `road_closures` as `dict[tuple[int, int], float]` keyed by (source, target) node ID pair matching NetworkX DiGraph edge access pattern
    - Accept `civ_delay` (civilian evacuation delay in minutes) for this run
    - Return per-zone `OptimizedRouteResult` with route, cost breakdown, and shelter assignment
    - Performance target: optimized routing runs once per MC run (~500 times). `POST /api/simulate` with `num_runs=500` should complete within 5 minutes for up to 20 zones and 5,000 road edges
    - Handle all routes blocked by fire: report `viability_score = 0.0` for that zone
    - _Requirements: 5.3, 5.4, 5.5, 5.5a_

  - [ ]* 13.2 Write property test for optimized cost function correctness
    - **Property 10: Optimized Cost Function Correctness**
    - Generate random edge attributes and weight coefficients, verify computed cost equals `α*travel_time + β*congestion + γ*fire_exposure + δ*road_closure` and fire_exposure is in [0.0, 1.0]
    - **Validates: Requirements 5.3, 5.4**

- [ ] 14. Checkpoint — API and optimized routing validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `POST /api/simulate` returns full results with both baseline and optimized routes, region_name, and worldwide lat/lon acceptance.
  - Verify `POST /api/ingest` triggers ingestion and `GET /api/ingest/{slug}/status` returns progress.
  - Verify absolute seed_dir paths are rejected with HTTP 400.

- [ ] 15. Implement full viability scoring and evacuation ordering
  - **Depends on: 13 (optimized routing), 9 (Monte Carlo)**
  - [ ] 15.1 Extend `EvacuationRouter` with viability scoring
    - Implement `compute_viability_scores(mc_results: list[SingleRunResult])` — Route_Viability_Score = % of MC runs route reaches shelter before fire arrival at any point along the route
    - Implement `Cutoff_Time` per zone — latest timestep T where starting evacuation yields viability > 50%, and T+1 yields ≤ 50%
    - Compute failure risk percentage per zone (% of runs with no viable route)
    - _Requirements: 5.6, 5.7, 5.9_

  - [ ] 15.2 Implement evacuation ordering
    - Implement `compute_evacuation_ordering(zones, fire_exposure_probs)` — sort zones by descending `priority_score = (pop_weight + (elderly_pct / 100) * 2.0 + (disability_pct / 100) * 1.5) * fire_exposure_probability`
    - `pop_weight = zone_population / max_population_in_region`
    - `fire_exposure_probability` = mean Burn_Probability_Map value across all grid cells within the zone polygon
    - Return ordered list of `ZoneOrderResult`
    - _Requirements: 5.8_

  - [ ]* 15.3 Write property test for route viability score aggregation
    - **Property 11: Route Viability Score Aggregation**
    - Generate random boolean arrays (route success per run), verify score = count_success / N * 100 and score in [0, 100]
    - **Validates: Requirements 5.6**

  - [ ]* 15.4 Write property test for cutoff time correctness
    - **Property 12: Cutoff Time Correctness**
    - Generate random monotonically decreasing viability curves, verify cutoff is latest T with score > 50% and T+1 has score ≤ 50%
    - **Validates: Requirements 5.7**

  - [ ]* 15.5 Write property test for evacuation ordering
    - **Property 13: Evacuation Ordering Sorted by Priority**
    - Generate random zone lists with priority data, verify ordering is descending by `priority_score`
    - **Validates: Requirements 5.8**

- [ ] 16. Polish output serialization and wire everything together
  - **Depends on: 15 (viability scoring), 12 (API)**
  - [ ] 16.1 Ensure all outputs match serialization requirements
    - Burn probability map serialized as 2D float array with `grid_bounds` metadata
    - Arrival time stats include mean, median, p10, p90 per cell (None for cells that never ignited)
    - Routes serialized as ordered (lat, lon) coordinate pairs with viability score and travel_time
    - Zone results serialized as GeoJSON features with zone_id, population, cutoff_time, priority_score, route IDs, failure_risk_pct, geometry
    - Wire viability scores, cutoff times, and evacuation ordering into `SimulationResponse`
    - Ensure `region_name` flows through from region_config to all outputs (CLI and API)
    - Ensure all geospatial data in GeoJSON-compatible format within response schemas
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 6.8_

  - [ ]* 16.2 Write integration tests for end-to-end pipeline
    - Test full CLI pipeline: `python main.py --num-runs 10` produces valid JSON with all fields including region_name
    - Test full CLI pipeline with custom seed_dir: `python main.py --seed-dir path/to/region --num-runs 10`
    - Test full API pipeline: `POST /api/simulate` with small run count returns complete `SimulationResponse`
    - Test API with seed_dir parameter loads alternate region
    - Test API with absolute seed_dir returns 400
    - Test `GET /api/scenarios` with and without seed_dir param
    - Test `POST /api/ingest` triggers pipeline and returns region_slug
    - Test `GET /api/ingest/{slug}/status` returns progress after ingest starts
    - Verify round-trip JSON serialization of results
    - _Requirements: 7.2, 7.3, 6.1, 6.4, 6.5, 6.6, 6.10, 10.5_

- [ ] 17. Final checkpoint — Full system validation
  - Ensure all tests pass, ask the user if questions arise.
  - Verify end-to-end: default Paradise scenario → simulate → results include region_name, viability scores, cutoff times, evacuation ordering.
  - Verify CLI and API produce equivalent output structures.
  - Verify worldwide lat/lon accepted by API, region-specific bounds come from region_config at runtime.
  - Verify `POST /api/ingest` and `GET /api/ingest/{slug}/status` work correctly.
  - Verify CLI `ingest` subcommand works: `python backend/main.py ingest --lat 39.76 --lon -121.62 --radius 10`.
  - Verify absolute seed_dir paths rejected by API.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- **Phase 2 lanes are fully independent** — assign one developer per lane for maximum parallelism
- Checkpoints ensure incremental validation at each phase boundary
- Property tests validate the 17 universal correctness properties from the design document using Hypothesis
- Unit tests validate specific examples, edge cases, and error conditions
- The implementation language is Python throughout, matching the design document
- All seed data files are derived from real public data sources (LANDFIRE, OSM, Census, NIFC) — no synthetic data is used (Requirement 12)
- Scenario presets are the ONLY data file exempt from the real-data requirement (Requirement 12.12)
- Region-configurable architecture: `seed_dir` parameter flows through CLI (--seed-dir), API (request body / query param), and SeedDataLoader
- `region_config.json` is the single source of truth for region metadata (name, bbox, default ignition point, fire perimeter filename)
- Ingestion state is tracked in a module-level dict (single-process, in-memory) — acceptable for hackathon/prototype scope
- Performance target: `POST /api/simulate` with `num_runs=500` completes within 5 minutes for up to 20 zones and 5,000 road edges at default `max_timesteps=180`
- `SingleRunResult` is an internal dataclass (not Pydantic) used to pass per-run results from Monte Carlo to viability scoring
