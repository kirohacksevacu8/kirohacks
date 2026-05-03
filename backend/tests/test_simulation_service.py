from __future__ import annotations

import networkx as nx
import numpy as np

from backend.api.services import simulation_service
from backend.api.services.simulation_service import run_simulation
from backend.models.schemas import (
    ArrivalTimeStats,
    BoundingBox,
    BurnProbabilityMap,
    DefaultIgnitionPoint,
    GridBounds,
    RegionConfig,
    RouteResult,
    ScenarioPreset,
    SeedData,
    Shelter,
    SimulationRequest,
    SimulationResponse,
    SimulationSummary,
    WindConditions,
    Zone,
    ZoneResult,
)


def build_test_response(request: SimulationRequest) -> SimulationResponse:
    grid_bounds = GridBounds(
        min_lat=39.67,
        max_lat=39.86,
        min_lon=-121.74,
        max_lon=-121.47,
        cell_size_m=100.0,
        grid_rows=2,
        grid_cols=2,
    )
    baseline_route = RouteResult(
        route_id="PAR-01-baseline",
        zone_id="PAR-01",
        shelter_id="sh-01",
        path_coords=[[39.75, -121.62], [39.73, -121.84]],
        node_ids=[1, 2],
        total_travel_time_min=24.0,
        viability_score=62.0,
        strategy="baseline",
    )
    optimized_route = RouteResult(
        route_id="PAR-01-optimized",
        zone_id="PAR-01",
        shelter_id="sh-01",
        path_coords=[[39.75, -121.62], [39.7, -121.66], [39.73, -121.84]],
        node_ids=[1, 3, 2],
        total_travel_time_min=18.0,
        viability_score=84.0,
        strategy="optimized",
    )
    return SimulationResponse(
        region_name="Paradise, CA",
        scenario=request.scenario_preset or "custom",
        num_runs=request.num_runs,
        max_timesteps=request.max_timesteps,
        wind=WindConditions(
            wind_speed_mph=request.wind_speed_mph,
            wind_direction_deg=request.wind_direction_deg,
            wind_gust_mph=request.wind_gust_mph,
            relative_humidity=request.relative_humidity,
        ),
        grid_bounds=grid_bounds,
        burn_probability_map=BurnProbabilityMap(
            grid_bounds=grid_bounds,
            data=[[0.1, 0.2], [0.4, 0.8]],
        ),
        arrival_time_stats=ArrivalTimeStats(
            grid_bounds=grid_bounds,
            mean=[[1.0, 2.0], [3.0, None]],
            median=[[1.0, 2.0], [3.0, None]],
            p10=[[1.0, 2.0], [3.0, None]],
            p90=[[1.0, 2.0], [3.0, None]],
        ),
        zone_results=[
            ZoneResult(
                zone_id="PAR-01",
                population=1000,
                evacuation_priority_score=10.0,
                cutoff_time=12,
                failure_risk_pct=16.0,
                baseline_route=baseline_route,
                optimized_route=optimized_route,
                geometry={
                    "type": "Polygon",
                    "coordinates": [[[-121.63, 39.76], [-121.61, 39.76], [-121.61, 39.74], [-121.63, 39.74], [-121.63, 39.76]]],
                },
            )
        ],
        evacuation_ordering=["PAR-01"],
        summary=SimulationSummary(
            mean_cells_burned=42.0,
            median_cells_burned=40.0,
            simulation_duration_sec=1.0,
            runs_completed=request.num_runs,
        ),
    )


