import { SimulationStatus } from './SimulationStatus';
import { WindRose } from './WindRose';
import { useSimulationContext } from '@/context/SimulationContext';

export function HeaderBar(): React.JSX.Element {
  const { state } = useSimulationContext();
  const isMock = import.meta.env.VITE_API_MODE === 'mock';

  return (
    <header className="h-12 bg-surface-raised border-b border-surface-border flex items-center px-4 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <span className="text-fire-active text-lg">🔥</span>
        <span className="font-semibold text-sm tracking-wide text-gray-100">EvacuAI</span>
      </div>

      {/* Scenario label */}
      <span className="text-sm text-gray-400 hidden sm:block">
        {state.selectedScenario ?? 'No scenario selected'}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Mock badge */}
      {isMock && (
        <span className="bg-accent-warning/20 text-accent-warning text-[10px] font-medium px-2 py-0.5 rounded-full">
          MOCK DATA
        </span>
      )}

      {/* Status */}
      <SimulationStatus />

      {/* Wind Rose */}
      <WindRose />
    </header>
  );
}
