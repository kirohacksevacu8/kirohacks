# EvacuAI — Data & API Specification
**Wildfire Evacuation Planning System | v1.0 | Cal Poly Kiro Hackathon**

---

## Overview

EvacuAI simulates probabilistic wildfire futures and recommends evacuation route strategies for first responders and emergency planners. This doc specifies every external data source, API endpoint, response schema, field mapping, and preprocessing step needed to build the simulation pipeline.

---

## Data Architecture

One live API call on simulation load. Everything else pre-fetched and bundled. Demo never breaks.

| Layer | Source | Mode | Format |
|---|---|---|---|
| Wind conditions | NWS api.weather.gov | Live (on load) | JSON |
| Fire perimeter seed | NIFC WFIGS ArcGIS REST | Pre-fetched | GeoJSON |
| Road network graph | OpenStreetMap Overpass API | Pre-fetched | JSON → NetworkX |
| Fuel model grid | USGS LANDFIRE | Pre-processed | GeoTIFF → .npy |
| Population & vulnerability | US Census API | Pre-fetched | JSON → GeoJSON |

---

## Source 1 — NWS Wind Data

| | |
|---|---|
| **Base URL** | `https://api.weather.gov` |
| **Auth** | None. Set header: `User-Agent: EvacuAI/1.0 (your@email.com)` |
| **Rate limit** | No hard limit. Add 1s delay between sequential calls. |

### Step 1 — Resolve Grid Coordinates

```
GET https://api.weather.gov/points/{lat},{lon}
```

Example for Paradise, CA:
```
GET https://api.weather.gov/points/39.7596,-121.6219
```

| Field | Type | Used For |
|---|---|---|
| `properties.gridId` | string | NWS office code (e.g. `"STO"`) — required for Step 2 URL |
| `properties.gridX` | integer | Grid X coordinate — required for Step 2 URL |
| `properties.gridY` | integer | Grid Y coordinate — required for Step 2 URL |
| `properties.forecastHourly` | string (URL) | Direct URL to hourly forecast endpoint |

### Step 2 — Fetch Hourly Wind Forecast

```
GET https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}/forecast/hourly
```

Example resolved:
```
GET https://api.weather.gov/gridpoints/STO/52,89/forecast/hourly
```

Returns `properties.periods[]` — one object per hour:

| Field | Type | Example | Simulation Use |
|---|---|---|---|
| `windSpeed` | string | `"14 mph"` | Parse float → μ for `Normal(μ, σ=3mph)` per MC run |
| `windDirection` | string | `"SW"` | Convert to degrees → μ for `Normal(μ, σ=15°)` per MC run |
| `windGust` | string | `"22 mph"` | Parse float → upper bound for worst-case MC scenarios |
| `relativeHumidity.value` | float | `18.0` | Fuel moisture modifier in Rothermel spread equation |
| `startTime` | ISO 8601 | `"2025-11-08T14:00:00-08:00"` | Use first period for current conditions |
| `shortForecast` | string | `"Sunny and Windy"` | Display string in UI weather panel |

**Wind direction string → degrees:**

| N | NE | E | SE | S | SW | W | NW |
|---|---|---|---|---|---|---|---|
| 0° | 45° | 90° | 135° | 180° | 225° | 270° | 315° |

### Step 3 — Optional: Raw Gridpoint Data

```
GET https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}
```

Returns time-series value arrays instead of period objects. More granular. Use if hourly forecast is insufficient. Key extra fields: `transportWindSpeed`, `windSpeed`, `windDirection` as value arrays.

---

## Source 2 — NIFC WFIGS Fire Perimeters

| | |
|---|---|
| **Base URL** | `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services` |
| **Auth** | None. Public ArcGIS REST service. |
| **Update freq** | Every 5 minutes. Changes visible within 15 minutes. |

### Historical Perimeters (Demo Seed — Camp Fire)

```
GET .../WFIGS_Interagency_Perimeters/FeatureServer/0/query
  ?where=IncidentName='CAMP'
  &outFields=*
  &f=geojson
```

Full URL:
```
https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Interagency_Perimeters/FeatureServer/0/query?where=IncidentName%3D'CAMP'&outFields=*&f=geojson
```

