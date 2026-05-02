import { ScatterplotLayer, TextLayer } from 'deck.gl';
import type { LayersList } from 'deck.gl';

// ---------------------------------------------------------------------------
// ShelterMarkers — blue scatterplot markers with capacity text labels
// ---------------------------------------------------------------------------

export interface ShelterData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
}

interface ShelterMarkersProps {
  shelters: ShelterData[];
  visible: boolean;
}

export function useShelterMarkerLayers({
  shelters,
  visible,
}: ShelterMarkersProps): LayersList {
  if (!visible || shelters.length === 0) return [];

  const markerLayer = new ScatterplotLayer<ShelterData>({
    id: 'shelter-markers',
    data: shelters,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: 120,
    getFillColor: [59, 130, 246, 200],
    radiusUnits: 'meters',
    pickable: true,
    stroked: true,
    getLineColor: [59, 130, 246, 255],
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
  });

  const textLayer = new TextLayer<ShelterData>({
    id: 'shelter-labels',
    data: shelters,
    getPosition: (d) => [d.lon, d.lat],
    getText: (d) => `${d.name}\n(${d.capacity})`,
    getSize: 12,
    getColor: [255, 255, 255, 220],
    getTextAnchor: 'middle',
    getAlignmentBaseline: 'top',
    getPixelOffset: [0, 16],
    fontFamily: 'Inter, system-ui, sans-serif',
    pickable: false,
  });

  return [markerLayer, textLayer];
}
