import { useState } from "react";
import { useSimulationStore } from "../../stores/simulationStore";
import type { ZoneResult } from "../../types/api";

type SortKey =
  | "zone_id"
  | "population"
  | "cutoff_time"
  | "evacuation_priority_score"
  | "failure_risk_pct";

interface ZoneEvacuationTableProps {
  zones: ZoneResult[];
}

export function ZoneEvacuationTable({ zones }: ZoneEvacuationTableProps) {
  const selectedZoneId = useSimulationStore((s) => s.selectedZoneId);
  const selectZone = useSimulationStore((s) => s.selectZone);
  const [sortKey, setSortKey] = useState<SortKey>("evacuation_priority_score");
  const sortedZones = zones.slice().sort((a, b) => compareZones(a, b, sortKey));

  return (
    <section className="results-section">
      <div className="section-title">
        <h3>Zone Evacuation Table</h3>
        <span>{zones.length} zones</span>
      </div>
      <div className="table-scroll">
        <table className="zone-table">
          <thead>
            <tr>
              <Header label="Zone" sortKey="zone_id" active={sortKey} setSortKey={setSortKey} />
              <Header label="Population" sortKey="population" active={sortKey} setSortKey={setSortKey} />
              <Header label="Cutoff (min)" sortKey="cutoff_time" active={sortKey} setSortKey={setSortKey} />
              <Header
                label="Priority"
                sortKey="evacuation_priority_score"
                active={sortKey}
                setSortKey={setSortKey}
              />
              <th title="Baseline route viability score">Baseline</th>
              <th title="Optimized route viability score">Optimized</th>
              <Header label="Failure Risk" sortKey="failure_risk_pct" active={sortKey} setSortKey={setSortKey} />
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sortedZones.map((zone) => (
              <tr
                className={selectedZoneId === zone.zone_id ? "is-selected" : ""}
                key={zone.zone_id}
                tabIndex={0}
                role="button"
                aria-pressed={selectedZoneId === zone.zone_id}
                aria-label={`Select zone ${zone.zone_id}`}
                onClick={() => selectZone(zone.zone_id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectZone(zone.zone_id); }}
                style={{ cursor: "pointer" }}
              >
                <td>{zone.zone_id}</td>
                <td>{zone.population.toLocaleString()}</td>
                <td>{zone.cutoff_time ?? "n/a"}m</td>
                <td>{zone.evacuation_priority_score.toFixed(0)}</td>
                <td>{(zone.baseline_route.viability_score ?? 0).toFixed(0)}%</td>
                <td>{(zone.optimized_route?.viability_score ?? 0).toFixed(0)}%</td>
                <td>{(zone.failure_risk_pct ?? 0).toFixed(0)}%</td>
                <td>
                  <span className={`status-pill status-pill--${statusFor(zone.cutoff_time)}`}>
                    {statusIcon(zone.cutoff_time)} {statusFor(zone.cutoff_time)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Header({
  label,
  sortKey,
  active,
  setSortKey,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  setSortKey: (sortKey: SortKey) => void;
}) {
  return (
    <th>
      <button
        className={active === sortKey ? "table-sort is-active" : "table-sort"}
        type="button"
        onClick={() => setSortKey(sortKey)}
      >
        {label}
      </button>
    </th>
  );
}

function compareZones(a: ZoneResult, b: ZoneResult, key: SortKey) {
  if (key === "zone_id") return a.zone_id.localeCompare(b.zone_id);
  return Number(b[key] ?? 0) - Number(a[key] ?? 0);
}

function statusFor(cutoff?: number | null) {
  if (cutoff === null || cutoff === undefined) return "warning";
  if (cutoff < 5) return "critical";
  if (cutoff < 15) return "warning";
  return "safe";
}

function statusIcon(cutoff?: number | null) {
  if (cutoff === null || cutoff === undefined) return "⚠";
  if (cutoff < 5) return "✕";
  if (cutoff < 15) return "⚠";
  return "✓";
}
