# Design Document

## Overview

This design specifies the EvacuAI frontend — a dark command-center dashboard for wildfire evacuation planning. The frontend is a React 18 / TypeScript SPA styled with Tailwind CSS, consuming the EvacuAI FastAPI backend via REST. It renders geospatial simulation results on a WebGL map with terrain elevation context and presents Monte Carlo outputs through operational data visualizations.

Design priorities: (1) spatial clarity for first responders under time pressure, (2) fast parameter iteration for what-if analysis, (3) visual credibility for hackathon judges, (4) strict separation from backend computation.

**Styling approach:** Tailwind CSS with a custom theme extending the default config. Design tokens are expressed as Tailwind theme extensions in `tailwind.config.ts` rather than raw CSS custom properties. A small `base.css` file applies Tailwind's `@layer base` directives for global resets and font loading.

## Architecture

### System Context

```
┌─────────────────────────────────────────────────────────┐
│                    EvacuAI Frontend                       │
│  React 18 + TypeScript + Vite + Tailwind CSS             │
│                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Control   │  │ Map View │  │ Results  │               │
│  │ Panel     │  │ (Deck.gl │  │ Panel    │               │
│  │           │  │  /Mapbox)│  │          │               │
│  └─────┬────┘  └────┬─────┘  └────┬─────┘               │
│        │             │              │                     │
│  ┌─────▼─────────────▼──────────────▼─────┐              │
│  │         SimulationContext               │              │
│  │  (React Context + useReducer)           │              │
│  └─────────────────┬──────────────────────┘              │
│                    │                                      │
│  ┌─────────────────▼──────────────────────┐              │
│  │         API Service Layer               │              │
│  │  (ApiClient ↔ MockApiClient)            │              │
│  └─────────────────┬──────────────────────┘              │
└────────────────────┼──────────────────────────────────────┘
                     │ HTTP/REST
                     ▼
┌────────────────────────────────────────────┐
│         EvacuAI Backend (FastAPI)           │
│  POST /api/simulate                        │
│  GET  /api/results/{job_id}                │
│  GET  /api/wind?lat=&lon=                  │
│  GET  /api/scenarios                       │
└────────────────────────────────────────────┘
```

### Component Tree

```
<App>
  <SimulationProvider>
    <CommandCenter>                 ← Full-viewport flex layout
      <HeaderBar>                  ← h-12 top bar
        <Logo />
        <ScenarioLabel />
        <SimulationStatus />
        <WindRose />
      </HeaderBar>
      <MainContent>                ← flex flex-row, h-[calc(100vh-48px)]
        <ControlPanel>             ← w-80 shrink-0, collapsible
          <IgnitionSection />
          <WindSection />
          <ScenarioSelector />
          <MonteCarloSlider />
          <RunButton />
          <DemoStepIndicator />
        </ControlPanel>
        <MapView>                  ← flex-1 relative
          <DeckGLMap />
          <BurnHeatmapLayer />
          <RouteOverlayLayer />
          <ZoneChoroplethLayer />
          <ElevationLayer />
          <ShelterMarkers />
          <PerimeterOutline />
          <LayerToggleControl />
          <AnimationTimeline />
          <IgnitionMarker />
        </MapView>
        <ResultsPanel>             ← w-96 shrink-0, collapsible
          <KeyMetricCard />
          <ComparisonView>
            <StrategyColumn strategy="baseline" />
            <StrategyColumn strategy="optimized" />
          </ComparisonView>
          <ZoneEvacuationTable />
          <EvacuationOrdering />
          <SummaryStatistics />
        </ResultsPanel>
      </MainContent>
    </CommandCenter>
    <ToastContainer />
  </SimulationProvider>
</App>
```

## Design Decisions

### Decision 1: Tailwind CSS over CSS Modules / styled-components

**Choice:** Tailwind CSS v3+ with custom theme config

**Rationale:** For a hackathon with 4 parallel developers, Tailwind eliminates style conflicts entirely — no CSS file ownership disputes, no specificity wars, no naming conventions to agree on. Every component is self-contained via utility classes. The custom theme in `tailwind.config.ts` serves as the single source of truth for the design system (colors, spacing, typography), giving the same consistency as design tokens but with zero runtime cost and instant IntelliSense in VS Code.

**Trade-off:** Longer class strings in JSX. Mitigated by extracting repeated patterns into small component abstractions (e.g., `<MetricCard>`) rather than `@apply` directives, keeping Tailwind's tree-shaking effective.

