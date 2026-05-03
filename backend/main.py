#!/usr/bin/env python3
"""EvacuAI CLI entry point."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.api.services.simulation_service import run_simulation
from backend.data.loader import SeedDataLoader
from backend.models.schemas import SimulationRequest


def _run_simulation(args) -> dict:
    default_ignition = None
    if args.lat is None or args.lon is None:
        loader = SeedDataLoader(seed_dir=args.seed_dir)
        default_ignition = loader.load_region_config().default_ignition_point

    request = SimulationRequest(
        ignition_lat=args.lat if args.lat is not None else default_ignition.lat,
        ignition_lon=args.lon if args.lon is not None else default_ignition.lon,
        wind_speed_mph=args.wind_speed,
        wind_direction_deg=args.wind_dir,
        wind_gust_mph=args.wind_gust,
        relative_humidity=args.humidity,
        num_runs=args.num_runs,
        max_timesteps=args.max_timesteps,
        scenario_preset=args.scenario_preset,
        seed=args.seed,
        seed_dir=args.seed_dir,
    )
    return run_simulation(request).model_dump()


def _run_ingest(args) -> None:
    # m6: Validate US-only coordinates
    if not (18.0 <= args.lat <= 72.0 and -180.0 <= args.lon <= -65.0):
        print("Error: Ingestion requires US coordinates (lat 18-72, lon -180 to -65)", file=sys.stderr)
        sys.exit(1)

    from backend.data.ingest.orchestrator import run_ingestion
    print(f"Starting ingestion for ({args.lat}, {args.lon}), radius={args.radius}km...")
    slug, warnings = run_ingestion(
        lat=args.lat, lon=args.lon, radius_km=args.radius,
        fire_name=args.fire_name,
    )
    print(f"Ingestion complete. Region slug: {slug}")
    if warnings:
        print("Warnings (degraded data sources):")
        for w in warnings:
            print(f"  - {w}")


def main():
    parser = argparse.ArgumentParser(description="EvacuAI — Wildfire Evacuation Simulator")
    subparsers = parser.add_subparsers(dest="command")

    parser.add_argument("--lat", type=float, default=None)
    parser.add_argument("--lon", type=float, default=None)
    parser.add_argument("--wind-speed", type=float, default=14.0, dest="wind_speed")
    parser.add_argument("--wind-dir", type=float, default=225.0, dest="wind_dir")
    parser.add_argument("--wind-gust", type=float, default=20.0, dest="wind_gust")
    parser.add_argument("--humidity", type=float, default=18.0)
    parser.add_argument("--num-runs", type=int, default=50, dest="num_runs")
    parser.add_argument("--max-timesteps", type=int, default=180, dest="max_timesteps")
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--seed-dir", type=str, default="backend/data/seed/paradise-ca/", dest="seed_dir")
    parser.add_argument("--output", type=str, default="results/")
    parser.add_argument("--scenario-preset", type=str, default=None, dest="scenario_preset")

    ingest_parser = subparsers.add_parser("ingest", help="Ingest real data for a region")
    ingest_parser.add_argument("--lat", type=float, required=True)
    ingest_parser.add_argument("--lon", type=float, required=True)
    ingest_parser.add_argument("--radius", type=float, default=10.0)
    ingest_parser.add_argument("--fire-name", type=str, default=None, dest="fire_name")

    args = parser.parse_args()

    if args.command == "ingest":
        _run_ingest(args)
        return

    if not Path(args.seed_dir).exists():
        print(f"Region dataset directory not found: {args.seed_dir}", file=sys.stderr)
        sys.exit(1)

    try:
        output = _run_simulation(args)
    except Exception as e:
        print(f"Simulation failed: {e}", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.output)
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"Output directory not writable: {e}", file=sys.stderr)
        sys.exit(1)

    out_file = out_dir / "simulation_results.json"
    with open(out_file, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    s = output["summary"]
    print(f"Region: {output['region_name']}")
    print(f"Runs completed: {s['runs_completed']}")
    print(f"Mean cells burned: {s['mean_cells_burned']:.1f}")
    print(f"Median cells burned: {s['median_cells_burned']:.1f}")
    print(f"Simulation duration: {s['simulation_duration_sec']:.2f}s")
    print(f"Output written to: {out_file}")


if __name__ == "__main__":
    main()
