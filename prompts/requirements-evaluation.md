# Critical Evaluation: EvacuAI Requirements Document

## Overall Assessment

The document is **well-structured and unusually thorough** for an AI-generated requirements file. The glossary is precise, the phase decomposition is sensible, and the real-data mandate (Req 12) is a standout — it prevents the common trap of shipping a demo on synthetic numbers. That said, there are several gaps, ambiguities, and one structural problem significant enough to block smooth agentic execution.

---

## Strengths

- **Glossary is specific and contractual.** Terms like `Route_Viability_Score`, `Cutoff_Time`, and `Burn_Probability_Map` are defined with enough precision that a coding agent has an unambiguous target.
- **Rothermel model constants are explicit.** `R0=0.05`, `0.1783`, `0.8` dampening — no guessing. Good.
- **Phase gating is realistic.** Separating baseline routing (Phase 2) from optimized routing (Phase 3) and viability scoring (Phase 4) avoids the one-shot trap.
- **The Agent Development Playbook is a real asset.** Many requirements docs stop at acceptance criteria; this one includes step prompts and validation gates per phase.
- **Real-data mandate is enforceable.** Req 12 lists each data source, its origin API, and what synthetic substitute is forbidden. This is exactly the right level of specificity.

---

## Issues Found

### 🔴 Critical — Will block development or cause architectural drift

**C1: The data ingestion pipeline is in Phase 1 but the Paradise seed data it generates is required by Phase 1.**

Step 1.2 asks the agent to "implement the data ingestion pipeline AND generate the Paradise seed files" in a single task. This conflates two very different concerns: building a general-purpose ingestor (a development task) and running it successfully against live APIs (an operational task that depends on API availability, rate limits, and network access). If the ingestion pipeline fails or the APIs are down, Phase 1 is completely blocked.

**Recommendation:** Split step 1.2 into 1.2a (implement ingestion pipeline code) and 1.2b (run pipeline to generate Paradise seed files, with a fallback plan if any API is unavailable). Define what a "valid but degraded" seed dataset looks like so the agent can proceed with simulation work while data issues are resolved separately.

---

**C2: `road_graph.json` schema is not defined anywhere.**

The SeedDataLoader is told to construct a NetworkX DiGraph from `road_graph.json`, and Req 11 lists it as a required file, but no schema for the JSON is specified. The ingestion pipeline (Overpass API → graph) and the loader both need to agree on this format. A coding agent will invent its own schema, and the two sides will diverge.

**Recommendation:** Add a `road_graph.json` schema spec to Req 11 or the glossary. At minimum: whether it uses node-link format (`{"nodes": [...], "links": [...]}`) or adjacency list, what fields are required on each edge (`travel_time`, `capacity`, `highway_class`, `closure_probability`), and what the node ID format is.

---

**C3: `zones.geojson` field names are inconsistently specified.**

Req 3 (loader) says fields are `elderly_pct` and `disability_pct`. Req 5 (optimizer) references `elderly_weight` and `disability_weight` and uses the formula `elderly_weight * 2.0 + disability_weight * 1.5`. It's unclear whether these are the same fields renamed, or whether there's a transformation step that converts percentages to weights. A coding agent will produce two incompatible implementations.

**Recommendation:** Standardize on one field name. If there's a transformation (`elderly_pct → elderly_weight`), state where it happens and what the formula is.

---

### 🟡 Significant — Will cause rework or ambiguity in scoring

**S1: `fire_exposure` on road edges is referenced before it's computed.**

Req 5 Phase 3 says the optimized cost function includes `γ * fire_exposure` per edge, and that `fire_exposure` is "the fraction of the route segment that is burning at the estimated time of traversal." But at routing time, you have a *Monte Carlo aggregate* (the `Burn_Probability_Map`), not a per-timestep Fire_Grid. It's ambiguous whether `fire_exposure` comes from: (a) the burn probability map at each cell the edge crosses, (b) the arrival time distribution compared to estimated traversal time, or (c) a live simulation grid state from one specific run.

**Recommendation:** Clarify whether optimized routing runs once on aggregated MC output or per-MC-run. If (c), the architecture needs a run-level router, not just a post-MC router — that's a significant scope difference.

---

**S2: `congestion` in the cost function has no definition.**

