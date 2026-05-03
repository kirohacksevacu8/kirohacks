/**
 * PerimeterOutline Component
 *
 * Deck.gl GeoJsonLayer that draws the simulation grid boundary as a dashed
 * orange outline. Uses the grid_bounds from the current simulation results,
 * so it works for any region — not just Paradise/Camp Fire.
 *
 * When no results are available the layer is hidden.
 */

import { useMemo } from 'react';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Feature, Polygon } from 'geojson';

import { useSimulation } from '@/hooks/useSimulation';

export interface PerimeterOutlineProps {
  /** Whether the perimeter layer is visible */
  visible: boolean;
}

/**
 * Build a GeoJSON polygon from grid bounds.
 */
function boundsToFeature(bounds: {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}): Feature<Polygon> {
  const { min_lat, max_lat, min_lon, max_lon } = bounds;
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [min_lon, min_lat],
        [max_lon, min_lat],
        [max_lon, max_lat],
        [min_lon, max_lat],
        [min_lon, min_lat],
      ]],
    },
  };
}

/**
 * Creates a Deck.gl GeoJsonLayer for the simulation grid boundary.
 * Returns null when not visible or when no results are loaded.
 */
export function usePerimeterOutlineLayer({ visible }: PerimeterOutlineProps): GeoJsonLayer | null {
  const { state } = useSimulation();
  const gridBounds = state.currentResults?.burn_probability?.grid_bounds ?? null;

  const data = useMemo(() => {
    if (!gridBounds) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [boundsToFeature(gridBounds)],
    };
  }, [gridBounds]);

  if (!visible || !data) {
    return null;
  }

  return new GeoJsonLayer({
    id: 'perimeter-outline',
    data,
    pickable: false,
    stroked: true,
    filled: false,
    lineWidthMinPixels: 2,
    lineWidthMaxPixels: 4,
    getLineColor: [255, 107, 53, 180], // fire-active color with alpha
    getLineWidth: 3,
    getDashArray: [8, 4],
    dashJustified: true,
    dashGapPickable: false,
    extensions: [],
  });
}

export function PerimeterOutline(_props: PerimeterOutlineProps): null {
  return null;
}
