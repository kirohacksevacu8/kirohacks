"""Tests for backend.data.loader — SeedDataLoader.

Covers:
- Successful loading of each file type from the bundled Paradise dataset
- Configurable seed_dir (custom path, default to paradise-ca)
- Region config validation
- Required file validation (lists ALL missing files)
- Error handling for missing files, malformed data
- Fire perimeter filename read from region_config.json
- Road graph edge attribute verification
"""

import json
import os
import tempfile

import networkx as nx
import numpy as np
import pytest

from backend.data.loader import SeedData, SeedDataError, SeedDataLoader
from backend.models.schemas import (
    GridBounds,
    RegionConfig,
    ScenarioPreset,
    Shelter,
    Zone,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

PARADISE_SEED_DIR = "backend/data/seed/paradise-ca/"


@pytest.fixture
def loader():
    return SeedDataLoader(seed_dir=PARADISE_SEED_DIR)


@pytest.fixture
def temp_seed_dir():
    """Create a temporary directory with a minimal valid region dataset."""
    with tempfile.TemporaryDirectory() as tmpdir:
        # region_config.json
        config = {
            "region_name": "Test Region",
            "bounding_box": {"min_lat": 0.0, "max_lat": 1.0, "min_lon": 0.0, "max_lon": 1.0},
            "default_ignition_point": {"lat": 0.5, "lon": 0.5},
            "fire_perimeter_file": None,
        }
        with open(os.path.join(tmpdir, "region_config.json"), "w") as f:
            json.dump(config, f)

        # fuel_grid.npy
        fuel = np.ones((10, 10), dtype=np.float32) * 0.8
        np.save(os.path.join(tmpdir, "fuel_grid.npy"), fuel)

        # grid_bounds.json
        gb = {"min_lat": 0.0, "max_lat": 1.0, "min_lon": 0.0, "max_lon": 1.0,
              "cell_size_m": 100.0, "grid_rows": 10, "grid_cols": 10}
        with open(os.path.join(tmpdir, "grid_bounds.json"), "w") as f:
            json.dump(gb, f)

        # road_graph.json (minimal connected graph)
        graph_data = {
            "directed": True, "multigraph": False, "graph": {},
            "nodes": [
                {"id": 1, "lat": 0.3, "lon": 0.3},
                {"id": 2, "lat": 0.7, "lon": 0.7},
            ],
            "links": [
                {"source": 1, "target": 2, "travel_time": 5.0, "capacity": 100, "highway": "primary"},
                {"source": 2, "target": 1, "travel_time": 5.0, "capacity": 100, "highway": "primary"},
            ],
        }
        with open(os.path.join(tmpdir, "road_graph.json"), "w") as f:
            json.dump(graph_data, f)

        # zones.geojson
        zones = {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {
                    "zone_id": "Z1", "population": 100, "elderly_pct": 10.0,
                    "disability_pct": 5.0, "evacuation_priority_weight": 1.0,
                    "centroid_lat": 0.5, "centroid_lon": 0.5,
                },
                "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
            }],
        }
        with open(os.path.join(tmpdir, "zones.geojson"), "w") as f:
            json.dump(zones, f)

        # shelters.json
        shelters = [{"shelter_id": "S1", "name": "Test Shelter", "lat": 0.8, "lon": 0.8, "capacity": 50, "accessible": True}]
        with open(os.path.join(tmpdir, "shelters.json"), "w") as f:
            json.dump(shelters, f)

        # scenario_presets.json
        presets = [{
            "name": "Default", "description": "Test preset",
            "ignition_lat": 0.5, "ignition_lon": 0.5,
            "wind_speed_mph": 10.0, "wind_direction_deg": 180.0,
            "wind_gust_mph": 15.0, "relative_humidity": 20.0,
        }]
        with open(os.path.join(tmpdir, "scenario_presets.json"), "w") as f:
            json.dump(presets, f)

        yield tmpdir


# ---------------------------------------------------------------------------
# Loading from Bundled Paradise Dataset
# ---------------------------------------------------------------------------

class TestParadiseDataset:
    def test_load_all_succeeds(self, loader):
        data = loader.load_all()
        assert isinstance(data, SeedData)
        assert data.region_config.region_name == "Paradise, CA"

    def test_region_config(self, loader):
        rc = loader.load_region_config()
        assert rc.region_name == "Paradise, CA"
        assert rc.bounding_box.min_lat == 39.65
        assert rc.bounding_box.max_lat == 39.90
        assert rc.default_ignition_point.lat == pytest.approx(39.8103)
        assert rc.fire_perimeter_file == "camp_fire_perimeter.geojson"

    def test_fuel_grid(self, loader):
        grid = loader.load_fuel_grid()
        assert grid.dtype == np.float32
        assert grid.ndim == 2
        assert grid.shape == (50, 50)
        assert np.all(grid >= 0.0)
        assert np.all(grid <= 1.5)

    def test_grid_bounds(self, loader):
        gb = loader.load_grid_bounds()
        assert isinstance(gb, GridBounds)
        assert gb.grid_rows == 50
        assert gb.grid_cols == 50
        assert gb.cell_size_m == 100.0

    def test_road_graph(self, loader):
        graph = loader.load_road_graph()
        assert isinstance(graph, nx.DiGraph)
        assert graph.number_of_nodes() == 20
        # All edges must have travel_time and capacity
        for u, v, attrs in graph.edges(data=True):
            assert "travel_time" in attrs
            assert "capacity" in attrs

    def test_zones(self, loader):
        zones = loader.load_zones()
        assert len(zones) == 4
        assert all(isinstance(z, Zone) for z in zones)
        zone_ids = {z.zone_id for z in zones}
        assert zone_ids == {"Z1", "Z2", "Z3", "Z4"}

    def test_shelters(self, loader):
        shelters = loader.load_shelters()
        assert len(shelters) == 3
        assert all(isinstance(s, Shelter) for s in shelters)

    def test_scenario_presets(self, loader):
        presets = loader.load_scenario_presets()
        assert len(presets) == 3
        names = {p.name for p in presets}
        assert "Fast Wind Shift" in names
        assert "Night Evacuation" in names
        assert "School Zone" in names

    def test_fire_perimeter_loaded(self, loader):
        data = loader.load_all()
        assert data.burn_perimeter is not None
        assert data.burn_perimeter.dtype == bool
        assert data.burn_perimeter.shape == (50, 50)


