import React, { useState, useEffect } from 'react';
import { X, ExternalLink, MapPin, Navigation } from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { LocationTag } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

interface InteractiveMapModalProps {
  location: LocationTag;
  title?: string;
  onClose: () => void;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  location,
  title,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState<string>(
    (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || (firebaseConfig as any).apiKey || ''
  );
  const [mapLoadError, setMapLoadError] = useState(false);

  useEffect(() => {
    // Fetch server configured key if client doesn't already have one
    if (!apiKey) {
      fetch('/api/maps/config')
        .then((res) => res.json())
        .then((data) => {
          if (data?.apiKey) {
            setApiKey(data.apiKey);
          }
        })
        .catch((err) => console.warn('Could not fetch maps config:', err));
    }
  }, [apiKey]);

  const center = { lat: location.latitude, lng: location.longitude };
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;

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
            <div className="w-9 h-9 rounded-full bg-emerald-100/80 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-medium text-stone-800 leading-tight">
                {location.placeName || title || 'Reflection Location'}
              </h3>
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
        <div className="relative w-full h-[400px] bg-stone-100 overflow-hidden">
          {apiKey && !mapLoadError ? (
            <APIProvider apiKey={apiKey}>
              <div className="w-full h-full">
                <Map
                  id="reflection-google-map"
                  style={{ width: '100%', height: '100%' }}
                  defaultCenter={center}
                  defaultZoom={14}
                  mapId="DEMO_MAP_ID"
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                >
                  <AdvancedMarker position={center} title={location.address}>
                    <Pin
                      background="#15803d"
                      borderColor="#14532d"
                      glyphColor="#ffffff"
                    />
                  </AdvancedMarker>
                </Map>
              </div>
            </APIProvider>
          ) : (
            // Fallback iframe map for seamless display
            <div className="relative w-full h-full">
              <iframe
                title="Location Map"
                className="w-full h-full border-0"
                src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=14&output=embed`}
                loading="lazy"
              />
            </div>
          )}

          {/* Coordinates pill badge */}
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-stone-200 text-xs font-mono text-stone-600 shadow-sm flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-stone-500" />
            <span>{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#FAF7F2] border-t border-stone-200 text-xs text-stone-600">
          <span className="truncate max-w-sm">{location.address}</span>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/80 hover:bg-stone-300 text-stone-800 font-medium transition-colors"
          >
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
