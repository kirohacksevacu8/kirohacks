import { MetricCard } from "../../components/MetricCard";
import { useSimulationStore } from "../../stores/simulationStore";
import { useSimulation } from "../../hooks/useSimulation";
import type { SimulationResponse } from "../../types/api";
import { ComparisonView } from "./ComparisonView";
import { EvacuationOrdering } from "./EvacuationOrdering";
import { RouteCard } from "./RouteCard";
import { ZoneEvacuationTable } from "./ZoneEvacuationTable";

export function ResultsPanel() {
  const result = useSimulationStore((s) => s.result);
  const previousResult = useSimulationStore((s) => s.previousResult);
  const modifiedWind = useSimulationStore((s) => s.modifiedWind);
  const status = useSimulationStore((s) => s.status);
  const panels = useSimulationStore((s) => s.panels);
  const setPanel = useSimulationStore((s) => s.setPanel);
  const { runSimulation } = useSimulation();

  return (
    <aside className={`panel results-panel ${panels.results ? "is-open" : ""}`}>
      <div className="panel__header">
        <div>
          <span className="eyebrow">Results Panel</span>
          <h2>Route Intelligence</h2>
        </div>
        <button
          className="icon-button panel__close"
          type="button"
          aria-label="Close results"
          onClick={() => setPanel("results", false)}
        >
          ✕
        </button>
      </div>

      {!result ? (
        <div className="empty-results">
          <MetricCard
            label="Awaiting Simulation"
            value="Ready"
            tone="info"
            detail="Set an ignition point, configure wind conditions, and run the simulation to see evacuation route analysis."
          />
        </div>
      ) : (
        <>
          <MetricCard
            label="Best Route Viability"
            value={keyRouteMetric(result)}
            tone="info"
            detail={`Route ${bestRouteName(result)} — highest survival rate across Monte Carlo scenarios`}
            large
          />
          {modifiedWind ? (
            <p className="modified-wind-notice">
              <span className="badge badge--warning">Modified Wind</span>
              Results reflect manually adjusted wind conditions
            </p>
          ) : null}

          <ComparisonView result={result} previousResult={previousResult} />

          {result.zone_results.every((z) => (z.optimized_route?.viability_score ?? 0) === 0) ? (
            <p className="no-routes-notice" role="alert">
              ⚠ No viable routes found. All routes have 0% viability — consider adjusting wind parameters or ignition point.
            </p>
          ) : null}

          <section className="summary-grid" aria-label="Summary statistics">
            <MetricCard
              label="Total Population at Risk"
              value={totalPopulation(result).toLocaleString()}
              tone="warning"
              detail="residents in affected evacuation zones"
            />
            <MetricCard
              label="Zones Under 10 min Cutoff"
              value={zonesUnderCutoff(result, 10)}
              unit="zones"
              tone="critical"
              detail="fire reaches zone before full evacuation"
            />
            <MetricCard
              label="Optimization Lift"
              value={optimizationLift(result).toFixed(1)}
              unit="%"
              tone="success"
              detail="viability gain from optimized vs baseline routes"
            />
            <MetricCard label="Monte Carlo Confidence" value="90" unit="% CI" tone="default" detail="confidence interval across simulation runs" />
          </section>

          <div className="results-actions">
            <button
              className="secondary-button"
              type="button"
              disabled={status === "running"}
              title="Re-run simulation with wind shifted +45° to compare route viability"
              onClick={() => void runSimulation({ quickCompare: true })}
            >
              Quick Compare (+45° wind shift)
            </button>
          </div>

          <ZoneEvacuationTable zones={result.zone_results} />

          <section className="results-section">
            <div className="section-title">
              <h3>Per-Zone Routes</h3>
              <span>best paths</span>
            </div>
            <div className="route-card-list">
              {result.zone_results.map((zone) => (
                <RouteCard key={zone.zone_id} zone={zone} />
              ))}
            </div>
          </section>

          <EvacuationOrdering zones={result.zone_results} ordering={result.evacuation_ordering} />
        </>
      )}
    </aside>
  );
}

function bestRouteName(result: SimulationResponse) {
  return bestOptimizedRoute(result)?.route_id ?? "optimized";
}

function keyRouteMetric(result: SimulationResponse) {
  const route = bestOptimizedRoute(result);
  return `${(route?.viability_score ?? 0).toFixed(0)}%`;
}

function bestOptimizedRoute(result: SimulationResponse) {
  return result.zone_results
    .map((zone) => zone.optimized_route)
    .filter((route) => route !== null && route !== undefined)
    .sort((a, b) => (b.viability_score ?? 0) - (a.viability_score ?? 0))[0];
}

function totalPopulation(result: SimulationResponse) {
  return result.zone_results.reduce((sum, zone) => sum + zone.population, 0);
}

function zonesUnderCutoff(result: SimulationResponse, cutoff: number) {
  return result.zone_results.filter((zone) => (zone.cutoff_time ?? Infinity) < cutoff).length;
}

function optimizationLift(result: SimulationResponse) {
  const baseline = average(result.zone_results.map((zone) => zone.baseline_route.viability_score ?? 0));
  const optimized = average(
    result.zone_results.map((zone) => zone.optimized_route?.viability_score ?? 0),
  );
  return optimized - baseline;
}

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}
