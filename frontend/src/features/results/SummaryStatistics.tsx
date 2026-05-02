/**
 * SummaryStatistics — grid of key metric cards
 */

import { MetricCard } from '@/components/MetricCard';
import type { SimulationResults } from '@/types/api';

export function SummaryStatistics({ results }: { results: SimulationResults }) {
  const { summary } = results;
  const [ciLo, ciHi] = summary.confidence_interval_95;

  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Summary</div>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Population at Risk" value={summary.total_population_at_risk.toLocaleString()} color="text-accent-warning" />
        <MetricCard label="Critical Zones" value={summary.zones_critical_count} color="text-zone-critical" />
        <MetricCard label="Improvement" value={`+${summary.improvement_percentage}`} unit="%" color="text-accent-success" />
        <MetricCard label="95% CI" value={`${ciLo}–${ciHi}`} unit="%" color="text-gray-300" />
      </div>
    </div>
  );
}