The optimized cost formula is `α*travel_time + β*congestion + γ*fire_exposure + δ*road_closure`. `travel_time`, `fire_exposure`, and `road_closure` are all defined or derivable. `congestion` is not defined anywhere — not in the glossary, not in the road graph schema, not in the Monte Carlo sampling. Is it a function of edge capacity vs. simultaneous evacuating population? A static attribute? Sampled per MC run?

**Recommendation:** Define `congestion` explicitly — recommended approach: `congestion = evacuating_population_on_edge / edge_capacity`, where `evacuating_population_on_edge` is computed by assigning zone populations to their routes.

---

**S3: `POST /api/ingest` endpoint is specified in Req 12 but missing from Req 6.**

Req 12 acceptance criterion 9 states the ingestion pipeline shall be accessible via `POST /api/ingest`. Req 6 only specifies `POST /api/simulate`, `GET /api/wind`, and `GET /api/scenarios`. The ingest endpoint has no Pydantic schema defined for its request/response. A coding agent working from Req 6 alone will not build it.

**Recommendation:** Add `POST /api/ingest` to Req 6 with a request schema (`lat`, `lon`, `radius_km`, optional `output_dir`) and response schema (success/failure status, files generated, warnings for degraded sources).

---

**S4: Wind gust is sampled but its use in simulation is undefined.**

Req 2 says wind speed is sampled from `Normal(μ, 3)` clamped to wind gust as an upper bound. But the Rothermel model in Req 1 only uses `wind_speed` — `wind_gust` never appears in the spread rate formula. Is gust just a cap, or does it affect model behavior? Also, `relativeHumidity` is listed as a NWS parse output (Req 4) and a CLI argument, but the moisture factor formula uses it directly — confirm it's in range 0–100 (not 0–1).

**Recommendation:** Explicitly state that `wind_gust` is used only as a cap on sampled wind speed. Confirm humidity units are 0–100 (percentage) throughout, not a decimal fraction.

---

### 🟢 Minor — Worth fixing before handing to an agent

**M1: The playbook prompts in the Agent Development Playbook reference `python backend/main.py` but the CLI spec in Req 7 shows `python main.py`.**
Pick one and be consistent — this will cause path errors.

**M2: Req 9 specifies Paradise bounding box as `-121.75°W to -121.40°W` longitude but the LANDFIRE and Census APIs use standard signed decimal degrees where west is negative. Make sure the `region_config.json` schema clarifies that `min_lon` and `max_lon` are signed floats (not cardinal labels), e.g., `min_lon: -121.75`.**

**M3: The three scenario presets (Fast Wind Shift, Night Evacuation, School Zone) are specified in Req 9 by name but their parameters (ignition points, wind values, time-of-day handling) are left to the agent. Either specify the parameters or explicitly call them out as "to be determined during data ingestion."**

**M4: The `--seed-dir` CLI argument and `seed_dir` API field both accept a filesystem path. There's no spec for how an API server handles `seed_dir` paths — is it relative to the server's working directory? Absolute only? This is a security surface if the API is exposed.**

---

## Summary Table

| ID | Severity | Issue |
|----|----------|-------|
| C1 | 🔴 Critical | Ingestion pipeline and seed data generation conflated in one step |
| C2 | 🔴 Critical | `road_graph.json` schema undefined |
| C3 | 🔴 Critical | Zone field naming inconsistency (`elderly_pct` vs `elderly_weight`) |
| S1 | 🟡 Significant | `fire_exposure` computation basis is ambiguous |
| S2 | 🟡 Significant | `congestion` term in cost function is undefined |
| S3 | 🟡 Significant | `POST /api/ingest` missing from Req 6 |
| S4 | 🟡 Significant | Wind gust role and humidity units underspecified |
| M1 | 🟢 Minor | CLI path inconsistency (`python main.py` vs `python backend/main.py`) |
| M2 | 🟢 Minor | Longitude sign convention not explicit in config schema |
| M3 | 🟢 Minor | Scenario preset parameters not specified |
| M4 | 🟢 Minor | `seed_dir` path resolution in API context unspecified |

---

## Recommendation Before Handing to a Coding Agent

Resolve **C1, C2, and C3** before issuing the first development task — they will cause broken implementations that are expensive to fix mid-build. The significant issues (S1–S4) can be resolved as part of the issue decomposition prompt by explicitly calling them out as decisions the agent must make and document. The minor issues are quick to address and worth a fast pass.
