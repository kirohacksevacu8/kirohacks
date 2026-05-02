/**
 * EvacuationOrdering — ordered list of zones by evacuation priority
 */

import { cn } from '@/lib/cn';
import type { EvacuationOrderEntry } from '@/types/api';

function urgencyColor(cutoff: number) {
  if (cutoff > 30) return 'bg-zone-safe';
  if (cutoff > 15) return 'bg-zone-warning';
  if (cutoff > 5)  return 'bg-fire-medium';
  return 'bg-zone-critical';
}

export function EvacuationOrdering({ ordering }: { ordering: EvacuationOrderEntry[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Evacuation Order</div>
      <ol className="space-y-2">
        {ordering.map((entry, i) => (
          <li key={entry.zone_id} className="flex items-center gap-3 p-2 rounded-md bg-surface-overlay">
            <span className="text-xs font-mono text-gray-500 w-4 shrink-0">{i + 1}</span>
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', urgencyColor(entry.cutoff_time))} />
            <span className="font-mono text-sm text-gray-200 flex-1">{entry.zone_id}</span>
            <span className="text-xs text-gray-400">{entry.population.toLocaleString()}</span>
            <span className="text-xs font-mono text-gray-500">{entry.cutoff_time}m</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
