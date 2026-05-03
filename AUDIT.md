# EvacuAI Backend — Phase 1 Audit Report

**Auditor:** Kiro (review instance)
**Date:** 2026-05-02
**Scope:** All files produced by the brother instance, checked against `design.md` and `requirements.md`.

---

## Summary

The brother instance completed a substantial amount of work: project scaffolding, all Pydantic schemas, fire spread engine, Monte Carlo engine, evacuation router (baseline + optimized + viability), data loader, wind client, full data ingestion pipeline, CLI with ingest subcommand, and real seed data for Paradise-CA and Malibu-CA. The overall architecture is sound and follows the spec structure.

However, there are **critical correctness bugs** in the fire spread engine and Monte Carlo engine, **missing spec-required models/fields** in schemas, and several **design deviations** that will cause failures in later phases (API, tests, integration).

---

## Critical Errors

### C1. `fire_spread.py` — Stochastic ignition inside a deterministic engine

**File:** `backend/simulation/fire_spread.py`, lines ~90-95
**Spec says:** `FireSpreadEngine.run()` executes "one **deterministic** fire spread simulation." The Monte Carlo engine handles stochasticity by sampling parameters *before* calling `run()`.
**Code does:** Creates `rng = np.random.default_rng()` (unseeded!) inside `run()` and uses `rand_vals = rng.random(len(nr))` to stochastically decide ignition per cell.
**Impact:** Violates **Property 7 (Deterministic Seeding)** — even with the same inputs, `run()` produces different results every time. The Monte Carlo engine's `SeedSequence` reproducibility is completely undermined because the fire engine has its own uncontrolled RNG. Also violates **Property 1** — the spec says `ignition_probability = min(1.0, spread_rate * 1.0)` and the cell ignites if a random draw is below that probability, but the design doc describes this as a *probability threshold*, not a stochastic draw. The Rothermel model in the spec is deterministic: if `spread_rate >= 1.0`, the cell always ignites; if `spread_rate < 1.0`, it ignites with that probability. However, the RNG must be passed in or seeded deterministically.

**Fix:** Accept an optional `rng: np.random.Generator | None` parameter in `run()`. If `None`, use deterministic behavior (ignite if `prob >= threshold`, e.g. 0.5, or always ignite — check spec intent). The Monte Carlo engine should pass its per-run `rng` to `run()` so that stochastic ignition is reproducible. At minimum, the RNG must be seeded from the MC engine's per-run seed.

**Justification:** Property 7 requires identical results with the same seed. An unseeded RNG inside the deterministic engine makes this impossible.

---

### C2. `fire_spread.py` — Neighbor offset index lookup is broken

**File:** `backend/simulation/fire_spread.py`, line ~87
**Code does:**
```python
idx = neighbor_offsets.index((dr, dc, _))
```
**Problem:** The variable `_` here is the loop variable from the `for dr, dc, _ in neighbor_offsets:` loop. But `_` is the bearing of the *current* neighbor being iterated. So `neighbor_offsets.index((dr, dc, _))` is looking up the tuple `(dr, dc, current_bearing)` — this works by coincidence because `_` IS the correct bearing for this iteration. However, this is fragile and confusing. More importantly, the `list.index()` call is O(n) on every burning cell × every neighbor, which is a performance concern on large grids.

**Fix:** Use `enumerate()` on the outer loop instead:
```python
for idx, (dr, dc, bearing_deg) in enumerate(neighbor_offsets):
    ...
    wf = wind_factors[idx]
```

**Justification:** Correctness by construction rather than coincidence, and avoids O(n) lookup per iteration.

---

### C3. `monte_carlo/engine.py` — Does not pass RNG to fire engine

**File:** `backend/monte_carlo/engine.py`, lines ~55-62
**Spec says:** Each MC run creates a fresh `numpy.random.Generator` from a `SeedSequence` derived from the master seed. This RNG should control ALL randomness in that run.
**Code does:** Creates `rng` per run but only uses it for sampling wind/delay/closures. The `fire_engine.run()` call does not receive this RNG — the fire engine creates its own unseeded RNG internally (see C1).
**Impact:** Deterministic reproducibility (Property 7) is broken.

**Fix:** After fixing C1 to accept an `rng` parameter, pass the per-run `rng` to `self.fire_engine.run(...)`.

---

### C4. `evacuation/router.py` — `_fire_exposure` recomputes graph bounds on every call

