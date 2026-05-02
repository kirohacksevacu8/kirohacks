import { useSimulation } from '@/hooks/useSimulation';
import { MetricCard } from '@/components/MetricCard';
import { cn } from '@/lib/cn';

export function ResultsPanel(): React.JSX.Element {
  const { state, selectZone } = useSimulation();
  const results = state.currentResults;

  if (!results) {
    return (
      <aside className="w-96 shrink-0 bg-surface-raised border-l border-surface-border overflow-y-auto p-4 hidden lg:flex lg:flex-col items-center justify-center">
        <p className="text-gray-500 text-sm text-center">
          Run a simulation to see results
        </p>
      </aside>
    );
  }

  const bestRoute = results.routes
    .filter((r) => r.strategy === 'optimized')
    .sort((a, b) => b.viability_score - a.viability_score)[0];

  return (
    <aside className="w-96 shrink-0 bg-surface-raised border-l border-surface-border overflow-y-auto p-4 space-y-4 hidden lg:flex lg:flex-col">
      {/* Key Metric */}
      {bestRoute && (
        <MetricCard
          label="Route Viability"
          value={`${(bestRoute.viability_score * 100).toFixed(0)}%`}
          unit={`${bestRoute.route_id} survives in ${(bestRoute.viability_score * 100).toFixed(0)}% of scenarios`}
          color="text-route-safe"
          large
        />
      )}

      {/* Comparison View */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
          Strategy Comparison
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Baseline Avg"
            value={`${(results.summary.baseline_avg_viability * 100).toFixed(0)}%`}
            color="text-gray-300"
          />
          <MetricCard
            label="Optimized Avg"
            value={`${(results.summary.optimized_avg_viability * 100).toFixed(0)}%`}
            color="text-route-safe"
            delta={`+${results.summary.improvement_percentage.toFixed(1)}% improvement`}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Population at Risk"
          value={results.summary.total_population_at_risk.toLocaleString()}
          color="text-fire-medium"
        />
        <MetricCard
          label="Critical Zones"
          value={results.summary.zones_critical_count}
          unit="cutoff < 10 min"
          color="text-zone-critical"
        />
      </div>

      {/* Zone Evacuation Table */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
          Zone Evacuation
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-surface-border">
                {['Zone', 'Pop', 'Cutoff', 'Base', 'Opt', 'Risk', ''].map((h) => (
                  <th
                    key={h}
                    className="text-[10px] uppercase tracking-wider text-gray-500 font-medium px-2 py-1.5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.zones.features.map((z) => {
                const p = z.properties;
                const isSelected = state.selectedZoneId === p.zone_id;
                return (
                  <tr
                    key={p.zone_id}
                    onClick={() => selectZone(isSelected ? null : p.zone_id)}
                    className={cn(
                      'border-b border-surface-border cursor-pointer transition-colors',
                      isSelected ? 'bg-accent-primary/10' : 'hover:bg-surface-hover'
                    )}
                  >
                    <td className="px-2 py-1.5 font-mono text-xs text-gray-300">{p.zone_id}</td>
                    <td className="px-2 py-1.5 font-mono text-xs text-gray-300">
                      {p.population.toLocaleString()}
                    </td>
                    <td
                      className={cn(
                        'px-2 py-1.5 font-mono text-xs',
                        p.cutoff_time < 10
                          ? 'text-fire-high'
                          : p.cutoff_time < 30
                            ? 'text-zone-warning'
                            : 'text-gray-300'
                      )}
                    >
                      {p.cutoff_time}m
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-gray-400">
                      {(p.baseline_viability * 100).toFixed(0)}%
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-route-safe">
                      {(p.optimized_viability * 100).toFixed(0)}%
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs text-fire-medium">
                      {p.failure_risk_percentage}%
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          'inline-block w-2 h-2 rounded-full',
                          p.cutoff_time < 10
                            ? 'bg-zone-critical'
                            : p.cutoff_time < 30
                              ? 'bg-zone-warning'
                              : 'bg-zone-safe'
                        )}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evacuation Ordering */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">
          Evacuation Order
        </h3>
        <ol className="space-y-1.5">
          {results.evacuation_ordering.map((z, i) => (
            <li
              key={z.zone_id}
              className="flex items-center gap-3 p-2 rounded-md bg-surface-overlay text-sm"
            >
              <span className="text-gray-500 font-mono text-xs w-4">{i + 1}.</span>
              <span
                className={cn(
                  'w-2 h-2 rounded-full shrink-0',
                  z.cutoff_time < 10
                    ? 'bg-zone-critical'
                    : z.cutoff_time < 30
                      ? 'bg-zone-warning'
                      : 'bg-zone-safe'
                )}
              />
              <span className="font-mono text-xs text-gray-300">{z.zone_id}</span>
              <span className="text-[10px] text-gray-500">
                {z.population.toLocaleString()} people · {z.cutoff_time}min
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Confidence Interval */}
      <div className="text-[10px] text-gray-500 text-center pt-2 border-t border-surface-border">
        95% CI: [{(results.summary.confidence_interval_95[0] * 100).toFixed(0)}% –{' '}
        {(results.summary.confidence_interval_95[1] * 100).toFixed(0)}%]
      </div>
    </aside>
  );
}
