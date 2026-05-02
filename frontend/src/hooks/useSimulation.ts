import { useCallback, useContext, useMemo } from 'react';

import { SimulationContext } from '@/context/SimulationContext';
import type {
  SimulationState,
  WindParameters,
  VisibleLayers,
} from '@/context/simulationReducer';
import { createApiClient } from '@/services/api';
import type { SimulationResults } from '@/types/api';

// ---------------------------------------------------------------------------
// Singleton API client (created once per app lifecycle)
// ---------------------------------------------------------------------------

const api = createApiClient();

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseSimulationReturn {
  /** Full simulation state */
  state: SimulationState;

  // ---- Memoized selectors ------------------------------------------------
  ignitionPoint: SimulationState['ignitionPoint'];
  windParams: SimulationState['windParams'];
  monteCarloRuns: number;
  jobStatus: SimulationState['jobStatus'];
  progress: SimulationState['progress'];
  currentResults: SimulationResults | null;
  previousResults: SimulationResults | null;
  demoMode: boolean;
  demoStep: number;
  selectedZoneId: string | null;
  animationTimestep: number;
  isAnimating: boolean;
  terrainExaggeration: number;
  visibleLayers: SimulationState['visibleLayers'];
  isRunning: boolean;

  // ---- Dispatch helpers ---------------------------------------------------
  setIgnition: (point: { lat: number; lon: number } | null) => void;
  setWind: (params: WindParameters) => void;
  setScenario: (name: string | null) => void;
  setMonteCarloRuns: (runs: number) => void;
  runSimulation: () => Promise<void>;
  selectZone: (zoneId: string | null) => void;
  toggleLayer: (layer: keyof VisibleLayers) => void;
  toggleAnimation: () => void;
  setAnimationTimestep: (timestep: number) => void;
  setTerrainExaggeration: (value: number) => void;
  toggleDemoMode: () => void;
  setDemoStep: (step: number) => void;
  storePreviousResults: () => void;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useSimulation(): UseSimulationReturn {
  const ctx = useContext(SimulationContext);

  if (ctx === null) {
    throw new Error('useSimulation must be used within a <SimulationProvider>');
  }

  const { state, dispatch } = ctx;

  // ---- Dispatch helpers (stable references) --------------------------------

  const setIgnition = useCallback(
    (point: { lat: number; lon: number } | null) => {
      dispatch({ type: 'SET_IGNITION', payload: point });
    },
    [dispatch],
  );

  const setWind = useCallback(
    (params: WindParameters) => {
      dispatch({ type: 'SET_WIND', payload: params });
    },
    [dispatch],
  );

  const setScenario = useCallback(
    (name: string | null) => {
      dispatch({ type: 'SET_SCENARIO', payload: name });
    },
    [dispatch],
  );

  const setMonteCarloRuns = useCallback(
    (runs: number) => {
      dispatch({ type: 'SET_MC_RUNS', payload: runs });
    },
    [dispatch],
  );

  const selectZone = useCallback(
    (zoneId: string | null) => {
      dispatch({ type: 'SELECT_ZONE', payload: zoneId });
    },
    [dispatch],
  );

  const toggleLayer = useCallback(
    (layer: keyof VisibleLayers) => {
      dispatch({ type: 'TOGGLE_LAYER', payload: layer });
    },
    [dispatch],
  );

  const toggleAnimation = useCallback(() => {
    dispatch({ type: 'TOGGLE_ANIMATION' });
  }, [dispatch]);

  const setAnimationTimestep = useCallback(
    (timestep: number) => {
      dispatch({ type: 'SET_ANIMATION_TIMESTEP', payload: timestep });
    },
    [dispatch],
  );

  const setTerrainExaggeration = useCallback(
    (value: number) => {
      dispatch({ type: 'SET_TERRAIN_EXAGGERATION', payload: value });
    },
    [dispatch],
  );

  const toggleDemoMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_DEMO_MODE' });
  }, [dispatch]);

  const setDemoStep = useCallback(
    (step: number) => {
      dispatch({ type: 'SET_DEMO_STEP', payload: step });
    },
    [dispatch],
  );

  const storePreviousResults = useCallback(() => {
    dispatch({ type: 'STORE_PREVIOUS_RESULTS' });
  }, [dispatch]);

  // ---- Run simulation (submit → poll → results) ---------------------------

  const runSimulation = useCallback(async () => {
    const { ignitionPoint, windParams, monteCarloRuns, selectedScenario } =
      state;

    if (!ignitionPoint) {
      dispatch({ type: 'SET_ERROR', payload: 'No ignition point selected' });
      return;
    }

    try {
      // 1. Submit
      const { job_id } = await api.simulate({
        ignition_point: ignitionPoint,
        wind_speed: windParams.wind_speed,
        wind_direction: windParams.wind_direction,
        wind_gust: windParams.wind_gust,
        relative_humidity: windParams.relative_humidity,
        num_runs: monteCarloRuns,
        scenario_preset: selectedScenario ?? undefined,
      });

      dispatch({ type: 'SUBMIT_SIMULATION', payload: { jobId: job_id } });

      // 2. Poll for results
      const POLL_INTERVAL_MS = 1_000;
      const MAX_POLLS = 120; // 2 minutes max

      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        const result = await api.getResults(job_id);

        if (result.status === 'running') {
          dispatch({
            type: 'UPDATE_PROGRESS',
            payload: {
              completed: result.completed_runs,
              total: result.total_runs,
            },
          });
          continue;
        }

        if (result.status === 'complete') {
          dispatch({ type: 'SET_RESULTS', payload: result });
          return;
        }
      }

      // Timed out
      dispatch({
        type: 'SET_ERROR',
        payload: 'Simulation timed out after 2 minutes',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Simulation failed';
      dispatch({ type: 'SET_ERROR', payload: message });
    }
  }, [state, dispatch]);

  // ---- Memoized selectors --------------------------------------------------

  const isRunning = useMemo(
    () =>
      state.jobStatus === 'submitting' || state.jobStatus === 'running',
    [state.jobStatus],
  );

  return {
    state,

    // Selectors
    ignitionPoint: state.ignitionPoint,
    windParams: state.windParams,
    monteCarloRuns: state.monteCarloRuns,
    jobStatus: state.jobStatus,
    progress: state.progress,
    currentResults: state.currentResults,
    previousResults: state.previousResults,
    demoMode: state.demoMode,
    demoStep: state.demoStep,
    selectedZoneId: state.selectedZoneId,
    animationTimestep: state.animationTimestep,
    isAnimating: state.isAnimating,
    terrainExaggeration: state.terrainExaggeration,
    visibleLayers: state.visibleLayers,
    isRunning,

    // Dispatch helpers
    setIgnition,
    setWind,
    setScenario,
    setMonteCarloRuns,
    runSimulation,
    selectZone,
    toggleLayer,
    toggleAnimation,
    setAnimationTimestep,
    setTerrainExaggeration,
    toggleDemoMode,
    setDemoStep,
    storePreviousResults,
  };
}
