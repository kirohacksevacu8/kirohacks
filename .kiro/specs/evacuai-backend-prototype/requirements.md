# Requirements Document

## Introduction

EvacuAI is a computation-first Python backend that simulates wildfire spread under uncertainty using Monte Carlo methods and evaluates evacuation route viability for first responders and emergency planners. The system uses a simplified Rothermel fire spread model on a grid, runs ~500 Monte Carlo simulations per scenario, and compares baseline vs. optimized evacuation strategies over a real road network. The architecture is region-agnostic: any geographic region that provides a conformant region dataset can be loaded and simulated. Paradise, CA (Camp Fire 2018) is the bundled default demo region. All data sources — fuel grids, road networks, population zones, shelter locations, and fire perimeters — are derived from real public datasets (LANDFIRE, OpenStreetMap, US Census, NIFC); no synthetic or fabricated seed data is used. The backend serves results via a synchronous FastAPI REST API and is also runnable as a standalone CLI tool.

**Skills Reference:** engineering-backend-architect (system architecture, API design, service decomposition), engineering-data-engineer (data pipeline design, seed data processing, data quality).

## Glossary

- **Simulation_Engine**: The core Python module that executes the simplified Rothermel fire spread model on a NumPy grid, advancing fire state over discrete timesteps.
- **Monte_Carlo_Engine**: The module that orchestrates ~500 stochastic simulation runs per scenario, sampling wind speed, wind direction, civilian delay, and road closure probability from defined distributions.
- **Evacuation_Optimizer**: The module that computes evacuation routes over a NetworkX DiGraph road network, comparing baseline (shortest-path) and optimized (multi-factor cost) strategies.
- **Data_Pipeline**: The collection of preprocessing scripts and loaders that ingest region dataset files and live wind data into simulation-ready formats.
- **API_Layer**: The FastAPI application that exposes synchronous simulation, results, wind, and scenario endpoints with Pydantic-validated request/response schemas.
- **Fire_Grid**: A 2D NumPy float32 array representing the simulation area at 100m cell resolution, where each cell holds burn state, ignition time, and spread probability.
- **Fire_Exposure_Probability**: A per-zone metric used in evacuation priority scoring, defined as the mean Burn_Probability_Map value across all grid cells whose centers fall within the zone's polygon boundary. Ranges from 0.0 (no fire risk) to 1.0 (certain fire exposure).
- **Fuel_Grid**: A pre-processed NumPy float32 array derived from LANDFIRE FBFM40 data, containing spread rate multipliers (0.0–1.5) per cell.
- **Road_Graph**: A NetworkX DiGraph built from pre-fetched OpenStreetMap data in node-link JSON format (`{"nodes": [{id, lat, lon}], "links": [{source, target, travel_time, capacity, highway}]}`), where edges carry `travel_time` (float, minutes), `capacity` (int, vehicles/hour), and `highway` (string, road class) attributes. `fire_exposure` and `closure_probability` are computed at simulation time, not stored in the file.
- **Congestion**: A per-edge metric computed during optimized routing as `congestion = evacuating_population_on_edge / edge_capacity`, where `evacuating_population_on_edge` is the sum of zone populations whose routes traverse that edge, and `edge_capacity` is the vehicles-per-hour attribute from the Road_Graph.
- **Burn_Probability_Map**: A 2D array aggregated over all Monte Carlo runs, where each cell value represents the fraction of runs in which that cell ignited.
- **Zone**: A census block group polygon with associated population count, vulnerability percentages (`elderly_pct`, `disability_pct` — stored as 0–100 percentage values in `zones.geojson`), and a pre-computed `evacuation_priority_weight`. The priority scoring formula in Req 5 derives weights from these percentages: `pop_weight = population / max_population_in_region`, `elderly_weight = elderly_pct / 100`, `disability_weight = disability_pct / 100`, then `priority_score = (pop_weight + elderly_weight * 2.0 + disability_weight * 1.5) * fire_exposure_probability`.
- **Route_Viability_Score**: The percentage of Monte Carlo runs in which a given evacuation route successfully reaches a shelter before fire arrival.
- **Cutoff_Time**: The latest simulation timestep at which a zone can still begin evacuation and have at least one viable route to a shelter.
- **Scenario**: A named configuration combining an ignition point, wind parameters, uncertainty settings, and optional presets (e.g., Fast Wind Shift, Night Evacuation).
- **Region_Dataset**: A self-contained directory of seed data files and a `region_config.json` metadata file that fully describes a geographic region for simulation. Any region that provides the required files in the expected schema can be loaded and simulated.
- **Region_Config**: A JSON metadata file (`region_config.json`) within a Region_Dataset that specifies the region name, bounding box, default ignition point, and default scenario presets for that region.
- **Seed_Data**: Data files within a Region_Dataset directory derived from real public data sources (LANDFIRE, OpenStreetMap, US Census, NIFC) that the system loads at startup. No synthetic or fabricated data is used.
- **NWS_Client**: The module responsible for fetching live wind forecast data from the National Weather Service api.weather.gov API.
- **Rothermel_Model**: The simplified fire behavior model using base spread rate R0=0.05 km/min, wind factor exponent 0.1783, and moisture dampening up to 0.8 reduction.
- **Pydantic_Schema**: A strict data contract defined using Pydantic models for all API request and response payloads.
- **SeedDataLoader**: The component within the Data_Pipeline responsible for discovering, validating, and loading a Region_Dataset from a configurable directory path.
- **Data_Ingestion_Pipeline**: The collection of modules in `backend/data/ingest/` that fetch real data from public APIs (LANDFIRE, Overpass, Census, NIFC) and generate a complete Region_Dataset directory for any given US coordinate.

