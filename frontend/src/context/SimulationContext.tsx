import { createContext, useContext, useReducer, type ReactNode } from 'react';
import { simulationReducer, INITIAL_STATE, type SimulationState, type SimulationAction } from './simulationReducer';

interface SimulationContextValue {
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [state, dispatch] = useReducer(simulationReducer, INITIAL_STATE);
  return (
    <SimulationContext.Provider value={{ state, dispatch }}>
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulationContext(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulationContext must be used within SimulationProvider');
  return ctx;
}
