/**
 * BurnHeatmapLayer
 *
 * Renders burn probability grid as a Deck.gl BitmapLayer with fire color ramp.
 * Supports opacity control and animation timestep filtering via arrival_times.
 */

import { useMemo } from 'react';
import { BitmapLayer } from '@deck.gl/layers';
import type { BurnProbabilityMap, ArrivalTimeStats } from '@/types/api';

// Fire color ramp: transparent → fire-low → fire-medium → fire-high → fire-extreme
// Each entry: [r, g, b, a] at probability 0.0, 0.25, 0.5, 0.75, 1.0
const COLOR_RAMP: [number, number, number, number][] = [
  [0, 0, 0, 0],         // 0.0 — transparent
  [252, 211, 77, 120],  // 0.25 — fire-low
  [249, 115, 22, 180],  // 0.5 — fire-medium
  [220, 38, 38, 220],   // 0.75 — fire-high
  [153, 27, 27, 255],   // 1.0 — fire-extreme
];

function interpolateColor(
  t: number
): [number, number, number, number] {
  const n = COLOR_RAMP.length - 1;
  const scaled = t * n;
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, n);
  const f = scaled - lo;
  const a = COLOR_RAMP[lo];
  const b = COLOR_RAMP[hi];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    Math.round(a[3] + (b[3] - a[3]) * f),
  ];
}

function buildTexture(
  grid: number[][],
  arrivalTimes: number[][] | null,
  animationTimestep: number
): ImageData {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const data = new Uint8ClampedArray(cols * rows * 4);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const prob = grid[r][c];
      const arrival = arrivalTimes ? arrivalTimes[r][c] : 0;
      // If animating, only show cells that have been reached
      const show = arrivalTimes === null || arrival <= animationTimestep;
      const idx = (r * cols + c) * 4;
      if (show && prob > 0) {
        // When animating, color by recency: bright orange → dark red
        let t = prob;
        if (arrivalTimes && arrival <= animationTimestep && animationTimestep > 0) {
          const age = animationTimestep - arrival;
          // Newer cells brighter (lower t), older cells darker (higher t)
          t = Math.min(1, 0.3 + age / 30);
        }
        const [r2, g, b, a] = interpolateColor(t);
        data[idx] = r2;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = a;
      } else {
        data[idx + 3] = 0;
      }
    }
  }

  return new ImageData(data, cols, rows);
}

export interface BurnHeatmapLayerProps {
  burnProbability: BurnProbabilityMap | null;
  arrivalTimes: ArrivalTimeStats | null;
  animationTimestep: number;
  opacity: number;
  visible: boolean;
}

export function useBurnHeatmapLayer({
  burnProbability,
  arrivalTimes,
  animationTimestep,
  opacity,
  visible,
}: BurnHeatmapLayerProps) {
  return useMemo(() => {
    if (!burnProbability || !visible) return null;

    const { grid, grid_bounds } = burnProbability;
    const isAnimating = animationTimestep > 0;
    const meanGrid = arrivalTimes?.mean ?? null;

    const imageData = buildTexture(grid, isAnimating ? meanGrid : null, animationTimestep);

    const { min_lon, max_lon, min_lat, max_lat } = grid_bounds;

    return new BitmapLayer({
      id: 'burn-heatmap',
      image: imageData,
      bounds: [min_lon, min_lat, max_lon, max_lat],
      opacity,
      pickable: false,
      // Flip vertically: grid row 0 = top (max_lat), but BitmapLayer expects bottom-left origin
      // We handle this by building the texture with row 0 at top and using bounds correctly
    });
  }, [burnProbability, arrivalTimes, animationTimestep, opacity, visible]);
}
