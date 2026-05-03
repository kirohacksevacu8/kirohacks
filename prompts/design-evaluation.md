# Critical Evaluation: EvacuAI Design Document vs. Requirements

## Overall Assessment

The design document is **exceptionally thorough and largely faithful to the requirements**. The Mermaid diagrams, component interfaces, Pydantic schemas, property-based test plan, and error handling tables are all production-quality artifacts that will give a coding agent clear, unambiguous implementation targets. The vast majority of requirements are correctly translated.

That said, there are **2 correctness bugs, 4 design gaps, and 6 minor inconsistencies** that should be fixed before handing this to a coding agent. Left unresolved, two of these will cause incorrect simulation behavior.

---

## 🔴 Correctness Bugs — Will produce wrong results

### B1: `spread_rate` is treated as a probability directly — units are never converted

**Where:** `simulation.fire_spread` key implementation details (line ~224), Property 1 definition.

**The problem:** The Rothermel formula produces a spread *rate* in km/min (R0 = 0.05 km/min). The design says this value is used as a "spread probability" to decide whether a neighboring cell ignites each timestep. But a rate in km/min is not a probability in [0, 1] — they have completely different units and scales.

For example, with R0=0.05, fuel=1.5, a strong wind:  
`0.05 * 1.5 * exp(0.1783 * 30 * cos(0°)) = 0.075 * exp(5.349) ≈ 0.075 * 210 ≈ 15.8`

A spread probability of 15.8 is nonsensical. The design never defines how `spread_rate` (km/min) maps to a per-timestep ignition probability. Options include: (a) treat spread_rate as the probability of spreading per timestep directly (which breaks for high wind), (b) convert to cells-per-minute and use a threshold, or (c) use `min(1.0, spread_rate * cell_size_km / (R0 * max_timestep_duration))`.

**Impact:** The simulation will either clamp all values to 1.0 at moderate winds (fire spreads everywhere instantly), clip strangely, or raise a runtime error depending on what the coding agent implements.

**Recommendation:** Add an explicit conversion step. Simplest defensible approach: `ignition_probability = min(1.0, spread_rate * timestep_duration_min)` where `timestep_duration_min = 1.0`. This converts spread rate to a per-minute ignition probability bounded at 1.0. State this formula explicitly in the design under fire_spread implementation details.

---

### B2: Wind direction angle ambiguity — `cos(wind_angle_to_cell)` is not fully defined

**Where:** Req 1.2, design component interface for `FireSpreadEngine`, Property 1.

**The problem:** The formula uses `cos(wind_angle_to_cell)` where `wind_angle_to_cell` is described as "the angle between wind vector and cell-to-neighbor vector." But the wind direction convention (meteorological: 0° = wind *from* North, i.e., wind blows South) conflicts with the bearing convention for neighbor directions (0° = neighbor is to the North of burning cell). 

With meteorological convention: a 0° (North) wind means air is moving *southward*. The neighbor to the South of a burning cell has bearing 180°. The angle between the wind vector (pointing South = 180°) and the neighbor direction (180°) should be 0° (perfectly downwind), giving `cos(0°) = 1.0` — correct. But if the code naively uses `cos(wind_dir - neighbor_bearing)` = `cos(0° - 180°) = cos(-180°) = -1`, the south neighbor gets *minimum* spread probability — the exact opposite of correct behavior.

**Impact:** The fire will spread upwind instead of downwind, making all simulation results physically backwards.

**Recommendation:** Add an explicit statement: "Wind direction is converted from meteorological convention (degrees *from* North) to a vector direction (degrees *toward* which the wind blows) by adding 180° before computing neighbor angles. The downwind direction is `(wind_direction_deg + 180°) % 360°`. The angle used in the cosine is `neighbor_bearing - downwind_direction`."

---

## 🟡 Design Gaps — Missing or underspecified, will cause divergent implementations

### G1: The `EvacuationRouter` receives `road_closures` as a parameter but the type and shape are undefined

**Where:** `compute_optimized_routes` signature — `road_closures: np.ndarray`.

The MC engine samples road closure probability per edge from `Beta(1.5, 8.5)`. This produces a float per edge. But the router receives it as `np.ndarray` with no specified shape, index convention, or mapping from array index to edge. Is it indexed by edge position in the NetworkX adjacency list? By `(source_node_id, target_node_id)` tuple? A dict would be the natural structure but the type hint says `np.ndarray`.

