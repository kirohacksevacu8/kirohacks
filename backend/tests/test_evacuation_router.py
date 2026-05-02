"""Tests for backend.evacuation.router — Evacuation Router.

Covers:
- Baseline routing correctness (Dijkstra shortest path)
- Route travel time matches sum of edge weights
- Disconnected graph handling
- No-path-to-shelter case (failure_risk_pct = 100.0)
- Known small graph with expected shortest paths
"""

import networkx as nx
import pytest

from backend.evacuation.router import BaselineRouteResult, EvacuationRouter
from backend.models.schemas import Shelter, Zone


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_zone(zone_id: str, lat: float, lon: float) -> Zone:
    return Zone(
        zone_id=zone_id, population=1000, elderly_pct=10.0,
        disability_pct=5.0, evacuation_priority_weight=1.0,
        centroid_lat=lat, centroid_lon=lon,
        geometry={"type": "Polygon", "coordinates": []},
    )


def _make_shelter(shelter_id: str, lat: float, lon: float) -> Shelter:
    return Shelter(
        shelter_id=shelter_id, name=f"Shelter {shelter_id}",
        lat=lat, lon=lon, capacity=500, accessible=True,
    )


@pytest.fixture
def simple_graph():
    """A simple directed graph:
    1 --5.0--> 2 --3.0--> 3
    1 --10.0-> 3 (direct but longer)
    """
    G = nx.DiGraph()
    G.add_node(1, lat=0.0, lon=0.0)
    G.add_node(2, lat=0.5, lon=0.5)
    G.add_node(3, lat=1.0, lon=1.0)
    G.add_edge(1, 2, travel_time=5.0, capacity=100)
    G.add_edge(2, 3, travel_time=3.0, capacity=100)
    G.add_edge(1, 3, travel_time=10.0, capacity=100)
    # Reverse edges
    G.add_edge(2, 1, travel_time=5.0, capacity=100)
    G.add_edge(3, 2, travel_time=3.0, capacity=100)
    G.add_edge(3, 1, travel_time=10.0, capacity=100)
    return G


# ---------------------------------------------------------------------------
# Baseline Routing Correctness
# ---------------------------------------------------------------------------

class TestBaselineRouting:
    """Property 9: Baseline Routing Correctness."""

    def test_shortest_path_chosen(self, simple_graph):
        """Route from node 1 to node 3 should go via node 2 (cost 8.0)
        rather than direct (cost 10.0)."""
        zone = _make_zone("Z1", lat=0.0, lon=0.0)  # nearest to node 1
        shelter = _make_shelter("S1", lat=1.0, lon=1.0)  # nearest to node 3

        router = EvacuationRouter(simple_graph, [zone], [shelter])
        routes = router.compute_baseline_routes()

        assert "Z1" in routes
        result = routes["Z1"]
        assert result.shelter_id == "S1"
        assert result.total_travel_time == pytest.approx(8.0)
        assert result.node_ids == [1, 2, 3]
        assert result.failure_risk_pct == 0.0

    def test_travel_time_equals_edge_sum(self, simple_graph):
        """Total travel time should equal sum of edge weights along the path."""
        zone = _make_zone("Z1", lat=0.0, lon=0.0)
        shelter = _make_shelter("S1", lat=1.0, lon=1.0)

        router = EvacuationRouter(simple_graph, [zone], [shelter])
        routes = router.compute_baseline_routes()
        result = routes["Z1"]

        # Manually sum edge weights along the path
        path = result.node_ids
        total = sum(
            simple_graph[path[i]][path[i + 1]]["travel_time"]
            for i in range(len(path) - 1)
        )
        assert result.total_travel_time == pytest.approx(total)

    def test_picks_nearest_shelter(self):
        """When multiple shelters exist, picks the one with shortest path."""
        G = nx.DiGraph()
        G.add_node(1, lat=0.0, lon=0.0)
        G.add_node(2, lat=1.0, lon=0.0)
        G.add_node(3, lat=0.0, lon=1.0)
        G.add_edge(1, 2, travel_time=10.0, capacity=100)
        G.add_edge(1, 3, travel_time=3.0, capacity=100)

        zone = _make_zone("Z1", lat=0.0, lon=0.0)
        shelter_far = _make_shelter("S_far", lat=1.0, lon=0.0)
        shelter_near = _make_shelter("S_near", lat=0.0, lon=1.0)

        router = EvacuationRouter(G, [zone], [shelter_far, shelter_near])
        routes = router.compute_baseline_routes()

        assert routes["Z1"].shelter_id == "S_near"
        assert routes["Z1"].total_travel_time == pytest.approx(3.0)

    def test_path_coords_extracted(self, simple_graph):
        zone = _make_zone("Z1", lat=0.0, lon=0.0)
        shelter = _make_shelter("S1", lat=1.0, lon=1.0)

        router = EvacuationRouter(simple_graph, [zone], [shelter])
        routes = router.compute_baseline_routes()
        result = routes["Z1"]

        assert len(result.path_coords) == len(result.node_ids)
        assert result.path_coords[0] == (0.0, 0.0)  # node 1
        assert result.path_coords[-1] == (1.0, 1.0)  # node 3


