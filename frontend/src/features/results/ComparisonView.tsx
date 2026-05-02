/**
 * ComparisonView — side-by-side baseline vs optimized metrics
 */

import { MetricCard } from '@/components/MetricCard';
import type { SimulationResults } from '@/types/api';

export function ComparisonView({ results }: { results: SimulationResults }) {
  const { summary } = results;

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Route Comparison</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500 mb-2 text-center">Baseline</div>
          <MetricCard label="Avg Viability" value={summary.baseline_avg_viability} unit="%" color="text-route-caution" />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-2 text-center">Optimized</div>
          <MetricCard label="Avg Viability" value={summary.optimized_avg_viability} unit="%" color="text-route-safe" />
        </div>
      </div>
      <div className="mt-2 text-center text-xs text-accent-success">
        +{summary.improvement_percentage}% improvement with optimized routing
      </div>
    </div>
  );
}
