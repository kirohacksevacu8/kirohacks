import { GeoJsonLayer } from 'deck.gl';
import type { Feature, FeatureCollection } from 'geojson';

// ---------------------------------------------------------------------------
// PerimeterOutline — dashed orange GeoJSON stroke for fire perimeter
// ---------------------------------------------------------------------------

interface PerimeterOutlineProps {
  /** GeoJSON data for the fire perimeter */
  data: Feature | FeatureCollection | null;
  visible: boolean;
}

export function usePerimeterOutlineLayer({
  data,
  visible,
}: PerimeterOutlineProps): GeoJsonLayer | null {
  if (!data || !visible) return null;

  return new GeoJsonLayer({
    id: 'perimeter-outline',
    data,
    stroked: true,
    filled: false,
    getLineColor: [255, 107, 53, 180],
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
    getDashArray: [8, 4],
    dashJustified: true,
    extensions: [],
    pickable: false,
  });
}
