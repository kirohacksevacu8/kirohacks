import { SimulationProvider } from '@/context/SimulationContext';
import { HeaderBar } from '@/components/HeaderBar';
import { ControlPanel } from '@/features/controls/ControlPanel';
import { MapView } from '@/features/map/MapView';
import { ResultsPanel } from '@/features/results/ResultsPanel';

export default function App(): React.JSX.Element {
  return (
    <SimulationProvider>
      <div className="h-screen flex flex-col bg-surface-base">
        <HeaderBar />
        <div className="flex flex-1 overflow-hidden">
          <ControlPanel />
          <MapView />
          <ResultsPanel />
        </div>
      </div>
    </SimulationProvider>
  );
}
