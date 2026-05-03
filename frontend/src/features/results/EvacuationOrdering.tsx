import { useSimulationStore } from "../../stores/simulationStore";
import type { ZoneResult } from "../../types/api";

interface EvacuationOrderingProps {
  zones: ZoneResult[];
  ordering: string[];
}

export function EvacuationOrdering({ zones, ordering }: EvacuationOrderingProps) {
  const selectZone = useSimulationStore((s) => s.selectZone);
  const zoneLookup = new Map(zones.map((zone) => [zone.zone_id, zone]));

  return (
    <section className="results-section">
      <div className="section-title">
        <h3>Evacuation Ordering</h3>
        <span>priority first</span>
      </div>
      <ol className="ordering-list">
        {ordering.map((zoneId) => {
          const zone = zoneLookup.get(zoneId);
          if (!zone) return null;
          const level = urgencyLevel(zone.cutoff_time);

          return (
            <li key={zone.zone_id}>
              <button type="button" onClick={() => selectZone(zoneId)}>
                <span
                  className={`urgency-dot urgency-dot--${level}`}
                  aria-hidden="true"
                />
                <strong>{zone.zone_id}</strong>
                <span>Priority score: {zone.evacuation_priority_score.toFixed(0)}</span>
                <span className={`badge badge--${level}`}>{urgencyLabel(level)}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function urgencyLevel(cutoff?: number | null) {
  if (cutoff === null || cutoff === undefined || cutoff < 5) return "critical";
  if (cutoff < 15) return "warning";
  if (cutoff < 30) return "notice";
  return "safe";
}

function urgencyLabel(level: string) {
  const labels: Record<string, string> = {
    critical: "CRITICAL",
    warning: "HIGH",
    notice: "MEDIUM",
    safe: "LOW",
  };
  return labels[level] ?? level.toUpperCase();
}
