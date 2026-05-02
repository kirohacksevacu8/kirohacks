import type {
  SimulateRequest,
  SimulateResponse,
  SimulationResults,
  SimulationProgress,
  WindData,
  ScenarioPreset,
} from '@/types/api';
import { LiveApiClient } from '@/services/liveApiClient';
import { MockApiClient } from '@/services/mockApiClient';

export interface EvacuAIApi {
  simulate(request: SimulateRequest): Promise<SimulateResponse>;
  getResults(jobId: string): Promise<SimulationResults | SimulationProgress>;
  getWind(lat: number, lon: number): Promise<WindData>;
  getScenarios(): Promise<ScenarioPreset[]>;
}

export function createApiClient(): EvacuAIApi {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock';

  if (mode === 'live') {
    const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
    return new LiveApiClient(baseUrl);
  }

  return new MockApiClient();
}
