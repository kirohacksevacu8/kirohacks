import type {
  SimulateRequest,
  SimulateResponse,
  SimulationResults,
  SimulationProgress,
  WindData,
  ScenarioPreset,
} from '@/types/api';

export interface EvacuAIApi {
  simulate(params: SimulateRequest): Promise<SimulateResponse>;
  getResults(jobId: string): Promise<SimulationResults | SimulationProgress>;
  getWind(lat: number, lon: number): Promise<WindData>;
  getScenarios(): Promise<ScenarioPreset[]>;
}

export function createApiClient(): EvacuAIApi {
  const mode = import.meta.env.VITE_API_MODE ?? 'mock';
  if (mode === 'mock') {
    // Lazy import to tree-shake mock data in production
    return new MockApiClientInline();
  }
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
  return new LiveApiClientInline(baseUrl);
}

// Inline live client to avoid circular imports during scaffolding
class LiveApiClientInline implements EvacuAIApi {
  constructor(private baseUrl: string) {}

  async simulate(params: SimulateRequest): Promise<SimulateResponse> {
    const res = await fetch(`${this.baseUrl}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Simulation request failed' }));
      throw new Error(err.detail ?? `HTTP ${res.status}`);
    }
    return res.json() as Promise<SimulateResponse>;
  }

  async getResults(jobId: string): Promise<SimulationResults | SimulationProgress> {
    const res = await fetch(`${this.baseUrl}/api/results/${jobId}`);
    if (res.status === 202) {
      return res.json() as Promise<SimulationProgress>;
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch results: HTTP ${res.status}`);
    }
    return res.json() as Promise<SimulationResults>;
  }

  async getWind(lat: number, lon: number): Promise<WindData> {
    const res = await fetch(`${this.baseUrl}/api/wind?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error('Wind fetch failed');
    return res.json() as Promise<WindData>;
  }

  async getScenarios(): Promise<ScenarioPreset[]> {
    const res = await fetch(`${this.baseUrl}/api/scenarios`);
    if (!res.ok) throw new Error('Scenarios fetch failed');
    return res.json() as Promise<ScenarioPreset[]>;
  }
}

// Inline mock client with realistic data
class MockApiClientInline implements EvacuAIApi {
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async simulate(_params: SimulateRequest): Promise<SimulateResponse> {
    await this.delay(200);
    return { job_id: `mock-${Date.now()}` };
  }

  private callCount = 0;

  async getResults(_jobId: string): Promise<SimulationResults | SimulationProgress> {
    this.callCount++;
    // Simulate progress for first 3 polls
    if (this.callCount <= 3) {
      await this.delay(300);
      return {
        status: 'running' as const,
        completed_runs: this.callCount * 167,
        total_runs: 500,
        elapsed_seconds: this.callCount * 2,
      };
    }
    this.callCount = 0;
    await this.delay(200);
    return this.getMockResults();
  }

  async getWind(_lat: number, _lon: number): Promise<WindData> {
    await this.delay(100);
    return {
      wind_speed: 14,
      wind_direction: 225,
      wind_gust: 22,
      relative_humidity: 18,
      forecast_text: 'Sunny and Windy',
      source: 'nws',
    };
  }

  async getScenarios(): Promise<ScenarioPreset[]> {
    await this.delay(100);
    return [
      {
        name: 'Camp Fire Default',
        description: 'Historical Camp Fire conditions — Paradise, CA 2018',
        ignition_point: { lat: 39.8104, lon: -121.4370 },
        wind_speed: 14,
        wind_direction: 225,
        wind_gust: 22,
        relative_humidity: 18,
      },
      {
        name: 'Fast Wind Shift',
        description: 'Wind direction changes 90° mid-simulation',
        ignition_point: { lat: 39.7596, lon: -121.6219 },
        wind_speed: 20,
        wind_direction: 270,
        wind_gust: 35,
        relative_humidity: 12,
      },
      {
        name: 'Night Evacuation',
        description: 'Reduced visibility, increased civilian delay',
        ignition_point: { lat: 39.7596, lon: -121.6219 },
        wind_speed: 8,
        wind_direction: 180,
        wind_gust: 15,
        relative_humidity: 35,
      },
    ];
  }

  private getMockResults(): SimulationResults {
    const rows = 25;
    const cols = 35;
    const grid = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const dist = Math.sqrt((r - 5) ** 2 + (c - 10) ** 2);
        return Math.max(0, Math.min(1, 1 - dist / 20));
      })
    );
    const meanArrival = Array.from({ length: rows }, (_, r) =>
      Array.from({ length: cols }, (_, c) => {
        const dist = Math.sqrt((r - 5) ** 2 + (c - 10) ** 2);
        return dist < 20 ? Math.round(dist * 3) : -1;
      })
    );

    const gridBounds = {
      min_lat: 39.65,
      max_lat: 39.90,
      min_lon: -121.75,
      max_lon: -121.40,
      cell_size_m: 100,
      grid_rows: rows,
      grid_cols: cols,
    };

    return {
      status: 'complete',
      job_id: 'mock-complete',
      burn_probability: { grid, grid_bounds: gridBounds },
      arrival_times: {
        mean: meanArrival,
        median: meanArrival,
        p10: meanArrival.map((r) => r.map((v) => (v > 0 ? v - 2 : -1))),
        p90: meanArrival.map((r) => r.map((v) => (v > 0 ? v + 5 : -1))),
        grid_bounds: gridBounds,
      },
      routes: [
        {
          route_id: 'skyway-baseline',
          zone_id: 'BG-12',
          segments: [
            { lat: 39.7596, lon: -121.6219 },
            { lat: 39.74, lon: -121.60 },
            { lat: 39.72, lon: -121.58 },
            { lat: 39.70, lon: -121.55 },
          ],
          viability_score: 0.64,
          travel_time_minutes: 18,
          strategy: 'baseline',
        },
        {
          route_id: 'skyway-optimized',
          zone_id: 'BG-12',
          segments: [
            { lat: 39.7596, lon: -121.6219 },
            { lat: 39.75, lon: -121.63 },
            { lat: 39.73, lon: -121.61 },
            { lat: 39.70, lon: -121.55 },
          ],
          viability_score: 0.82,
          travel_time_minutes: 22,
          strategy: 'optimized',
        },
        {
          route_id: 'clark-baseline',
          zone_id: 'BG-07',
          segments: [
            { lat: 39.78, lon: -121.60 },
            { lat: 39.76, lon: -121.57 },
            { lat: 39.73, lon: -121.53 },
          ],
          viability_score: 0.78,
          travel_time_minutes: 14,
          strategy: 'baseline',
        },
        {
          route_id: 'clark-optimized',
          zone_id: 'BG-07',
          segments: [
            { lat: 39.78, lon: -121.60 },
            { lat: 39.77, lon: -121.62 },
            { lat: 39.75, lon: -121.58 },
            { lat: 39.73, lon: -121.53 },
          ],
          viability_score: 0.91,
          travel_time_minutes: 17,
          strategy: 'optimized',
        },
      ],
      zones: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-121.64, 39.76], [-121.60, 39.76], [-121.60, 39.78], [-121.64, 39.78], [-121.64, 39.76]]],
            },
            properties: {
              zone_id: 'BG-12',
              population: 2340,
              cutoff_time: 8,
              evacuation_priority_score: 0.87,
              best_baseline_route_id: 'skyway-baseline',
              best_optimized_route_id: 'skyway-optimized',
              baseline_viability: 0.64,
              optimized_viability: 0.82,
              failure_risk_percentage: 18,
            },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-121.62, 39.78], [-121.58, 39.78], [-121.58, 39.80], [-121.62, 39.80], [-121.62, 39.78]]],
            },
            properties: {
              zone_id: 'BG-07',
              population: 1890,
              cutoff_time: 22,
              evacuation_priority_score: 0.65,
              best_baseline_route_id: 'clark-baseline',
              best_optimized_route_id: 'clark-optimized',
              baseline_viability: 0.78,
              optimized_viability: 0.91,
              failure_risk_percentage: 9,
            },
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[[-121.58, 39.80], [-121.54, 39.80], [-121.54, 39.82], [-121.58, 39.82], [-121.58, 39.80]]],
            },
            properties: {
              zone_id: 'BG-03',
              population: 940,
              cutoff_time: 45,
              evacuation_priority_score: 0.42,
              best_baseline_route_id: 'clark-baseline',
              best_optimized_route_id: 'clark-optimized',
              baseline_viability: 0.92,
              optimized_viability: 0.97,
              failure_risk_percentage: 3,
            },
          },
        ],
      },
      evacuation_ordering: [
        { zone_id: 'BG-12', priority_score: 0.87, population: 2340, cutoff_time: 8 },
        { zone_id: 'BG-07', priority_score: 0.65, population: 1890, cutoff_time: 22 },
        { zone_id: 'BG-03', priority_score: 0.42, population: 940, cutoff_time: 45 },
      ],
      summary: {
        total_population_at_risk: 5170,
        zones_critical_count: 1,
        baseline_avg_viability: 0.78,
        optimized_avg_viability: 0.90,
        improvement_percentage: 15.4,
        confidence_interval_95: [0.86, 0.94],
      },
    };
  }
}

// Singleton API client
export const api = createApiClient();
