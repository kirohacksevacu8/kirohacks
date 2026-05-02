/**
 * RouteOverlayLayer
 *
 * Deck.gl PathLayer rendering evacuation routes colored by viability.
 * Baseline routes are dashed, optimized routes are solid.
 */

import { useMemo } from 'react';
import { PathLayer } from '@deck.gl/layers';
import type { EvacuationRoute } from '@/types/api';

// Color by viability score
function routeColor(viability: number): [number, number, number, 220] {
  if (viability >= 80) return [0, 229, 255, 220];   // route-safe
  if (viability >= 50) return [255, 214, 0, 220];    // route-caution
  return [255, 23, 68, 220];                          // route-danger
}

export interface RouteOverlayLayerProps {
  routes: EvacuationRoute[];
  selectedZoneId: string | null;
  visible: boolean;
}

export function useRouteOverlayLayer({
  routes,
  selectedZoneId,
  visible,
}: RouteOverlayLayerProps) {
  return useMemo(() => {
    if (!visible || routes.length === 0) return [];

    const data = routes.map((route) => ({
      path: route.segments.map((s) => [s.lon, s.lat] as [number, number]),
      viability: route.viability_score,
      strategy: route.strategy,
      zone_id: route.zone_id,
      capacity: 1, // placeholder; width proportional to capacity
    }));

    return [
      // Baseline routes (dashed)
      new PathLayer({
        id: 'routes-baseline',
        data: data.filter((d) => d.strategy === 'baseline'),
        getPath: (d) => d.path,
        getColor: (d) => {
          const isSelected = selectedZoneId && d.zone_id === selectedZoneId;
          if (isSelected) return [255, 214, 0, 220]; // caution highlight
          return routeColor(d.viability);
        },
        getWidth: 3,
        getDashArray: [6, 3],
        dashJustified: true,
        extensions: [],
        widthUnits: 'pixels',
        pickable: false,
        updateTriggers: { getColor: [selectedZoneId] },
      }),
      // Optimized routes (solid)
      new PathLayer({
        id: 'routes-optimized',
        data: data.filter((d) => d.strategy === 'optimized'),
        getPath: (d) => d.path,
        getColor: (d) => {
          const isSelected = selectedZoneId && d.zone_id === selectedZoneId;
          if (isSelected) return [0, 229, 255, 255]; // safe highlight
          return routeColor(d.viability);
        },
        getWidth: 4,
        widthUnits: 'pixels',
        pickable: false,
        updateTriggers: { getColor: [selectedZoneId] },
      }),
    ];
  }, [routes, selectedZoneId, visible]);
}
