from __future__ import annotations

import importlib
import time

from fastapi.testclient import TestClient

from backend.api.app import _cors_origin_regex, app
from backend.api.jobs import job_store
from backend.data.wind_client import WindFetchResult
from backend.models.schemas import SimulationRequest, WindConditions

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_cors_allows_vercel_preview_origins():
    response = client.options(
        "/api/scenarios",
        headers={
            "Origin": "https://evacuai-demo.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://evacuai-demo.vercel.app"


def test_cors_regex_is_disabled_when_origins_are_explicit(monkeypatch):
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", "https://frontend.example")
    monkeypatch.delenv("CORS_ALLOW_ORIGIN_REGEX", raising=False)

    assert _cors_origin_regex() is None


def test_get_scenarios_returns_default_region_data():
    response = client.get("/api/scenarios")

    assert response.status_code == 200
    payload = response.json()
    assert len(payload) > 0
    assert payload[0]["name"] == "Fast Wind Shift"


def test_get_wind_returns_client_metadata(monkeypatch):
    def fake_fetch_with_metadata(self, lat: float, lon: float, override=None):
        return WindFetchResult(
            conditions=WindConditions(
                wind_speed_mph=12.0,
                wind_direction_deg=180.0,
                wind_gust_mph=18.0,
                relative_humidity=22.0,
            ),
            source="fallback",
            forecast_text="Fallback wind for tests.",
        )

    monkeypatch.setattr(
        "backend.data.wind_client.NWSWindClient.fetch_with_metadata",
        fake_fetch_with_metadata,
    )

    response = client.get("/api/wind", params={"lat": 39.7596, "lon": -121.6219})

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "fallback"
    assert payload["forecast_text"] == "Fallback wind for tests."


def test_simulate_returns_accepted_then_complete(monkeypatch):
    job_store.clear()
    api_app_module = importlib.import_module("backend.api.app")

    def fake_run_simulation(request: SimulationRequest, progress_callback=None):
        if progress_callback is not None:
            progress_callback(10, request.num_runs, "sampling wind futures")
            progress_callback(request.num_runs, request.num_runs, "aggregating viability")
        from backend.tests.test_simulation_service import build_test_response

        return build_test_response(request)

    monkeypatch.setattr(api_app_module, "run_simulation", fake_run_simulation)

    response = client.post(
        "/api/simulate",
        json={
            "ignition_lat": 39.7596,
            "ignition_lon": -121.6219,
            "wind_speed_mph": 14,
            "wind_direction_deg": 225,
            "wind_gust_mph": 20,
            "relative_humidity": 18,
            "num_runs": 50,
            "max_timesteps": 30,
        },
    )

    assert response.status_code == 202
    job_id = response.json()["job_id"]

    final = None
    for _ in range(20):
        polled = client.get(f"/api/results/{job_id}")
        if polled.status_code == 200:
            final = polled
            break
        time.sleep(0.05)

    assert final is not None
    payload = final.json()
    assert payload["status"] == "complete"
    assert payload["result"]["summary"]["runs_completed"] == 50


def test_results_serializes_unreachable_route_time_as_null():
    from backend.tests.test_simulation_service import build_test_response

    job_store.clear()
    request = SimulationRequest(
        ignition_lat=39.7596,
        ignition_lon=-121.6219,
        wind_speed_mph=14.0,
        wind_direction_deg=225.0,
        wind_gust_mph=20.0,
        relative_humidity=18.0,
        num_runs=50,
        max_timesteps=30,
    )
    result = build_test_response(request)
    result.zone_results[0].baseline_route.total_travel_time_min = float("inf")
    job = job_store.create(total_runs=request.num_runs)
    job_store.complete(job.job_id, result)

    response = client.get(f"/api/results/{job.job_id}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["result"]["zone_results"][0]["baseline_route"]["total_travel_time_min"] is None


def test_results_404_for_unknown_job():
    response = client.get("/api/results/does-not-exist")

    assert response.status_code == 404


def test_simulate_rejects_num_runs_below_frontend_contract():
    response = client.post(
        "/api/simulate",
        json={
            "ignition_lat": 39.7596,
            "ignition_lon": -121.6219,
            "wind_speed_mph": 14,
            "wind_direction_deg": 225,
            "wind_gust_mph": 20,
            "relative_humidity": 18,
            "num_runs": 10,
            "max_timesteps": 30,
        },
    )

    assert response.status_code == 422
