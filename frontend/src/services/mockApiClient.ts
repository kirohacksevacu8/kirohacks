import type { EvacuAIApi } from '@/services/api';
import type {
  SimulateRequest,
  SimulateResponse,
  SimulationResults,
  SimulationProgress,
  WindData,
  ScenarioPreset,
} from '@/types/api';
import mockResultsJson from '@/assets/mock/simulationResults.json';
import mockWindJson from '@/assets/mock/windData.json';
import mockScenariosJson from '@/assets/mock/scenarios.json';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock API client for parallel frontend development.
 * Returns realistic data matching backend Pydantic schemas with simulated delays.
 */
export class MockApiClient implements EvacuAIApi {
  private simulationInProgress = false;
  private completedRuns = 0;
  private totalRuns = 0;
  private jobId = '';
  private startTime = 0;

  async simulate(request: SimulateRequest): Promise<SimulateResponse> {
    this.jobId = `mock-job-${Date.now()}`;
    this.totalRuns = request.num_runs;
    this.completedRuns = 0;
    this.simulationInProgress = true;
    this.startTime = Date.now();

    // Small initial delay to simulate request round-trip
    await delay(200);

    // Start background progress simulation
    this.advanceProgress();

    return { job_id: this.jobId };
  }

  async getResults(jobId: string): Promise<SimulationResults | SimulationProgress> {
    // Ignore jobId mismatch in mock — always return current state
    void jobId;

    if (this.simulationInProgress && this.completedRuns < this.totalRuns) {
      const elapsed = (Date.now() - this.startTime) / 1000;
      const progress: SimulationProgress = {
        status: 'running',
        completed_runs: this.completedRuns,
        total_runs: this.totalRuns,
        elapsed_seconds: Math.round(elapsed * 10) / 10,
      };
      return progress;
    }

    // Simulation complete — return full results
    this.simulationInProgress = false;
    const results = mockResultsJson as unknown as SimulationResults;
    return { ...results, job_id: this.jobId || results.job_id };
  }

  async getWind(_lat: number, _lon: number): Promise<WindData> {
    await delay(100);
    return mockWindJson as WindData;
  }

  async getScenarios(): Promise<ScenarioPreset[]> {
    await delay(100);
    return mockScenariosJson as ScenarioPreset[];
  }

  /**
   * Simulates progressive completion over ~3 seconds.
   * Advances completedRuns in increments until reaching totalRuns.
   */
  private advanceProgress(): void {
    const totalDuration = 3000; // 3 seconds total
    const steps = 10;
    const stepDelay = totalDuration / steps;
    const runsPerStep = Math.ceil(this.totalRuns / steps);

    let step = 0;

    const tick = (): void => {
      step++;
      this.completedRuns = Math.min(step * runsPerStep, this.totalRuns);

      if (step < steps) {
        setTimeout(tick, stepDelay);
      } else {
        this.completedRuns = this.totalRuns;
        this.simulationInProgress = false;
      }
    };

    setTimeout(tick, stepDelay);
  }
}