## Development Phases & Priority

Requirements are organized into four incremental phases. Each phase builds on the previous and produces a testable, runnable system.

### Phase 1 — MVP: Fire Simulation + Monte Carlo + CLI (Priority: Critical)
- Requirement 1: Fire Spread Simulation on Grid
- Requirement 2: Monte Carlo Stochastic Engine
- Requirement 3: Seed Data Loading and Preprocessing
- Requirement 7: CLI Execution Mode
- Requirement 8: Project Structure and Module Separation
- Requirement 11: Region Dataset Specification
- Requirement 12: Real Data Sources — No Synthetic Seed Data

### Phase 2 — Routing: Road Graph + Basic Evacuation (Priority: High)
- Requirement 5: Evacuation Route Optimization (baseline shortest-path only)
- Requirement 9: Demo Region Configuration

### Phase 3 — API: FastAPI Layer + Optimized Routing (Priority: High)
- Requirement 4: Live Wind Data Fetch
- Requirement 6: REST API Layer (synchronous)
- Requirement 5 (extended): Optimized cost-function routing and zone ordering

### Phase 4 — Polish: Output Serialization + Advanced Features (Priority: Medium)
- Requirement 10: Simulation Output Serialization
- Requirement 5 (extended): Full viability scoring, cutoff times, failure risk

---

## Requirements

### Requirement 1: Fire Spread Simulation on Grid

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As an evacuation planner, I want to simulate wildfire spread on a realistic terrain grid, so that I can see how fire propagates under given conditions.

#### Acceptance Criteria

1. WHEN an ignition point and wind parameters are provided, THE Simulation_Engine SHALL compute fire spread on a Fire_Grid using the simplified Rothermel_Model with 100m cell resolution and 1-minute timesteps.
2. THE Simulation_Engine SHALL calculate spread probability for each cell using the formula: `spread_rate = R0 * fuel_multiplier * wind_factor * moisture_factor`, where `wind_factor = exp(0.1783 * wind_speed_mph * cos(wind_angle_to_cell))` and `moisture_factor = 1 - (relative_humidity / 100) * 0.8`.
3. WHEN computing spread direction, THE Simulation_Engine SHALL favor downwind propagation by applying the cosine-weighted wind factor relative to each neighboring cell's bearing from the burning cell.
4. THE Simulation_Engine SHALL use the Fuel_Grid spread rate multipliers (range 0.0 to 1.5) to modify the base spread rate R0 of 0.05 km/min per cell.
5. WHEN a cell has a non-burnable fuel code (FBFM40 codes 91–99, multiplier 0.0), THE Simulation_Engine SHALL prevent fire from spreading into that cell.
6. THE Simulation_Engine SHALL record the ignition timestep for each cell that catches fire during the simulation run.

### Requirement 2: Monte Carlo Stochastic Engine

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As an evacuation planner, I want to run hundreds of stochastic simulations per scenario, so that I can understand the range of possible fire outcomes and make probability-informed decisions.

#### Acceptance Criteria

1. WHEN a scenario is submitted, THE Monte_Carlo_Engine SHALL execute approximately 500 independent simulation runs with stochastically sampled parameters.
2. THE Monte_Carlo_Engine SHALL sample wind speed from a Normal distribution centered on the provided wind speed value with σ=3 mph, clamped to [0, wind_gust_mph]. The `wind_gust_mph` parameter serves exclusively as an upper bound on sampled wind speed and does not appear in the Rothermel spread rate formula.
3. THE Monte_Carlo_Engine SHALL sample wind direction from a Normal distribution centered on the provided wind direction (in degrees) with σ=15°.
4. THE Monte_Carlo_Engine SHALL sample civilian evacuation delay from a Uniform(2, 15) distribution in minutes per run.
5. THE Monte_Carlo_Engine SHALL sample road closure probability per edge from a Beta(1.5, 8.5) distribution per run.
6. WHEN all runs complete, THE Monte_Carlo_Engine SHALL aggregate results into: a Burn_Probability_Map (fraction of runs each cell ignited) and per-cell arrival time statistics (mean, median).
7. THE Monte_Carlo_Engine SHALL produce deterministic results when initialized with the same random seed.
8. ALL humidity values throughout the system SHALL be expressed as percentages in the range 0–100 (not as decimal fractions 0.0–1.0). The moisture factor formula `1 - (relative_humidity / 100) * 0.8` assumes this convention.

