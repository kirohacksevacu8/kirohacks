import { useEffect, useRef, useCallback } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

// ---------------------------------------------------------------------------
// ElevationLayer — configures Mapbox terrain DEM + hillshade
// ---------------------------------------------------------------------------

interface ElevationLayerProps {
  mapRef: React.RefObject<MapRef | null>;
  visible: boolean;
  exaggeration: number;
  hasMapboxToken: boolean;
}

export function useElevationLayer({
  mapRef,
  visible,
  exaggeration,
  hasMapboxToken,
}: ElevationLayerProps): void {
  const sourceAdded = useRef(false);

  const applyTerrain = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map || !hasMapboxToken) return;

    // Add DEM source if not already present
    if (!sourceAdded.current && !map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      sourceAdded.current = true;
    }

    // Add hillshade layer if not present
    if (sourceAdded.current && !map.getLayer('hillshade-layer')) {
      map.addLayer(
        {
          id: 'hillshade-layer',
          type: 'hillshade',
          source: 'mapbox-dem',
          paint: {
            'hillshade-exaggeration': 0.5,
            'hillshade-shadow-color': '#000000',
            'hillshade-highlight-color': '#ffffff',
            'hillshade-accent-color': '#374151',
          },
        },
        // Insert below labels
        map.getStyle()?.layers?.find((l) => l.type === 'symbol')?.id,
      );
    }

    // Toggle terrain
    if (visible) {
      map.setTerrain({ source: 'mapbox-dem', exaggeration });
      if (map.getLayer('hillshade-layer')) {
        map.setLayoutProperty('hillshade-layer', 'visibility', 'visible');
      }
    } else {
      map.setTerrain(null);
      if (map.getLayer('hillshade-layer')) {
        map.setLayoutProperty('hillshade-layer', 'visibility', 'none');
      }
    }
  }, [mapRef, visible, exaggeration, hasMapboxToken]);

  useEffect(() => {
    applyTerrain();
  }, [applyTerrain]);
}
