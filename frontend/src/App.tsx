/**
 * App Component
 *
 * Root application component that sets up the SimulationProvider and ToastProvider
 * contexts and renders the main CommandCenter layout with ToastContainer.
 */

import { SimulationProvider } from '@/context/SimulationContext';
import { ToastProvider } from '@/context/ToastContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSimulation } from '@/hooks/useSimulation';
import { CommandCenter } from '@/components/CommandCenter';
import { ToastContainer } from '@/components/ToastContainer';

function AppContent(): React.ReactElement {
  const { selectZone } = useSimulation();

  useKeyboardShortcuts({
    onEscape: () => selectZone(null),
  });

  return (
    <>
      <CommandCenter />
      <ToastContainer />
    </>
  );
}

function App(): React.ReactElement {
  return (
    <ToastProvider>
      <SimulationProvider>
        <AppContent />
      </SimulationProvider>
    </ToastProvider>
  );
}

export default App;