### Requirement 3: Seed Data Loading and Preprocessing

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As a developer, I want all non-wind data loadable from a configurable region dataset directory, so that the system supports any geographic region and the demo runs reliably from pre-fetched real data.

#### Acceptance Criteria

1. THE SeedDataLoader SHALL accept a configurable `seed_dir` path parameter specifying the Region_Dataset directory to load, defaulting to the bundled Paradise, CA dataset at `backend/data/seed/paradise-ca/`.
2. THE SeedDataLoader SHALL load the fire perimeter from a GeoJSON file (e.g., `camp_fire_perimeter.geojson` or any region-specific perimeter file named in Region_Config) within the specified `seed_dir` and rasterize the polygon into a binary burn mask on the Fire_Grid at 100m resolution.
3. THE SeedDataLoader SHALL load the fuel model grid from `fuel_grid.npy` within the specified `seed_dir` as a float32 NumPy array with values in the range 0.0 to 1.5.
4. THE SeedDataLoader SHALL load grid metadata from `grid_bounds.json` within the specified `seed_dir` containing the bounding box coordinates and cell resolution.
5. THE SeedDataLoader SHALL load the road network from `road_graph.json` within the specified `seed_dir` and construct a NetworkX DiGraph with travel_time and capacity attributes per edge.
6. THE SeedDataLoader SHALL load population and vulnerability zones from `zones.geojson` within the specified `seed_dir`, where each feature includes population, elderly_pct, disability_pct, and evacuation_priority_weight fields.
7. THE SeedDataLoader SHALL load shelter locations from `shelters.json` within the specified `seed_dir` with capacity and accessibility attributes per shelter.
8. THE SeedDataLoader SHALL load scenario presets from `scenario_presets.json` within the specified `seed_dir`, where presets are region-specific (ignition points, wind conditions, and scenario names defined per region).
9. THE SeedDataLoader SHALL load region metadata from `region_config.json` within the specified `seed_dir` to obtain the region name, bounding box, default ignition point, and fire perimeter filename.
10. IF any required Region_Dataset file is missing or malformed, THEN THE SeedDataLoader SHALL raise a descriptive error identifying the file path and the nature of the problem.

### Requirement 4: Live Wind Data Fetch

**Priority:** High (Phase 3 — API)

**User Story:** As an evacuation planner, I want current wind conditions fetched from the National Weather Service, so that simulations reflect real-time weather.

#### Acceptance Criteria

1. WHEN the system receives a wind fetch request, THE NWS_Client SHALL resolve grid coordinates by calling `GET https://api.weather.gov/points/{lat},{lon}` and extracting gridId, gridX, and gridY from the response.
2. WHEN grid coordinates are resolved, THE NWS_Client SHALL fetch the hourly forecast by calling `GET https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}/forecast/hourly` and parsing the first period for windSpeed, windDirection, windGust, and relativeHumidity.
3. THE NWS_Client SHALL parse windSpeed and windGust string values (e.g., "14 mph") into numeric float values in mph.
4. THE NWS_Client SHALL convert windDirection compass strings (N, NE, E, SE, S, SW, W, NW) to degree values (0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°).
5. THE NWS_Client SHALL set the HTTP header `User-Agent: EvacuAI/1.0` on all requests to api.weather.gov.
6. IF the NWS API call fails or times out, THEN THE NWS_Client SHALL return a fallback wind condition (wind speed 10 mph, direction SW/225°, gust 20 mph, humidity 20%) and log a warning.
7. WHEN manual wind override values are provided by the user, THE NWS_Client SHALL use the override values instead of fetching from the API.

### Requirement 5: Evacuation Route Optimization

**Priority:** High (Phase 2 baseline, Phase 3 optimized, Phase 4 full scoring)

**User Story:** As an evacuation planner, I want to compare baseline and optimized evacuation strategies, so that I can recommend the safest routes for each zone.

#### Acceptance Criteria

**Phase 2 — Baseline Routing:**

1. THE Evacuation_Optimizer SHALL compute a baseline strategy using shortest-path routing (minimum travel_time via Dijkstra) to the nearest shelter for each Zone on the Road_Graph.
2. THE Evacuation_Optimizer SHALL output per-zone results including: best baseline route as an ordered list of node IDs and total travel_time.