### Current Active Fires (Live Mode)

```
GET .../WFIGS_Current_Interagency_Fire_Perimeters/FeatureServer/0/query
  ?where=1=1
  &outFields=*
  &geometry=-122,39,-121,40
  &geometryType=esriGeometryEnvelope
  &f=geojson
```

### Response Fields

| Field | Type | Used For |
|---|---|---|
| `geometry.coordinates` | array | Burn polygon → t=0 fire state on simulation grid |
| `properties.IncidentName` | string | Fire name for UI display |
| `properties.GISAcres` | float | Burned area — scale reference for grid cell sizing |
| `properties.PerimeterDateTime` | ISO 8601 | Capture timestamp → simulation start time |
| `properties.IncidentTypeCategory` | string | Filter to `WF` (wildfire only, exclude prescribed burns) |
| `properties.ContainmentDateTime` | ISO 8601 | Non-null = fire contained, skip this record |
| `properties.CreateDate` | timestamp | First reported date — useful for historical scenarios |

**Pre-processing:** Convert GeoJSON polygon to binary burn mask (NumPy array) using `shapely.geometry.shape()`. Rasterize to your simulation grid at 100m cell resolution for the Paradise demo region.

---

## Source 3 — OpenStreetMap Road Network

| | |
|---|---|
| **Endpoint** | `https://overpass-api.de/api/interpreter` |
| **Method** | POST with Overpass QL body |
| **Auth** | None. Set `User-Agent` header. |
| **Strategy** | Pre-fetch ONCE. Serialize to `road_graph.json`. Never query live during demo. |

### Query — Paradise / Butte County

```
[out:json][timeout:60];
(
  way["highway"~"^(primary|secondary|tertiary|trunk|residential)$"]
  (39.65,-121.75,39.90,-121.40);
);
out body geom;
```

Bounding box covers Paradise and surrounding evacuation corridors including Skyway.

### Response Element Fields

| Field | Type | Used For |
|---|---|---|
| `id` | integer | Unique way ID → edge identifier in NetworkX graph |
| `nodes[]` | integer array | Node IDs at each end → graph node identifiers |
| `geometry[].lat/lon` | float | Coordinate sequence for the road segment |
| `tags.highway` | string | Road class → base capacity and default speed |
| `tags.name` | string | Road name (e.g. `"Skyway"`) → route recommendation display |
| `tags.maxspeed` | string | Speed limit → edge travel time calculation |
| `tags.oneway` | string | Direction constraint (`"yes"` = one-way) → DiGraph edge direction |
| `tags.lanes` | string | Lane count → vehicle throughput / capacity model |
| `tags.bridge` | string | Bridge flag → elevated closure risk in fire conditions |
| `tags.tunnel` | string | Tunnel flag → shelter-in-place risk modifier |

### Highway Class → Simulation Defaults

| `highway` value | Base Speed | Capacity (veh/hr) | Fire Closure Risk |
|---|---|---|---|
| trunk | 65 mph | 3600 | Low |
| primary | 55 mph | 2400 | Low-Medium |
| secondary | 45 mph | 1600 | Medium |
| tertiary | 35 mph | 900 | Medium-High |
| residential | 25 mph | 400 | High |

**Post-processing:** Build a NetworkX `DiGraph`. Each edge gets: `travel_time` (length / speed), `fire_exposure` (computed per MC run), `closure_probability` (MC variable sampled per run).

---

## Source 4 — USGS LANDFIRE Fuel Model

| | |
|---|---|
| **Portal** | https://www.landfire.gov/viewer/ |
| **Product** | FBFM40 — 40 Scott & Burgan Fire Behavior Fuel Models |
| **Format** | GeoTIFF raster, 30m native resolution |
| **Strategy** | Download once. Pre-process to `.npy`. Bake into seed data. Never fetch live. |

### Download Steps

1. Go to `landfire.gov/viewer`
2. Select `FBFM40` product layer
3. Draw bounding box: `39.65N, -121.75W` to `39.90N, -121.40W`
4. Export as GeoTIFF
5. Run `process_landfire.py` → outputs `fuel_grid.npy` and `grid_bounds.json`

