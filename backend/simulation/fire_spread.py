"""Simplified Rothermel fire spread engine on a 2D NumPy grid.

Implements deterministic fire spread simulation using:
- Base spread rate R0 = 0.05 km/min
- Wind factor: exp(0.1783 * wind_speed_mph * cos(wind_angle_to_cell))
- Moisture factor: 1 - (relative_humidity / 100) * 0.8
- 8-neighbor (Moore) connectivity with 100m cells and 1-minute timesteps
- NumPy vectorized operations for neighbor spread probability computation
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from backend.models.schemas import GridBounds

# Base spread rate in km/min (simplified Rothermel constant)
R0 = 0.05

# Wind factor exponent coefficient
WIND_COEFF = 0.1783

# Maximum moisture dampening factor
MOISTURE_DAMP = 0.8

# Cell size in km (100m = 0.1 km)
CELL_SIZE_KM = 0.1

# 8-neighbor (Moore) offsets: (row_offset, col_offset)
# Order: N, NE, E, SE, S, SW, W, NW
NEIGHBOR_OFFSETS = np.array(
    [
        [-1, 0],   # N
        [-1, 1],   # NE
        [0, 1],    # E
        [1, 1],    # SE
        [1, 0],    # S
        [1, -1],   # SW
        [0, -1],   # W
        [-1, -1],  # NW
    ],
    dtype=np.int32,
)

# Bearing angles (in radians) from a cell to each of its 8 neighbors.
# North = 0°, East = 90°, South = 180°, West = 270°.
# These represent the geographic direction from the burning cell to the neighbor.
NEIGHBOR_BEARINGS_DEG = np.array(
    [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0],
    dtype=np.float64,
)
NEIGHBOR_BEARINGS_RAD = np.deg2rad(NEIGHBOR_BEARINGS_DEG)


@dataclass(frozen=True)
class FireSpreadResult:
    """Result of a single deterministic fire spread simulation.

    Attributes:
        burn_mask: Boolean array (H, W) — True for cells that burned.
        ignition_times: Int32 array (H, W) — timestep each cell ignited, -1 if unburned.
        cells_burned: Total count of cells that burned during the simulation.
    """

    burn_mask: np.ndarray   # bool, shape (H, W)
    ignition_times: np.ndarray  # int32, shape (H, W)
    cells_burned: int


class FireSpreadEngine:
    """Simplified Rothermel fire spread on a 2D NumPy grid.

    Each cell is 100m × 100m. Timesteps are 1 minute each.
    Spread uses 8-neighbor connectivity with wind-angle-dependent probability.
    """

    def __init__(self, fuel_grid: np.ndarray, grid_bounds: GridBounds) -> None:
        """Initialize the fire spread engine.

        Args:
            fuel_grid: float32 array (H, W) with spread rate multipliers 0.0–1.5.
                       Cells with value 0.0 are non-burnable.
            grid_bounds: Bounding box and cell resolution metadata.
        """
        if fuel_grid.ndim != 2:
            raise ValueError(f"fuel_grid must be 2D, got {fuel_grid.ndim}D")

        self.fuel_grid = fuel_grid.astype(np.float32)
        self.grid_bounds = grid_bounds
        self.rows, self.cols = fuel_grid.shape

        # Precompute the non-burnable mask (fuel == 0.0 cells can never ignite)
        self.burnable_mask = self.fuel_grid > 0.0

    def latlon_to_grid(self, lat: float, lon: float) -> tuple[int, int]:
        """Convert latitude/longitude to grid row/column indices.

        Row 0 corresponds to max_lat (north), row H-1 to min_lat (south).
        Col 0 corresponds to min_lon (west), col W-1 to max_lon (east).

        Args:
            lat: Latitude in degrees.
            lon: Longitude in degrees.

        Returns:
            (row, col) grid indices.

        Raises:
            ValueError: If the point is outside the grid bounds.
        """
        gb = self.grid_bounds

        if not (gb.min_lat <= lat <= gb.max_lat):
            raise ValueError(
                f"Latitude {lat} is outside grid bounds [{gb.min_lat}, {gb.max_lat}]"
            )
        if not (gb.min_lon <= lon <= gb.max_lon):
            raise ValueError(
                f"Longitude {lon} is outside grid bounds [{gb.min_lon}, {gb.max_lon}]"
            )

        lat_range = gb.max_lat - gb.min_lat
        lon_range = gb.max_lon - gb.min_lon

        # Row: north (max_lat) is row 0, south (min_lat) is row H-1
        row_frac = (gb.max_lat - lat) / lat_range if lat_range > 0 else 0.0
        row = int(row_frac * (self.rows - 1))
        row = max(0, min(row, self.rows - 1))

        # Col: west (min_lon) is col 0, east (max_lon) is col W-1
        col_frac = (lon - gb.min_lon) / lon_range if lon_range > 0 else 0.0
        col = int(col_frac * (self.cols - 1))
        col = max(0, min(col, self.cols - 1))

        return row, col

    def run(
        self,
        ignition_point: tuple[float, float],
        wind_speed_mph: float,
        wind_direction_deg: float,
        relative_humidity: float,
        max_timesteps: int = 180,
    ) -> FireSpreadResult:
        """Execute one deterministic fire spread simulation.

        Args:
            ignition_point: (lat, lon) of the fire ignition point.
            wind_speed_mph: Wind speed in miles per hour (≥ 0).
            wind_direction_deg: Wind direction in degrees (0=N, 90=E, 180=S, 270=W).
                This is the direction the wind is coming FROM.
            relative_humidity: Relative humidity percentage (0–100).
            max_timesteps: Maximum number of 1-minute timesteps to simulate.

        Returns:
            FireSpreadResult with burn_mask, ignition_times, and cells_burned.

        Raises:
            ValueError: If ignition point is outside grid bounds or on a non-burnable cell.
        """
        lat, lon = ignition_point
        ign_row, ign_col = self.latlon_to_grid(lat, lon)

        if not self.burnable_mask[ign_row, ign_col]:
            raise ValueError(
                f"Ignition point ({lat}, {lon}) maps to a non-burnable cell "
                f"at grid position ({ign_row}, {ign_col})"
            )

        # Initialize state arrays
        ignition_times = np.full((self.rows, self.cols), -1, dtype=np.int32)
        burn_mask = np.zeros((self.rows, self.cols), dtype=np.bool_)

        # Ignite the starting cell at timestep 0
        burn_mask[ign_row, ign_col] = True
        ignition_times[ign_row, ign_col] = 0

        # Precompute moisture factor (constant for the entire simulation)
        moisture_factor = 1.0 - (relative_humidity / 100.0) * MOISTURE_DAMP

        # Precompute wind factors for each of the 8 neighbor directions.
        # Wind direction is where wind comes FROM, so wind blows TOWARD
        # (wind_direction_deg + 180) degrees. The wind factor for a neighbor
        # is highest when the neighbor bearing aligns with the downwind direction.
        wind_toward_deg = (wind_direction_deg + 180.0) % 360.0
        wind_toward_rad = np.deg2rad(wind_toward_deg)

        # Angle between wind vector (downwind) and each neighbor bearing
        angle_diffs = NEIGHBOR_BEARINGS_RAD - wind_toward_rad
        wind_factors = np.exp(WIND_COEFF * wind_speed_mph * np.cos(angle_diffs))

        # Precompute per-neighbor spread probability:
        # For each neighbor direction d, the base probability that fire spreads
        # from a burning cell to that neighbor is:
        #   prob = min(1.0, (R0 * fuel_neighbor * wind_factors[d] * moisture_factor) / CELL_SIZE_KM)
        # We precompute the wind*moisture part; fuel is applied per-cell.
        wind_moisture_factors = wind_factors * moisture_factor  # shape (8,)

        # Track which cells are currently on the fire front (just ignited)
        # Using a set of (row, col) for the active front
        active_front = np.zeros((self.rows, self.cols), dtype=np.bool_)
        active_front[ign_row, ign_col] = True

        for t in range(1, max_timesteps + 1):
            if not np.any(active_front):
                break

            # Get coordinates of all cells on the active front
            front_rows, front_cols = np.where(active_front)

            if len(front_rows) == 0:
                break

            # Reset active front for next timestep
            new_front = np.zeros((self.rows, self.cols), dtype=np.bool_)

            # For each of the 8 neighbor directions, compute spread vectorized
            for d in range(8):
                dr, dc = NEIGHBOR_OFFSETS[d]

                # Compute neighbor coordinates for all front cells
                n_rows = front_rows + dr
                n_cols = front_cols + dc

                # Bounds check: keep only valid neighbors
                valid = (
                    (n_rows >= 0)
                    & (n_rows < self.rows)
                    & (n_cols >= 0)
                    & (n_cols < self.cols)
                )
                n_rows = n_rows[valid]
                n_cols = n_cols[valid]

                if len(n_rows) == 0:
                    continue

                # Filter: only unburned AND burnable neighbors
                unburned = ~burn_mask[n_rows, n_cols]
                burnable = self.burnable_mask[n_rows, n_cols]
                candidates = unburned & burnable

                n_rows = n_rows[candidates]
                n_cols = n_cols[candidates]

                if len(n_rows) == 0:
                    continue

                # Compute spread probability for each candidate neighbor
                fuel_vals = self.fuel_grid[n_rows, n_cols]
                spread_rate = R0 * fuel_vals * wind_moisture_factors[d]

                # Convert spread rate (km/min) to probability of crossing a cell
                # in one timestep: prob = spread_rate / cell_size_km
                # Clamped to [0, 1]
                prob = np.minimum(1.0, spread_rate / CELL_SIZE_KM)

                # Deterministic threshold: cell ignites if probability >= 0.5
                # This makes the single-run simulation deterministic
                # (stochasticity comes from Monte Carlo parameter sampling)
                ignites = prob >= 0.5

                ig_rows = n_rows[ignites]
                ig_cols = n_cols[ignites]

                if len(ig_rows) > 0:
                    # Mark newly ignited cells
                    # Only update cells that haven't been burned yet
                    # (handles duplicates from multiple burning neighbors)
                    still_unburned = ~burn_mask[ig_rows, ig_cols]
                    ig_rows = ig_rows[still_unburned]
                    ig_cols = ig_cols[still_unburned]

                    burn_mask[ig_rows, ig_cols] = True
                    ignition_times[ig_rows, ig_cols] = t
                    new_front[ig_rows, ig_cols] = True

            # The new front becomes the active front for the next timestep
            active_front = new_front

        cells_burned = int(np.sum(burn_mask))

        return FireSpreadResult(
            burn_mask=burn_mask,
            ignition_times=ignition_times,
            cells_burned=cells_burned,
        )