**File:** `backend/evacuation/router.py`, lines ~155-160
**Code does:** Inside `_fire_exposure()`, for every edge sample point, it computes:
```python
gb_min_lat = min(self.G.nodes[n]["lat"] for n in self.G.nodes)
gb_max_lat = max(self.G.nodes[n]["lat"] for n in self.G.nodes)
gb_min_lon = min(self.G.nodes[n]["lon"] for n in self.G.nodes)
gb_max_lon = max(self.G.nodes[n]["lon"] for n in self.G.nodes)
```
This iterates ALL graph nodes (58,134 for Paradise) **for every edge, for every sample point, for every zone, for every MC run**. With 500 MC runs × 200 zones × ~10 edges per path × 3 samples × 4 iterations = billions of node iterations.

**Impact:** This will make optimized routing astronomically slow — likely hours instead of the 5-minute SLA. This is a **performance-critical bug**.

**Fix:** The router already has access to `GridBounds` (or should). Either:
1. Store `grid_bounds` in `__init__` and use it in `_fire_exposure`, or
2. Precompute the graph's lat/lon bounds once in `__init__`.

**Justification:** Requirement 5.5a mandates 500 runs complete within 5 minutes. This code makes that impossible.

---

### C5. `evacuation/router.py` — `_fire_exposure` uses graph bounds instead of grid bounds

**File:** `backend/evacuation/router.py`, lines ~155-165
**Spec says:** Fire exposure should map edge coordinates to the fire grid using the simulation's `GridBounds`.
**Code does:** Uses the road graph's node lat/lon extents as the coordinate system for mapping to the fire grid. These are different from the simulation grid bounds (the road graph may extend beyond or not cover the full fire grid).
**Impact:** Fire exposure calculations will map to wrong grid cells, producing incorrect cost function values. Violates **Property 10**.

**Fix:** Pass `GridBounds` to `compute_optimized_routes()` (or store it in `__init__`) and use it for coordinate-to-cell conversion, consistent with `FireSpreadEngine._latlon_to_cell()`.

---

### C6. `evacuation/router.py` — `compute_viability_scores` uses hardcoded cutoff_time=180

**File:** `backend/evacuation/router.py`, lines ~210-215
**Spec says (Property 12):** Cutoff_Time is the latest timestep T such that starting evacuation at T yields viability > 50%, and T+1 yields ≤ 50%. This requires sweeping over timesteps.
**Code does:**
```python
cutoff_time = None
if viability > 50.0:
    cutoff_time = 180  # default max
```
This is a stub — it just returns 180 if viability is above 50%, regardless of when fire actually arrives.

**Impact:** Cutoff times will be meaningless. Violates **Property 12** and **Requirement 5.7**.

**Fix:** Implement the actual cutoff time calculation: for each zone, sweep start times from 0 to max_timesteps, compute viability at each start time, find the latest T where viability > 50%. This can be done efficiently by checking when fire arrives at route nodes across MC runs.

**Justification:** This is a Phase 4 feature, so it's acceptable as a stub *if documented as such*. But it's not marked as a stub — it silently returns wrong data.

---

### C7. `schemas.py` — `SeedData` model missing `fuel_grid` and `road_graph` fields

**File:** `backend/models/schemas.py`, lines ~130-140
**Spec says:** `SeedData` should contain `fuel_grid`, `road_graph`, and `fire_perimeter` alongside the Pydantic fields.
**Code does:** `SeedData` only has Pydantic fields (region_config, grid_bounds, zones, shelters, scenario_presets). The loader hacks around this:
```python
result.__dict__['fuel_grid'] = fuel_grid
result.__dict__['road_graph'] = road_graph
```
**Impact:** No type safety for the most critical data structures. Accessing `data.fuel_grid` works at runtime but has no IDE support, no validation, and will confuse any developer. The `main.py` already shows the awkwardness: `data.__dict__["fuel_grid"]`.

