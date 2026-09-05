import React, { useState, useRef } from 'react';
import { MapPin, Navigation, Search, X, Loader2, AlertCircle } from 'lucide-react';
import type { LocationTag } from '../types';

interface LocationPickerModalProps {
  currentLocation?: LocationTag | null;
  onSelect: (location: LocationTag) => void;
  onClose: () => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  currentLocation: _currentLocation,
  onSelect,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debounceTimeout = useRef<number | null>(null);

  // Handle Search Input with debounce for OpenStreetMap Nominatim
  const handleQueryChange = (val: string) => {
    setSearchQuery(val);
    setErrorMessage(null);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (!val.trim() || val.trim().length < 2) {
      setPredictions([]);
      return;
    }

    debounceTimeout.current = window.setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch('/api/maps/places-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: val }),
        });
        const data = await res.json();
        setPredictions(data.predictions || []);
      } catch (err: any) {
        console.warn('Place search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  };

  // Use Current Geolocation
  const handleUseCurrentLocation = () => {
    setErrorMessage(null);
    if (!('geolocation' in navigator)) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;

          const res = await fetch('/api/maps/geocode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          if (!res.ok) {
            throw new Error('Geocoding service was unable to resolve address.');
          }

          const data = await res.json();
          const address = data.address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          onSelect({
            latitude,
            longitude,
            address,
            placeName: 'Current Location',
            placeId: data.placeId,
          });
          onClose();
        } catch (err: any) {
          console.error('Reverse geocode failed:', err);
          // Fall back gracefully to coordinates so user is not blocked
          const latitude = pos.coords.latitude;
          const longitude = pos.coords.longitude;
          onSelect({
            latitude,
            longitude,
            address: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            placeName: 'Current Location',
          });
          onClose();
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        console.error('Geolocation error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage('Location permission was denied. You can search for a place manually below.');
        } else {
          setErrorMessage('Unable to retrieve your location. Please try searching for a place.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Select place from search
  const handleSelectPrediction = async (prediction: any) => {
    setIsSearching(true);
    setErrorMessage(null);

    try {
      if (typeof prediction.latitude === 'number' && typeof prediction.longitude === 'number') {
        onSelect({
          latitude: prediction.latitude,
          longitude: prediction.longitude,
          address: prediction.description,
          placeName: prediction.mainText,
          placeId: prediction.placeId,
        });
        onClose();
        return;
      }

      // Forward geocode the place address
      const res = await fetch('/api/maps/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: prediction.description }),
      });

      if (!res.ok) {
        throw new Error('Could not resolve coordinates for this place.');
      }

      const data = await res.json();

      onSelect({
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address || prediction.description,
        placeName: prediction.mainText || prediction.description.split(',')[0],
        placeId: data.placeId || prediction.placeId,
      });
      onClose();
    } catch (err: any) {
      console.error('Select place error:', err);
      setErrorMessage('Could not load location details. Please try another place.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div
      id="location-picker-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="location-picker-modal-container"
        className="relative w-full max-w-lg bg-[#FCFAF7] rounded-2xl border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-[#F5F2EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-medium text-stone-800">
                  Tag Location
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  OpenStreetMap
                </span>
              </div>
              <p className="text-xs text-stone-500 font-sans">
                Attach where this reflection took place
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Option A: Current Location */}
          <div>
            <button
              id="use-current-location-btn"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl bg-[#EDE7DD] hover:bg-[#E5DFD4] text-stone-800 text-sm font-medium border border-stone-300 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
                  <span>Detecting Location via Browser…</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 text-emerald-700" />
                  <span>Use Current Location</span>
                </>
              )}
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-stone-200 w-full" />
            <span className="bg-[#FCFAF7] px-3 text-xs text-stone-400 uppercase tracking-wider font-medium">
              or search OpenStreetMap
            </span>
            <div className="border-t border-stone-200 w-full" />
          </div>

          {/* Option B: Search Places */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="place-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search city, neighborhood, park, natural landmark…"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-stone-300 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700 transition-all"
                autoFocus
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 animate-spin text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Results list */}
            {predictions.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-white divide-y divide-stone-100 max-h-56 overflow-y-auto shadow-sm">
                {predictions.map((p, idx) => (
                  <button
                    key={p.placeId || idx}
                    onClick={() => handleSelectPrediction(p)}
                    className="w-full px-4 py-2.5 text-left hover:bg-[#F7F4EE] transition-colors flex items-start gap-2.5 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-stone-800 truncate">
                        {p.mainText || p.description}
                      </p>
                      {p.secondaryText && (
                        <p className="text-[11px] text-stone-500 truncate">
                          {p.secondaryText}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.trim().length >= 2 && !isSearching && predictions.length === 0 && (
              <p className="text-xs text-stone-400 text-center py-2">
                No matching places found. Try a broader city or landmark name.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#FAF7F2] border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
