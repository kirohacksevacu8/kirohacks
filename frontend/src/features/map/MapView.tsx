import { useCallback, useState, useRef } from 'react';
import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
  type MapRef,
  type MapLayerMouseEvent,
} from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSimulation } from '@/hooks/useSimulation';
import { cn } from '@/lib/cn';

// Free dark basemap — no token required
const CARTO_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Paradise, CA center
const INITIAL_VIEW = {
  longitude: -121.62,
  latitude: 39.76,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

export function MapView(): React.JSX.Element {
  const { state, setIgnition, toggleLayer } = useSimulation();
  const mapRef = useRef<MapRef>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    zone: string;
  } | null>(null);

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const lat = Number(e.lngLat.lat.toFixed(4));
      const lon = Number(e.lngLat.lng.toFixed(4));
      setIgnition(lat, lon);
    },
    [setIgnition],
  );

  const layers = state.visibleLayers;

  return (
    <div className="flex-1 relative bg-surface-base min-h-0 min-w-0">
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW}
        mapStyle={CARTO_DARK}
        onClick={handleMapClick}
        style={{ position: 'absolute', inset: 0 }}
        cursor="crosshair"
        attributionControl={true}
      >
        <NavigationControl position="bottom-right" />
        <ScaleControl position="bottom-left" unit="imperial" />

        {/* Ignition point marker */}
        {state.ignitionPoint && (
          <Marker
            longitude={state.ignitionPoint.lon}
            latitude={state.ignitionPoint.lat}
            anchor="center"
          >
            <div className="relative flex items-center justify-center">
              {/* Pulsing ring */}
              <span className="absolute w-8 h-8 rounded-full bg-fire-active/30 animate-ping" />
              {/* Core dot */}
              <span className="relative w-4 h-4 rounded-full bg-fire-active border-2 border-white shadow-glow-fire" />
            </div>
          </Marker>
        )}
      </Map>

      {/* Mock burn heatmap visualization overlay */}
      {state.currentResults && layers.burnHeatmap && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 rounded-full bg-gradient-radial from-fire-active/40 via-fire-high/20 to-transparent blur-xl" />
        </div>
      )}

      {/* Mock zone overlays */}
      {state.currentResults && layers.zones && (
        <div className="absolute inset-0 pointer-events-none">
          {state.currentResults.zones.features.map((z) => (
            <div
              key={z.properties.zone_id}
              className={cn(
                'absolute w-16 h-12 rounded border text-[8px] font-mono flex items-center justify-center pointer-events-auto',
                z.properties.cutoff_time < 10
                  ? 'bg-zone-critical/20 border-zone-critical/40 text-zone-critical'
                  : z.properties.cutoff_time < 30
                    ? 'bg-zone-warning/20 border-zone-warning/40 text-zone-warning'
                    : 'bg-zone-safe/20 border-zone-safe/40 text-zone-safe',
              )}
              style={{
                top: `${30 + Math.random() * 40}%`,
                left: `${20 + Math.random() * 50}%`,
              }}
              onMouseEnter={(e) =>
                setHoverInfo({
                  x: e.clientX,
                  y: e.clientY,
                  zone: z.properties.zone_id,
                })
              }
              onMouseLeave={() => setHoverInfo(null)}
            >
              {z.properties.zone_id}
            </div>
          ))}
        </div>
      )}

      {/* Hover tooltip */}
      {hoverInfo && state.currentResults && (
        <div
          className="fixed z-30 bg-surface-overlay border border-surface-border rounded-lg p-3 shadow-lg text-sm pointer-events-none"
          style={{ top: hoverInfo.y - 80, left: hoverInfo.x + 10 }}
        >
          {(() => {
            const zone = state.currentResults?.zones.features.find(
              (z) => z.properties.zone_id === hoverInfo.zone,
            );
            if (!zone) return null;
            return (
              <>
                <p className="font-mono text-gray-200">
                  {zone.properties.zone_id}
                </p>
                <p className="text-gray-400">
                  Pop: {zone.properties.population.toLocaleString()}
                </p>
                <p className="text-gray-400">
                  Cutoff: {zone.properties.cutoff_time} min
                </p>
                <p className="text-gray-400">
                  Risk: {zone.properties.failure_risk_percentage}%
                </p>
              </>
            );
          })()}
        </div>
      )}

      {/* Layer Toggle */}
      <div className="absolute top-4 right-4 z-10 bg-surface-overlay/90 backdrop-blur-sm border border-surface-border rounded-lg p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
          Layers
        </p>
        {(
          [
            ['burnHeatmap', '🔥 Burn Heatmap'],
            ['routes', '🛣️ Routes'],
            ['zones', '📊 Zones'],
            ['elevation', '⛰️ Elevation'],
            ['shelters', '🏠 Shelters'],
            ['perimeter', '🔲 Perimeter'],
          ] as const
        ).map(([key, label]) => (
          <label
            key={key}
            className="flex items-center gap-2 cursor-pointer text-xs text-gray-300"
          >
            <input
              type="checkbox"
              checked={layers[key]}
              onChange={() => toggleLayer(key)}
              className="accent-accent-primary w-3.5 h-3.5"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Mock route legend */}
      {state.currentResults && layers.routes && (
        <div className="absolute bottom-4 left-4 z-10 bg-surface-overlay/90 backdrop-blur-sm border border-surface-border rounded-lg p-2 space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Routes
          </p>
          {state.currentResults.routes.map((r) => (
            <div
              key={r.route_id}
              className="flex items-center gap-2 text-[10px]"
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  r.viability_score > 0.8
                    ? 'bg-route-safe'
                    : r.viability_score > 0.5
                      ? 'bg-route-caution'
                      : 'bg-route-danger',
                )}
              />
              <span className="text-gray-400 font-mono">
                {r.route_id}: {(r.viability_score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ignition coordinates badge */}
      {state.ignitionPoint && (
        <div className="absolute bottom-4 right-4 z-10 bg-surface-overlay/90 backdrop-blur-sm border border-surface-border rounded-lg px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Ignition
          </p>
          <p className="text-xs font-mono text-fire-active">
            {state.ignitionPoint.lat.toFixed(4)},{' '}
            {state.ignitionPoint.lon.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}
