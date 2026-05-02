import type { EvacuAIApi } from '@/services/api';
import type {
  SimulateRequest,
  SimulateResponse,
  SimulationResults,
  SimulationProgress,
  WindData,
  ScenarioPreset,
} from '@/types/api';

export interface ApiFieldError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

export class ApiValidationError extends Error {
  readonly fieldErrors: ApiFieldError[];

  constructor(fieldErrors: ApiFieldError[]) {
    const summary = fieldErrors
      .map((e) => `${e.loc.join('.')}: ${e.msg}`)
      .join('; ');
    super(`Validation failed: ${summary}`);
    this.name = 'ApiValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export class ApiNetworkError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ApiNetworkError';
    this.cause = cause;
  }
}

export class LiveApiClient implements EvacuAIApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    // Strip trailing slash for consistent URL construction
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async simulate(request: SimulateRequest): Promise<SimulateResponse> {
    const response = await this.fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    return response as SimulateResponse;
  }

  async getResults(jobId: string): Promise<SimulationResults | SimulationProgress> {
    const response = await this.fetch(`/api/results/${encodeURIComponent(jobId)}`);
    return response as SimulationResults | SimulationProgress;
  }

  async getWind(lat: number, lon: number): Promise<WindData> {
    const response = await this.fetch(
      `/api/wind?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
    );
    return response as WindData;
  }

  async getScenarios(): Promise<ScenarioPreset[]> {
    const response = await this.fetch('/api/scenarios');
    return response as ScenarioPreset[];
  }

  private async fetch(path: string, init?: RequestInit): Promise<unknown> {
    let response: Response;

    try {
      response = await globalThis.fetch(`${this.baseUrl}${path}`, init);
    } catch (err: unknown) {
      throw new ApiNetworkError(
        'Network request failed. Check your connection and try again.',
        err,
      );
    }

    // 422 — validation error with field-level details
    if (response.status === 422) {
      const body = (await response.json()) as { detail?: ApiFieldError[] };
      throw new ApiValidationError(body.detail ?? []);
    }

    // 202 — simulation still running, return progress payload
    if (response.status === 202) {
      return (await response.json()) as SimulationProgress;
    }

    // Other non-OK statuses
    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new ApiNetworkError(
        `Server responded with ${response.status}: ${text}`,
      );
    }

    return response.json();
  }
}
