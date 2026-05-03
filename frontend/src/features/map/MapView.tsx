import { useEffect, useRef, useState } from "react";
import type { PickingInfo } from "@deck.gl/core";
import DeckGL from "@deck.gl/react";
import { PathLayer, PolygonLayer, ScatterplotLayer, TextLayer, type PathLayerProps } from "@deck.gl/layers";
import { PathStyleExtension, type PathStyleExtensionProps } from "@deck.gl/extensions";
import Map, { type MapRef, Layer, Source } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useSimulationStore } from "../../stores/simulationStore";
import type { BurnProbabilityMap, GeoJsonPolygon, RouteResult, ZoneResult } from "../../types/api";
import { AnimationTimeline } from "./AnimationTimeline";

interface MapCamera {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

interface BurnCell {
  position: [number, number];
  probability: number;
}

interface RouteDatum {
  route: RouteResult;
  selected: boolean;
}

interface ZoneDatum extends ZoneResult {
  selected: boolean;
}

interface HoveredZone {
  zone: ZoneResult;
  x: number;
  y: number;
}

interface ArrowDatum {
  position: [number, number];
  angle: number;
  score: number;
  selected: boolean;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
const EMPTY_ZONES: ZoneResult[] = [];

const initialViewState: MapCamera = {
  longitude: -121.6219,
  latitude: 39.7596,
  zoom: 10.9,
  pitch: 48,
  bearing: -18,
};

export function MapView() {
  const store = useSimulationStore();
  const [viewState, setViewState] = useState<MapCamera>(initialViewState);
  const [hoveredZone, setHoveredZone] = useState<HoveredZone | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [dashOffset, setDashOffset] = useState(0);
  const mapRef = useRef<MapRef>(null);

  const zones = store.result?.zone_results ?? EMPTY_ZONES;
  const burnMap = store.result?.burn_probability_map;
  const shelters = store.result ? deriveShelters(store.result.zone_results) : [];
  const routes = routeData(zones, store.selectedRouteId);
  const routeOverlayProps = store.layers.routes && routes.length > 0
    ? {
        id: "route-overlay",
        data: routes,
        pickable: true,
        getPath: (d) => routePath(d.route),
        getColor: (d) => routeColor(d.route.viability_score ?? 0, d.selected),
        getWidth: (d) => (d.selected ? 8 : 4),
        widthUnits: "pixels",
        onClick: (info: PickingInfo<RouteDatum>) => {
          if (info.object) store.selectRoute(info.object.route.route_id, info.object.route.zone_id);
        },
        extensions: [new PathStyleExtension({ dash: true, highPrecisionDash: true })],
        getDashArray: [8, 4] as const,
        dashGapPickable: true,
        dashJustified: false,
      } satisfies PathLayerProps<RouteDatum> & PathStyleExtensionProps<RouteDatum>
    : null;

  // Animate route arrow offset
  useEffect(() => {
    if (routes.length === 0) return;
    const id = window.setInterval(() => {
      setDashOffset((prev) => (prev + 1) % 5);
    }, 600);
    return () => window.clearInterval(id);
  }, [routes.length]);

  // Update terrain exaggeration when slider changes
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (store.layers.elevation) {
      map.setTerrain({ source: "mapbox-dem", exaggeration: store.terrainExaggeration });
    } else {
      map.setTerrain(null);
    }
  }, [store.layers.elevation, store.terrainExaggeration]);

  // Fly to selected zone
  useEffect(() => {
    const selectedZone = zones.find((z) => z.zone_id === store.selectedZoneId);
    if (!selectedZone) return undefined;
    const center = polygonCenter(selectedZone.geometry);
    const id = window.setTimeout(() => {
      setViewState((v) => ({
        ...v,
        longitude: center[0],
        latitude: center[1],
        zoom: Math.max(v.zoom, 11.7),
      }));
    }, 0);
    return () => window.clearTimeout(id);
  }, [store.selectedZoneId, zones]);

