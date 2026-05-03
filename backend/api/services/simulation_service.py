from __future__ import annotations

import math
import os
import time
from pathlib import Path
from typing import Callable, Optional

import numpy as np
from shapely.geometry import Point, shape

from backend.data.loader import SeedDataError, SeedDataLoader
from backend.data.wind_client import NWSWindClient
from backend.evacuation.router import EvacuationRouter
from backend.models.schemas import (
    ArrivalTimeStats,
    BurnProbabilityMap,
    RouteResult,
    ScenarioPreset,
    SimulationRequest,
    SimulationResponse,
    SimulationSummary,
    WindResponse,
    ZoneResult,
)
from backend.monte_carlo.engine import MonteCarloEngine
from backend.simulation.fire_spread import FireSpreadEngine

DEFAULT_REGION = "paradise-ca"
DEFAULT_OPTIMIZED_ROUTE_LIMIT = 25
REPO_ROOT = Path(__file__).resolve().parents[3]
SEED_ROOT = REPO_ROOT / "backend" / "data" / "seed"
ProgressCallback = Callable[[int, int, str], None]


def resolve_seed_dir(region: Optional[str] = None, seed_dir: Optional[str] = None) -> Path:
    if seed_dir:
        requested = Path(seed_dir)
        resolved = requested if requested.is_absolute() else (REPO_ROOT / requested)
        resolved = resolved.resolve()
        if not resolved.is_relative_to(SEED_ROOT.resolve()):
            raise SeedDataError("seed_dir must resolve inside backend/data/seed")
        if not resolved.exists():
            raise SeedDataError(f"Region dataset directory not found: {resolved}")
        return resolved

    region_slug = (region or DEFAULT_REGION).strip()
    resolved = (SEED_ROOT / region_slug).resolve()
    if not resolved.is_relative_to(SEED_ROOT.resolve()) or not resolved.exists():
        raise SeedDataError(f"Unknown region '{region_slug}'")
    return resolved


def list_scenarios(region: str = DEFAULT_REGION) -> list[ScenarioPreset]:
    seed_dir = resolve_seed_dir(region=region)
    loader = SeedDataLoader(seed_dir=str(seed_dir))
    return loader.load_scenario_presets()


def fetch_wind(lat: float, lon: float) -> WindResponse:
    result = NWSWindClient().fetch_with_metadata(lat, lon)
    return WindResponse(
        conditions=result.conditions,
        source=result.source,
        forecast_text=result.forecast_text,
    )


