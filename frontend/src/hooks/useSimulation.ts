import { useCallback } from 'react';
import { useSimulationContext } from '@/context/SimulationContext';
import { api } from '@/services/api';
import type { WindParameters, ScenarioPreset } from '@/types/api';

export function useSimulation() {
  const { state, dispatch } = useSimulationContext();

  const setIgnition = useCallback(
    (lat: number, lon: number) => dispatch({ type: 'SET_IGNITION', payload: { lat, lon } }),
    [dispatch]
  );

  const setWind = useCallback(
    (params: Partial<WindParameters>) => dispatch({ type: 'SET_WIND', payload: params }),
    [dispatch]
  );

  const setScenario = useCallback(
    (preset: ScenarioPreset) => {
      dispatch({ type: 'SET_SCENARIO', payload: preset.name });
      dispatch({ type: 'SET_IGNITION', payload: preset.ignition_point });
      dispatch({
        type: 'SET_WIND',
        payload: {
          wind_speed: preset.wind_speed,
          wind_direction: preset.wind_direction,
          wind_gust: preset.wind_gust,
          relative_humidity: preset.relative_humidity,
        },
      });
    },
    [dispatch]
  );

  const setMonteCarloRuns = useCallback(
    (runs: number) => dispatch({ type: 'SET_MC_RUNS', payload: runs }),
    [dispatch]
  );

  const runSimulation = useCallback(async () => {
    if (!state.ignitionPoint) return;

    try {
      const { job_id } = await api.simulate({
        ignition_point: state.ignitionPoint,
        ...state.windParams,
        num_runs: state.monteCarloRuns,
        scenario_preset: state.selectedScenario ?? undefined,
      });
      dispatch({ type: 'SUBMIT_SIMULATION', payload: job_id });

      // Poll for results
      const poll = async () => {
        try {
          const result = await api.getResults(job_id);
          if (result.status === 'running') {
            dispatch({
              type: 'UPDATE_PROGRESS',
              payload: { completed: result.completed_runs, total: result.total_runs },
            });
            setTimeout(poll, 1000);
          } else {
            dispatch({ type: 'SET_RESULTS', payload: result });
          }
        } catch (err) {
          dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Polling failed' });
        }
      };
      setTimeout(poll, 1000);
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Simulation failed' });
    }
  }, [state.ignitionPoint, state.windParams, state.monteCarloRuns, state.selectedScenario, dispatch]);

  const fetchWind = useCallback(async () => {
    const lat = state.ignitionPoint?.lat ?? 39.7596;
    const lon = state.ignitionPoint?.lon ?? -121.6219;
    try {
      const wind = await api.getWind(lat, lon);
      dispatch({
        type: 'SET_WIND',
        payload: {
          wind_speed: wind.wind_speed,
          wind_direction: wind.wind_direction,
          wind_gust: wind.wind_gust,
          relative_humidity: wind.relative_humidity,
        },
      });
      return wind;
    } catch {
      // Fallback wind
      dispatch({
        type: 'SET_WIND',
        payload: { wind_speed: 10, wind_direction: 225, wind_gust: 20, relative_humidity: 20 },
      });
      return null;
    }
  }, [state.ignitionPoint, dispatch]);

  const selectZone = useCallback(
    (zoneId: string | null) => dispatch({ type: 'SELECT_ZONE', payload: zoneId }),
    [dispatch]
  );

  const toggleLayer = useCallback(
    (layer: keyof typeof state.visibleLayers) => dispatch({ type: 'TOGGLE_LAYER', payload: layer }),
    [dispatch]
  );

  const toggleDemoMode = useCallback(() => dispatch({ type: 'TOGGLE_DEMO_MODE' }), [dispatch]);

  return {
    state,
    dispatch,
    setIgnition,
    setWind,
    setScenario,
    setMonteCarloRuns,
    runSimulation,
    fetchWind,
    selectZone,
    toggleLayer,
    toggleDemoMode,
  };
}
