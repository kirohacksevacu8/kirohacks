import { SimulationProvider } from '@/context/SimulationContext';
import { CommandCenter } from '@/components/CommandCenter';
import { ToastContainer } from '@/components/ToastContainer';

function App(): React.JSX.Element {
  return (
    <SimulationProvider>
      <CommandCenter />
      <ToastContainer />
    </SimulationProvider>
  );
}

export { App };