def run_simulation(
    request: SimulationRequest,
    progress_callback: Optional[ProgressCallback] = None,
) -> SimulationResponse:
    seed_dir = resolve_seed_dir(seed_dir=request.seed_dir)
    loader = SeedDataLoader(seed_dir=str(seed_dir))
    data = loader.load_all(load_fire_perimeter=False)

    engine = FireSpreadEngine(data.fuel_grid, data.grid_bounds)
    router = EvacuationRouter(
        data.road_graph,
        data.zones,
        data.shelters,
        grid_bounds=data.grid_bounds,
    )
    mc = MonteCarloEngine(engine, data.road_graph, data.zones, data.shelters)

    if progress_callback is not None:
        progress_callback(0, request.num_runs, "sampling wind futures")

    started_at = time.time()
    result = mc.run(
        ignition_point=(request.ignition_lat, request.ignition_lon),
        wind_speed_mph=request.wind_speed_mph,
        wind_direction_deg=request.wind_direction_deg,
        wind_gust_mph=request.wind_gust_mph,
        relative_humidity=request.relative_humidity,
        num_runs=request.num_runs,
        seed=request.seed,
        max_timesteps=request.max_timesteps,
        progress_callback=(
            None
            if progress_callback is None
            else lambda completed, total: progress_callback(
                completed,
                total,
                "sampling wind futures",
            )
        ),
    )

    if progress_callback is not None:
        progress_callback(request.num_runs, request.num_runs, "routing exposed zones")

    baseline_routes = router.compute_baseline_routes()
    fire_exposure_probs = _zone_fire_exposure(
        data.zones,
        result.burn_probability_map,
        data.grid_bounds,
    )
    ordering = router.compute_evacuation_ordering(data.zones, fire_exposure_probs)
    ordered_zone_ids = [item.zone_id for item in ordering]
    optimized_zone_ids = ordered_zone_ids[:_optimized_route_limit()]

    aggregated_ignition_times = np.nan_to_num(
        result.arrival_time_mean,
        nan=float(request.max_timesteps + 1),
    )
    average_civ_delay = float(
        np.mean([run.civ_delay for run in result.run_results]) if result.run_results else 0.0
    )
    optimized_routes = router.compute_optimized_routes(
        fire_grid=result.burn_probability_map,
        ignition_times=aggregated_ignition_times,
        road_closures={},
        civ_delay=average_civ_delay,
        zone_priority_order=optimized_zone_ids,
    )

    if progress_callback is not None:
        progress_callback(request.num_runs, request.num_runs, "aggregating viability")

    baseline_viability = router.compute_viability_scores(
        result.run_results,
        baseline_routes,
        max_timesteps=request.max_timesteps,
    )
    optimized_viability = router.compute_viability_scores(
        result.run_results,
        optimized_routes,
        max_timesteps=request.max_timesteps,
    )

    zone_results = [
        _build_zone_result(
            zone=zone,
            fire_exposure_probs=fire_exposure_probs,
            zones=data.zones,
            baseline_routes=baseline_routes,
            optimized_routes=optimized_routes,
            baseline_viability=baseline_viability,
            optimized_viability=optimized_viability,
        )
        for zone in data.zones
    ]
    zone_results.sort(key=lambda item: item.evacuation_priority_score, reverse=True)

    cells_arr = result.cells_burned_per_run
    duration = round(time.time() - started_at, 2)

    return SimulationResponse(
        region_name=data.region_config.region_name,
        scenario=request.scenario_preset or "custom",
        num_runs=result.num_runs,
        max_timesteps=request.max_timesteps,
        wind=fetch_wind_response_from_request(request),
        grid_bounds=data.grid_bounds,
        burn_probability_map=BurnProbabilityMap(
            grid_bounds=data.grid_bounds,
            data=result.burn_probability_map.tolist(),
        ),
        arrival_time_stats=ArrivalTimeStats(
            grid_bounds=data.grid_bounds,
            mean=_nan_to_none(result.arrival_time_mean),
            median=_nan_to_none(result.arrival_time_median),
            p10=_nan_to_none(result.arrival_time_p10),
            p90=_nan_to_none(result.arrival_time_p90),
        ),
        zone_results=zone_results,
        evacuation_ordering=[zone.zone_id for zone in zone_results],
        summary=SimulationSummary(
            mean_cells_burned=float(np.mean(cells_arr)),
            median_cells_burned=float(np.median(cells_arr)),
            simulation_duration_sec=duration,
            runs_completed=result.num_runs,
        ),
    )


def fetch_wind_response_from_request(request: SimulationRequest):
    return fetch_wind_response(
        wind_speed_mph=request.wind_speed_mph,
        wind_direction_deg=request.wind_direction_deg,
        wind_gust_mph=request.wind_gust_mph,
        relative_humidity=request.relative_humidity,
    )


def fetch_wind_response(
    *,
    wind_speed_mph: float,
    wind_direction_deg: float,
    wind_gust_mph: float,
    relative_humidity: float,
):
    from backend.models.schemas import WindConditions

    return WindConditions(
        wind_speed_mph=wind_speed_mph,
        wind_direction_deg=wind_direction_deg,
        wind_gust_mph=wind_gust_mph,
        relative_humidity=relative_humidity,
    )


