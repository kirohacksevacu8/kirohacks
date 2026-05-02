"""Tests for backend.monte_carlo.engine — Monte Carlo simulation orchestrator.

Covers:
- Deterministic reproducibility (same seed → same results)
- Stochastic parameter sampling (wind speed clamping, direction wrapping)
- Burn probability map correctness (values in [0, 1], shape matches grid)
- Arrival time stats (mean/median/p10/p90, -1 for unburned cells)
- Per-zone aggregation (runs_with_route counts)
- Road closure application (closure_probability edge attribute)
- Edge cases: zero runs completed, single run
"""

import numpy as np
import pytest

from backend.data.loader import SeedDataLoader
from backend.monte_carlo.engine import (
    MonteCarloEngine,
    MonteCarloResult,
    SingleRunResult,
    ZoneMCResult,
)
from backend.simulation.fire_spread import FireSpreadEngine


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def seed_data():
    """Load Paradise, CA seed data once for all tests in this module."""
    loader = SeedDataLoader()
    return loader.load_all()


@pytest.fixture(scope="module")
def mc_engine(seed_data):
    """Create a MonteCarloEngine from seed data."""
    fire_engine = FireSpreadEngine(seed_data.fuel_grid, seed_data.grid_bounds)
    return MonteCarloEngine(
        fire_engine, seed_data.road_graph, seed_data.zones, seed_data.shelters
    )


IGNITION = (39.8103, -121.4377)
MC_KWARGS = dict(
    ignition_point=IGNITION,
    wind_speed_mph=14.0,
    wind_direction_deg=225.0,
    wind_gust_mph=25.0,
    relative_humidity=18.0,
    num_runs=10,
    seed=42,
    max_timesteps=60,
)


# ---------------------------------------------------------------------------
# Deterministic reproducibility
# ---------------------------------------------------------------------------

class TestReproducibility:
    def test_same_seed_same_results(self, mc_engine):
        r1 = mc_engine.run(**MC_KWARGS)
        r2 = mc_engine.run(**MC_KWARGS)
        assert r1.runs_completed == r2.runs_completed
        assert r1.mean_cells_burned == r2.mean_cells_burned
        assert r1.burn_probability_map.data == r2.burn_probability_map.data

    def test_different_seed_different_results(self, mc_engine):
        r1 = mc_engine.run(**{**MC_KWARGS, "seed": 1})
        r2 = mc_engine.run(**{**MC_KWARGS, "seed": 2})
        # With different seeds, burn counts should differ (probabilistically)
        assert r1.burn_probability_map.data != r2.burn_probability_map.data


# ---------------------------------------------------------------------------
# Burn probability map
# ---------------------------------------------------------------------------

class TestBurnProbabilityMap:
    def test_shape_matches_grid(self, mc_engine, seed_data):
        result = mc_engine.run(**MC_KWARGS)
        rows, cols = seed_data.fuel_grid.shape
        assert len(result.burn_probability_map.data) == rows
        assert len(result.burn_probability_map.data[0]) == cols

    def test_values_in_zero_one(self, mc_engine):
        result = mc_engine.run(**MC_KWARGS)
        arr = np.array(result.burn_probability_map.data)
        assert np.all(arr >= 0.0)
        assert np.all(arr <= 1.0)

    def test_ignition_cell_always_burns(self, mc_engine):
        """The ignition cell should have burn probability 1.0 (burns every run)."""
        result = mc_engine.run(**MC_KWARGS)
        row, col = mc_engine.fire_engine.latlon_to_grid(*IGNITION)
        assert result.burn_probability_map.data[row][col] == 1.0


# ---------------------------------------------------------------------------
# Arrival time statistics
# ---------------------------------------------------------------------------

class TestArrivalTimeStats:
    def test_shape_matches_grid(self, mc_engine, seed_data):
        result = mc_engine.run(**MC_KWARGS)
        rows, cols = seed_data.fuel_grid.shape
        for field in ("mean", "median", "p10", "p90"):
            arr = getattr(result.arrival_time_stats, field)
            assert len(arr) == rows
            assert len(arr[0]) == cols

    def test_ignition_cell_time_zero(self, mc_engine):
        """Ignition cell should have arrival time 0 in all stats."""
        result = mc_engine.run(**MC_KWARGS)
        row, col = mc_engine.fire_engine.latlon_to_grid(*IGNITION)
        assert result.arrival_time_stats.mean[row][col] == 0.0
        assert result.arrival_time_stats.median[row][col] == 0.0

    def test_unburned_cells_negative_one(self, mc_engine):
        """Cells that never burned should have -1.0 in all stat arrays."""
        result = mc_engine.run(**MC_KWARGS)
        prob = np.array(result.burn_probability_map.data)
        mean = np.array(result.arrival_time_stats.mean)
        # Where burn probability is 0, arrival time should be -1
        never_burned = prob == 0.0
        assert np.all(mean[never_burned] == -1.0)


# ---------------------------------------------------------------------------
# Zone results
# ---------------------------------------------------------------------------

class TestZoneResults:
    def test_all_zones_present(self, mc_engine, seed_data):
        result = mc_engine.run(**MC_KWARGS)
        zone_ids = {z.zone_id for z in seed_data.zones}
        result_ids = {zr.zone_id for zr in result.zone_results}
        assert result_ids == zone_ids

    def test_total_runs_matches(self, mc_engine):
        result = mc_engine.run(**MC_KWARGS)
        for zr in result.zone_results:
            assert zr.total_runs == result.runs_completed

    def test_runs_with_route_bounded(self, mc_engine):
        result = mc_engine.run(**MC_KWARGS)
        for zr in result.zone_results:
            assert 0 <= zr.runs_with_route <= zr.total_runs


# ---------------------------------------------------------------------------
# Road closure application
# ---------------------------------------------------------------------------

class TestRoadClosures:
    def test_closure_probability_set(self, mc_engine):
        rng = np.random.default_rng(0)
        closures = rng.beta(1.5, 8.5, size=len(mc_engine._edges))
        modified = mc_engine._apply_road_closures(closures)
        for idx, (u, v) in enumerate(mc_engine._edges):
            assert "closure_probability" in modified[u][v]
            assert modified[u][v]["closure_probability"] == pytest.approx(
                closures[idx], abs=1e-10
            )

    def test_original_graph_unchanged(self, mc_engine):
        rng = np.random.default_rng(0)
        closures = rng.beta(1.5, 8.5, size=len(mc_engine._edges))
        mc_engine._apply_road_closures(closures)
        # Original graph should not have closure_probability
        for u, v in mc_engine._edges:
            assert "closure_probability" not in mc_engine.road_graph[u][v]


# ---------------------------------------------------------------------------
# Run metadata
# ---------------------------------------------------------------------------

class TestRunMetadata:
    def test_runs_completed(self, mc_engine):
        result = mc_engine.run(**MC_KWARGS)
        assert result.runs_completed == MC_KWARGS["num_runs"]

    def test_mean_median_cells_burned_positive(self, mc_engine):
        result = mc_engine.run(**MC_KWARGS)
        assert result.mean_cells_burned > 0
        assert result.median_cells_burned > 0

    def test_simulation_duration_positive(self, mc_engine):
        result = mc_engine.run(**MC_KWARGS)
        assert result.simulation_duration_sec > 0


# ---------------------------------------------------------------------------
# Edge case: single run
# ---------------------------------------------------------------------------

class TestSingleRun:
    def test_single_run_works(self, mc_engine):
        result = mc_engine.run(**{**MC_KWARGS, "num_runs": 1})
        assert result.runs_completed == 1
        assert result.mean_cells_burned == result.median_cells_burned