**Phase 3 — Optimized Routing:**

3. THE Evacuation_Optimizer SHALL compute an optimized strategy that minimizes a weighted cost function: `cost = α * travel_time + β * congestion + γ * fire_exposure + δ * road_closure`, where α, β, γ, δ are configurable weight coefficients with sensible defaults (α=1.0, β=0.5, γ=2.0, δ=1.5).
4. WHEN computing fire_exposure per edge, THE Evacuation_Optimizer SHALL use the per-run Fire_Grid state (not the aggregated Burn_Probability_Map). Optimized routing runs once per Monte Carlo run using that run's specific fire simulation output. For each edge, `fire_exposure` is the fraction of grid cells along the edge's geographic path that are burning at the estimated time the evacuating population would traverse that edge (a value in [0.0, 1.0]).
5. WHEN computing congestion per edge, THE Evacuation_Optimizer SHALL use a single-pass greedy assignment: zones are assigned routes in descending priority_score order; after each zone is assigned, congestion on all edges in that route is updated before the next zone routes. Already-assigned zones are not re-routed. `congestion = evacuating_population_on_edge / edge_capacity`, where `evacuating_population_on_edge` is the sum of populations from all zones whose assigned routes traverse that edge, and `edge_capacity` is the vehicles-per-hour attribute from the Road_Graph.

**Performance:**

5a. Optimized routing runs once per Monte Carlo run (~500 times). `POST /api/simulate` with `num_runs=500` SHALL complete within 5 minutes for a region with up to 20 zones and 5,000 road edges. The `num_runs` parameter is intentionally configurable: use 500 for full accuracy, 10–50 for interactive/demo use.

**Phase 4 — Full Viability Scoring:**

6. THE Evacuation_Optimizer SHALL compute a Route_Viability_Score for each route as the percentage of Monte Carlo runs in which the route successfully reaches a shelter before fire arrival at any point along the route.
7. THE Evacuation_Optimizer SHALL compute a Cutoff_Time for each Zone representing the latest timestep at which evacuation can begin and still have at least one route with a Route_Viability_Score above 50%.
8. THE Evacuation_Optimizer SHALL produce an evacuation ordering of Zones sorted by descending priority_score, where `priority_score = (pop_weight + (elderly_pct / 100) * 2.0 + (disability_pct / 100) * 1.5) * fire_exposure_probability`. Here `pop_weight = zone_population / max_population_in_region`, `elderly_pct` and `disability_pct` are the percentage values from `zones.geojson`, and `fire_exposure_probability` is the mean Burn_Probability_Map value across all grid cells within the zone polygon (see Glossary: Fire_Exposure_Probability).
9. THE Evacuation_Optimizer SHALL output per-zone results including: best route (baseline), best route (optimized), Route_Viability_Score for each, Cutoff_Time, and failure risk percentage.

### Requirement 6: REST API Layer (Synchronous)

**Priority:** High (Phase 3 — API)

**User Story:** As a frontend developer, I want a well-defined synchronous REST API with strict schema contracts, so that I can build the visualization layer independently.

#### Acceptance Criteria

1. THE API_Layer SHALL expose a `POST /api/simulate` endpoint that accepts a Pydantic_Schema request body containing ignition point (lat, lon), wind parameters (speed, direction, gust, humidity), number of Monte Carlo runs, an optional scenario preset name, and an optional `seed_dir` path to specify the Region_Dataset, and returns the full simulation results synchronously in the response body.
2. THE API_Layer SHALL validate the SimulationRequest ignition point latitude within the range -90.0 to 90.0 and longitude within the range -180.0 to 180.0, accepting any valid geographic coordinate worldwide.
3. THE API_Layer SHALL expose a `GET /api/wind` endpoint that accepts latitude and longitude query parameters and returns the current NWS wind conditions parsed into numeric values.
4. THE API_Layer SHALL expose a `GET /api/scenarios` endpoint that accepts an optional `seed_dir` query parameter and returns the list of available scenario presets from the specified Region_Dataset (defaulting to the bundled Paradise dataset).
5. THE API_Layer SHALL expose a `POST /api/ingest` endpoint that accepts a JSON request body containing `lat` (float, required), `lon` (float, required), and `radius_km` (float, optional, default 10.0), triggers the Data_Ingestion_Pipeline to generate a new Region_Dataset from real data sources, and returns a response with `status` (string: "generating" or "complete"), `region_slug` (string: generated directory name), and `warnings` (list of strings for any degraded data sources). This endpoint MAY use FastAPI `BackgroundTasks` for long-running ingestion.
6. IF `POST /api/ingest` runs asynchronously via BackgroundTasks, THE API_Layer SHALL also expose a `GET /api/ingest/{region_slug}/status` endpoint that returns `{"status": "generating" | "complete" | "failed", "progress_pct": int, "completed_files": list[str], "warnings": list[str]}` so callers can poll for completion.
7. THE API_Layer SHALL validate all request payloads using Pydantic models and return HTTP 422 with descriptive error messages for invalid inputs.
8. THE API_Layer SHALL return all geospatial data (burn probability maps, route geometries, zone polygons) in GeoJSON-compatible format within the response schemas.
9. THE API_Layer SHALL include CORS middleware configured to allow cross-origin requests from the frontend.
10. WHEN the API receives a `seed_dir` parameter (in `POST /api/simulate` or `GET /api/scenarios`), THE API_Layer SHALL resolve the path relative to the server's working directory. Absolute paths SHALL be rejected with HTTP 400 to prevent directory traversal attacks.