def _build_zone_result(
    *,
    zone,
    fire_exposure_probs: dict[str, float],
    zones,
    baseline_routes,
    optimized_routes,
    baseline_viability,
    optimized_viability,
) -> ZoneResult:
    baseline_route_result = baseline_routes[zone.zone_id]
    baseline_viability_result = baseline_viability[zone.zone_id]
    optimized_route_result = optimized_routes.get(zone.zone_id)
    optimized_viability_result = optimized_viability.get(zone.zone_id)

    baseline_route = RouteResult(
        route_id=f"{zone.zone_id}-baseline",
        zone_id=zone.zone_id,
        shelter_id=baseline_route_result.shelter_id,
        path_coords=baseline_route_result.path_coords,
        node_ids=baseline_route_result.node_ids,
        total_travel_time_min=_finite_float_or_none(baseline_route_result.total_travel_time),
        viability_score=baseline_viability_result.viability_score,
        strategy="baseline",
    )

    optimized_route = None
    if (
        optimized_route_result is not None
        and optimized_route_result.node_ids
        and optimized_route_result.shelter_id != "none"
    ):
        optimized_route = RouteResult(
            route_id=f"{zone.zone_id}-optimized",
            zone_id=zone.zone_id,
            shelter_id=optimized_route_result.shelter_id,
            path_coords=optimized_route_result.path_coords,
            node_ids=optimized_route_result.node_ids,
            total_travel_time_min=_finite_float_or_none(optimized_route_result.total_travel_time),
            viability_score=(
                optimized_viability_result.viability_score
                if optimized_viability_result is not None
                else 0.0
            ),
            strategy="optimized",
        )

    zone_viability = (
        optimized_viability_result
        if optimized_route is not None and optimized_viability_result is not None
        else baseline_viability_result
    )
    return ZoneResult(
        zone_id=zone.zone_id,
        population=zone.population,
        evacuation_priority_score=_priority_score(zone, zones, fire_exposure_probs),
        cutoff_time=zone_viability.cutoff_time,
        failure_risk_pct=zone_viability.failure_risk_pct,
        baseline_route=baseline_route,
        optimized_route=optimized_route,
        geometry=zone.geometry,
    )


def _priority_score(zone, zones, fire_exposure_probs: dict[str, float]) -> float:
    max_pop = max((item.population for item in zones), default=1)
    fire_exposure = fire_exposure_probs.get(zone.zone_id, 0.0)
    return (
        zone.population / max_pop
        + (zone.elderly_pct / 100.0) * 2.0
        + (zone.disability_pct / 100.0) * 1.5
    ) * fire_exposure


def _optimized_route_limit() -> int:
    configured = os.getenv("MAX_OPTIMIZED_ROUTE_ZONES")
    if configured is None:
        return DEFAULT_OPTIMIZED_ROUTE_LIMIT
    try:
        return max(0, int(configured))
    except ValueError:
        return DEFAULT_OPTIMIZED_ROUTE_LIMIT


def _finite_float_or_none(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    value = float(value)
    return value if math.isfinite(value) else None


def _nan_to_none(arr: np.ndarray) -> list[list[Optional[float]]]:
    return [[None if not np.isfinite(value) else float(value) for value in row] for row in arr]


def _zone_fire_exposure(zones, burn_probability_map, grid_bounds) -> dict[str, float]:
    gb = grid_bounds
    height, width = burn_probability_map.shape
    fire_exposure_probs: dict[str, float] = {}

    for zone in zones:
        geom = zone.geometry
        if not geom or not geom.get("coordinates"):
            row = max(
                0,
                min(
                    height - 1,
                    int((gb.max_lat - zone.centroid_lat) / (gb.max_lat - gb.min_lat) * height),
                ),
            )
            col = max(
                0,
                min(
                    width - 1,
                    int((zone.centroid_lon - gb.min_lon) / (gb.max_lon - gb.min_lon) * width),
                ),
            )
            fire_exposure_probs[zone.zone_id] = float(burn_probability_map[row, col])
            continue

        polygon = shape(geom)
        values = []
        minx, miny, maxx, maxy = polygon.bounds
        row_start = max(0, int((gb.max_lat - maxy) / (gb.max_lat - gb.min_lat) * height))
        row_end = min(
            height,
            int((gb.max_lat - miny) / (gb.max_lat - gb.min_lat) * height) + 1,
        )
        col_start = max(0, int((minx - gb.min_lon) / (gb.max_lon - gb.min_lon) * width))
        col_end = min(
            width,
            int((maxx - gb.min_lon) / (gb.max_lon - gb.min_lon) * width) + 1,
        )

        for row in range(row_start, row_end):
            lat = gb.max_lat - (row + 0.5) * (gb.max_lat - gb.min_lat) / height
            for col in range(col_start, col_end):
                lon = gb.min_lon + (col + 0.5) * (gb.max_lon - gb.min_lon) / width
                if polygon.contains(Point(lon, lat)):
                    values.append(float(burn_probability_map[row, col]))

        fire_exposure_probs[zone.zone_id] = float(np.mean(values)) if values else 0.0

    return fire_exposure_probs
