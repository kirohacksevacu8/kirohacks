import json
import logging
import math
from pathlib import Path

import networkx as nx

from backend.data.ingest.overpass import IngestError, OverpassClient

log = logging.getLogger(__name__)

SPEED = {"motorway": 65, "trunk": 55, "primary": 45, "secondary": 35,
         "tertiary": 25, "residential": 25, "unclassified": 20}
CAPACITY = {"motorway": 2000, "trunk": 1500, "primary": 1200, "secondary": 800,
            "tertiary": 600, "residential": 400, "unclassified": 300}


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = math.radians
    a = (math.sin(r(lat2 - lat1) / 2) ** 2
         + math.cos(r(lat1)) * math.cos(r(lat2)) * math.sin(r(lon2 - lon1) / 2) ** 2)
    return 3959 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _build_graph(data: dict) -> nx.DiGraph:
    nodes = {e["id"]: (e["lat"], e["lon"]) for e in data["elements"] if e["type"] == "node"}
    G = nx.DiGraph()
    for nid, (lat, lon) in nodes.items():
        G.add_node(nid, lat=float(lat), lon=float(lon))
    for way in (e for e in data["elements"] if e["type"] == "way"):
        hw = way.get("tags", {}).get("highway", "unclassified")
        speed = SPEED.get(hw, 20)
        cap = CAPACITY.get(hw, 300)
        refs = way["nodes"]
        for u, v in zip(refs, refs[1:]):
            if u not in nodes or v not in nodes:
                continue
            dist = _haversine(*nodes[u], *nodes[v])
            tt = (dist / speed) * 60
            G.add_edge(u, v, travel_time=tt, capacity=cap)
            G.add_edge(v, u, travel_time=tt, capacity=cap)
    return G


def fetch_road_network(
    bbox: tuple[float, float, float, float],
    output_path: Path,
    overpass_client: OverpassClient | None = None,
) -> None:
    min_lon, min_lat, max_lon, max_lat = bbox
    query = (
        f"[out:json][timeout:60];\n"
        f"(\n"
        f'  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"]'
        f"({min_lat},{min_lon},{max_lat},{max_lon});\n"
        f");\nout body;\n>;\nout skel qt;"
    )
    client = overpass_client or OverpassClient()
    data = client.query(query)
    G = _build_graph(data)

    if G.number_of_nodes() == 0:
        raise IngestError("No road data found for this region. Cannot compute evacuation routes.")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(nx.node_link_data(G)))
    log.info("Wrote road graph (%d nodes, %d edges) to %s", G.number_of_nodes(), G.number_of_edges(), output_path)