### Fuel Model Code → Spread Rate Multiplier

| FBFM40 Code | Fuel Type | Spread Multiplier | Notes |
|---|---|---|---|
| GR1–GR9 (101–109) | Grass | 0.8–1.5 | Fast spread, moderate flame length |
| GS1–GS4 (121–124) | Grass-Shrub | 0.6–1.2 | Moderate spread, variable intensity |
| SH1–SH9 (141–149) | Shrub | 0.4–1.0 | Variable spread, high intensity |
| TU1–TU5 (161–165) | Timber Understory | 0.3–0.7 | Slow spread, high fuel load |
| TL1–TL9 (181–189) | Timber Litter | 0.2–0.5 | Slow spread, smoldering risk |
| SB1–SB4 (201–204) | Slash-Blowdown | 0.1–0.4 | Very slow, very high intensity |
| NB1–NB9 (91–99) | Non-Burnable | 0.0 | Urban, agriculture, water — no spread |

**Output:** `fuel_grid.npy` — float32 array with shape `(grid_height, grid_width)`, values `0.0–1.5`. Alongside `grid_bounds.json` with bounding box and cell resolution.

---

## Source 5 — US Census Population Data

| | |
|---|---|
| **Base URL** | `https://api.census.gov/data` |
| **Auth** | Free key from `api.census.gov/sign-up.html` (optional for low volume) |
| **Strategy** | Pre-fetch for Butte County. Join to Tiger geometry. Bundle as `zones.geojson`. |

### Decennial Census — Population by Block Group

```
GET https://api.census.gov/data/2020/dec/pl
  ?get=P1_001N,NAME
  &for=block%20group:*
  &in=state:06%20county:007
```

State `06` = California. County `007` = Butte County.

### ACS 5-Year — Vulnerability Indicators

```
GET https://api.census.gov/data/2021/acs/acs5
  ?get=B01001_020E,B01001_021E,B01001_022E,B01001_023E,B01001_024E,B01001_025E,
       B01001_044E,B01001_045E,B01001_046E,B01001_047E,B01001_048E,B01001_049E,
       B18101_004E,B18101_007E,B18101_010E,B18101_013E,NAME
  &for=block%20group:*
  &in=state:06%20county:007
```

### Census Field Reference

| Field Code | Description | Simulation Use |
|---|---|---|
| `P1_001N` | Total population (2020) | Base population weight for zone priority |
| `B01001_020E–025E` | Male age 65–85+ cohorts | Vulnerability weight (elderly = higher priority) |
| `B01001_044E–049E` | Female age 65–85+ cohorts | Vulnerability weight (elderly = higher priority) |
| `B18101_004E` | Male under 5 with disability | Mobility constraint weight |
| `B18101_007E` | Male 5–17 with disability | Mobility constraint weight |
| `B18101_010E` | Male 18–34 with disability | Mobility constraint weight |
| `B18101_013E` | Male 35–64 with disability | Mobility constraint weight |

### Tiger Geometry — Block Group Boundaries

```
GET https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/10/query
  ?where=STATE='06' AND COUNTY='007'
  &outFields=GEOID,NAME,ALAND
  &f=geojson
```

Join census data to geometry on `GEOID`. Output `zones.geojson` where each feature includes `population`, `elderly_pct`, `disability_pct`, and computed `evacuation_priority_weight`.

### Evacuation Priority Weight Formula

```python
pop_weight        = total_population / max_population_in_region
elderly_weight    = (sum_65plus / total_population) * 2.0
disability_weight = (sum_disabled / total_population) * 1.5

priority_weight   = pop_weight + elderly_weight + disability_weight
priority_score    = priority_weight * fire_exposure_probability
```

---

## Simulation Data Flow

