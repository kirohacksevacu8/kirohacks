import type { SimulationResults, WindParameters } from '@/types/api';

export interface SimulationState {
  ignitionPoint: { lat: number; lon: number } | null;
  windParams: WindParameters;
  monteCarloRuns: number;
  selectedScenario: string | null;
  jobId: string | null;
  jobStatus: 'idle' | 'submitting' | 'running' | 'complete' | 'error';
  progress: { completed: number; total: number } | null;
  errorMessage: string | null;
  currentResults: SimulationResults | null;
  previousResults: SimulationResults | null;
  demoMode: boolean;
  demoStep: number;
  selectedZoneId: string | null;
  animationTimestep: number;
  isAnimating: boolean;
  terrainExaggeration: number;
  visibleLayers: {
    burnHeatmap: boolean;
    routes: boolean;
    zones: boolean;
    elevation: boolean;
    shelters: boolean;
    perimeter: boolean;
  };
}

export const INITIAL_STATE: SimulationState = {
  ignitionPoint: null,
  windParams: { wind_speed: 14, wind_direction: 225, wind_gust: 22, relative_humidity: 18 },
  monteCarloRuns: 500,
  selectedScenario: null,
  jobId: null,
  jobStatus: 'idle',
  progress: null,
  errorMessage: null,
  currentResults: null,
  previousResults: null,
  demoMode: false,
  demoStep: 0,
  selectedZoneId: null,
  animationTimestep: 0,
  isAnimating: false,
  terrainExaggeration: 1.0,
  visibleLayers: {
    burnHeatmap: true,
    routes: true,
    zones: true,
    elevation: false,
    shelters: true,
    perimeter: true,
  },
};

export type SimulationAction =
  | { type: 'SET_IGNITION'; payload: { lat: number; lon: number } }
  | { type: 'SET_WIND'; payload: Partial<WindParameters> }
  | { type: 'SET_SCENARIO'; payload: string | null }
  | { type: 'SET_MC_RUNS'; payload: number }
  | { type: 'SUBMIT_SIMULATION'; payload: string }
  | { type: 'UPDATE_PROGRESS'; payload: { completed: number; total: number } }
  | { type: 'SET_RESULTS'; payload: SimulationResults }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_DEMO_MODE' }
  | { type: 'SET_DEMO_STEP'; payload: number }
  | { type: 'SELECT_ZONE'; payload: string | null }
  | { type: 'SET_ANIMATION_TIMESTEP'; payload: number }
  | { type: 'TOGGLE_ANIMATION' }
  | { type: 'SET_TERRAIN_EXAGGERATION'; payload: number }
  | { type: 'TOGGLE_LAYER'; payload: keyof SimulationState['visibleLayers'] }
  | { type: 'STORE_PREVIOUS_RESULTS' }
  | { type: 'RESET' };

export function simulationReducer(state: SimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'SET_IGNITION':
      return { ...state, ignitionPoint: action.payload };
    case 'SET_WIND':
      return { ...state, windParams: { ...state.windParams, ...action.payload } };
    case 'SET_SCENARIO':
      return { ...state, selectedScenario: action.payload };
    case 'SET_MC_RUNS':
      return { ...state, monteCarloRuns: action.payload };
    case 'SUBMIT_SIMULATION':
      return { ...state, jobId: action.payload, jobStatus: 'running', progress: null, errorMessage: null };
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload };
    case 'SET_RESULTS':
      return { ...state, jobStatus: 'complete', currentResults: action.payload, progress: null };
    case 'SET_ERROR':
      return { ...state, jobStatus: 'error', errorMessage: action.payload, progress: null };
    case 'TOGGLE_DEMO_MODE':
      return { ...state, demoMode: !state.demoMode, demoStep: state.demoMode ? 0 : 1 };
    case 'SET_DEMO_STEP':
      return { ...state, demoStep: action.payload };
    case 'SELECT_ZONE':
      return { ...state, selectedZoneId: action.payload };
    case 'SET_ANIMATION_TIMESTEP':
      return { ...state, animationTimestep: action.payload };
    case 'TOGGLE_ANIMATION':
      return { ...state, isAnimating: !state.isAnimating };
    case 'SET_TERRAIN_EXAGGERATION':
      return { ...state, terrainExaggeration: action.payload };
    case 'TOGGLE_LAYER':
      return {
        ...state,
        visibleLayers: {
          ...state.visibleLayers,
          [action.payload]: !state.visibleLayers[action.payload],
        },
      };
    case 'STORE_PREVIOUS_RESULTS':
      return { ...state, previousResults: state.currentResults };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}