  const layers = [
    store.layers.perimeter && store.result
      ? new PolygonLayer<{ geometry: GeoJsonPolygon }>({
          id: "fire-perimeter",
          data: store.result.zone_results.map((z) => ({ geometry: z.geometry })),
          stroked: true,
          filled: false,
          getPolygon: (d) => d.geometry.coordinates[0],
          getLineColor: [255, 107, 53, 180],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
        })
      : null,
    store.layers.zones && zones.length > 0
      ? new PolygonLayer<ZoneDatum>({
          id: "zone-choropleth",
          data: zones.map((z) => ({ ...z, selected: z.zone_id === store.selectedZoneId })),
          pickable: true,
          stroked: true,
          filled: true,
          getPolygon: (d) => d.geometry.coordinates[0],
          getFillColor: (d) => zoneFillColor(d),
          getLineColor: (d) => (d.selected ? [249, 250, 251, 255] : [148, 163, 184, 130]),
          getLineWidth: (d) => (d.selected ? 4 : 1),
          lineWidthUnits: "pixels",
          onHover: (info: PickingInfo<ZoneDatum>) =>
            setHoveredZone(info.object ? { zone: info.object, x: info.x, y: info.y } : null),
          onClick: (info: PickingInfo<ZoneDatum>) => {
            if (info.object) store.selectZone(info.object.zone_id);
          },
        })
      : null,
    // Redundant icon encoding for accessibility (WCAG 1.4.1)
    store.layers.zones && zones.length > 0
      ? new TextLayer<ZoneResult>({
          id: "zone-icons",
          data: zones,
          getPosition: (d) => polygonCenter(d.geometry),
          getText: (d) => zoneIcon(d.cutoff_time),
          getColor: [249, 250, 251, 220],
          getSize: 16,
          fontFamily: "sans-serif",
        })
      : null,
    store.layers.burnHeatmap && burnMap
      ? new ScatterplotLayer<BurnCell>({
          id: "burn-heatmap",
          data: burnCells(burnMap),
          getPosition: (d) => d.position,
          getFillColor: (d) => burnColor(d.probability, store.burnOpacity),
          getRadius: 440,
          radiusUnits: "meters",
          stroked: false,
          opacity: store.animation.playing ? 0.75 : 1,
        })
      : null,
    store.layers.routes && routes.length > 0
      ? new PathLayer<RouteDatum>({
          id: "route-base",
          data: routes,
          getPath: (d) => routePath(d.route),
          getColor: (d) => {
            const c = routeColor(d.route.viability_score ?? 0, d.selected);
            return [c[0], c[1], c[2], Math.round(c[3] * 0.35)] as [number, number, number, number];
          },
          getWidth: (d) => (d.selected ? 8 : 4),
          widthUnits: "pixels",
        })
      : null,
    routeOverlayProps ? new PathLayer<RouteDatum>(routeOverlayProps) : null,
    store.layers.routes && routes.length > 0
      ? new TextLayer<ArrowDatum>({
          id: "route-arrows",
          data: routeArrows(routes, dashOffset),
          getPosition: (d) => d.position,
          getText: () => "▶",
          getAngle: (d) => -d.angle,
          getColor: (d) => routeColor(d.score, d.selected),
          getSize: (d) => (d.selected ? 16 : 12),
          fontFamily: "sans-serif",
          billboard: false,
          getTextAnchor: "middle",
          getAlignmentBaseline: "center",
        })
      : null,
    store.layers.shelters && shelters.length > 0
      ? new ScatterplotLayer<(typeof shelters)[0]>({
          id: "shelter-markers",
          data: shelters,
          getPosition: (d) => [d.lon, d.lat],
          getRadius: 260,
          radiusUnits: "meters",
          getFillColor: [16, 185, 129, 225],
          getLineColor: [249, 250, 251, 230],
          getLineWidth: 2,
          lineWidthUnits: "pixels",
          stroked: true,
        })
      : null,
    store.layers.shelters && shelters.length > 0
      ? new TextLayer<(typeof shelters)[0]>({
          id: "shelter-labels",
          data: shelters,
          getPosition: (d) => [d.lon, d.lat],
          getText: (d) => d.shelter_id,
          getColor: [249, 250, 251, 255],
          getSize: 11,
          getPixelOffset: [0, -24],
          fontFamily: "JetBrains Mono, monospace",
        })
      : null,
    new ScatterplotLayer({
      id: "ignition-marker",
      data: [store.ignition],
      getPosition: (d) => [d.lon, d.lat],
      getRadius: 300,
      radiusUnits: "meters",
      getFillColor: [255, 107, 53, 210],
      getLineColor: [249, 250, 251, 255],
      getLineWidth: 3,
      lineWidthUnits: "pixels",
      stroked: true,
    }),
  ].filter(Boolean);