**Fix:** Either:
1. Add `fuel_grid: Any` and `road_graph: Any` and `fire_perimeter: Any` fields to `SeedData` with `model_config = ConfigDict(arbitrary_types_allowed=True)` (Pydantic v2 style), or
2. Make `SeedData` a plain dataclass instead of a Pydantic model (it's internal, not serialized over the wire).

**Justification:** The current approach is fragile and non-idiomatic. Every consumer has to use `__dict__` access.

---

## Major Errors

### M1. `fire_spread.py` — Wind direction convention may be inverted for neighbor bearings

**File:** `backend/simulation/fire_spread.py`, lines ~65-75
**Spec says:** Neighbor bearings: "0° = North, 90° = East". The offset `(-1, 0)` means row decreases = moving north in the grid (since row 0 is max_lat). So `(-1, 0)` → bearing 0° (North) is correct.
**Code does:** `(-1, 0, 0.0)` for N — this is correct.
**Verdict:** The bearing assignments are correct. No fix needed.

---

### M2. `fuel.py` — Uses NLCD instead of LANDFIRE FBFM40

**File:** `backend/data/ingest/fuel.py`
**Spec says (Req 12.2):** "The fuel grid SHALL be derived from real USGS LANDFIRE FBFM40 raster data fetched via the LANDFIRE Product Service API."
**Code does:** Uses NLCD 2021 Land Cover from MRLC WCS instead.
**Impact:** The fuel multiplier mapping is fundamentally different. NLCD has ~16 land cover classes; FBFM40 has 40 fuel behavior models specifically designed for fire spread modeling. The multiplier values in `NLCD_TO_MULTIPLIER` are reasonable approximations but are NOT the spec-required data source.

**Fix:** This was noted in the file list as "replaced LANDFIRE with NLCD" — presumably because the LANDFIRE API was unavailable or too complex. This is acceptable as a pragmatic deviation IF:
1. It's documented as a known deviation from the spec
2. The README/comments note that NLCD is a proxy for FBFM40
3. The multiplier mapping is validated against known fire behavior

**Justification:** NLCD is a reasonable proxy. The spec allows degraded data with warnings (Req 12.10). But it should be explicitly documented.

---

### M3. `scenarios.py` — School Zone preset uses generic coordinates instead of spec-required ones

**File:** `backend/data/ingest/scenarios.py`
**Spec says (Req 9.4):** School Zone preset should use ignition near Paradise schools at `(39.7596, -121.6219)`.
**Code does:** Uses the generic `lat, lon` passed to the function (which is the region center, not the school location). The Paradise `scenario_presets.json` has been hand-corrected to `(39.7606, -121.6202)` which is close but not exact.
**Impact:** Minor — the hand-corrected values are close enough. But the generator function will produce wrong School Zone coordinates for other regions.

**Fix:** The generator should accept an optional `school_zone_coords` parameter, or the Paradise presets should be treated as a special case with exact coordinates from the spec.

---

### M4. `main.py` — Fire exposure probability uses centroid cell only, not zone polygon

**File:** `backend/main.py`, lines ~45-55
**Spec says (Glossary, Req 5.8):** `fire_exposure_probability` is "the mean Burn_Probability_Map value across all grid cells whose centers fall within the zone's polygon boundary."
**Code does:** Uses only the single centroid cell value:
```python
fire_exposure_probs[zone.zone_id] = float(result.burn_probability_map[row, col])
```
**Impact:** For large zones, the centroid may not be representative. A zone could have high fire exposure on its edges but low at the centroid, producing incorrect evacuation ordering. Violates **Property 13**.

**Fix:** Iterate over all grid cells within the zone polygon (using Shapely `contains` or rasterization) and compute the mean burn probability. This is a one-time computation per zone after MC completes, so performance is not a concern.

---

### M5. `main.py` — Output JSON doesn't match `SimulationResponse` schema

**File:** `backend/main.py`, lines ~60-100
**Spec says:** CLI output should match the `SimulationResponse` Pydantic model.
**Code does:** Builds a manual dict with different structure:
- Missing `scenario` field
- `zone_results` has simplified structure (missing `evacuation_priority_score`, `cutoff_time`, `failure_risk_pct`, `baseline_route` as full `RouteResult`, `optimized_route`, `geometry`)
- `baseline_route` is a simplified dict with `shelter_id`, `total_travel_time_min`, `node_count` instead of the full `RouteResult` model

**Impact:** Frontend integration will break — the API and CLI are supposed to share the same schema. Violates **Requirement 10.3, 10.4**.

**Fix:** Construct a proper `SimulationResponse` object and call `.model_dump()` for JSON output. This ensures CLI and API produce identical output structures.

---

### M6. `loader.py` — `load_fire_perimeter` returns raw GeoJSON dict, not rasterized mask

**File:** `backend/data/loader.py`, line ~95
**Spec says (Req 3.2):** "THE SeedDataLoader SHALL load the fire perimeter from a GeoJSON file and **rasterize the polygon into a binary burn mask** on the Fire_Grid at 100m resolution."
**Code does:** Returns raw GeoJSON dict with comment "rasterization done at sim time."
**Impact:** The fire perimeter is never actually rasterized anywhere in the codebase. The perimeter data is loaded but unused in the simulation pipeline.

**Fix:** Either:
1. Implement rasterization in the loader using Shapely (create a binary mask matching fuel_grid dimensions), or
2. Implement it in the fire spread engine as an initial burn state.

**Justification:** Without rasterization, the Camp Fire perimeter (a key demo feature) has no effect on simulations.

---

### M7. `overpass.py` — Rate limiter uses global mutable state, not thread-safe

**File:** `backend/data/ingest/overpass.py`
**Spec says:** "shared thread-safe Overpass rate limiter with slot-based throttling."
**Code does:** Uses a global `_last_request_time` float with no locking.
**Impact:** If the API ingest endpoint uses `BackgroundTasks` (as specified), concurrent ingestion requests will race on the rate limiter.

**Fix:** Use `threading.Lock` around the time check and sleep, or use a `threading.Semaphore`.

---

### M8. `zones.py` — Elderly percentage calculation only counts male 65+ columns

**File:** `backend/data/ingest/zones.py`, line ~72
**Code does:**
```python
elderly = sum(int(row[idx(f"B01001_0{c:02d}E")] or 0) for c in range(20, 26))
```
**Problem:** ACS table B01001 columns 020-025 are male 65+ age groups. The female 65+ equivalents are columns 044-049. The code only sums male elderly, undercounting by roughly half.
**Impact:** `elderly_pct` will be approximately half of the true value for all zones, affecting evacuation priority scoring.

**Fix:** Also sum female elderly columns:
```python
elderly_male = sum(int(row[idx(f"B01001_0{c:02d}E")] or 0) for c in range(20, 26))
elderly_female = sum(int(row[idx(f"B01001_0{c:02d}E")] or 0) for c in range(44, 50))
elderly = elderly_male + elderly_female
```
But note: the ACS query in the code doesn't even request columns B01001_044E through B01001_049E. The `get` parameter needs to be expanded.

---

### M9. `zones.py` — Disability data uses wrong ACS columns

**File:** `backend/data/ingest/zones.py`, line ~73
**Code does:**
```python
disabled = int(row[idx("B18101_004E")] or 0) + int(row[idx("B18101_007E")] or 0)
```
**Problem:** Table B18101 is "Sex by Age by Disability Status." Columns 004 and 007 are specific age/sex/disability cross-tabs, not total disabled population. The total disabled count requires summing all "with a disability" rows across age groups and sexes.
**Impact:** Disability percentages will be significantly underestimated.

**Fix:** Use table C18108 (Age by Disability Status) or sum all disability rows from B18101. Alternatively, use a simpler table like B18101_001E (total) and B18101_002E (with disability) if available at block group level.

---

## Minor Errors

### m1. `schemas.py` — Uses Pydantic v1 `Config` class instead of v2 `model_config`

**File:** `backend/models/schemas.py`, line ~138
**Code does:**
```python
class Config:
    arbitrary_types_allowed = True
```
**Should be (Pydantic v2):**
```python
model_config = ConfigDict(arbitrary_types_allowed=True)
```
**Impact:** Works in Pydantic v2 via backward compatibility, but emits deprecation warnings.

---

### m2. `test_api_connectivity.py` — Not a pytest test, uses `if __name__` pattern

**File:** `backend/tests/test_api_connectivity.py`
**Impact:** `pytest` will discover the `test_*` functions but they make real HTTP calls to external APIs, which will fail in CI or offline environments. These should be in a separate `scripts/` directory or marked with `@pytest.mark.skip` / `@pytest.mark.integration`.

---

### m3. `perimeters.py` — WFIGS query uses `attr_IncidentName` field name

**File:** `backend/data/ingest/perimeters.py`, line ~42
**Code does:** `"where": f"attr_IncidentName LIKE '%{fire_name}%'"`
**Problem:** The NIFC WFIGS field name may be `IncidentName` (without `attr_` prefix) depending on the service version. The test file `test_api_connectivity.py` uses `IncidentName` (no prefix) and it works. The `attr_` prefix is used in some WFIGS service versions but not others.
**Impact:** The WFIGS query may return no results, falling through to GeoMAC historical.

**Fix:** Try both field names, or use the one confirmed working in the test (`IncidentName`).

---

### m4. `perimeters.py` — SQL injection risk in fire_name parameter

**File:** `backend/data/ingest/perimeters.py`, lines ~42, ~62
**Code does:** `f"attr_IncidentName LIKE '%{fire_name}%'"` — directly interpolates user input into a SQL-like WHERE clause.
**Impact:** A malicious `fire_name` could inject arbitrary query conditions. Low risk since this is an ArcGIS REST API (not a real SQL database), but still bad practice.

**Fix:** Validate/sanitize `fire_name` to alphanumeric + spaces only before interpolation.

---

### m5. `main.py` — Missing `--wind-gust` in CLI help/README

**File:** `backend/main.py`
**Code has:** `--wind-gust` argument with default 20.0.
**README says:** No mention of `--wind-gust` in the CLI usage example.
**Impact:** Minor documentation gap.

---

### m6. `main.py` — `ingest` subcommand doesn't validate US-only coordinates

**File:** `backend/main.py`, lines ~105-115
**Spec says (Req 12.9):** CLI ingest should validate US-only coordinates (lat 18–72, lon -180 to -65).
**Code does:** No validation — passes lat/lon directly to `run_ingestion()`.
**Impact:** Non-US coordinates will be accepted by CLI but produce empty/failed results from US-only data sources.

**Fix:** Add validation before calling `run_ingestion()`:
```python
if not (18.0 <= args.lat <= 72.0 and -180.0 <= args.lon <= -65.0):
    print("Error: Ingestion requires US coordinates", file=sys.stderr)
    sys.exit(1)
```

---

### m7. `schemas.py` — Missing `description` fields on most model fields

**File:** `backend/models/schemas.py`
**Spec shows:** `Field(..., description="...")` on most fields.
**Code does:** Only `SimulationRequest` has descriptions; all other models omit them.
**Impact:** API documentation (OpenAPI/Swagger) will lack field descriptions.

---

### m8. Paradise `scenario_presets.json` — School Zone ignition coordinates slightly off

**Spec says:** `(39.7596, -121.6219)`
**File has:** `(39.7606, -121.6202)`
**Impact:** ~150m difference. Negligible for simulation but doesn't match spec exactly.

---

## Missing Components (Expected for Later Phases)

These are not errors — they're noted for tracking:

1. **`api/app.py`** and **`api/routes.py`** — Not implemented (Phase 3, Task 12)
2. **Property-based tests** (`test_properties.py`) — None written yet (Tasks 2.2-2.4, 4.2-4.5, etc.)
3. **Unit tests** for loader, fire spread, MC, router, wind client — None written yet
4. **Optimized routing integration into MC loop** — `compute_optimized_routes` exists but is never called from `MonteCarloEngine.run()`. The `SingleRunResult.optimized_routes` is always `{}`.
5. **Fire perimeter rasterization** — Loaded but never used in simulation

---

## Seed Data Assessment

### Paradise, CA ✅ (with caveats)
- `region_config.json` — Matches spec bbox and ignition point exactly ✅
- `fuel_grid.npy` — Shape (277, 298) matches grid_bounds, values 0.0–1.3 within range ✅ (NLCD-derived, not FBFM40 — see M2)
- `grid_bounds.json` — Consistent with region_config bbox ✅
- `road_graph.json` — 58,134 nodes, 117,088 links, real OSM data ✅
- `zones.geojson` — 200 features with all required fields, real Census data ✅ (elderly_pct undercounted — see M8)
- `shelters.json` — 29 shelters, real OSM data ✅ (all capacity=100, all accessible=false — see note below)
- `scenario_presets.json` — 3 presets matching spec names ✅ (School Zone coords slightly off — see m8)
- `paradise-ca_perimeter.geojson` — Real Camp Fire perimeter, MultiPolygon ✅

**Note on shelters:** All 29 shelters have `capacity: 100` and `accessible: false`. The capacity is a default fallback (OSM rarely has capacity data). The `accessible` field only checks for `wheelchair=yes|designated` tags, which most OSM features lack. This is real data but low-quality — consider estimating capacity by building type (schools ~500, churches ~200, etc.).

### Malibu, CA ✅
- All 7 required files present ✅
- No fire perimeter (expected — `fire_perimeter_file: null`) ✅
- 3 shelters (one named "Hannah Montana House" — real OSM data, likely a joke entry) ⚠️

---

## Priority Fix Order

1. **C1 + C3** — Fix fire engine determinism (blocks Property 7, all MC reproducibility)
2. **C4 + C5** — Fix `_fire_exposure` performance and correctness (blocks 5-minute SLA)
3. **C7** — Fix `SeedData` model (blocks clean integration)
4. **M5** — Fix CLI output to match `SimulationResponse` schema (blocks frontend integration)
5. **M6** — Implement fire perimeter rasterization (blocks demo feature)
6. **C6** — Implement real cutoff time calculation (Phase 4, can stub with TODO)
7. **M4** — Fix fire exposure probability to use zone polygon (affects ordering accuracy)
8. **M8 + M9** — Fix Census data columns (requires re-ingestion)
9. **C2** — Fix neighbor index lookup (correctness by construction)
10. **m3** — Fix WFIGS field name (affects perimeter ingestion)