### Requirement 7: CLI Execution Mode

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As a developer, I want to run the full simulation pipeline from the command line with a configurable region, so that I can test and iterate on the computation for any region independently.

#### Acceptance Criteria

1. THE system SHALL provide a CLI entry point via `python backend/main.py` that accepts command-line arguments for ignition point (`--lat`, `--lon`), wind parameters (`--wind-speed`, `--wind-dir`, `--humidity`), number of Monte Carlo runs (`--num-runs`, default 500), and a `--seed-dir` argument to specify the Region_Dataset directory to load. The API request body uses the matching field name `num_runs`.
2. WHEN the `--seed-dir` argument is not provided, THE system SHALL default to the bundled Paradise, CA Region_Dataset.
3. WHEN executed via CLI, THE system SHALL run the full pipeline: load the specified Region_Dataset, execute Monte Carlo simulations with provided or default wind values, and output aggregated results.
4. THE system SHALL write CLI output results to a JSON file in a configurable output directory.
5. THE system SHALL print a summary to stdout including: region name, total cells burned (mean), simulation duration, and number of runs completed.

### Requirement 8: Project Structure and Module Separation

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As a team member, I want a clean module structure with strict separation of concerns, so that multiple developers can work in parallel without conflicts.

#### Acceptance Criteria

1. THE system SHALL organize all backend code under the `/backend` directory with separate modules for: simulation (fire spread), monte_carlo (stochastic engine), evacuation (routing and optimization), data (loaders and pipeline), api (FastAPI endpoints and schemas), and models (Pydantic data models).
2. THE system SHALL use NumPy for all grid-based simulation computations, SciPy for probability distributions and sampling, and NetworkX for road graph construction and routing.
3. THE system SHALL define all API request and response models as Pydantic schemas in a dedicated models module, shared between the API_Layer and CLI output.
4. THE system SHALL not include any frontend, visualization, or UI code in the `/backend` directory.

### Requirement 9: Demo Region Configuration

**Priority:** High (Phase 2 — Routing)

**User Story:** As a demo presenter, I want the system to ship with a complete Paradise, CA region dataset as the default, so that the demo runs immediately with realistic data derived from real public sources while the architecture supports loading any region.

#### Acceptance Criteria

1. THE system SHALL bundle a Paradise, CA Region_Dataset at `backend/data/seed/paradise-ca/` containing all required Region_Dataset files as defined in Requirement 11, with all data derived from real public sources as defined in Requirement 12.
2. THE Paradise Region_Config SHALL specify the region name "Paradise, CA", bounding box `min_lat: 39.65`, `max_lat: 39.90`, `min_lon: -121.75`, `max_lon: -121.40` (signed decimal degrees, west is negative), and the Camp Fire origin (lat: 39.8103, lon: -121.4377) as the default ignition point.
3. THE Paradise Region_Dataset SHALL include the Camp Fire perimeter from real NIFC WFIGS data as the default initial fire state at simulation time t=0.
4. THE Paradise Region_Dataset SHALL include at least three scenario presets in `scenario_presets.json` with the following parameters:
   - **Fast Wind Shift**: ignition at Camp Fire origin (39.8103, -121.4377), wind 25 mph NE (45°), gust 40 mph, humidity 10%.
   - **Night Evacuation**: ignition at Camp Fire origin (39.8103, -121.4377), wind 10 mph SW (225°), gust 15 mph, humidity 30%.
   - **School Zone**: ignition near Paradise schools (39.7596, -121.6219), wind 15 mph N (0°), gust 25 mph, humidity 15%.
5. WHEN no `seed_dir` or region is specified by the user, THE system SHALL load the bundled Paradise, CA Region_Dataset as the default.
6. THE Paradise Region_Dataset fuel grid SHALL be derived from real LANDFIRE FBFM40 data, the road network from real OpenStreetMap data, the population zones from real US Census data, and the shelter locations from real OpenStreetMap amenity data.

### Requirement 10: Simulation Output Serialization