def test_run_simulation_returns_frontend_ready_response():
    class FakeLoader:
        def __init__(self, seed_dir: str) -> None:
            self.seed_dir = seed_dir

        def load_all(self, *, load_fire_perimeter: bool = True) -> SeedData:
            grid_bounds = GridBounds(
                min_lat=0.0,
                max_lat=1.0,
                min_lon=0.0,
                max_lon=1.0,
                cell_size_m=100.0,
                grid_rows=4,
                grid_cols=4,
            )
            graph = nx.DiGraph()
            graph.add_node(1, lat=0.8, lon=0.2)
            graph.add_node(2, lat=0.6, lon=0.5)
            graph.add_node(3, lat=0.2, lon=0.5)
            graph.add_node(4, lat=0.8, lon=0.8)
            graph.add_edge(1, 2, travel_time=2.0, capacity=100)
            graph.add_edge(2, 3, travel_time=2.0, capacity=100)
            graph.add_edge(4, 2, travel_time=3.0, capacity=100)

            return SeedData(
                region_config=RegionConfig(
                    region_name="Test Region",
                    bounding_box=BoundingBox(
                        min_lat=0.0,
                        max_lat=1.0,
                        min_lon=0.0,
                        max_lon=1.0,
                    ),
                    default_ignition_point=DefaultIgnitionPoint(lat=0.75, lon=0.5),
                ),
                grid_bounds=grid_bounds,
                fuel_grid=np.ones((4, 4), dtype=np.float32),
                road_graph=graph,
                zones=[
                    Zone(
                        zone_id="ZONE-1",
                        population=120,
                        elderly_pct=10.0,
                        disability_pct=6.0,
                        evacuation_priority_weight=1.0,
                        centroid_lat=0.8,
                        centroid_lon=0.2,
                        geometry={
                            "type": "Polygon",
                            "coordinates": [[[0.1, 0.9], [0.3, 0.9], [0.3, 0.7], [0.1, 0.7], [0.1, 0.9]]],
                        },
                    ),
                    Zone(
                        zone_id="ZONE-2",
                        population=90,
                        elderly_pct=4.0,
                        disability_pct=3.0,
                        evacuation_priority_weight=1.0,
                        centroid_lat=0.8,
                        centroid_lon=0.8,
                        geometry={
                            "type": "Polygon",
                            "coordinates": [[[0.7, 0.9], [0.9, 0.9], [0.9, 0.7], [0.7, 0.7], [0.7, 0.9]]],
                        },
                    ),
                ],
                shelters=[
                    Shelter(
                        shelter_id="SH-1",
                        name="Safe Site",
                        lat=0.2,
                        lon=0.5,
                        capacity=250,
                        accessible=True,
                    )
                ],
                scenario_presets=[
                    ScenarioPreset(
                        name="Synthetic Scenario",
                        description="Fast local test scenario.",
                        ignition_lat=0.75,
                        ignition_lon=0.5,
                        wind_speed_mph=14.0,
                        wind_direction_deg=225.0,
                        wind_gust_mph=20.0,
                        relative_humidity=18.0,
                    )
                ],
            )

    monkeypatch_target = "backend.api.services.simulation_service.SeedDataLoader"
    original_loader = simulation_service.SeedDataLoader
    original_resolver = simulation_service.resolve_seed_dir
    simulation_service.SeedDataLoader = FakeLoader
    simulation_service.resolve_seed_dir = lambda region=None, seed_dir=None: __import__("pathlib").Path(".")

    request = SimulationRequest(
        ignition_lat=0.75,
        ignition_lon=0.5,
        wind_speed_mph=14.0,
        wind_direction_deg=225.0,
        wind_gust_mph=20.0,
        relative_humidity=18.0,
        num_runs=50,
        max_timesteps=8,
        seed_dir="backend/data/seed/paradise-ca/",
    )

    try:
        response = run_simulation(request)
    finally:
        simulation_service.SeedDataLoader = original_loader
        simulation_service.resolve_seed_dir = original_resolver

    assert response.summary.runs_completed == request.num_runs
    assert response.zone_results
    assert response.evacuation_ordering == [zone.zone_id for zone in response.zone_results]
    assert all(zone.baseline_route.viability_score is not None for zone in response.zone_results)
    assert any(zone.optimized_route is not None for zone in response.zone_results)
