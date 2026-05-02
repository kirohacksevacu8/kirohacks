import { useCallback, useState } from 'react';

import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';
import { createApiClient } from '@/services/api';
import type { WindParameters } from '@/context/simulationReducer';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

interface ValidationErrors {
  wind_speed?: string;
  wind_direction?: string;
  wind_gust?: string;
  relative_humidity?: string;
}

function validateWind(params: WindParameters): ValidationErrors {
  const errors: ValidationErrors = {};
  if (params.wind_speed < 0 || params.wind_speed > 100) {
    errors.wind_speed = 'Must be 0–100 mph';
  }
  if (params.wind_direction < 0 || params.wind_direction > 360) {
    errors.wind_direction = 'Must be 0–360°';
  }
  if (params.wind_gust < 0 || params.wind_gust > 150) {
    errors.wind_gust = 'Must be 0–150 mph';
  }
  if (params.relative_humidity < 0 || params.relative_humidity > 100) {
    errors.relative_humidity = 'Must be 0–100%';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Singleton API client
// ---------------------------------------------------------------------------

const api = createApiClient();

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface WindSectionProps {
  onToast?: (message: string, variant: 'success' | 'warning' | 'error') => void;
}

/**
 * Wind parameters section with 2×2 grid of inputs,
 * "Fetch Live Wind" button, and Live/Manual toggle.
 */
export function WindSection({ onToast }: WindSectionProps): React.JSX.Element {
  const { windParams, setWind, ignitionPoint } = useSimulation();
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [fetching, setFetching] = useState(false);
  const [mode, setMode] = useState<'live' | 'manual'>(
    windParams.source === 'manual' ? 'manual' : 'live',
  );

  const updateField = useCallback(
    (field: keyof WindParameters, raw: string) => {
      const value = parseFloat(raw);
      if (Number.isNaN(value)) return;

      const next: WindParameters = {
        ...windParams,
        [field]: value,
        source: 'manual' as const,
      };
      const nextErrors = validateWind(next);
      setErrors(nextErrors);
      setWind(next);
      setMode('manual');
    },
    [windParams, setWind],
  );

  const fetchLiveWind = useCallback(async () => {
    const lat = ignitionPoint?.lat ?? 39.7596;
    const lon = ignitionPoint?.lon ?? -121.6219;

    setFetching(true);
    try {
      const data = await api.getWind(lat, lon);
      const next: WindParameters = {
        wind_speed: data.wind_speed,
        wind_direction: data.wind_direction,
        wind_gust: data.wind_gust,
        relative_humidity: data.relative_humidity,
        source: data.source,
      };
      setWind(next);
      setErrors({});
      setMode('live');

      if (data.source === 'fallback') {
        onToast?.('Using default wind (NWS unavailable)', 'warning');
      } else {
        onToast?.('Wind data fetched from NWS', 'success');
      }
    } catch {
      onToast?.('Failed to fetch wind data', 'error');
    } finally {
      setFetching(false);
    }
  }, [ignitionPoint, setWind, onToast]);

  const inputBase = cn(
    'w-full bg-surface-base border rounded-md px-3 py-2',
    'font-mono text-sm text-gray-200',
    'focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
    'min-h-[44px]',
  );

  const fields: Array<{
    key: keyof WindParameters;
    label: string;
    unit: string;
  }> = [
    { key: 'wind_speed', label: 'Speed', unit: 'mph' },
    { key: 'wind_direction', label: 'Direction', unit: '°' },
    { key: 'wind_gust', label: 'Gust', unit: 'mph' },
    { key: 'relative_humidity', label: 'Humidity', unit: '%' },
  ];

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
        Wind Parameters
      </h3>

      {/* Live / Manual toggle */}
      <div className="flex rounded-md border border-surface-border overflow-hidden mb-3">
        {(['live', 'manual'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
              mode === m
                ? 'bg-accent-primary text-white'
                : 'bg-surface-overlay text-gray-400 hover:text-gray-200 hover:bg-surface-hover',
            )}
          >
            {m === 'live' ? 'Live' : 'Manual'}
          </button>
        ))}
      </div>

      {/* 2×2 input grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {fields.map(({ key, label, unit }) => {
          if (key === 'source') return null;
          const err = errors[key as keyof ValidationErrors];
          return (
            <div key={key}>
              <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">
                {label} ({unit})
              </label>
              <input
                type="number"
                value={windParams[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className={cn(
                  inputBase,
                  err ? 'border-accent-error' : 'border-surface-border',
                )}
                aria-invalid={!!err}
                aria-describedby={err ? `wind-err-${key}` : undefined}
              />
              {err && (
                <p
                  id={`wind-err-${key}`}
                  className="text-xs text-accent-error mt-1"
                >
                  {err}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Fetch Live Wind button */}
      <button
        type="button"
        onClick={() => void fetchLiveWind()}
        disabled={fetching}
        className={cn(
          'w-full bg-surface-overlay hover:bg-surface-hover',
          'border border-surface-border rounded-md px-3 py-2 text-sm',
          'text-gray-300 hover:text-gray-100 transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
          'min-h-[44px]',
          fetching && 'opacity-60 cursor-not-allowed',
        )}
      >
        {fetching ? '⏳ Fetching…' : '🌬️ Fetch Live Wind'}
      </button>
    </section>
  );
}