**Priority:** Medium (Phase 4 — Polish)

**User Story:** As a frontend developer, I want simulation outputs in a well-defined serializable format, so that I can render burn maps, routes, and metrics without additional processing.

#### Acceptance Criteria

1. THE system SHALL serialize the Burn_Probability_Map as a 2D array of float values (0.0 to 1.0) with associated grid_bounds metadata (bounding box, cell size, grid dimensions).
2. THE system SHALL serialize arrival time distributions as per-cell statistics including mean, median, 10th percentile, and 90th percentile arrival timesteps.
3. THE system SHALL serialize evacuation routes as ordered lists of (lat, lon) coordinate pairs with per-segment Route_Viability_Score and travel_time.
4. THE system SHALL serialize zone results as GeoJSON features with properties including zone_id, population, Cutoff_Time, evacuation_priority_score, best_baseline_route_id, best_optimized_route_id, and failure_risk_percentage.
5. FOR ALL valid Scenario configurations, serializing results to JSON then deserializing back SHALL produce an equivalent data structure (round-trip property).

### Requirement 11: Region Dataset Specification

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As a developer or data engineer, I want a well-defined standard for region datasets, so that I can prepare data for any geographic region and the system will load and simulate it correctly.

#### Acceptance Criteria

1. THE system SHALL define a Region_Dataset as a directory containing the following required files: `region_config.json`, `fuel_grid.npy`, `grid_bounds.json`, `road_graph.json`, `zones.geojson`, `shelters.json`, and `scenario_presets.json`.
2. THE system SHALL treat a fire perimeter GeoJSON file as optional within a Region_Dataset; WHEN present, the filename SHALL be specified in `region_config.json` under the `fire_perimeter_file` field.
3. THE `region_config.json` file SHALL contain the following fields: `region_name` (string), `bounding_box` (object with `min_lat`, `max_lat`, `min_lon`, `max_lon` as signed decimal degree floats — west longitudes are negative), `default_ignition_point` (object with `lat` and `lon` as signed decimal degree floats), and `fire_perimeter_file` (string or null).
4. THE `road_graph.json` file SHALL use NetworkX node-link JSON format with the following schema: `{"nodes": [{"id": int, "lat": float, "lon": float}], "links": [{"source": int, "target": int, "travel_time": float, "capacity": int, "highway": string}]}`. `travel_time` is in minutes, `capacity` is in vehicles/hour, and `highway` is the OSM road class (e.g., "primary", "residential"). Node `id` values are integers (OSM node IDs or sequential).
5. THE `grid_bounds.json` file SHALL conform to the following schema: `{"min_lat": float, "max_lat": float, "min_lon": float, "max_lon": float, "cell_size_m": float, "grid_rows": int, "grid_cols": int}`. All lat/lon values are signed decimal degrees. `cell_size_m` defaults to 100.0. `grid_rows` and `grid_cols` define the fuel grid dimensions.
6. THE `shelters.json` file SHALL conform to the following schema: `[{"shelter_id": string, "name": string, "lat": float, "lon": float, "capacity": int, "accessible": bool}]`. `shelter_id` is a unique identifier (e.g., "osm_12345"), `capacity` is estimated persons, and `accessible` indicates wheelchair accessibility.
7. THE `scenario_presets.json` file SHALL conform to the following schema: `[{"name": string, "description": string, "ignition_lat": float, "ignition_lon": float, "wind_speed_mph": float, "wind_direction_deg": float, "wind_gust_mph": float, "relative_humidity": float}]`. All wind values are in mph, direction in degrees (0–360), and humidity as a 0–100 percentage.
8. WHEN the SeedDataLoader loads a Region_Dataset, THE SeedDataLoader SHALL validate that all required files listed in acceptance criterion 1 are present in the directory before proceeding with data loading.
9. IF a required Region_Dataset file is missing, THEN THE SeedDataLoader SHALL raise a descriptive error listing all missing files.
10. THE SeedDataLoader SHALL validate that the `region_config.json` conforms to the expected schema (contains all required fields with correct types) and raise a descriptive error if validation fails.
11. THE system SHALL use the `default_ignition_point` from `region_config.json` when no ignition point is specified by the user, instead of relying on a hardcoded default.
12. THE system SHALL use the `bounding_box` from `region_config.json` for grid initialization and coordinate validation within the loaded region, instead of relying on hardcoded coordinate ranges.

### Requirement 12: Real Data Sources — No Synthetic Seed Data

**Priority:** Critical (Phase 1 — MVP)

**User Story:** As an evacuation planner, I want all simulation data sourced from real public datasets and APIs, so that simulation results reflect actual terrain, road networks, population demographics, and shelter locations rather than fabricated data.

#### Acceptance Criteria

