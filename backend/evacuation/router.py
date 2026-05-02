"""Baseline and optimized evacuation route computation.

Provides Dijkstra shortest-path routing from zone centroids to the
nearest shelter on a road graph, with graceful handling of disconnected
graphs and unreachable shelters.
"""

import logging
import math
from dataclasses import dataclass, field

import networkx as nx

from backend.models.schemas import Shelter, Zone

logger = logging.getLogger(__name__)


@dataclass
class BaselineRouteResult:
    """Result of baseline shortest-path routing for a single zone."""

    zone_id: str
    shelter_id: str
    node_ids: list[int]
    path_coords: list[tuple[float, float]]  # (lat, lon) pairs
    total_travel_time: float
    failure_risk_pct: float  # 100.0 if no path found
    cutoff_time: int  # 0 if no path found


class EvacuationRouter:
    """Computes baseline and optimized evacuation routes.

    Baseline routing uses Dijkstra shortest-path (minimum travel_time)
    to the nearest shelter for each zone centroid on the road graph.
    """

    def __init__(
        self,
        road_graph: nx.DiGraph,
        zones: list[Zone],
        shelters: list[Shelter],
    ) -> None:
        self.road_graph = road_graph
        self.zones = zones
        self.shelters = shelters

    def _find_nearest_node(self, lat: float, lon: float) -> int | None:
        """Find the nearest graph node to a (lat, lon) point by Euclidean distance.

        Returns the node ID, or None if the graph has no nodes.
        """
        best_node: int | None = None
        best_dist = float("inf")

        for node_id, attrs in self.road_graph.nodes(data=True):
            node_lat = attrs.get("lat")
            node_lon = attrs.get("lon")
            if node_lat is None or node_lon is None:
                continue
            dist = math.hypot(lat - node_lat, lon - node_lon)
            if dist < best_dist:
                best_dist = dist
                best_node = node_id

        return best_node

    def _extract_path_coords(self, node_ids: list[int]) -> list[tuple[float, float]]:
        """Extract (lat, lon) coordinate pairs from a list of node IDs."""
        coords: list[tuple[float, float]] = []
        for node_id in node_ids:
            attrs = self.road_graph.nodes[node_id]
            lat = attrs.get("lat")
            lon = attrs.get("lon")
            if lat is not None and lon is not None:
                coords.append((lat, lon))
        return coords

    def compute_baseline_routes(self) -> dict[str, BaselineRouteResult]:
        """Compute Dijkstra shortest-path routes to nearest shelter per zone.

        For each zone, finds the nearest graph node to the zone centroid,
        then computes the shortest path (by travel_time) to the nearest
        graph node for each shelter. Picks the shelter with the lowest
        total travel time.

        Returns:
            Dictionary mapping zone_id to BaselineRouteResult.
        """
        # Pre-compute nearest graph node for each shelter
        shelter_nodes: dict[str, int | None] = {}
        for shelter in self.shelters:
            node = self._find_nearest_node(shelter.lat, shelter.lon)
            if node is None:
                logger.warning(
                    "No graph node found near shelter %s (%s). Skipping.",
                    shelter.shelter_id,
                    shelter.name,
                )
            shelter_nodes[shelter.shelter_id] = node

        results: dict[str, BaselineRouteResult] = {}

        for zone in self.zones:
            zone_node = self._find_nearest_node(zone.centroid_lat, zone.centroid_lon)

            if zone_node is None:
                logger.warning(
                    "No graph node found near zone %s centroid. Marking as unreachable.",
                    zone.zone_id,
                )
                results[zone.zone_id] = BaselineRouteResult(
                    zone_id=zone.zone_id,
                    shelter_id="",
                    node_ids=[],
                    path_coords=[],
                    total_travel_time=0.0,
                    failure_risk_pct=100.0,
                    cutoff_time=0,
                )
                continue

            best_path: list[int] | None = None
            best_travel_time = float("inf")
            best_shelter_id = ""

            for shelter in self.shelters:
                shelter_node = shelter_nodes.get(shelter.shelter_id)
                if shelter_node is None:
                    continue

                try:
                    path = nx.dijkstra_path(
                        self.road_graph,
                        zone_node,
                        shelter_node,
                        weight="travel_time",
                    )
                    travel_time = nx.dijkstra_path_length(
                        self.road_graph,
                        zone_node,
                        shelter_node,
                        weight="travel_time",
                    )
                except nx.NetworkXNoPath:
                    logger.warning(
                        "No path from zone %s (node %d) to shelter %s (node %d). "
                        "Graph may be disconnected.",
                        zone.zone_id,
                        zone_node,
                        shelter.shelter_id,
                        shelter_node,
                    )
                    continue

                if travel_time < best_travel_time:
                    best_travel_time = travel_time
                    best_path = path
                    best_shelter_id = shelter.shelter_id

            if best_path is None:
                logger.warning(
                    "Zone %s has no path to any shelter. Marking with failure_risk_pct=100.0.",
                    zone.zone_id,
                )
                results[zone.zone_id] = BaselineRouteResult(
                    zone_id=zone.zone_id,
                    shelter_id="",
                    node_ids=[],
                    path_coords=[],
                    total_travel_time=0.0,
                    failure_risk_pct=100.0,
                    cutoff_time=0,
                )
            else:
                path_coords = self._extract_path_coords(best_path)
                results[zone.zone_id] = BaselineRouteResult(
                    zone_id=zone.zone_id,
                    shelter_id=best_shelter_id,
                    node_ids=best_path,
                    path_coords=path_coords,
                    total_travel_time=best_travel_time,
                    failure_risk_pct=0.0,
                    cutoff_time=0,  # Will be computed by viability scoring (Task 15.1)
                )

        return results
