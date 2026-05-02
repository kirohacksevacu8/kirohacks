import { useCallback, useRef, useMemo } from 'react';
import DeckGL from 'deck.gl';
import { Map } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

import type { MapRef } from 'react-map-gl/mapbox';
import type { PickingInfo, MapViewState, LayersList } from 'deck.gl';

import { useSimulation } from '@/hooks/useSimulation';
import { useIgnitionMarkerLayer } from '@/features/map/IgnitionMarker';
import { useElevationLayer } from '@/features/map/ElevationLayer';
import { usePerimeterOutlineLayer } from '@/features/map/PerimeterOutline';
import { useShelterMarkerLayers } from '@/features/map/ShelterMarkers';
import { LayerToggle } from '@/components/LayerToggle';

import type { ShelterData } from '@/features/map/ShelterMarkers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
const HAS_MAPBOX = Boolean(MAPBOX_TOKEN && MAPBOX_TOKEN.length > 0);

const DARK_STYLE = 'mapbox://styles/mapbox/dark-v11';
const OSM_STYLE: mapboxgl.StyleSpecification = {
  version: 8 as const,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-tiles-layer',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

/** Demo region center: Paradise, CA */
const INITIAL_VIEW_STATE: MapViewState = {
  latitude: 39.7596,
  longitude: -121.6219,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

/** Placeholder shelters for the demo region */
const DEMO_SHELTERS: ShelterData[] = [
  {
    id: 'shelter-1',
    name: 'Chico Fairgrounds',
    lat: 39.7285,
    lon: -121.8375,
    capacity: 2500,
  },
  {
    id: 'shelter-2',
    name: 'Oroville Evac Center',
    lat: 39.5138,
    lon: -121.5564,
    capacity: 1200,
  },
];

// ---------------------------------------------------------------------------
// MapView
// ---------------------------------------------------------------------------

export function MapView(): React.JSX.Element {
  const mapRef = useRef<MapRef | null>(null);

  const {
    ignitionPoint,
    visibleLayers,
    terrainExaggeration,
    setIgnition,
  } = useSimulation();

  // ---- Click-to-ignite handler -------------------------------------------

  const handleClick = useCallback(
    (info: PickingInfo) => {
      if (info.coordinate) {
        const [lon, lat] = info.coordinate;
        setIgnition({ lat, lon });
      }
    },
    [setIgnition],
  );

  // ---- Deck.gl layers ----------------------------------------------------

  const ignitionLayer = useIgnitionMarkerLayer({
    ignitionPoint,
    visible: true,
  });

  useElevationLayer({
    mapRef,
    visible: visibleLayers.elevation,
    exaggeration: terrainExaggeration,
    hasMapboxToken: HAS_MAPBOX,
  });

  const perimeterLayer = usePerimeterOutlineLayer({
    data: null, // Will be populated when perimeter data is loaded
    visible: visibleLayers.perimeter,
  });

  const shelterLayers = useShelterMarkerLayers({
    shelters: DEMO_SHELTERS,
    visible: visibleLayers.shelters,
  });

  const layers: LayersList = useMemo(() => {
    const result: LayersList = [];
    if (perimeterLayer) result.push(perimeterLayer);
    result.push(...shelterLayers);
    if (ignitionLayer) result.push(ignitionLayer);
    return result;
  }, [perimeterLayer, shelterLayers, ignitionLayer]);

  // ---- Map style ---------------------------------------------------------

  const mapStyle = HAS_MAPBOX ? DARK_STYLE : OSM_STYLE;

  // ---- Render ------------------------------------------------------------

  return (
    <div className="flex-1 relative bg-surface-base">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller
        layers={layers}
        onClick={handleClick}
        style={{ position: 'absolute', inset: '0' }}
      >
        <Map
          ref={mapRef}
          mapboxAccessToken={HAS_MAPBOX ? MAPBOX_TOKEN : undefined}
          mapStyle={mapStyle}
          reuseMaps
          attributionControl={false}
        />
      </DeckGL>

      <LayerToggle />
    </div>
  );
}