**Recommendation:** Change to `road_closures: dict[tuple[int, int], float]` — keyed by `(source, target)` node ID pair, matching the NetworkX DiGraph edge access pattern. State this explicitly in the interface definition and in the MC engine where it's populated.

---

### G2: `compute_viability_scores` receives `list[SingleRunResult]` but `SingleRunResult` is never defined

**Where:** `EvacuationRouter.compute_viability_scores` signature.

`SingleRunResult` appears once in the interface but has no Pydantic model, no internal data structure entry in the table, and no description anywhere in the design. The method needs to know, per run: which routes were taken and whether they succeeded (reached shelter before fire arrival). Without a definition, a coding agent will invent an incompatible structure that breaks the MC→Router handoff.

**Recommendation:** Define `SingleRunResult` explicitly as an internal dataclass (not Pydantic — it's in-memory only):
```python
@dataclass
class SingleRunResult:
    run_index: int
    fire_grid: np.ndarray        # burn_mask for this run
    ignition_times: np.ndarray   # per-cell ignition timestep
    optimized_routes: dict[str, OptimizedRouteResult]  # zone_id → route
    civ_delay: float             # civilian delay sampled for this run
```
Add this to the Internal Data Structures table.

---

### G3: The `ingest` endpoint returns HTTP 202 but the design offers no state persistence mechanism for polling

**Where:** API routes, `POST /api/ingest` (status_code=202), `GET /api/ingest/{region_slug}/status`.

The `ingest_status` endpoint polls status by `region_slug`, but there's no design for where ingestion state is stored between the initial POST and subsequent GET polls. FastAPI BackgroundTasks run in-process — you can't store state in a local dict across requests if the server restarts, and even in-process there's no thread-safe shared state defined.

The design needs to specify: "Ingestion state is tracked in a module-level `dict[str, IngestStatusResponse]` initialized at startup. BackgroundTasks write progress updates to this dict as each ingest module completes. The status endpoint reads from this dict. This is a single-process, in-memory solution — state is lost on restart."

Without this, the coding agent will either leave the endpoint broken or invent its own persistence mechanism inconsistently.

---

### G4: `max_timesteps` is in `SimulationRequest` but never validated against the region's burn time

**Where:** `SimulationRequest.max_timesteps = Field(180, ge=1, le=1440)`.

The Paradise region spans ~35km × 35km = 350×250 cells at 100m resolution. At R0=0.05 km/min with typical wind, fire takes ~60–90 min to cross, so 180 timesteps is reasonable. But `le=1440` allows 24 hours. A 24-hour simulation on a 350×250 grid is ~875,000 cell-timestep operations × 500 runs = 438M operations — potentially very slow. There's no note about this tradeoff in the design.

**Recommendation:** Either tighten the max to something like `le=480` (8 hours) with a note, or add a performance note explaining that the 5-minute SLA in Req 5.5a applies only to the default `max_timesteps=180`, and callers using high `max_timesteps` should use lower `num_runs`.

---

## 🟢 Minor Inconsistencies — Small but will create friction

### M1: `SimulationResponse` uses `SimulationSummary` before defining it

In the Pydantic schemas section, `SimulationResponse` references `SimulationSummary` (line ~665) but `SimulationSummary` is defined *after* it (line ~668). In Python this will raise a `NameError` at class definition time unless `from __future__ import annotations` is used or the classes are reordered. The coding agent will likely catch this, but it should be fixed in the design.

---

### M2: `ZoneResult.geometry` typed as `dict` loses GeoJSON structure

`geometry: dict` on both `Zone` and `ZoneResult` is technically valid but loses all validation. A better type is `dict[str, Any]` with a note "GeoJSON Polygon geometry object (`{type: 'Polygon', coordinates: [...]}`)". Better still, use a `GeoJSONPolygon` model. The `dict` type means a coding agent could accidentally serialize it as an empty dict and Pydantic wouldn't catch it.

---

### M3: `ArrivalTimeStats` has no sentinel for unburned cells

`ArrivalTimeStats` includes `mean`, `median`, `p10`, `p90` as 2D float arrays. But cells that never ignite in *any* run have no arrival time — what value goes in those cells? The design says "arrival time stats: mean, median computed only over runs where the cell ignited" (line ~277) but never specifies the fill value for cells that ignited in 0 runs. Common choices are `null`, `-1`, or `float('inf')`. The frontend/serializer needs to know. Recommend: `null` (None in Python) with `list[list[float | None]]` for the grid type.

---

### M4: `RouteResult.viability_score` is `Optional[float]` but Req 10.3 requires it per segment

Req 10.3 says "serialize evacuation routes as ordered lists of (lat, lon) coordinate pairs with *per-segment* Route_Viability_Score and travel_time." But `RouteResult` has a single `viability_score: Optional[float]` for the entire route, not per segment. This is a mismatch — either the requirement means per-route (more likely, and the design is fine), or it means per-edge (in which case `RouteResult` needs a `segment_viability_scores: list[float]` field).

**Recommendation:** Clarify this in the design: "Route_Viability_Score is computed per route (not per segment). Req 10.3's 'per-segment' refers to the route's path segments having their coordinates listed, with a single viability score for the whole route." If per-segment scoring is truly intended, the design needs significant expansion.

---

### M5: The data flow diagram shows `MC → Evac` inside the loop, but `MC->>Evac: Compute viability scores` happens *after* the loop

The sequence diagram has:
- Inside loop: `MC->>Evac: Compute routes (fire_grid, road_graph)` ✅ (correct — optimized routing is per-run)
- After loop: `MC->>Evac: Compute viability scores across runs` ✅ (correct — viability is aggregate)

But the arrow `MC --> EVAC` in the system architecture diagram implies a single connection, when in reality Evac is called twice with very different data: once per-run inside MC, and once post-aggregate. The architecture diagram should show this dual relationship to avoid a coding agent collapsing them into one call. Suggest adding a note or split the EVAC box into "per-run routing" and "aggregate scoring."

---

### M6: `IngestRequest` validates US-only coordinates (`lat ge=18.0`) but `SimulationRequest` accepts worldwide — this inconsistency is correct but undocumented

The design correctly restricts ingestion to US coordinates (NWS and some data sources are US-only) while allowing simulation worldwide (you can simulate any loaded region). But there's no comment in the schema explaining *why* these ranges differ. A coding agent might "fix" the inconsistency by making them match. Add a comment: "Ingestion is US-only because LANDFIRE and NWS have US coverage. Simulation accepts any coordinate since data is pre-loaded from the region dataset."

---

## Summary Table

| ID | Severity | Issue | Impact |
|---|---|---|---|
| B1 | 🔴 Bug | `spread_rate` (km/min) used as probability without unit conversion | Fire spreads incorrectly at all wind speeds |
| B2 | 🔴 Bug | Wind direction convention (meteorological vs. bearing) not resolved | Fire spreads upwind instead of downwind |
| G1 | 🟡 Gap | `road_closures: np.ndarray` type/shape undefined | MC→Router interface breaks |
| G2 | 🟡 Gap | `SingleRunResult` referenced but never defined | MC→viability handoff is ambiguous |
| G3 | 🟡 Gap | No state persistence mechanism for `/api/ingest` polling | Status endpoint will not work |
| G4 | 🟡 Gap | `max_timesteps=1440` has no performance note | 5-min SLA implied to cover 24h runs |
| M1 | 🟢 Minor | `SimulationSummary` defined after it's referenced | Runtime `NameError` in Python |
| M2 | 🟢 Minor | `geometry: dict` loses GeoJSON validation | Silent serialization errors possible |
| M3 | 🟢 Minor | Unburned cell sentinel value undefined in `ArrivalTimeStats` | Frontend receives ambiguous nulls |
| M4 | 🟢 Minor | `RouteResult.viability_score` is per-route, Req 10.3 says per-segment | Req ambiguity needs resolution |
| M5 | 🟢 Minor | Architecture diagram doesn't show dual Evac usage (per-run vs. aggregate) | Coding agent may collapse into one call |
| M6 | 🟢 Minor | Ingest vs. simulate coordinate range difference unexplained | Agent may "fix" the inconsistency |

---

## Priority Order for Fixes

Fix **B1 and B2 first** — they are simulation correctness bugs that will produce backwards or overflow results. Everything downstream (burn probability maps, viability scores, the entire demo) depends on the fire spreading correctly.

Fix **G1, G2, G3** before writing any MC or API code — they define interfaces between modules that, if invented independently by a coding agent, will produce incompatible implementations.

**G4 and M1–M6** can be fixed in a quick pass before coding starts or noted as "resolve on first encounter" instructions to the coding agent.