### Decision 2: Deck.gl over Leaflet for Map Rendering

**Choice:** Deck.gl with Mapbox GL JS basemap

**Rationale:** The Burn_Probability_Map is a large 2D raster (potentially 250×350 cells). Deck.gl's WebGL pipeline handles GPU-accelerated heatmaps, path layers, and GeoJSON polygons in a unified renderer. Mapbox GL JS provides native 3D terrain support via `setTerrain()` for the Elevation_Layer. Leaflet cannot match this performance or terrain capability.

**Trade-off:** Larger bundle (~200KB gzipped). Acceptable for a hackathon where visual quality directly impacts judge perception.

### Decision 3: React Context + useReducer

**Choice:** React Context with useReducer for simulation state

**Rationale:** The state shape is flat and updates are infrequent (user actions, API responses). No need for Zustand or Redux. Keeps dependencies minimal for a hackathon timeline.

```typescript
interface SimulationState {
  ignitionPoint: { lat: number; lon: number } | null;
  windParams: WindParameters;
  monteCarloRuns: number;
  selectedScenario: string | null;
  jobId: string | null;
  jobStatus: 'idle' | 'submitting' | 'running' | 'complete' | 'error';
  progress: { completed: number; total: number } | null;
  currentResults: SimulationResults | null;
  previousResults: SimulationResults | null;
  demoMode: boolean;
  demoStep: number;
  apiMode: 'live' | 'mock';
  selectedZoneId: string | null;
  animationTimestep: number;
  isAnimating: boolean;
  terrainExaggeration: number;
  visibleLayers: {
    burnHeatmap: boolean;
    routes: boolean;
    zones: boolean;
    elevation: boolean;
    shelters: boolean;
    perimeter: boolean;
  };
}
```

### Decision 4: Mock API Client with Environment Toggle

**Choice:** Parallel `LiveApiClient` and `MockApiClient` implementing the same `EvacuAIApi` interface, switched via `VITE_API_MODE` env var.

**Rationale:** Frontend and backend teams work in parallel. Mock client returns realistic data matching Pydantic schemas with simulated delays. Integration is a single env var flip.

### Decision 5: Animation via Timestep Filtering

**Choice:** Use mean arrival time grid from Monte Carlo results; animate by filtering cells where `arrival_time <= currentTimestep`.

**Rationale:** Single comparison per cell per frame — trivial on the frontend. Produces smooth 30+ FPS. Color encodes time-since-ignition: bright orange (fresh) → dark red (burned).

### Decision 6: Mapbox Terrain-DEM for Elevation

**Choice:** Mapbox GL JS native `terrain` source with `mapbox-dem` tiles and hillshade.

**Rationale:** Fire spreads faster uphill; topography constrains evacuation routes. Mapbox provides this natively with zero additional data fetching. Exaggeration slider (1×–3×) makes features visible during demos. Graceful fallback to flat map if token is missing.

## Detailed Design

