import { useState, useEffect, useCallback } from 'react';
import { ScatterplotLayer } from 'deck.gl';

// ---------------------------------------------------------------------------
// IgnitionMarker — pulsing scatterplot layer at the ignition point
// ---------------------------------------------------------------------------

interface IgnitionMarkerProps {
  ignitionPoint: { lat: number; lon: number } | null;
  visible: boolean;
}

const PULSE_MIN = 200;
const PULSE_MAX = 600;
const PULSE_SPEED = 0.003;

export function useIgnitionMarkerLayer({
  ignitionPoint,
  visible,
}: IgnitionMarkerProps): ScatterplotLayer | null {
  const [radiusScale, setRadiusScale] = useState(1);

  const animate = useCallback(() => {
    const t = Date.now() * PULSE_SPEED;
    const pulse = (Math.sin(t) + 1) / 2; // 0..1
    setRadiusScale(PULSE_MIN + pulse * (PULSE_MAX - PULSE_MIN));
  }, []);

  useEffect(() => {
    if (!ignitionPoint || !visible) return;

    let frameId: number;
    const loop = (): void => {
      animate();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frameId);
  }, [ignitionPoint, visible, animate]);

  if (!ignitionPoint || !visible) return null;

  return new ScatterplotLayer({
    id: 'ignition-marker',
    data: [ignitionPoint],
    getPosition: (d: { lat: number; lon: number }) => [d.lon, d.lat],
    getRadius: radiusScale,
    getFillColor: [255, 107, 53, 200],
    radiusUnits: 'meters',
    pickable: false,
    stroked: true,
    getLineColor: [255, 107, 53, 100],
    getLineWidth: 2,
    lineWidthUnits: 'pixels',
  });
}
