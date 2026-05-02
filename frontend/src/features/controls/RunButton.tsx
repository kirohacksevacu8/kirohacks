import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';

export interface RunButtonProps {
  onValidationError?: (message: string) => void;
}

/**
 * Full-width simulation run button with fire glow,
 * disabled state during run, and progress overlay bar.
 */
export function RunButton({ onValidationError }: RunButtonProps): React.JSX.Element {
  const {
    ignitionPoint,
    windParams,
    isRunning,
    progress,
    runSimulation,
  } = useSimulation();

  const handleClick = (): void => {
    // Client-side validation
    if (!ignitionPoint) {
      onValidationError?.('Select an ignition point on the map first');
      return;
    }
    if (windParams.wind_speed < 0 || windParams.wind_speed > 100) {
      onValidationError?.('Wind speed must be 0–100 mph');
      return;
    }
    if (windParams.wind_direction < 0 || windParams.wind_direction > 360) {
      onValidationError?.('Wind direction must be 0–360°');
      return;
    }
    if (windParams.wind_gust < 0 || windParams.wind_gust > 150) {
      onValidationError?.('Wind gust must be 0–150 mph');
      return;
    }
    if (windParams.relative_humidity < 0 || windParams.relative_humidity > 100) {
      onValidationError?.('Humidity must be 0–100%');
      return;
    }

    void runSimulation();
  };

  const progressPct =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  return (
    <section>
      <button
        type="button"
        disabled={isRunning}
        onClick={handleClick}
        className={cn(
          'relative w-full py-3 px-4 rounded-lg font-semibold text-sm',
          'transition-all duration-150 overflow-hidden',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
          'min-h-[44px]',
          isRunning
            ? 'bg-surface-overlay text-gray-500 cursor-not-allowed'
            : 'bg-fire-active hover:bg-fire-medium text-white shadow-glow-fire hover:shadow-lg',
        )}
        aria-label={
          isRunning
            ? `Simulation running: ${progressPct}% complete`
            : 'Run simulation'
        }
      >
        {/* Progress bar overlay */}
        {isRunning && progress && (
          <div
            className="absolute inset-y-0 left-0 bg-fire-active/30 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
            aria-hidden="true"
          />
        )}

        <span className="relative z-10">
          {isRunning
            ? `Running ${progress?.completed ?? 0}/${progress?.total ?? '…'}…`
            : '▶ Run Simulation'}
        </span>
      </button>
    </section>
  );
}
