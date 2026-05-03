/**
 * EvacuAI API Service Layer
 *
 * Provides a unified interface for API communication with the live backend.
 *
 * @see src/types/api.ts for type definitions
 */

import type {
  SimulateRequest,
  SimulateResponse,
  SimulationProgress,
  SimulationResults,
  WindData,
  ScenarioPreset,
  ShelterData,
  ApiError,
} from '../types/api';

// ============================================================================
// API Interface
// ============================================================================

export type ProgressCallback = (progress: SimulationProgress) => void;

export interface EvacuAIApi {
  simulate(
    request: SimulateRequest,
    onProgress?: ProgressCallback
  ): Promise<SimulationResults>;

  getResults(jobId: string): Promise<SimulationProgress | SimulationResults>;

  getWind(lat: number, lon: number): Promise<WindData>;

  getScenarios(): Promise<ScenarioPreset[]>;

  getRegions(): Promise<string[]>;

  getShelters(region?: string): Promise<ShelterData[]>;
}

// ============================================================================
// API Client Factory
// ============================================================================

function getApiBaseUrl(): string {
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
}

async function createApiClient(): Promise<EvacuAIApi> {
  const { LiveApiClient } = await import('./liveApiClient');
  return new LiveApiClient(getApiBaseUrl());
}

// ============================================================================
// Singleton API Instance
// ============================================================================

let apiInstance: EvacuAIApi | null = null;
let apiInitPromise: Promise<EvacuAIApi> | null = null;

export async function getApi(): Promise<EvacuAIApi> {
  if (apiInstance) return apiInstance;

  if (!apiInitPromise) {
    apiInitPromise = createApiClient().then((client) => {
      apiInstance = client;
      return client;
    });
  }

  return apiInitPromise;
}

export function resetApi(): void {
  apiInstance = null;
  apiInitPromise = null;
}

// ============================================================================
// Re-export types for convenience
// ============================================================================

export type {
  SimulateRequest,
  SimulateResponse,
  SimulationProgress,
  SimulationResults,
  WindData,
  ScenarioPreset,
  ShelterData,
  ApiError,
};
