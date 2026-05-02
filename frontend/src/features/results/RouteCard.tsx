/**
 * RouteCard — displays a single evacuation route's details
 */

import { cn } from '@/lib/cn';
import type { EvacuationRoute } from '@/types/api';

function viabilityColor(score: number) {
  if (score >= 80) return 'text-route-safe';
  if (score >= 50) return 'text-route-caution';
  return 'text-route-danger';
}

export function RouteCard({ route, onShowOnMap }: { route: EvacuationRoute; onShowOnMap?: () => void }) {
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-200">{route.route_id}</span>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border', route.strategy === 'optimized' ? 'border-route-safe/40 text-route-safe bg-route-safe/10' : 'border-route-caution/40 text-route-caution bg-route-caution/10')}>
          {route.strategy}
        </span>
      </div>
      <div className="flex gap-4 text-xs text-gray-400">
        <span>Viability: <span className={cn('font-mono font-bold', viabilityColor(route.viability_score))}>{route.viability_score}%</span></span>
        <span>Time: <span className="font-mono text-gray-200">{route.travel_time_minutes}m</span></span>
      </div>
      {onShowOnMap && (
        <button
          type="button"
          onClick={onShowOnMap}
          className={cn('mt-2 text-xs text-accent-primary hover:text-accent-primary-hover transition-colors', 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary')}
        >
          Show on Map →
        </button>
      )}
    </div>
  );
}
