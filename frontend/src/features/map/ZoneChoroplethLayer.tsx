/**
 * ZoneChoroplethLayer
 *
 * Deck.gl GeoJsonLayer rendering zone polygons colored by cutoff urgency.
 * Supports hover tooltip and click to select zone.
 */

import { useMemo, useState, useCallback } from 'react';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { PickingInfo } from '@deck.gl/core';
import type { ZoneFeatureCollection, ZoneResult } from '@/types/api';

// Color by cutoff urgency
function zoneColor(cutoffMinutes: number, selected: boolean): [number, number, number, number] {
  if (selected) return [59, 130, 246, 180]; // accent-primary highlight
  if (cutoffMinutes > 30) return [16, 185, 129, 100];  // zone-safe
  if (cutoffMinutes > 15) return [245, 158, 11, 120];  // zone-warning
  if (cutoffMinutes > 5)  return [249, 115, 22, 140];  // fire-medium
  return [239, 68, 68, 160];                            // zone-critical
}

export interface ZoneTooltipInfo {
  x: number;
  y: number;
  zone: ZoneResult;
}

export interface ZoneChoroplethLayerProps {
  zones: ZoneFeatureCollection | null;
  selectedZoneId: string | null;
  visible: boolean;
  onSelectZone: (zoneId: string | null) => void;
}

export function useZoneChoroplethLayer({
  zones,
  selectedZoneId,
  visible,
  onSelectZone,
}: ZoneChoroplethLayerProps) {
  const [tooltip, setTooltip] = useState<ZoneTooltipInfo | null>(null);

  const handleHover = useCallback((info: PickingInfo) => {
    if (info.object && info.x !== undefined && info.y !== undefined) {
      setTooltip({ x: info.x, y: info.y, zone: info.object as ZoneResult });
    } else {
      setTooltip(null);
    }
  }, []);

  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (info.object) {
        const zone = info.object as ZoneResult;
        onSelectZone(zone.properties.zone_id);
      }
    },
    [onSelectZone]
  );

  const layer = useMemo(() => {
    if (!zones || !visible) return null;

    return new GeoJsonLayer({
      id: 'zones-choropleth',
      data: zones,
      filled: true,
      stroked: true,
      getFillColor: (f) => {
        const feature = f as ZoneResult;
        const isSelected = feature.properties.zone_id === selectedZoneId;
        return zoneColor(feature.properties.cutoff_time, isSelected);
      },
      getLineColor: [55, 65, 81, 200], // surface-border
      getLineWidth: 1,
      lineWidthUnits: 'pixels',
      pickable: true,
      onHover: handleHover,
      onClick: handleClick,
      updateTriggers: { getFillColor: [selectedZoneId] },
    });
  }, [zones, selectedZoneId, visible, handleHover, handleClick]);

  return { layer, tooltip };
}

export function ZoneTooltip({ tooltip }: { tooltip: ZoneTooltipInfo | null }) {
  if (!tooltip) return null;
  const { x, y, zone } = tooltip;
  const p = zone.properties;

  return (
    <div
      className="absolute z-30 bg-surface-overlay border border-surface-border rounded-lg p-3 shadow-lg text-sm pointer-events-none"
      style={{ left: x + 12, top: y - 10 }}
    >
      <div className="font-semibold text-gray-100 mb-1">{p.zone_id}</div>
      <div className="space-y-0.5 text-xs text-gray-400">
        <div>Population: <span className="text-gray-200">{p.population.toLocaleString()}</span></div>
        <div>Cutoff: <span className="text-gray-200">{p.cutoff_time} min</span></div>
        <div>Priority: <span className="text-gray-200">{(p.evacuation_priority_score * 100).toFixed(0)}%</span></div>
        <div>Failure risk: <span className="text-accent-error">{p.failure_risk_percentage}%</span></div>
      </div>
    </div>
  );
}
