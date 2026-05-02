import { useCallback } from 'react';

import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';

/**
 * Monte Carlo runs slider — range input min=50 max=1000 step=50
 * with a prominent numeric display.
 */
export function MonteCarloSlider(): React.JSX.Element {
  const { monteCarloRuns, setMonteCarloRuns } = useSimulation();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setMonteCarloRuns(Number(e.target.value));
    },
    [setMonteCarloRuns],
  );

  return (
    <section>
      <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">
        Monte Carlo Runs
      </h3>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={50}
          max={1000}
          step={50}
          value={monteCarloRuns}
          onChange={handleChange}
          className={cn(
            'flex-1 h-2 rounded-lg appearance-none cursor-pointer',
            'accent-fire-active',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
          )}
          aria-label={`Monte Carlo runs: ${monteCarloRuns}`}
        />
        <span className="font-mono text-lg font-bold text-gray-200 min-w-[4ch] text-right">
          {monteCarloRuns}
        </span>
      </div>

      <p className="text-[10px] text-gray-500 mt-1">
        50 (fast) — 1000 (precise)
      </p>
    </section>
  );
}