  return (
    <main
      className={`map-shell ${store.selectIgnitionMode ? "map-shell--ignite-mode" : ""}`}
      aria-label="Fire spread simulation map"
    >
      {mapError ? (
        <div className="map-error-panel">
          <strong>Map failed to load</strong>
          <span>{mapError}</span>
          <span>Check that VITE_MAPBOX_TOKEN is set correctly in .env</span>
        </div>
      ) : null}

      <DeckGL
        controller
        layers={layers}
        viewState={viewState}
        onClick={(info: PickingInfo) => {
          if (store.selectIgnitionMode && info.coordinate) {
            const [lon, lat] = info.coordinate;
            store.setIgnition(lat, lon);
          }
        }}
        onViewStateChange={({ viewState: next }) =>
          setViewState(toMapCamera(next as Partial<MapCamera>))
        }
      >
        {MAPBOX_TOKEN ? (
          <Map
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle={DARK_STYLE}
            onError={(e) => setMapError(e.error?.message ?? "Unknown map error")}
          >
            {/* Terrain DEM source — always added so setTerrain() can reference it */}
            <Source
              id="mapbox-dem"
              type="raster-dem"
              url="mapbox://mapbox.mapbox-terrain-dem-v1"
              tileSize={512}
              maxzoom={14}
            />
            {store.layers.elevation ? (
              <Layer
                id="hillshade"
                type="hillshade"
                source="mapbox-dem"
                paint={{ "hillshade-exaggeration": 0.5 }}
              />
            ) : null}
          </Map>
        ) : (
          <div className="map-basemap" aria-hidden="true" />
        )}
      </DeckGL>

      <div className="map-toolbar">
        <button
          className={`map-chip ${store.selectIgnitionMode ? "is-active" : ""}`}
          type="button"
          aria-pressed={store.selectIgnitionMode}
          onClick={() => store.setSelectIgnitionMode(!store.selectIgnitionMode)}
        >
          🔥 {store.selectIgnitionMode ? "Click map to place ignition" : "Set Ignition Point"}
        </button>
        <span className="map-chip">📍 Paradise, CA</span>
        <span className="map-chip">⛰ Terrain {store.terrainExaggeration.toFixed(1)}×</span>
      </div>

      {store.result ? (
        <div className="map-legend" aria-label="Map legend">
          <strong className="map-legend__title">Legend</strong>
          <div className="map-legend__section">
            <span className="map-legend__heading">Zone Urgency</span>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#ef4444" }} />Critical (&lt;5 min)</div>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#f59e0b" }} />Warning (5–15 min)</div>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#ffd600" }} />Caution (15–30 min)</div>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#10b981" }} />Safe (&gt;30 min)</div>
          </div>
          <div className="map-legend__section">
            <span className="map-legend__heading">Route Viability</span>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#00e5ff" }} />High (&gt;80%)</div>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#f59e0b" }} />Medium (50–80%)</div>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "#ef4444" }} />Low (&lt;50%)</div>
          </div>
          <div className="map-legend__section">
            <span className="map-legend__heading">Markers</span>
            <div className="map-legend__item"><span className="map-legend__swatch map-legend__swatch--round" style={{ background: "#ff6b35" }} />Ignition Point</div>
            <div className="map-legend__item"><span className="map-legend__swatch map-legend__swatch--round" style={{ background: "#10b981" }} />Shelter</div>
            <div className="map-legend__item"><span className="map-legend__swatch" style={{ background: "linear-gradient(90deg, #ffd600, #ff6b35, #881337)" }} />Burn Probability</div>
          </div>
        </div>
      ) : null}

      {hoveredZone ? <ZoneTooltip hoveredZone={hoveredZone} /> : null}
      <AnimationTimeline />
    </main>
  );
}

function ZoneTooltip({ hoveredZone }: { hoveredZone: HoveredZone }) {
  const { zone, x, y } = hoveredZone;
  const urgency = zone.cutoff_time == null ? "unknown" : zone.cutoff_time < 5 ? "critical" : zone.cutoff_time < 15 ? "warning" : zone.cutoff_time < 30 ? "caution" : "safe";
  return (
    <div className="zone-tooltip" style={{ left: x + 16, top: y + 16 }}>
      <strong>{zone.zone_id}</strong>
      <span>👥 Population: {zone.population.toLocaleString()}</span>
      <span>⏱ Fire cutoff: {zone.cutoff_time ?? "n/a"} min</span>
      <span>📊 Evac priority: {zone.evacuation_priority_score.toFixed(0)} / 100</span>
      <span>⚠ Failure risk: {(zone.failure_risk_pct ?? 0).toFixed(0)}%</span>
      <span className={`zone-tooltip__urgency zone-tooltip__urgency--${urgency}`}>
        {urgency.toUpperCase()} URGENCY
      </span>
    </div>
  );
}

