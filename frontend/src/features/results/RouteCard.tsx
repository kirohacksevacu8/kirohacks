import { useSimulationStore } from "../../stores/simulationStore";
import type { RouteResult, ZoneResult } from "../../types/api";

interface RouteCardProps {
  zone: ZoneResult;
}

export function RouteCard({ zone }: RouteCardProps) {
  return (
    <article className="route-card">
      <div className="route-card__header">
        <strong>{zone.zone_id}</strong>
        <span>👥 {zone.population.toLocaleString()} people</span>
      </div>
      <RouteLine label="Baseline (shortest)" route={zone.baseline_route} />
      {zone.optimized_route ? <RouteLine label="Optimized (safest)" route={zone.optimized_route} /> : null}
    </article>
  );
}

function RouteLine({ label, route }: { label: string; route: RouteResult }) {
  const selectRoute = useSimulationStore((s) => s.selectRoute);
  const score = route.viability_score ?? 0;
  const tone = score > 80 ? "high" : score >= 50 ? "med" : "low";

  return (
    <div className="route-line">
      <div>
        <span>{label}</span>
        <strong className={`route-line__score route-line__score--${tone}`}>{score.toFixed(0)}% viability</strong>
      </div>
      <div>
        <span>Travel time</span>
        <strong>{route.total_travel_time_min.toFixed(0)} min</strong>
      </div>
      <button
        className="secondary-button"
        type="button"
        onClick={() => selectRoute(route.route_id, route.zone_id)}
      >
        Show on Map
      </button>
    </div>
  );
}