### Tailwind Theme Configuration

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surface palette — dark command center
        surface: {
          base: '#0A0E17',
          raised: '#111827',
          overlay: '#1F2937',
          border: '#374151',
          hover: '#2D3748',
        },
        // Fire spectrum
        fire: {
          low: '#FCD34D',
          medium: '#F97316',
          high: '#DC2626',
          extreme: '#991B1B',
          active: '#FF6B35',
        },
        // Evacuation
        route: {
          safe: '#00E5FF',
          caution: '#FFD600',
          danger: '#FF1744',
        },
        zone: {
          safe: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
        },
        // Elevation
        elevation: {
          low: '#1B4332',
          mid: '#6B705C',
          high: '#D4A373',
          peak: '#FEFAE0',
        },
        // UI accents
        accent: {
          primary: '#3B82F6',
          'primary-hover': '#2563EB',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        ui: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      spacing: {
        'header': '48px',
        'control-panel': '320px',
        'results-panel': '380px',
      },
      boxShadow: {
        'glow-fire': '0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-safe': '0 0 20px rgba(0, 229, 255, 0.2)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 300ms ease-out',
        'glow': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 107, 53, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 107, 53, 0.5)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

### Layout Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ HeaderBar  h-12 bg-surface-raised border-b border-surface-border
│ [Logo] [Scenario: Camp Fire] [● Running 342/500]        [🌬️]│
├────────────┬─────────────────────────────┬───────────────────┤
│ Control    │                             │ Results           │
│ Panel      │        Map View             │ Panel             │
│ w-80       │     flex-1 relative         │ w-96              │
│ bg-surface │                             │ bg-surface        │
│ -raised    │  ┌─────────────────────┐    │ -raised           │
│            │  │                     │    │                   │
│ ┌────────┐ │  │   Deck.gl Map       │    │ ┌──────────────┐ │
│ │Ignition│ │  │   + Terrain DEM     │    │ │ KEY METRIC   │ │
│ └────────┘ │  │   + Data Layers     │    │ │ Route A: 82% │ │
│ ┌────────┐ │  │                     │    │ └──────────────┘ │
│ │ Wind   │ │  │   [Layer Toggles]   │    │ ┌──────────────┐ │
│ └────────┘ │  │   [Elev: 1x 2x 3x] │    │ │ Comparison   │ │
│ ┌────────┐ │  └─────────────────────┘    │ │ Base │ Optim │ │
│ │Scenario│ │  ┌─────────────────────┐    │ └──────────────┘ │
│ └────────┘ │  │ ▶ ━━━━━●━━━━━━━━━━ │    │ ┌──────────────┐ │
│ ┌────────┐ │  │ t=23min  [1x][2x]  │    │ │ Zone Table   │ │
│ │MC Runs │ │  └─────────────────────┘    │ └──────────────┘ │
│ └────────┘ │                             │ ┌──────────────┐ │
│            │                             │ │ Evac Order   │ │
│ [▶ RUN   ] │                             │ └──────────────┘ │
└────────────┴─────────────────────────────┴───────────────────┘
```

### Component Tailwind Patterns

#### MetricCard

```tsx
<div className="bg-surface-overlay border border-surface-border rounded-lg p-4">
  <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
    Route Viability
  </p>
  <p className="text-3xl font-bold font-mono text-route-safe mt-1">
    82%
  </p>
  <p className="text-sm text-gray-500 mt-1">of scenarios</p>
  {/* Optional delta */}
  <p className="text-xs text-accent-success mt-2 flex items-center gap-1">
    <span>▲</span> +14% vs baseline
  </p>
</div>
```

#### RunButton

```tsx
<button
  disabled={isRunning}
  className={cn(
    "w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary",
    isRunning
      ? "bg-surface-overlay text-gray-500 cursor-not-allowed"
      : "bg-fire-active hover:bg-fire-medium text-white shadow-glow-fire hover:shadow-lg"
  )}
>
  {isRunning ? `Running ${progress.completed}/${progress.total}...` : '▶ Run Simulation'}
</button>
```

#### Zone Table Row

```tsx
<tr className="border-b border-surface-border hover:bg-surface-hover cursor-pointer transition-colors">
  <td className="px-3 py-2 font-mono text-sm text-gray-300">BG-12</td>
  <td className="px-3 py-2 font-mono text-sm text-gray-300">2,340</td>
  <td className="px-3 py-2 font-mono text-sm text-fire-high">8 min</td>
  <td className="px-3 py-2 font-mono text-sm text-gray-300">0.87</td>
  <td className="px-3 py-2 font-mono text-sm text-gray-400">64%</td>
  <td className="px-3 py-2 font-mono text-sm text-route-safe">82%</td>
  <td className="px-3 py-2 font-mono text-sm text-fire-medium">18%</td>
  <td className="px-3 py-2">
    <span className="inline-block w-2.5 h-2.5 rounded-full bg-zone-critical" title="Critical" />
  </td>
</tr>
```

#### Panel Collapse (responsive)

```tsx
{/* Desktop: static sidebar */}
<aside className={cn(
  "hidden lg:flex flex-col w-80 bg-surface-raised border-r border-surface-border",
  "overflow-y-auto"
)}>
  {/* panel content */}
</aside>

{/* Mobile: overlay drawer */}
<div className={cn(
  "lg:hidden fixed inset-y-0 left-0 z-20 w-80 bg-surface-raised border-r border-surface-border",
  "transform transition-transform duration-300",
  isOpen ? "translate-x-0" : "-translate-x-full"
)}>
  {/* panel content */}
</div>
```

### Burn Heatmap Color Ramp

```
Probability:  0.0    0.2    0.4    0.6    0.8    1.0
Tailwind:     —      fire-low fire-medium fire-high fire-extreme fire-extreme
Hex:          trans   #FCD34D #F97316    #DC2626  #991B1B     #7F1D1D
Opacity:      0.0    0.3    0.5         0.6      0.7         0.8
```

### Elevation Layer Configuration

```
Mapbox GL JS terrain:
  source: 'mapbox-dem' (raster-dem, mapbox://mapbox.mapbox-terrain-dem-v1)
  exaggeration: 1.0 default, user slider 1.0–3.0
  hillshade: subtle shadow layer beneath data layers

Rendering order (bottom to top):
  1. Dark basemap tiles
  2. Terrain DEM (when 3D enabled)
  3. Hillshade layer
  4. Zone choropleth polygons
  5. Burn heatmap overlay
  6. Route polylines
  7. Shelter markers + ignition marker
  8. Perimeter outline
```

### TypeScript API Types

```typescript
// types/api.ts — mirrors backend Pydantic schemas

export interface SimulateRequest {
  ignition_point: { lat: number; lon: number };
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
  num_runs: number;
  scenario_preset?: string;
}

export interface SimulateResponse {
  job_id: string;
}

export interface SimulationProgress {
  status: 'running';
  completed_runs: number;
  total_runs: number;
  elapsed_seconds: number;
}

export interface GridBounds {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
  cell_size_m: number;
  grid_rows: number;
  grid_cols: number;
}

export interface BurnProbabilityMap {
  grid: number[][];
  grid_bounds: GridBounds;
}

export interface ArrivalTimeStats {
  mean: number[][];
  median: number[][];
  p10: number[][];
  p90: number[][];
  grid_bounds: GridBounds;
}

export interface RouteSegment {
  lat: number;
  lon: number;
}

export interface EvacuationRoute {
  route_id: string;
  zone_id: string;
  segments: RouteSegment[];
  viability_score: number;
  travel_time_minutes: number;
  strategy: 'baseline' | 'optimized';
}

export interface ZoneResult {
  type: 'Feature';
  geometry: GeoJSON.Polygon;
  properties: {
    zone_id: string;
    population: number;
    cutoff_time: number;
    evacuation_priority_score: number;
    best_baseline_route_id: string;
    best_optimized_route_id: string;
    baseline_viability: number;
    optimized_viability: number;
    failure_risk_percentage: number;
  };
}

export interface SimulationResults {
  status: 'complete';
  job_id: string;
  burn_probability: BurnProbabilityMap;
  arrival_times: ArrivalTimeStats;
  routes: EvacuationRoute[];
  zones: {
    type: 'FeatureCollection';
    features: ZoneResult[];
  };
  evacuation_ordering: Array<{
    zone_id: string;
    priority_score: number;
    population: number;
    cutoff_time: number;
  }>;
  summary: {
    total_population_at_risk: number;
    zones_critical_count: number;
    baseline_avg_viability: number;
    optimized_avg_viability: number;
    improvement_percentage: number;
    confidence_interval_95: [number, number];
  };
}

export interface WindData {
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
  forecast_text: string;
  source: 'nws' | 'fallback' | 'manual';
}

export interface ScenarioPreset {
  name: string;
  description: string;
  ignition_point: { lat: number; lon: number };
  wind_speed: number;
  wind_direction: number;
  wind_gust: number;
  relative_humidity: number;
}
```

### File Structure

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts             ← Design system lives here
├── postcss.config.js
├── .env
├── .env.example
├── public/
│   └── favicon.svg
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                  ← @tailwind base/components/utilities + font imports
│   ├── lib/
│   │   └── cn.ts                  ← clsx + tailwind-merge utility
│   ├── types/
│   │   └── api.ts
│   ├── services/
│   │   ├── api.ts                 ← EvacuAIApi interface + factory
│   │   ├── liveApiClient.ts
│   │   └── mockApiClient.ts
│   ├── context/
│   │   ├── SimulationContext.tsx
│   │   └── simulationReducer.ts
│   ├── hooks/
│   │   ├── useSimulation.ts
│   │   ├── usePolling.ts
│   │   └── useKeyboardShortcuts.ts
│   ├── components/
│   │   ├── HeaderBar.tsx
│   │   ├── WindRose.tsx
│   │   ├── MetricCard.tsx
│   │   ├── SimulationStatus.tsx
│   │   ├── ToastContainer.tsx
│   │   └── LayerToggle.tsx
│   ├── features/
│   │   ├── controls/
│   │   │   ├── ControlPanel.tsx
│   │   │   ├── IgnitionSection.tsx
│   │   │   ├── WindSection.tsx
│   │   │   ├── ScenarioSelector.tsx
│   │   │   ├── MonteCarloSlider.tsx
│   │   │   ├── RunButton.tsx
│   │   │   └── DemoStepIndicator.tsx
│   │   ├── map/
│   │   │   ├── MapView.tsx
│   │   │   ├── BurnHeatmapLayer.tsx
│   │   │   ├── RouteOverlayLayer.tsx
│   │   │   ├── ZoneChoroplethLayer.tsx
│   │   │   ├── ElevationLayer.tsx
│   │   │   ├── ShelterMarkers.tsx
│   │   │   ├── PerimeterOutline.tsx
│   │   │   ├── IgnitionMarker.tsx
│   │   │   └── AnimationTimeline.tsx
│   │   └── results/
│   │       ├── ResultsPanel.tsx
│   │       ├── ComparisonView.tsx
│   │       ├── ZoneEvacuationTable.tsx
│   │       ├── EvacuationOrdering.tsx
│   │       ├── RouteCard.tsx
│   │       └── SummaryStatistics.tsx
│   └── assets/
│       ├── logo.svg
│       └── mock/
│           ├── simulationResults.json
│           ├── windData.json
│           └── scenarios.json
```

### Data Flow

```
User clicks "Run Simulation"
  │
  ▼
ControlPanel dispatches SUBMIT_SIMULATION
  │
  ▼
Reducer → status: 'submitting'
  │
  ▼
useSimulation calls api.simulate(params)
  │
  ▼
API returns { job_id: "abc-123" }
  │
  ▼
Reducer → status: 'running', jobId: "abc-123"
  │
  ▼
usePolling polls api.getResults("abc-123") every 1s
  │
  ├── HTTP 202 → Reducer → progress: { completed: 342, total: 500 }
  │
  └── HTTP 200 → Reducer → status: 'complete', currentResults: data
      │
      ├── MapView re-renders burn heatmap, routes, zones over terrain
      ├── ResultsPanel populates comparison, table, ordering
      └── HeaderBar updates status to "Complete ✓"
```

### Responsive Behavior

| Breakpoint | Tailwind Prefix | Layout |
|---|---|---|
| ≥ 1280px | `xl:` | Full 3-column: Control (w-80) + Map (flex-1) + Results (w-96) |
| 1024–1279px | `lg:` | Narrower panels: Control (w-72) + Map + Results (w-80) |
| 768–1023px | `md:` | Panels collapse to overlay drawers, map fills viewport |
| < 768px | default | Map fills viewport, panels as bottom sheets via transform |

### Accessibility

- All interactive elements: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary`
- Zone table: semantic `<table>` with `<thead>`, `<tbody>`, `aria-sort` on sortable columns
- Color never sole indicator — status uses color + icon + text (e.g., `🔴 Critical` not just red dot)
- Animation respects `motion-safe:` / `motion-reduce:` Tailwind variants
- Elevation 3D mode includes "Flatten" button for motion-sensitive users
- Minimum 4.5:1 contrast verified: `#F9FAFB` on `#0A0E17` = 17.4:1 ✓, `#9CA3AF` on `#111827` = 5.4:1 ✓
- Touch targets: all buttons/inputs use `min-h-[44px] min-w-[44px]`

### Performance Budget

| Metric | Target |
|---|---|
| Initial bundle (gzipped) | < 500KB (Tailwind purges unused CSS to ~10KB) |
| Time to interactive | < 3 seconds |
| Map render (heatmap + terrain) | < 500ms for 250×350 grid |
| Animation frame rate | ≥ 15 FPS during fire spread |
| CSS file size (production) | < 15KB gzipped (Tailwind purge) |
| Memory peak (animation) | < 200MB |

### Error Handling

| Error | UX |
|---|---|
| Wind API fails | Toast (amber): "Using default wind (10 mph SW)". Fields show fallback. |
| Simulation 422 | Inline field errors in ControlPanel with `text-accent-error` + `border-accent-error`. |
| Simulation 500/network | Toast (red): "Simulation failed." + Retry button. |
| Polling timeout >60s | Toast (amber): "Taking longer than expected." Backoff polling. |
| Mapbox token missing | Fallback to OSM tiles, elevation toggle disabled with tooltip. |
| Terrain DEM fails | Flat 2D map, elevation toggle grayed out. |
| Mock mode active | `bg-accent-warning/20 text-accent-warning` badge: "MOCK DATA" in header. |
