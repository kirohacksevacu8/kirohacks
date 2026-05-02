// types/api.ts — mirrors backend Pydantic schemas

export interface SimulateRequest {
  ignition_point: { lat: number; lon: number };
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
  num_runs: number;
  scenario_preset?: string;
}

export interface SimulateResponse {
  job_id: string;
}

export interface SimulationProgress {
  status: 'running';
  completed_runs: number;
  total_runs: number;
  elapsed_seconds: number;
}

export interface GridBounds {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
  cell_size_m: number;
  grid_rows: number;
  grid_cols: number;
}

export interface BurnProbabilityMap {
  grid: number[][];
  grid_bounds: GridBounds;
}

export interface ArrivalTimeStats {
  mean: number[][];
  median: number[][];
  p10: number[][];
  p90: number[][];
  grid_bounds: GridBounds;
}

export interface RouteSegment {
  lat: number;
  lon: number;
}

export interface EvacuationRoute {
  route_id: string;
  zone_id: string;
  segments: RouteSegment[];
  viability_score: number;
  travel_time_minutes: number;
  strategy: 'baseline' | 'optimized';
}

export interface ZoneProperties {
  zone_id: string;
  population: number;
  cutoff_time: number;
  evacuation_priority_score: number;
  best_baseline_route_id: string;
  best_optimized_route_id: string;
  baseline_viability: number;
  optimized_viability: number;
  failure_risk_percentage: number;
}

export interface ZoneGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface ZoneResult {
  type: 'Feature';
  geometry: ZoneGeometry;
  properties: ZoneProperties;
}

export interface EvacuationOrderEntry {
  zone_id: string;
  priority_score: number;
  population: number;
  cutoff_time: number;
}

export interface SimulationSummary {
  total_population_at_risk: number;
  zones_critical_count: number;
  baseline_avg_viability: number;
  optimized_avg_viability: number;
  improvement_percentage: number;
  confidence_interval_95: [number, number];
}

export interface SimulationResults {
  status: 'complete';
  job_id: string;
  burn_probability: BurnProbabilityMap;
  arrival_times: ArrivalTimeStats;
  routes: EvacuationRoute[];
  zones: {
    type: 'FeatureCollection';
    features: ZoneResult[];
  };
  evacuation_ordering: EvacuationOrderEntry[];
  summary: SimulationSummary;
}

export interface WindData {
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
  forecast_text: string;
  source: 'nws' | 'fallback' | 'manual';
}

export interface ScenarioPreset {
  name: string;
  description: string;
  ignition_point: { lat: number; lon: number };
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
}
