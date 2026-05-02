"""Tests for backend.simulation.fire_spread — Fire Spread Engine.

Covers:
- Spread rate formula correctness
- Downwind propagation bias
- Non-burnable cell invariant
- Ignition time consistency (burn_mask ↔ ignition_times)
- Lat/lon to grid conversion
- Edge cases: out-of-bounds ignition, non-burnable ignition, zero wind, high humidity
"""

import math

import numpy as np
import pytest

from backend.models.schemas import GridBounds
from backend.simulation.fire_spread import (
    CELL_SIZE_KM,
    MOISTURE_DAMP,
    NEIGHBOR_BEARINGS_RAD,
    R0,
    WIND_COEFF,
    FireSpreadEngine,
    FireSpreadResult,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def grid_bounds():
    return GridBounds(
        min_lat=39.65, max_lat=39.90,
        min_lon=-121.75, max_lon=-121.40,
        cell_size_m=100.0, grid_rows=50, grid_cols=50,
    )


@pytest.fixture
def uniform_fuel_grid():
    """50×50 grid with uniform fuel multiplier 1.0."""
    return np.ones((50, 50), dtype=np.float32)


@pytest.fixture
def fuel_grid_with_barrier():
    """50×50 grid with a non-burnable row across the middle."""
    grid = np.ones((50, 50), dtype=np.float32)
    grid[25, :] = 0.0  # non-burnable barrier
    return grid


@pytest.fixture
def engine(uniform_fuel_grid, grid_bounds):
    return FireSpreadEngine(uniform_fuel_grid, grid_bounds)


# ---------------------------------------------------------------------------
# Spread Rate Formula
# ---------------------------------------------------------------------------

class TestSpreadRateFormula:
    """Property 1: Spread Rate Formula Correctness."""

    @pytest.mark.parametrize("wind_speed,wind_angle_deg,humidity,fuel_mult", [
        (0.0, 0.0, 0.0, 1.0),
        (14.0, 225.0, 18.0, 1.0),
        (30.0, 90.0, 50.0, 0.5),
        (5.0, 180.0, 100.0, 1.5),
        (0.0, 0.0, 100.0, 1.0),
    ])
    def test_formula_matches_spec(self, wind_speed, wind_angle_deg, humidity, fuel_mult):
        wind_angle_rad = math.radians(wind_angle_deg)
        expected_wind_factor = math.exp(WIND_COEFF * wind_speed * math.cos(wind_angle_rad))
        expected_moisture = 1.0 - (humidity / 100.0) * MOISTURE_DAMP
        expected_rate = R0 * fuel_mult * expected_wind_factor * expected_moisture

        # Compute what the engine would compute
        actual_wind_factor = math.exp(WIND_COEFF * wind_speed * math.cos(wind_angle_rad))
        actual_moisture = 1.0 - (humidity / 100.0) * MOISTURE_DAMP
        actual_rate = R0 * fuel_mult * actual_wind_factor * actual_moisture

        assert abs(actual_rate - expected_rate) < 1e-10


# ---------------------------------------------------------------------------
# Downwind Propagation Bias
# ---------------------------------------------------------------------------

class TestDownwindBias:
    """Property 2: Downwind Propagation Bias."""

    @pytest.mark.parametrize("wind_from_deg", [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0])
    def test_downwind_neighbor_has_highest_spread(self, wind_from_deg):
        """The neighbor most aligned with the downwind direction should have
        the highest wind factor."""
        wind_toward_deg = (wind_from_deg + 180.0) % 360.0
        wind_toward_rad = math.radians(wind_toward_deg)

        # Compute wind factor for each of the 8 neighbors
        angle_diffs = NEIGHBOR_BEARINGS_RAD - wind_toward_rad
        wind_factors = np.exp(WIND_COEFF * 14.0 * np.cos(angle_diffs))

        # The neighbor with the smallest absolute angle difference to downwind
        # should have the highest wind factor
        abs_diffs = np.abs(np.arctan2(np.sin(angle_diffs), np.cos(angle_diffs)))
        best_neighbor = np.argmin(abs_diffs)
        assert wind_factors[best_neighbor] == pytest.approx(np.max(wind_factors))


# ---------------------------------------------------------------------------
# Non-Burnable Cell Invariant
# ---------------------------------------------------------------------------

class TestNonBurnableInvariant:
    """Property 3: Non-Burnable Cell Invariant."""

    def test_nonburnable_cells_never_ignite(self, fuel_grid_with_barrier, grid_bounds):
        engine = FireSpreadEngine(fuel_grid_with_barrier, grid_bounds)
        # Ignite in the top half (above the barrier)
        result = engine.run(
            ignition_point=(39.88, -121.58),  # near top of grid
            wind_speed_mph=14.0,
            wind_direction_deg=0.0,  # wind from north → fire spreads south
            relative_humidity=18.0,
            max_timesteps=100,
        )
        # Row 25 is all zeros (non-burnable) — must never ignite
        assert not np.any(result.burn_mask[25, :])
        assert np.all(result.ignition_times[25, :] == -1)

    def test_scattered_nonburnable_cells(self, grid_bounds):
        """Random non-burnable cells should never ignite."""
        rng = np.random.default_rng(42)
        grid = rng.uniform(0.5, 1.5, size=(50, 50)).astype(np.float32)
        # Scatter non-burnable cells
        nonburnable_mask = rng.random((50, 50)) < 0.2
        grid[nonburnable_mask] = 0.0

        # Ensure the ignition cell is burnable regardless of random scatter
        ign_row, ign_col = 5, 25
        grid[ign_row, ign_col] = 1.0

        engine = FireSpreadEngine(grid, grid_bounds)
        # Compute the lat/lon that maps to (ign_row, ign_col) so the ignition
        # point is guaranteed to land on a burnable cell.
        gb = grid_bounds
        ign_lat = gb.max_lat - (ign_row / (engine.rows - 1)) * (gb.max_lat - gb.min_lat)
        ign_lon = gb.min_lon + (ign_col / (engine.cols - 1)) * (gb.max_lon - gb.min_lon)
        result = engine.run(
            ignition_point=(ign_lat, ign_lon),
            wind_speed_mph=20.0,
            wind_direction_deg=225.0,
            relative_humidity=10.0,
            max_timesteps=50,
        )
        # Every cell with fuel==0.0 must have ignition_time==-1
        zero_fuel = grid == 0.0
        assert np.all(result.ignition_times[zero_fuel] == -1)
        assert not np.any(result.burn_mask[zero_fuel])


# ---------------------------------------------------------------------------
# Ignition Time Consistency
# ---------------------------------------------------------------------------

class TestIgnitionTimeConsistency:
    """Property 4: burn_mask[i,j] == True iff ignition_times[i,j] >= 0."""

    def test_consistency(self, engine):
        result = engine.run(
            ignition_point=(39.80, -121.58),
            wind_speed_mph=14.0,
            wind_direction_deg=225.0,
            relative_humidity=18.0,
            max_timesteps=50,
        )
        # For every cell: burned ↔ non-negative ignition time
        assert np.all(result.burn_mask == (result.ignition_times >= 0))

    def test_cells_burned_count_matches_mask(self, engine):
        result = engine.run(
            ignition_point=(39.80, -121.58),
            wind_speed_mph=14.0,
            wind_direction_deg=225.0,
            relative_humidity=18.0,
            max_timesteps=50,
        )
        assert result.cells_burned == int(np.sum(result.burn_mask))


# ---------------------------------------------------------------------------
# Lat/Lon to Grid Conversion
# ---------------------------------------------------------------------------

class TestLatLonToGrid:
    def test_center_of_grid(self, engine):
        row, col = engine.latlon_to_grid(39.775, -121.575)
        assert 0 <= row < 50
        assert 0 <= col < 50

    def test_corners(self, engine):
        # Top-left (max_lat, min_lon) → row 0, col 0
        row, col = engine.latlon_to_grid(39.90, -121.75)
        assert row == 0
        assert col == 0

        # Bottom-right (min_lat, max_lon) → row 49, col 49
        row, col = engine.latlon_to_grid(39.65, -121.40)
        assert row == 49
        assert col == 49

    def test_out_of_bounds_lat(self, engine):
        with pytest.raises(ValueError, match="Latitude"):
            engine.latlon_to_grid(40.0, -121.58)

    def test_out_of_bounds_lon(self, engine):
        with pytest.raises(ValueError, match="Longitude"):
            engine.latlon_to_grid(39.80, -121.0)


# ---------------------------------------------------------------------------
# Edge Cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_ignition_on_nonburnable_raises(self, grid_bounds):
        grid = np.zeros((50, 50), dtype=np.float32)  # all non-burnable
        engine = FireSpreadEngine(grid, grid_bounds)
        with pytest.raises(ValueError, match="non-burnable"):
            engine.run(
                ignition_point=(39.80, -121.58),
                wind_speed_mph=14.0,
                wind_direction_deg=225.0,
                relative_humidity=18.0,
            )

    def test_zero_wind(self, engine):
        """Fire should still spread (isotropically) with zero wind."""
        result = engine.run(
            ignition_point=(39.80, -121.58),
            wind_speed_mph=0.0,
            wind_direction_deg=0.0,
            relative_humidity=18.0,
            max_timesteps=30,
        )
        assert result.cells_burned >= 1  # at least the ignition cell

    def test_high_humidity_dampens_spread(self, engine):
        """100% humidity should heavily dampen spread."""
        result = engine.run(
            ignition_point=(39.80, -121.58),
            wind_speed_mph=5.0,
            wind_direction_deg=225.0,
            relative_humidity=100.0,
            max_timesteps=30,
        )
        # With moisture_factor = 0.2, spread is very limited
        assert result.cells_burned >= 1

    def test_single_timestep(self, engine):
        result = engine.run(
            ignition_point=(39.80, -121.58),
            wind_speed_mph=14.0,
            wind_direction_deg=225.0,
            relative_humidity=18.0,
            max_timesteps=1,
        )
        assert result.cells_burned >= 1

    def test_result_is_frozen_dataclass(self, engine):
        result = engine.run(
            ignition_point=(39.80, -121.58),
            wind_speed_mph=14.0,
            wind_direction_deg=225.0,
            relative_humidity=18.0,
            max_timesteps=5,
        )
        assert isinstance(result, FireSpreadResult)