function burnCells(map: BurnProbabilityMap): BurnCell[] {
  const { grid_bounds: b, data } = map;
  const latStep = (b.max_lat - b.min_lat) / b.grid_rows;
  const lonStep = (b.max_lon - b.min_lon) / b.grid_cols;
  const cells: BurnCell[] = [];
  data.forEach((row, r) =>
    row.forEach((p, c) => {
      if (p < 0.05) return;
      cells.push({ probability: p, position: [b.min_lon + lonStep * (c + 0.5), b.max_lat - latStep * (r + 0.5)] });
    }),
  );
  return cells;
}

function burnColor(p: number, opacity: number): [number, number, number, number] {
  const a = Math.round(255 * opacity * Math.min(1, p + 0.25));
  if (p < 0.3) return [255, 214, 0, a];
  if (p < 0.6) return [245, 158, 11, a];
  if (p < 0.8) return [255, 107, 53, a];
  return [136, 19, 55, a];
}

function routeData(zones: ZoneResult[], selectedRouteId: string | null): RouteDatum[] {
  return zones.flatMap((z) => {
    const items: RouteDatum[] = [{ route: z.baseline_route, selected: z.baseline_route.route_id === selectedRouteId }];
    if (z.optimized_route) items.push({ route: z.optimized_route, selected: z.optimized_route.route_id === selectedRouteId });
    return items;
  });
}

function routeColor(score: number, selected: boolean): [number, number, number, number] {
  const a = selected ? 255 : 190;
  if (score > 80) return [0, 229, 255, a];
  if (score >= 50) return [245, 158, 11, a];
  return [239, 68, 68, a];
}

function routePath(route: RouteResult): [number, number][] {
  return route.path_coords.map(([lat, lon]): [number, number] => [lon, lat]);
}

function routeArrows(routes: RouteDatum[], offset: number): ArrowDatum[] {
  const arrows: ArrowDatum[] = [];
  const SPACING = 5; // place an arrow every ~5 segments
  for (const { route, selected } of routes) {
    const path = routePath(route);
    if (path.length < 2) continue;
    const score = route.viability_score ?? 0;
    const start = Math.round(offset) % SPACING;
    for (let i = start; i < path.length - 1; i += SPACING) {
      const [x1, y1] = path[i];
      const [x2, y2] = path[i + 1];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      arrows.push({
        position: [(x1 + x2) / 2, (y1 + y2) / 2],
        angle,
        score,
        selected,
      });
    }
  }
  return arrows;
}

function toMapCamera(v: Partial<MapCamera>): MapCamera {
  return {
    longitude: v.longitude ?? initialViewState.longitude,
    latitude: v.latitude ?? initialViewState.latitude,
    zoom: v.zoom ?? initialViewState.zoom,
    pitch: v.pitch ?? initialViewState.pitch,
    bearing: v.bearing ?? initialViewState.bearing,
  };
}

function zoneFillColor(z: ZoneDatum): [number, number, number, number] {
  const cutoff = z.cutoff_time ?? 99;
  const a = z.selected ? 178 : 112;
  if (cutoff > 30) return [16, 185, 129, a];
  if (cutoff > 15) return [255, 214, 0, a];
  if (cutoff > 5) return [245, 158, 11, a];
  return [239, 68, 68, a];
}

function deriveShelters(zones: ZoneResult[]) {
  const seen = new Set<string>();
  const out: { shelter_id: string; lon: number; lat: number; capacity: number }[] = [];
  for (const z of zones) {
    const route = z.optimized_route ?? z.baseline_route;
    if (!route.shelter_id || seen.has(route.shelter_id)) continue;
    seen.add(route.shelter_id);
    const last = route.path_coords[route.path_coords.length - 1];
    if (last) out.push({ shelter_id: route.shelter_id, lat: last[0], lon: last[1], capacity: 0 });
  }
  return out;
}

function polygonCenter(geometry: GeoJsonPolygon): [number, number] {
  const pts = geometry.coordinates[0];
  const t = pts.reduce((s, p) => ({ lon: s.lon + p[0], lat: s.lat + p[1] }), { lat: 0, lon: 0 });
  return [t.lon / pts.length, t.lat / pts.length];
}

// Redundant icon encoding for WCAG 1.4.1 (color-independent)
function zoneIcon(cutoff?: number | null): string {
  if (cutoff === null || cutoff === undefined || cutoff < 5) return "✕";
  if (cutoff < 15) return "⚠";
  return "✓";
}