# ---------------------------------------------------------------------------
# Disconnected Graph / No Path
# ---------------------------------------------------------------------------

class TestDisconnectedGraph:
    def test_no_path_to_shelter(self):
        """Zone with no path to any shelter gets failure_risk_pct=100.0."""
        G = nx.DiGraph()
        G.add_node(1, lat=0.0, lon=0.0)
        G.add_node(2, lat=1.0, lon=1.0)
        # No edges — disconnected

        zone = _make_zone("Z1", lat=0.0, lon=0.0)
        shelter = _make_shelter("S1", lat=1.0, lon=1.0)

        router = EvacuationRouter(G, [zone], [shelter])
        routes = router.compute_baseline_routes()

        assert routes["Z1"].failure_risk_pct == 100.0
        assert routes["Z1"].cutoff_time == 0
        assert routes["Z1"].node_ids == []
        assert routes["Z1"].shelter_id == ""

    def test_partially_connected(self):
        """Some zones reachable, some not."""
        G = nx.DiGraph()
        G.add_node(1, lat=0.0, lon=0.0)
        G.add_node(2, lat=0.5, lon=0.5)
        G.add_node(3, lat=1.0, lon=1.0)  # isolated
        G.add_edge(1, 2, travel_time=5.0, capacity=100)

        zone_ok = _make_zone("Z_ok", lat=0.0, lon=0.0)
        zone_isolated = _make_zone("Z_iso", lat=1.0, lon=1.0)
        shelter = _make_shelter("S1", lat=0.5, lon=0.5)

        router = EvacuationRouter(G, [zone_ok, zone_isolated], [shelter])
        routes = router.compute_baseline_routes()

        assert routes["Z_ok"].failure_risk_pct == 0.0
        assert routes["Z_iso"].failure_risk_pct == 100.0

    def test_empty_graph(self):
        G = nx.DiGraph()
        zone = _make_zone("Z1", lat=0.0, lon=0.0)
        shelter = _make_shelter("S1", lat=1.0, lon=1.0)

        router = EvacuationRouter(G, [zone], [shelter])
        routes = router.compute_baseline_routes()

        assert routes["Z1"].failure_risk_pct == 100.0


# ---------------------------------------------------------------------------
# Multiple Zones
# ---------------------------------------------------------------------------

class TestMultipleZones:
    def test_all_zones_get_routes(self, simple_graph):
        zones = [
            _make_zone("Z1", lat=0.0, lon=0.0),
            _make_zone("Z2", lat=0.5, lon=0.5),
        ]
        shelter = _make_shelter("S1", lat=1.0, lon=1.0)

        router = EvacuationRouter(simple_graph, zones, [shelter])
        routes = router.compute_baseline_routes()

        assert len(routes) == 2
        assert "Z1" in routes
        assert "Z2" in routes
        # Z2 is closer to the shelter
        assert routes["Z2"].total_travel_time < routes["Z1"].total_travel_time
