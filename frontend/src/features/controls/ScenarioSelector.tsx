import { useCallback, useEffect, useState } from 'react';

import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';
import { createApiClient } from '@/services/api';
import type { ScenarioPreset } from '@/types/api';

// ---------------------------------------------------------------------------
// Singleton API client
// ---------------------------------------------------------------------------

const api = createApiClient();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Scenario preset selector — fetches presets from the API and renders
 * them as selectable cards with name + description.
 */
export function ScenarioSelector(): React.JSX.Element {
  const { state, setScenario, setIgnition, setWind } = useSimulation();
  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const data = await api.getScenarios();
        if (!cancelled) {
          setScenarios(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = useCallback(
    (preset: ScenarioPreset) => {
      const isSelected = state.selectedScenario === preset.name;

      if (isSelected) {
        // Deselect
        setScenario(null);
        return;
      }

      setScenario(preset.name);
      setIgnition(preset.ignition_point);
      setWind({
        wind_speed: preset.wind_speed,
        wind_direction: preset.wind_direction,
        wind_gust: preset.wind_gust,
        relative_humidity: preset.relative_humidity,
        source: 'manual',
      });
    },
    [state.selectedScenario, setScenario, setIgnition, setWind],
  );

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
        Scenario Presets
      </h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading scenarios…</p>
      ) : scenarios.length === 0 ? (
        <p className="text-sm text-gray-500">No scenarios available</p>
      ) : (
        <div className="space-y-2">
          {scenarios.map((preset) => {
            const selected = state.selectedScenario === preset.name;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelect(preset)}
                className={cn(
                  'w-full text-left bg-surface-overlay hover:bg-surface-hover',
                  'border border-surface-border rounded-lg p-3',
                  'cursor-pointer transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
                  'min-h-[44px]',
                  selected && 'ring-2 ring-accent-primary',
                )}
                aria-pressed={selected}
              >
                <p
                  className={cn(
                    'text-sm font-medium',
                    selected ? 'text-accent-primary' : 'text-gray-200',
                  )}
                >
                  {preset.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {preset.description}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
