"""Tests for CLI pipeline (main.py)."""

import json
import os
import tempfile

from backend.main import main, parse_args


class TestParseArgs:
    def test_defaults(self):
        args = parse_args([])
        assert args.lat is None
        assert args.lon is None
        assert args.wind_speed == 14.0
        assert args.runs == 500

    def test_custom_args(self):
        args = parse_args(["--lat", "40.0", "--lon", "-120.0", "--runs", "10"])
        assert args.lat == 40.0
        assert args.lon == -120.0
        assert args.runs == 10


class TestMainPipeline:
    def test_full_pipeline_runs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rc = main([
                "--seed-dir", "backend/data/seed/paradise-ca/",
                "--runs", "2",
                "--max-timesteps", "5",
                "--seed", "42",
                "--output", tmpdir,
            ])
            assert rc == 0
            output_path = os.path.join(tmpdir, "simulation_results.json")
            assert os.path.exists(output_path)
            with open(output_path) as f:
                data = json.load(f)
            assert data["region_name"] == "Paradise, CA"
            assert data["runs_completed"] >= 1
            assert "zone_results" in data

    def test_explicit_ignition_point(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            rc = main([
                "--lat", "39.8103", "--lon", "-121.4377",
                "--seed-dir", "backend/data/seed/paradise-ca/",
                "--runs", "2",
                "--max-timesteps", "5",
                "--seed", "42",
                "--output", tmpdir,
            ])
            assert rc == 0
