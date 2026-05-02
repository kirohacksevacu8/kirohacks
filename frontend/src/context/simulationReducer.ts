import type { SimulationResults } from '@/types/api';

// ---------------------------------------------------------------------------
// Wind Parameters
// ---------------------------------------------------------------------------

export interface WindParameters {
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
  source: 'nws' | 'fallback' | 'manual';
}

// ---------------------------------------------------------------------------
// Visible Layers
// ---------------------------------------------------------------------------

export interface VisibleLayers {
  burnHeatmap: boolean;
  routes: boolean;
  zones: boolean;
  elevation: boolean;
  shelters: boolean;
  perimeter: boolean;
}

// ---------------------------------------------------------------------------
// Simulation State
// ---------------------------------------------------------------------------

export interface SimulationState {
  ignitionPoint: { lat: number; lon: number } | null;
  windParams: WindParameters;
  monteCarloRuns: number;
  selectedScenario: string | null;
  jobId: string | null;
  jobStatus: 'idle' | 'submitting' | 'running' | 'complete' | 'error';
  progress: { completed: number; total: number } | null;
  currentResults: SimulationResults | null;
  previousResults: SimulationResults | null;
  demoMode: boolean;
  demoStep: number;
  apiMode: 'live' | 'mock';
  selectedZoneId: string | null;
  animationTimestep: number;
  isAnimating: boolean;
  terrainExaggeration: number;
  visibleLayers: VisibleLayers;
}

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

export const INITIAL_STATE: SimulationState = {
  ignitionPoint: null,
  windParams: {
    wind_speed: 10,
    wind_direction: 225,
    wind_gust: 20,
    relative_humidity: 20,
    source: 'fallback',
  },
  monteCarloRuns: 500,
  selectedScenario: null,
  jobId: null,
  jobStatus: 'idle',
  progress: null,
  currentResults: null,
  previousResults: null,
  demoMode: false,
  demoStep: 0,
  apiMode: (import.meta.env.VITE_API_MODE as 'live' | 'mock') ?? 'mock',
  selectedZoneId: null,
  animationTimestep: 0,
  isAnimating: false,
  terrainExaggeration: 1.0,
  visibleLayers: {
    burnHeatmap: true,
    routes: true,
    zones: true,
    elevation: true,
    shelters: true,
    perimeter: true,
  },
};

// ---------------------------------------------------------------------------
// Action Types (discriminated union)
// ---------------------------------------------------------------------------

export type SimulationAction =
  | { type: 'SET_IGNITION'; payload: { lat: number; lon: number } | null }
  | { type: 'SET_WIND'; payload: WindParameters }
  | { type: 'SET_SCENARIO'; payload: string | null }
  | { type: 'SET_MC_RUNS'; payload: number }
  | { type: 'SUBMIT_SIMULATION'; payload: { jobId: string } }
  | { type: 'UPDATE_PROGRESS'; payload: { completed: number; total: number } }
  | { type: 'SET_RESULTS'; payload: SimulationResults }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'TOGGLE_DEMO_MODE' }
  | { type: 'SET_DEMO_STEP'; payload: number }
  | { type: 'SELECT_ZONE'; payload: string | null }
  | { type: 'SET_ANIMATION_TIMESTEP'; payload: number }
  | { type: 'TOGGLE_LAYER'; payload: keyof VisibleLayers }
  | { type: 'TOGGLE_ANIMATION' }
  | { type: 'SET_TERRAIN_EXAGGERATION'; payload: number }
  | { type: 'STORE_PREVIOUS_RESULTS' };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function simulationReducer(
  state: SimulationState,
  action: SimulationAction,
): SimulationState {
  switch (action.type) {
    case 'SET_IGNITION':
      return { ...state, ignitionPoint: action.payload };

    case 'SET_WIND':
      return { ...state, windParams: action.payload };

    case 'SET_SCENARIO':
      return { ...state, selectedScenario: action.payload };

    case 'SET_MC_RUNS':
      return { ...state, monteCarloRuns: action.payload };

    case 'SUBMIT_SIMULATION':
      return {
        ...state,
        jobId: action.payload.jobId,
        jobStatus: 'submitting',
        progress: null,
        currentResults: null,
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        jobStatus: 'running',
        progress: action.payload,
      };

    case 'SET_RESULTS':
      return {
        ...state,
        jobStatus: 'complete',
        currentResults: action.payload,
        progress: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        jobStatus: 'error',
        progress: null,
      };

    case 'TOGGLE_DEMO_MODE':
      return {
        ...state,
        demoMode: !state.demoMode,
        demoStep: state.demoMode ? 0 : 1,
      };

    case 'SET_DEMO_STEP':
      return { ...state, demoStep: action.payload };

    case 'SELECT_ZONE':
      return { ...state, selectedZoneId: action.payload };

    case 'SET_ANIMATION_TIMESTEP':
      return { ...state, animationTimestep: action.payload };

    case 'TOGGLE_LAYER':
      return {
        ...state,
        visibleLayers: {
          ...state.visibleLayers,
          [action.payload]: !state.visibleLayers[action.payload],
        },
      };

    case 'TOGGLE_ANIMATION':
      return { ...state, isAnimating: !state.isAnimating };

    case 'SET_TERRAIN_EXAGGERATION':
      return { ...state, terrainExaggeration: action.payload };

    case 'STORE_PREVIOUS_RESULTS':
      return { ...state, previousResults: state.currentResults };

    default:
      return state;
  }
}
