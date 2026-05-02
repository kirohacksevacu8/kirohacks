import { createContext, useReducer, type ReactNode } from 'react';

import {
  simulationReducer,
  INITIAL_STATE,
  type SimulationState,
  type SimulationAction,
} from '@/context/simulationReducer';

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface SimulationContextValue {
  state: SimulationState;
  dispatch: React.Dispatch<SimulationAction>;
}

export const SimulationContext = createContext<SimulationContextValue | null>(
  null,
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface SimulationProviderProps {
  children: ReactNode;
}

export function SimulationProvider({
  children,
}: SimulationProviderProps): React.JSX.Element {
  const [state, dispatch] = useReducer(simulationReducer, INITIAL_STATE);

  return (
    <SimulationContext value={{ state, dispatch }}>
      {children}
    </SimulationContext>
  );
}