1. THE system SHALL NOT use synthetic, fabricated, or placeholder data for any data source in production or demo Region Datasets. All data files within a Region_Dataset SHALL be derived from real public data sources.
2. THE fuel grid (`fuel_grid.npy`) SHALL be derived from real USGS LANDFIRE FBFM40 raster data fetched via the LANDFIRE Product Service API, NOT from randomly generated or synthetic fuel grids.
3. THE road network (`road_graph.json`) SHALL be derived from real OpenStreetMap data fetched via the Overpass API, NOT from synthetic or hand-crafted graph structures.
4. THE population and vulnerability zones (`zones.geojson`) SHALL be derived from real US Census Bureau data (ACS 5-Year demographics joined to TIGER/Web block group geometries), NOT from synthetic population figures or fabricated zone polygons.
5. THE shelter locations (`shelters.json`) SHALL be derived from real OpenStreetMap amenity data (shelters, community centres, schools, places of worship, civic buildings, emergency assembly points) fetched via the Overpass API, NOT from manually placed or synthetic shelter entries.
6. THE fire perimeter data (when present) SHALL be derived from real NIFC WFIGS (Wildland Fire Interagency Geospatial Services) perimeter data fetched via the ArcGIS REST API, NOT from synthetic or hand-drawn perimeters.
7. THE wind data SHALL be fetched live from the National Weather Service api.weather.gov API as specified in Requirement 4, with fallback values used ONLY when the API is unreachable — NOT as a primary data source.
8. THE system SHALL provide a data ingestion pipeline (`backend/data/ingest/`) that fetches all required Region_Dataset files from their respective real data sources given a center coordinate (lat, lon) and radius.
9. THE data ingestion pipeline SHALL be executable via both a CLI command (`python backend/main.py ingest --lat {lat} --lon {lon} --radius {radius_km}`) and an API endpoint (`POST /api/ingest`).
10. WHEN a real data source API is temporarily unavailable during ingestion, THE system MAY use a clearly-logged fallback with a warning, but the fallback SHALL be documented as degraded data quality and SHALL NOT be the default or intended mode of operation.
11. THE bundled Paradise, CA demo Region_Dataset SHALL contain data derived from the real data sources listed above (LANDFIRE, OSM, Census, NIFC), NOT synthetic approximations.
12. THE scenario presets (`scenario_presets.json`) are the ONLY data file exempt from the real-data requirement, as they represent hypothetical "what-if" configurations rather than observed data.

---

## Agent Development Playbook

Below is a phased todo list with prompts to run for each phase. Each phase ends with a validation step before proceeding.

### Phase 1 — MVP: Fire Simulation Core

**Goal:** A CLI-runnable system that simulates fire spread with Monte Carlo and outputs burn probability maps. Region dataset structure is established.

| Step | Task | Agent Prompt |
|------|------|-------------|
| 1.1 | Scaffold project structure | "Create the /backend directory structure with modules: simulation/, monte_carlo/, data/, evacuation/, api/, models/. Add __init__.py files, requirements.txt with numpy, scipy, networkx, fastapi, uvicorn, pydantic, shapely, requests. Add main.py CLI entry point stub." |
| 1.2a | Implement data ingestion pipeline | "Implement the data ingestion pipeline at /backend/data/ingest/ with modules for each data source: fuel.py (LANDFIRE), roads.py (Overpass), zones.py (Census+TIGER), shelters.py (Overpass), perimeters.py (NIFC), region.py (config generator), scenarios.py (preset generator), orchestrator.py (ties all together), and overpass.py (shared rate limiter). Each module fetches from its real API and outputs the corresponding seed file." |
| 1.2b | Generate Paradise seed data | "Run the ingestion pipeline for Paradise, CA (lat=39.7596, lon=-121.6219, radius_km=15) to generate the bundled seed dataset at /backend/data/seed/paradise-ca/. If any API is temporarily unavailable, log a warning and document which files are degraded — the simulation pipeline work (steps 1.4–1.6) can proceed with whatever files are available while data issues are resolved separately." |
| 1.3 | Build seed data loaders | "Implement /backend/data/loader.py with a SeedDataLoader class that accepts a configurable seed_dir path. It loads all region dataset files (region_config.json, fuel_grid.npy, grid_bounds.json, fire perimeter if specified, road_graph.json, zones.geojson, shelters.json, scenario_presets.json) with validation for required files and error handling for missing/malformed files. Default seed_dir to backend/data/seed/paradise-ca/. All seed data must be derived from real public data sources — no synthetic data." |
| 1.4 | Implement fire spread engine | "Implement /backend/simulation/fire_spread.py with the simplified Rothermel model: R0=0.05 km/min, wind_factor=exp(0.1783*wind_speed*cos(angle)), moisture_factor=1-(rh/100)*0.8. Grid is 100m cells, 1-min timesteps. Use NumPy vectorized operations. Track ignition times per cell." |
| 1.5 | Implement Monte Carlo engine | "Implement /backend/monte_carlo/engine.py that runs N simulations sampling wind_speed~Normal(μ,3), wind_dir~Normal(μ,15), civ_delay~Uniform(2,15), road_closure~Beta(1.5,8.5). Aggregate into burn probability map and arrival time stats. Support deterministic seeding." |
| 1.6 | Wire CLI entry point | "Wire /backend/main.py to accept CLI args (--lat, --lon, --wind-speed, --wind-dir, --humidity, --num-runs, --seed-dir), load the specified region dataset (defaulting to paradise-ca), run Monte Carlo, and output results JSON + stdout summary including region name." |