# ---------------------------------------------------------------------------
# Configurable seed_dir
# ---------------------------------------------------------------------------

class TestConfigurableSeedDir:
    def test_custom_seed_dir(self, temp_seed_dir):
        loader = SeedDataLoader(seed_dir=temp_seed_dir)
        data = loader.load_all()
        assert data.region_config.region_name == "Test Region"
        assert data.fuel_grid.shape == (10, 10)

    def test_default_seed_dir(self):
        loader = SeedDataLoader()
        assert str(loader.seed_dir).endswith("paradise-ca")


# ---------------------------------------------------------------------------
# Error Handling
# ---------------------------------------------------------------------------

class TestErrorHandling:
    def test_missing_directory_raises(self):
        loader = SeedDataLoader(seed_dir="/nonexistent/path")
        with pytest.raises(SeedDataError, match="not found"):
            loader.load_all()

    def test_missing_files_lists_all(self):
        """When multiple files are missing, error should list ALL of them."""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Only create region_config.json
            config = {
                "region_name": "Incomplete",
                "bounding_box": {"min_lat": 0, "max_lat": 1, "min_lon": 0, "max_lon": 1},
                "default_ignition_point": {"lat": 0.5, "lon": 0.5},
            }
            with open(os.path.join(tmpdir, "region_config.json"), "w") as f:
                json.dump(config, f)

            loader = SeedDataLoader(seed_dir=tmpdir)
            with pytest.raises(SeedDataError, match="Missing required files") as exc_info:
                loader.load_all()

            error_msg = str(exc_info.value)
            # Should list all 6 missing files (region_config exists)
            assert "fuel_grid.npy" in error_msg
            assert "grid_bounds.json" in error_msg
            assert "road_graph.json" in error_msg
            assert "zones.geojson" in error_msg
            assert "shelters.json" in error_msg
            assert "scenario_presets.json" in error_msg

    def test_malformed_json_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            with open(os.path.join(tmpdir, "region_config.json"), "w") as f:
                f.write("{invalid json")
            loader = SeedDataLoader(seed_dir=tmpdir)
            with pytest.raises(SeedDataError, match="not valid JSON"):
                loader.load_region_config()

    def test_invalid_region_config_schema(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            # Missing required fields
            with open(os.path.join(tmpdir, "region_config.json"), "w") as f:
                json.dump({"region_name": "Test"}, f)
            loader = SeedDataLoader(seed_dir=tmpdir)
            with pytest.raises(SeedDataError, match="failed schema validation"):
                loader.load_region_config()

    def test_fuel_grid_out_of_range(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_grid = np.ones((10, 10), dtype=np.float32) * 2.0  # > 1.5
            np.save(os.path.join(tmpdir, "fuel_grid.npy"), bad_grid)
            loader = SeedDataLoader(seed_dir=tmpdir)
            with pytest.raises(SeedDataError, match="outside \\[0.0, 1.5\\]"):
                loader.load_fuel_grid()

    def test_missing_fire_perimeter_raises(self, temp_seed_dir):
        """If region_config references a perimeter file that doesn't exist."""
        # Update config to reference a non-existent file
        config_path = os.path.join(temp_seed_dir, "region_config.json")
        with open(config_path) as f:
            config = json.load(f)
        config["fire_perimeter_file"] = "nonexistent.geojson"
        with open(config_path, "w") as f:
            json.dump(config, f)

        loader = SeedDataLoader(seed_dir=temp_seed_dir)
        gb = loader.load_grid_bounds()
        with pytest.raises(SeedDataError, match="not found"):
            loader.load_fire_perimeter("nonexistent.geojson", gb)

    def test_road_graph_missing_edge_attrs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            graph_data = {
                "directed": True, "multigraph": False, "graph": {},
                "nodes": [{"id": 1, "lat": 0.0, "lon": 0.0}, {"id": 2, "lat": 1.0, "lon": 1.0}],
                "links": [{"source": 1, "target": 2}],  # missing travel_time, capacity
            }
            with open(os.path.join(tmpdir, "road_graph.json"), "w") as f:
                json.dump(graph_data, f)
            loader = SeedDataLoader(seed_dir=tmpdir)
            with pytest.raises(SeedDataError, match="missing 'travel_time'"):
                loader.load_road_graph()
