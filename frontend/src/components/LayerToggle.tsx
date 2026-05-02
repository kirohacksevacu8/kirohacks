import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';
import type { VisibleLayers } from '@/context/simulationReducer';

// ---------------------------------------------------------------------------
// LayerToggle — floating panel with labeled checkboxes for each layer
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const HAS_MAPBOX = Boolean(MAPBOX_TOKEN && MAPBOX_TOKEN.length > 0);

interface LayerOption {
  key: keyof VisibleLayers;
  label: string;
  color: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  { key: 'burnHeatmap', label: 'Burn Heatmap', color: 'bg-fire-active' },
  { key: 'routes', label: 'Routes', color: 'bg-route-safe' },
  { key: 'zones', label: 'Zones', color: 'bg-zone-warning' },
  { key: 'elevation', label: 'Elevation', color: 'bg-elevation-mid' },
  { key: 'shelters', label: 'Shelters', color: 'bg-accent-primary' },
  { key: 'perimeter', label: 'Perimeter', color: 'bg-fire-medium' },
];

export function LayerToggle(): React.JSX.Element {
  const {
    visibleLayers,
    terrainExaggeration,
    toggleLayer,
    setTerrainExaggeration,
  } = useSimulation();

  const elevationDisabled = !HAS_MAPBOX;

  return (
    <div
      className={cn(
        'absolute top-4 right-4 z-10',
        'bg-surface-overlay/90 backdrop-blur-sm',
        'border border-surface-border rounded-lg',
        'p-3 space-y-2',
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-1">
        Layers
      </p>

      {LAYER_OPTIONS.map(({ key, label, color }) => {
        const isElevation = key === 'elevation';
        const disabled = isElevation && elevationDisabled;

        return (
          <label
            key={key}
            className={cn(
              'flex items-center gap-2 text-sm text-gray-300 cursor-pointer',
              'hover:text-gray-100 transition-colors duration-150',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            title={disabled ? 'Mapbox token required for elevation' : undefined}
          >
            <input
              type="checkbox"
              checked={visibleLayers[key]}
              onChange={() => {
                if (!disabled) toggleLayer(key);
              }}
              disabled={disabled}
              className="accent-accent-primary w-3.5 h-3.5 rounded"
            />
            <span className={cn('w-2.5 h-2.5 rounded-full', color)} />
            <span>{label}</span>
          </label>
        );
      })}

      {/* Terrain exaggeration slider */}
      <div
        className={cn(
          'pt-2 border-t border-surface-border',
          elevationDisabled && 'opacity-50 cursor-not-allowed',
        )}
        title={
          elevationDisabled ? 'Mapbox token required for elevation' : undefined
        }
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Terrain</span>
          <span className="text-xs font-mono text-gray-300">
            {terrainExaggeration.toFixed(1)}×
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.5}
          value={terrainExaggeration}
          onChange={(e) => setTerrainExaggeration(parseFloat(e.target.value))}
          disabled={elevationDisabled || !visibleLayers.elevation}
          className="w-full accent-accent-primary"
          aria-label="Terrain exaggeration"
        />
      </div>
    </div>
  );
}
