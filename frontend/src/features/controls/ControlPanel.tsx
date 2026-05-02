import { useState } from 'react';
import { useSimulation } from '@/hooks/useSimulation';
import { cn } from '@/lib/cn';
import { api } from '@/services/api';
import type { ScenarioPreset } from '@/types/api';

export function ControlPanel(): React.JSX.Element {
  const { state, setIgnition, setWind, setScenario, setMonteCarloRuns, runSimulation, fetchWind } = useSimulation();
  const [scenarios, setScenarios] = useState<ScenarioPreset[]>([]);
  const [scenariosLoaded, setScenariosLoaded] = useState(false);
  const [clickMode, setClickMode] = useState(false);

  const loadScenarios = async () => {
    if (scenariosLoaded) return;
    const data = await api.getScenarios();
    setScenarios(data);
    setScenariosLoaded(true);
  };

  // Load scenarios on first render
  if (!scenariosLoaded) {
    loadScenarios();
  }

  const isRunning = state.jobStatus === 'running' || state.jobStatus === 'submitting';
  const canRun = state.ignitionPoint !== null && !isRunning;

  return (
    <aside className="w-80 shrink-0 bg-surface-raised border-r border-surface-border overflow-y-auto p-4 space-y-5 hidden lg:flex lg:flex-col">
      {/* Ignition Section */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Ignition Point</h3>
        {state.ignitionPoint ? (
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-gray-300">
              {state.ignitionPoint.lat.toFixed(4)}, {state.ignitionPoint.lon.toFixed(4)}
            </span>
            <button
              onClick={() => setIgnition(0, 0)}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Click map to select</p>
        )}
        <button
          onClick={() => setClickMode(!clickMode)}
          className={cn(
            'mt-2 w-full px-3 py-2 rounded-md text-sm transition-colors min-h-[44px]',
            'border border-surface-border',
            clickMode
              ? 'bg-fire-active/20 text-fire-active border-fire-active/30'
              : 'bg-surface-overlay hover:bg-surface-hover text-gray-300'
          )}
        >
          {clickMode ? '📍 Click map to place...' : 'Select on Map'}
        </button>
      </section>

      {/* Wind Section */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Wind Parameters</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Speed (mph)', key: 'wind_speed' as const, max: 100 },
            { label: 'Direction (°)', key: 'wind_direction' as const, max: 360 },
            { label: 'Gust (mph)', key: 'wind_gust' as const, max: 150 },
            { label: 'Humidity (%)', key: 'relative_humidity' as const, max: 100 },
          ].map(({ label, key, max }) => (
            <div key={key}>
              <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
              <input
                type="number"
                min={0}
                max={max}
                value={state.windParams[key]}
                onChange={(e) => setWind({ [key]: Number(e.target.value) })}
                className="w-full bg-surface-base border border-surface-border rounded-md px-3 py-2 font-mono text-sm text-gray-200 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary/30 outline-none transition-colors"
              />
            </div>
          ))}
        </div>
        <button
          onClick={fetchWind}
          className="mt-2 w-full px-3 py-2 rounded-md text-sm bg-surface-overlay hover:bg-surface-hover border border-surface-border text-gray-300 transition-colors min-h-[44px]"
        >
          🌬️ Fetch Live Wind
        </button>
      </section>

      {/* Scenario Selector */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Scenarios</h3>
        <div className="space-y-2">
          {scenarios.map((s) => (
            <button
              key={s.name}
              onClick={() => setScenario(s)}
              className={cn(
                'w-full text-left p-3 rounded-lg border transition-all min-h-[44px]',
                state.selectedScenario === s.name
                  ? 'border-accent-primary ring-2 ring-accent-primary/30 bg-surface-overlay'
                  : 'border-surface-border bg-surface-overlay hover:bg-surface-hover'
              )}
            >
              <p className="text-sm font-medium text-gray-200">{s.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Monte Carlo Slider */}
      <section>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">Monte Carlo Runs</h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={state.monteCarloRuns}
            onChange={(e) => setMonteCarloRuns(Number(e.target.value))}
            className="flex-1 accent-fire-active"
          />
          <span className="font-mono text-lg font-bold text-gray-200 w-14 text-right">
            {state.monteCarloRuns}
          </span>
        </div>
      </section>

      {/* Run Button */}
      <button
        disabled={!canRun}
        onClick={runSimulation}
        className={cn(
          'w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150 min-h-[44px]',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
          canRun
            ? 'bg-fire-active hover:bg-fire-medium text-white shadow-glow-fire hover:shadow-lg'
            : 'bg-surface-overlay text-gray-500 cursor-not-allowed'
        )}
      >
        {isRunning
          ? `Running ${state.progress ? `${state.progress.completed}/${state.progress.total}` : '...'}` 
          : '▶ Run Simulation'}
      </button>

      {/* Progress bar */}
      {isRunning && state.progress && (
        <div className="w-full h-1 bg-surface-base rounded-full overflow-hidden">
          <div
            className="h-full bg-fire-active rounded-full transition-all duration-300"
            style={{ width: `${(state.progress.completed / state.progress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Error */}
      {state.jobStatus === 'error' && (
        <p className="text-xs text-accent-error">{state.errorMessage}</p>
      )}

      {/* Demo step indicator */}
      {state.demoMode && (
        <div className="flex items-center gap-1 flex-wrap">
          {['Ignition', 'Wind', 'Simulate', 'Compare', 'Re-run'].map((step, i) => (
            <span
              key={step}
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                i + 1 === state.demoStep
                  ? 'text-accent-primary font-semibold bg-accent-primary/10'
                  : i + 1 < state.demoStep
                    ? 'text-accent-success'
                    : 'text-gray-600'
              )}
            >
              {i + 1}. {step}
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}
