import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';

/**
 * Ignition point display and selection controls.
 * Shows lat/lon in monospace, "Select on Map" prompt, and clear button.
 */
export function IgnitionSection(): React.JSX.Element {
  const { ignitionPoint, setIgnition } = useSimulation();

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
        Ignition Point
      </h3>

      {ignitionPoint ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-surface-base border border-surface-border rounded-md px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                Lat
              </span>
              <p className="font-mono text-sm text-gray-200">
                {ignitionPoint.lat.toFixed(5)}
              </p>
            </div>
            <div className="bg-surface-base border border-surface-border rounded-md px-3 py-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">
                Lon
              </span>
              <p className="font-mono text-sm text-gray-200">
                {ignitionPoint.lon.toFixed(5)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIgnition(null)}
            className={cn(
              'w-full bg-surface-overlay hover:bg-surface-hover',
              'border border-surface-border rounded-md px-3 py-2 text-sm',
              'text-gray-400 hover:text-gray-200 transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
              'min-h-[44px]',
            )}
          >
            ✕ Clear Ignition
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-400">No ignition point selected</p>
          <button
            type="button"
            className={cn(
              'w-full bg-surface-overlay hover:bg-surface-hover',
              'border border-surface-border rounded-md px-3 py-2 text-sm',
              'text-gray-300 hover:text-gray-100 transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
              'min-h-[44px]',
            )}
            aria-label="Click on the map to select an ignition point"
          >
            📍 Select on Map
          </button>
        </div>
      )}
    </section>
  );
}
