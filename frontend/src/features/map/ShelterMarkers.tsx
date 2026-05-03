/**
 * ShelterMarkers — Deck.gl layers for shelter locations.
 * Fetches from live API, re-fetches when region changes.
 * Shows error when no shelters are available.
 */

import { useState, useEffect } from 'react';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { getApi } from '@/services/api';
import { useSimulation } from '@/hooks/useSimulation';
import type { ShelterData } from '@/types/api';

export interface ShelterMarkersProps {
  visible: boolean;
}

export interface ShelterMarkersState {
  layers: Layer[];
  error: string | null;
  count: number;
}

export function useShelterMarkers({ visible }: ShelterMarkersProps): ShelterMarkersState {
  const { state } = useSimulation();
  const [shelters, setShelters] = useState<ShelterData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const region = state.selectedRegion;

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setError(null);
    getApi()
      .then((api) => api.getShelters(region ?? undefined))
      .then((data) => {
        if (cancelled) return;
        setShelters(data);
        if (data.length === 0) setError('No shelter locations found for this region.');
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load shelters');
      });
    return () => { cancelled = true; };
  }, [visible, region]);

  if (!visible || shelters.length === 0) return { layers: [], error, count: 0 };

  return {
    layers: [
      new ScatterplotLayer({
        id: 'shelter-markers',
        data: shelters,
        pickable: true,
        opacity: 0.9,
        stroked: true,
        filled: true,
        radiusMinPixels: 8,
        radiusMaxPixels: 16,
        lineWidthMinPixels: 2,
        getPosition: (d: ShelterData) => [d.lon, d.lat],
        getRadius: 300,
        getFillColor: [0, 229, 255, 200],
        getLineColor: [255, 255, 255, 255],
      }),
      new TextLayer({
        id: 'shelter-labels',
        data: shelters,
        pickable: false,
        getPosition: (d: ShelterData) => [d.lon, d.lat],
        getText: (d: ShelterData) => `${d.capacity.toLocaleString()}`,
        getSize: 12,
        getColor: [255, 255, 255, 255],
        getAngle: 0,
        getTextAnchor: 'middle' as const,
        getAlignmentBaseline: 'top' as const,
        getPixelOffset: [0, 16],
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 600,
        background: true,
        getBackgroundColor: [17, 24, 39, 200],
        backgroundPadding: [4, 2],
      }),
    ],
    error: null,
    count: shelters.length,
  };
}
