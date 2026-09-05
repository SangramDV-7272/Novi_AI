import React, { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, MapPin, Navigation, Layers, RotateCcw } from 'lucide-react';
import {
  Map as MapLibreMap,
  Marker as MapLibreMarker,
  Popup as MapLibrePopup,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { LocationTag } from '../types';

interface InteractiveMapModalProps {
  location: LocationTag;
  title?: string;
  onClose: () => void;
}

type MapStyleKey = 'positron' | 'osm' | 'voyager';

const MAP_STYLES: Record<MapStyleKey, { name: string; style: StyleSpecification }> = {
  positron: {
    name: 'Muted Light (Carto)',
    style: {
      version: 8,
      sources: {
        'carto-positron': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        },
      },
      layers: [
        {
          id: 'carto-tiles',
          type: 'raster',
          source: 'carto-positron',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    },
  },
  osm: {
    name: 'OpenStreetMap Standard',
    style: {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [
            'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
            'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
          ],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        },
      },
      layers: [
        {
          id: 'osm-tiles',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 19,
        },
      ],
    },
  },
  voyager: {
    name: 'Voyager (Natural)',
    style: {
      version: 8,
      sources: {
        'carto-voyager': {
          type: 'raster',
          tiles: [
            'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
          ],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
        },
      },
      layers: [
        {
          id: 'voyager-tiles',
          type: 'raster',
          source: 'carto-voyager',
          minzoom: 0,
          maxzoom: 20,
        },
      ],
    },
  },
};

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  location,
  title,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<MapLibreMarker | null>(null);

  const [activeStyle, setActiveStyle] = useState<MapStyleKey>('positron');
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  const osmUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=16/${location.latitude}/${location.longitude}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Destroy existing instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: MAP_STYLES[activeStyle].style,
      center: [location.longitude, location.latitude],
      zoom: 14.5,
      pitch: 0,
      attributionControl: false,
    });

    // Custom attribution control
    map.addControl(
      new AttributionControl({
        compact: true,
      }),
      'bottom-right'
    );

    // Zoom & Rotation Navigation Control
    map.addControl(
      new NavigationControl({
        showCompass: true,
        showZoom: true,
        visualizePitch: true,
      }),
      'top-right'
    );

    // Scale bar
    map.addControl(
      new ScaleControl({
        maxWidth: 100,
        unit: 'metric',
      }),
      'bottom-left'
    );

    // Create custom DOM Marker with pin & pulsing beacon
    const markerEl = document.createElement('div');
    markerEl.className = 'relative flex items-center justify-center cursor-pointer group';
    markerEl.innerHTML = `
      <div style="position: absolute; width: 34px; height: 34px; background-color: rgba(22, 101, 52, 0.3); border-radius: 50%; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #166534 0%, #14532d 100%); border: 2.5px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); color: white;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      </div>
    `;

    // Create informative popup
    const popupHtml = `
      <div style="padding: 6px 8px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; max-width: 220px;">
        <p style="font-weight: 600; font-size: 13px; color: #1c1917; margin: 0 0 3px 0; line-height: 1.2;">
          ${escapeHtml(location.placeName || title || 'Reflection')}
        </p>
        <p style="font-size: 11px; color: #78716c; margin: 0; line-height: 1.35;">
          ${escapeHtml(location.address)}
        </p>
      </div>
    `;

    const popup = new MapLibrePopup({
      offset: 24,
      closeButton: false,
      className: 'shadow-md rounded-xl',
    }).setHTML(popupHtml);

    const marker = new MapLibreMarker({ element: markerEl, anchor: 'center' })
      .setLngLat([location.longitude, location.latitude])
      .setPopup(popup)
      .addTo(map);

    // Toggle popup open initially
    marker.togglePopup();

    mapInstanceRef.current = map;
    markerRef.current = marker;

    // Clean up on unmount
    return () => {
      marker.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [location.latitude, location.longitude, activeStyle]);

  // Re-center handler
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [location.longitude, location.latitude],
        zoom: 14.5,
        essential: true,
      });
      if (markerRef.current && !markerRef.current.getPopup()?.isOpen()) {
        markerRef.current.togglePopup();
      }
    }
  };

  return (
    <div
      id="interactive-map-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="interactive-map-modal-container"
        className="relative w-full max-w-2xl bg-[#FCFAF7] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F5F2EB]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-stone-800 leading-tight truncate">
                  {location.placeName || title || 'Reflection Location'}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  OpenStreetMap
                </span>
              </div>
              <p className="text-xs text-stone-500 font-sans truncate max-w-md">
                {location.address}
              </p>
            </div>
          </div>
          <button
            id="close-map-modal-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
            title="Close Map"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Canvas Area */}
        <div className="relative w-full h-[420px] bg-[#EFECE3] overflow-hidden">
          {/* MapLibre Container */}
          <div
            ref={mapContainerRef}
            id="maplibre-container"
            className="w-full h-full"
          />

          {/* Map Floating Actions: Re-center & Style Switcher */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-xl border border-stone-200 shadow-sm text-xs">
            <button
              onClick={handleRecenter}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-stone-100 text-stone-700 font-medium transition-colors cursor-pointer"
              title="Center on Reflection"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-600" />
              <span>Re-center</span>
            </button>

            <div className="w-px h-4 bg-stone-200" />

            <div className="relative">
              <button
                onClick={() => setShowStyleMenu((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-stone-100 text-stone-700 font-medium transition-colors cursor-pointer"
                title="Change Map Style"
              >
                <Layers className="w-3.5 h-3.5 text-stone-600" />
                <span>{MAP_STYLES[activeStyle].name.split(' ')[0]}</span>
              </button>

              {showStyleMenu && (
                <div className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-xl border border-stone-200 shadow-lg py-1 z-20">
                  {(Object.keys(MAP_STYLES) as MapStyleKey[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setActiveStyle(key);
                        setShowStyleMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        activeStyle === key
                          ? 'bg-emerald-50 text-emerald-800 font-semibold'
                          : 'text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <span>{MAP_STYLES[key].name}</span>
                      {activeStyle === key && <span className="text-emerald-700">&bull;</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coordinates pill badge */}
          <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-mono text-stone-600 shadow-sm flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-emerald-700" />
            <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 bg-[#FAF7F2] border-t border-stone-200 text-xs text-stone-600">
          <span className="truncate max-w-xs font-medium text-stone-700">
            Powered by OpenStreetMap &amp; MapLibre GL
          </span>
          <div className="flex items-center gap-2">
            <a
              href={osmUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100/70 hover:bg-emerald-100 text-emerald-900 font-medium transition-colors border border-emerald-200"
            >
              <span>View on OpenStreetMap</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/80 hover:bg-stone-300 text-stone-700 font-medium transition-colors"
            >
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Safe HTML escaper for MapLibre popups
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
