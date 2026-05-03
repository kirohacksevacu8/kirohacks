# Critical Evaluation: EvacuAI Requirements v2

## Diff from Previous Version

All 7 critical and significant issues from the v1 evaluation were addressed. Here's a quick confirmation:

| Previous Issue | Resolution in v2 | Status |
|---|---|---|
| C1 — Ingestion/seed conflated | Step 1.2 split into 1.2a (pipeline code) and 1.2b (generate seed data) | ✅ Fixed |
| C2 — `road_graph.json` schema undefined | Full schema in Req 11.4 and glossary | ✅ Fixed |
| C3 — Zone field naming conflict | Glossary now defines `elderly_pct`/`disability_pct` as stored values; Req 5.8 uses inline formula | ✅ Fixed |
| S1 — `fire_exposure` basis ambiguous | Req 5.4 now explicitly specifies per-run Fire_Grid state, not aggregated BPM | ✅ Fixed |
| S2 — `congestion` undefined | Glossary now has a full formula; Req 5.5 expands it with iterative assignment | ✅ Fixed |
| S3 — `POST /api/ingest` missing from Req 6 | Now Req 6.5 with full request/response schema | ✅ Fixed |
| S4 — Wind gust role / humidity units | Req 2.2 now states gust is cap only; Req 2.8 mandates 0–100 percentage everywhere | ✅ Fixed |
| M1 — CLI path inconsistency | All references now use `python backend/main.py` | ✅ Fixed |
| M2 — Longitude sign convention | Req 9.2 and Req 11.3 both say "signed decimal degrees, west is negative" | ✅ Fixed |
| M3 — Scenario preset params | Req 9.4 now specifies exact wind, gust, humidity, ignition for all three presets | ✅ Fixed |
| M4 — `seed_dir` path security | Req 6.9 now rejects absolute paths with HTTP 400 | ✅ Fixed |

---

## Overall Assessment

The document is now **production-ready for agentic development**. The key architectural ambiguities are resolved, data contracts are explicit, and the phase decomposition is sound. The issues below are significantly smaller in scope than v1 — no blockers remain, only refinements.

---

## Remaining Issues

### 🟡 Significant — Worth resolving before coding starts

**S1: Optimized routing runs inside the MC loop — this is a major performance implication not flagged anywhere.**

Req 5.4 now correctly specifies that optimized routing uses per-run Fire_Grid state, meaning the router runs once per MC iteration (~500 times). For a region with hundreds of zones and a road graph with thousands of edges, this could be extremely slow. The requirements say nothing about performance targets, timeout handling, or whether this is acceptable. A coding agent will implement it faithfully and produce something that takes 10–30 minutes per API call.

**Recommendation:** Add a performance acceptance criterion to Req 5 or Req 6 — e.g., "POST /api/simulate with 500 runs SHALL complete within X minutes for a region of up to Y zones and Z road edges." Alternatively, explicitly accept the performance tradeoff and note that `num_runs` is intentionally configurable for this reason (default 500 for full accuracy, lower for interactive use). Even a note like "optimized routing is computationally expensive; the default for interactive API use is 50 runs" would prevent a coding agent from being surprised.

---

**S2: `POST /api/ingest` response schema says `status: "generating" or "complete"` but the endpoint MAY use BackgroundTasks — no mechanism for the caller to poll progress.**

If ingestion runs in the background, the caller gets back `status: "generating"` with a `region_slug`. But there's no `GET /api/ingest/{region_slug}` status endpoint specified, so the caller has no way to know when ingestion finishes or whether it succeeded. This will confuse any frontend or CLI consumer.

**Recommendation:** Either (a) make `POST /api/ingest` synchronous (simpler, acceptable if timeout is documented), or (b) add a `GET /api/ingest/{region_slug}/status` endpoint returning `{status, progress_pct, warnings, completed_files}`. The current spec leaves the caller in a dead end.

---

**S3: Congestion is computed "iteratively as routes are assigned" (Req 5.5) but no iteration strategy is defined.**

This is a chicken-and-egg problem: congestion on an edge depends on which zones are routed through it, but routes are chosen based on congestion. Req 5.5 says "recomputed iteratively" without specifying: how many iterations, what the convergence criterion is, or what the initial state is (all zones unassigned → zero congestion → pick routes → compute congestion → re-route? How many passes?).

**Recommendation:** Specify the iteration approach explicitly. Simplest viable option: "zones are assigned routes in descending priority_score order; congestion is updated after each zone assignment and the next zone routes using the updated congestion values (single-pass greedy assignment, no re-routing of already-assigned zones)."

---

### 🟢 Minor — Quick fixes

**M1: `fire_exposure_probability` in the priority scoring formula (Req 5.8) is not defined in the glossary or anywhere else.**

The formula is `priority_score = (pop_weight + (elderly_pct/100) * 2.0 + (disability_pct/100) * 1.5) * fire_exposure_probability`. What is `fire_exposure_probability`? Is it the Burn_Probability_Map value at the zone centroid? The maximum BPM value within the zone polygon? The fraction of zone area with BPM > 0.5? A coding agent will guess.

**Recommendation:** Define it: e.g., "the mean Burn_Probability_Map value across all grid cells within the zone polygon boundary."

---

**M2: `shelters.json` schema is never defined.**

`zones.geojson` has its fields listed (population, elderly_pct, disability_pct, evacuation_priority_weight). `road_graph.json` has a full schema in Req 11.4. But `shelters.json` only appears in Req 3.7 as "capacity and accessibility attributes per shelter" — no field names, no schema. The ingestion pipeline (step 1.2a) and the router (which routes to "nearest shelter") both need to agree on this format.

**Recommendation:** Add `shelters.json` schema to Req 11, e.g.: `[{"id": string, "name": string, "lat": float, "lon": float, "capacity": int, "accessibility": bool}]`.

---

**M3: The `grid_bounds.json` schema is also undefined.**

Req 3.4 says it contains "bounding box coordinates and cell resolution." That's all. A coding agent writing the ingestion pipeline and one writing the loader will produce different field names. Suggest adding to Req 11: `{"min_lat": float, "max_lat": float, "min_lon": float, "max_lon": float, "cell_size_m": int, "grid_rows": int, "grid_cols": int}`.

---

**M4: `scenario_presets.json` schema is never defined.**

Req 3.8 says it contains "ignition points, wind conditions, and scenario names" but the exact JSON structure is unspecified. The Req 9.4 presets give us the values but not the field names. A coding agent will invent its own schema. Suggest: `[{"name": string, "ignition_lat": float, "ignition_lon": float, "wind_speed_mph": float, "wind_dir_deg": float, "wind_gust_mph": float, "humidity_pct": float}]`.

---

**M5: The `num_runs` CLI argument and API field use different implied names.**

Req 7.1 lists CLI args including "number of Monte Carlo runs" but the playbook step uses `--runs`. Req 6.1 refers to it as part of the request body without specifying the field name. Pin the field name explicitly: `num_runs` in both the CLI (`--num-runs`) and the API request body, matching the `~500` default from Req 2.1.

---

## Summary

The document went from having 3 blockers and 4 significant gaps to having 0 blockers and 3 moderate gaps. The remaining issues are refinements, not structural problems. The two most important to fix before handing to a coding agent are **S1** (performance expectations for in-loop routing) and **S3** (congestion iteration strategy), as both affect how much work the agent will do and whether the result will be usable. The four minor schema gaps (M2–M5) are a 10-minute fix that will prevent incompatible implementations across modules.
