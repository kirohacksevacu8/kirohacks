/**
 * HeaderBar Component
 *
 * Top navigation bar containing logo, scenario label, simulation status,
 * wind rose, and mode badges.
 */

import { cn } from '@/lib/cn';
import { useSimulation } from '@/hooks/useSimulation';
import { SimulationStatus } from './SimulationStatus';
import { WindRose } from './WindRose';

export function HeaderBar(): React.ReactElement {
  const { state } = useSimulation();
  const { selectedScenario, windParams } = state;

  const isWindModified = windParams.source === 'manual';

  return (
    <header
      className={cn('h-12 bg-surface-raised border-b border-surface-border', 'flex items-center px-4 gap-4')}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <svg className="w-6 h-6 text-fire-active" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.5 1.5-4.5 3-6 .5-.5 1-1 1.5-1.5-.5 2 .5 3.5 1.5 4.5 0-3 2-5 4-7 1 2 1.5 3.5 1.5 5 0 .5 0 1-.5 1.5 1-1 1.5-2.5 1.5-4 1.5 1.5 2.5 3.5 2.5 5.5 0 5-3.134 9-7 9z" />
        </svg>
        <span className="text-lg font-bold font-ui text-white">EvacuAI</span>
      </div>

      {/* Scenario Label */}
      {selectedScenario && (
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-gray-500">|</span>
          <span className="text-sm text-gray-400">{selectedScenario}</span>
        </div>
      )}

      <div className="flex-1" />

      <SimulationStatus />

      <div className="flex items-center gap-2">
        {isWindModified && (
          <span className="bg-accent-warning/20 text-accent-warning text-[10px] font-medium px-2 py-0.5 rounded-full">
            Modified Wind
          </span>
        )}
      </div>

      <WindRose />
    </header>
  );
}