| Input | Source | → Simulation Variable |
|---|---|---|
| `windSpeed` (string) | NWS hourly | μ_speed for `Normal(μ, σ=3mph)` per MC run |
| `windDirection` (string→deg) | NWS hourly | μ_dir for `Normal(μ, σ=15°)` per MC run |
| `windGust` (string) | NWS hourly | Upper clamp on sampled wind speed |
| `relativeHumidity.value` | NWS hourly | `fuel_moisture_factor = 1 - (rh/100) * 0.8` |
| `geometry.coordinates` | WFIGS GeoJSON | Binary burn mask: grid cells = 1 at t=0 |
| `tags.highway` + geometry | OSM Overpass | NetworkX DiGraph edges with `travel_time`, `capacity` |
| `fuel_grid.npy` cell value | LANDFIRE FBFM40 | `spread_rate` multiplier per grid cell |
| `priority_weight` per zone | Census ACS + Tiger | Evacuation order scoring and route assignment |

### Monte Carlo Loop (N = 500 runs)

```python
for run in range(N):
    wind_speed    = Normal(μ_speed, 3.0)
    wind_dir      = Normal(μ_dir, 15.0)
    civ_delay     = Uniform(2, 15)          # minutes
    road_closure  = Beta(1.5, 8.5)          # per edge

    fire_grid = run_rothermel(fuel_grid, wind_speed, wind_dir, moisture_factor)
    
    for edge in road_graph.edges:
        edge.fire_exposure = fraction_of_route_burning_at_edge_time(fire_grid, edge)
        edge.cost = α*travel_time + β*congestion + γ*fire_exposure + δ*road_closure

    for zone in zones:
        record(zone.evacuated_before_fire_arrival, zone.viable_routes)

# Aggregate → viability %, mean evac time, P(failure) per zone
```

---

## Rothermel Spread Model — Parameters

```python
spread_rate = R0 * fuel_multiplier * wind_factor * moisture_factor

wind_factor     = exp(0.1783 * wind_speed_mph * cos(wind_angle_to_cell))
moisture_factor = 1 - (relative_humidity / 100) * 0.8

# Cell ignites if:
rand() < spread_rate * dt / cell_size
```

| Parameter | Value | Source |
|---|---|---|
| Base spread rate (R0) | 0.05 km/min | USFS Fire Behavior Field Reference Guide |
| Wind factor exponent | 0.1783 | Rothermel (1972), simplified form |
| Moisture dampening | 0.8 max reduction | Rothermel (1972) |
| Timestep (dt) | 1 minute | Chosen for simulation responsiveness |
| Cell size | 100m × 100m | Balance of resolution and compute time |
| MC runs (N) | 500 | Sufficient for stable probability estimates |
| Wind speed σ | 3.0 mph | NWS forecast uncertainty |
| Wind direction σ | 15.0° | NWS wind direction variability |

---

## Seed File Manifest

All files live in `/backend/data/seed/` after preprocessing:

| File | Source | Format | Description |
|---|---|---|---|
| `camp_fire_perimeter.geojson` | NIFC WFIGS | GeoJSON | Camp Fire burn polygon — t=0 fire state |
| `road_graph.json` | OSM Overpass | JSON (NetworkX node-link) | Butte County road network |
| `fuel_grid.npy` | LANDFIRE FBFM40 | NumPy float32 | Spread rate multipliers on 100m grid |
| `grid_bounds.json` | Computed | JSON | Bounding box and cell resolution metadata |
| `zones.geojson` | Census + Tiger | GeoJSON | Block groups with population + vulnerability weights |
| `shelters.json` | Synthetic | JSON | Shelter locations, capacities, accessibility flags |
| `scenario_presets.json` | Hardcoded | JSON | Fast Wind Shift, Night Evacuation, School Zone scenarios |

---

## Preprocessing Scripts

| Script | Input | Output | Key Libraries |
|---|---|---|---|
| `fetch_wind.py` | lat, lon | `wind_current.json` | `requests` |
| `fetch_perimeter.py` | incident name | `camp_fire_perimeter.geojson` | `requests` |
| `fetch_roads.py` | bbox | `road_graph_raw.json` | `requests`, `osmnx` |
| `build_road_graph.py` | `road_graph_raw.json` | `road_graph.json` | `networkx`, `osmnx` |
| `process_landfire.py` | `FBFM40.tif` | `fuel_grid.npy`, `grid_bounds.json` | `rasterio`, `numpy` |
| `fetch_census.py` | state, county | `zones.geojson` | `requests`, `geopandas` |

---

*All external APIs are free, public, and require no payment information.*