**Validation:** `python backend/main.py --num-runs 10` completes without error using the Paradise default region and produces a results JSON with a burn probability map. `python backend/main.py --seed-dir path/to/other/region --num-runs 10` loads a different region dataset.

### Phase 2 — Routing: Road Graph + Baseline Evacuation

**Goal:** Shortest-path evacuation routing on the road network with per-zone results.

| Step | Task | Agent Prompt |
|------|------|-------------|
| 2.1 | Build road graph loader | "Enhance /backend/data/loader.py to construct a NetworkX DiGraph from road_graph.json with travel_time and capacity edge attributes. Map highway classes to default speeds and capacities per the dataspec." |
| 2.2 | Implement baseline routing | "Implement /backend/evacuation/router.py with baseline shortest-path routing using Dijkstra on travel_time to nearest shelter for each zone centroid. Output per-zone: route node list, total travel_time, shelter_id." |
| 2.3 | Verify demo region defaults | "Ensure the Paradise region_config.json provides correct defaults (bbox, Camp Fire ignition point, scenario presets). Ensure CLI runs with zero arguments using all defaults from the bundled Paradise region dataset." |

**Validation:** `python backend/main.py --num-runs 10` now includes per-zone baseline routes in the output JSON, with defaults sourced from region_config.json.

### Phase 3 — API: FastAPI + Optimized Routing + Wind

**Goal:** Synchronous REST API serving simulation results, live wind fetch, optimized routing. API accepts any valid lat/lon worldwide.

| Step | Task | Agent Prompt |
|------|------|-------------|
| 3.1 | Define Pydantic schemas | "Create /backend/models/schemas.py with Pydantic models for: SimulationRequest (lat: -90 to 90, lon: -180 to 180, optional seed_dir), SimulationResponse, WindResponse, ScenarioPreset. Include all fields from requirements." |
| 3.2 | Implement FastAPI endpoints | "Implement /backend/api/routes.py with synchronous POST /api/simulate (accepts optional seed_dir), GET /api/wind, GET /api/scenarios (accepts optional seed_dir query param). Wire to simulation and data modules. Add CORS middleware." |
| 3.3 | Implement NWS wind client | "Implement /backend/data/wind_client.py that fetches from api.weather.gov, parses wind strings to floats, converts compass to degrees. Include fallback values and manual override support. Works for any lat/lon worldwide." |
| 3.4 | Implement optimized routing | "Extend /backend/evacuation/router.py with optimized cost function: cost = α*travel_time + β*congestion + γ*fire_exposure + δ*road_closure. Compute fire_exposure from simulation grid state at traversal time. Return both baseline and optimized routes." |

**Validation:** `uvicorn backend.api.app:app` starts, `POST /api/simulate` returns full results with baseline and optimized routes. Lat/lon accepts any valid worldwide coordinates. Optional seed_dir parameter loads alternate region datasets.

### Phase 4 — Polish: Full Scoring + Serialization + Demo

**Goal:** Complete viability scoring, polished output format, demo-ready system.

| Step | Task | Agent Prompt |
|------|------|-------------|
| 4.1 | Add viability scoring | "Extend /backend/evacuation/router.py with Route_Viability_Score (% MC runs route succeeds), Cutoff_Time per zone, evacuation ordering by priority_score, and failure risk percentage." |
| 4.2 | Polish output serialization | "Ensure all outputs match Requirement 10: burn map as 2D float array with grid_bounds, arrival times with percentiles, routes as (lat,lon) pairs, zones as GeoJSON. Verify round-trip JSON serialization." |
| 4.3 | End-to-end demo flow | "Test the full demo flow: default Paradise scenario → simulate → view results → change wind → re-simulate → compare. Ensure 3-minute demo is achievable. Test with a second region dataset to verify region-agnostic architecture. Add README with setup and demo instructions." |

**Validation:** Full end-to-end run with `POST /api/simulate` returns complete results including viability scores, cutoff times, and evacuation ordering. CLI produces equivalent output. System works with both the bundled Paradise dataset and a custom region dataset.
