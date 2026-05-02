import { useSimulation } from '@/hooks/useSimulation';
import { SimulationStatus } from '@/components/SimulationStatus';
import { WindRose } from '@/components/WindRose';

export function HeaderBar(): React.JSX.Element {
  const { state } = useSimulation();

  const scenarioName = state.selectedScenario ?? 'No Scenario';

  return (
    <header className="h-12 bg-surface-raised border-b border-surface-border flex items-center px-4 gap-4">
      {/* Logo / wordmark */}
      <span className="text-lg font-bold text-fire-active tracking-tight shrink-0">
        EvacuAI
      </span>

      {/* Scenario label */}
      <span className="text-sm text-gray-400 truncate hidden sm:inline">
        {scenarioName}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Simulation status */}
      <SimulationStatus />

      {/* Wind rose */}
      <WindRose />
    </header>
  );
}
