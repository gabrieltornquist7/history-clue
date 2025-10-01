// components/GlobeMap.js
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getEmpiresForYear, createEmpireGeoJSON } from '../lib/historicalData';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZnJlZW1hbjExMTExMSIsImEiOiJjbWc4MTRidHAwMnB3MmxzOHRueHFjdTA4In0.ZTM8iAIySz1g7IzCf0fNiA';

// Custom Gold Pin SVG Component
const GoldPin = () => (
  <svg width="36" height="46" viewBox="-3 -3 36 46" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="goldGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path 
      d="M15 0C9.477 0 5 4.477 5 10c0 8 10 20 10 20s10-12 10-20c0-5.523-4.477-10-10-10z" 
      fill="#d4af37" 
      stroke="#ffd700" 
      strokeWidth="2"
      filter="url(#goldGlow)"
    />
    <circle cx="15" cy="10" r="4" fill="#1a1a1a"/>
  </svg>
);

// Custom Red Pin SVG Component for opponent
const RedPin = () => (
  <svg width="36" height="46" viewBox="-3 -3 36 46" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="redGlow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path 
      d="M15 0C9.477 0 5 4.477 5 10c0 8 10 20 10 20s10-12 10-20c0-5.523-4.477-10-10-10z" 
      fill="#dc2626" 
      stroke="#ef4444" 
      strokeWidth="2"
      filter="url(#redGlow)"
    />
    <circle cx="15" cy="10" r="4" fill="#1a1a1a"/>
  </svg>
);

export default function GlobeMap({ 
  onGuess, 
  opponentPosition = null, 
  initialPosition = null, 
  guessCoords = null,
  selectedYear = 2024 // Add selectedYear prop for time-travel feature
}) {
  const mapRef = useRef(null);
  const [viewState, setViewState] = useState({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
    pitch: 0,
    bearing: 0
  });
  const [playerPin, setPlayerPin] = useState(initialPosition);
  const [cursorStyle, setCursorStyle] = useState('grab');
  const [visibleEmpires, setVisibleEmpires] = useState([]);

  // Update player pin when guessCoords changes (continent quick jump)
  useEffect(() => {
    if (guessCoords) {
      setPlayerPin({ lng: guessCoords.lng, lat: guessCoords.lat });
      
      // Smoothly fly to the new position
      if (mapRef.current) {
        mapRef.current.flyTo({
          center: [guessCoords.lng, guessCoords.lat],
          zoom: 3,
          duration: 2000,
          essential: true
        });
      }
    }
  }, [guessCoords]);

  // Update player pin when initialPosition changes
  useEffect(() => {
    if (initialPosition) {
      setPlayerPin(initialPosition);
    }
  }, [initialPosition]);

  // Update visible empires based on selected year (TIME-TRAVEL FEATURE!)
  useEffect(() => {
    const empires = getEmpiresForYear(selectedYear);
    setVisibleEmpires(empires);
    console.log(`Year ${selectedYear}: Showing ${empires.length} empires:`, empires.map(e => e.name));
  }, [selectedYear]);

  const handleMapClick = useCallback((event) => {
    const { lngLat } = event;
    const newPin = { lng: lngLat.lng, lat: lngLat.lat };
    
    setPlayerPin(newPin);
    
    if (onGuess) {
      onGuess(newPin);
    }
  }, [onGuess]);

  return (
    <div className="h-full w-full relative">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        cursor={cursorStyle}
        onMouseDown={() => setCursorStyle('grabbing')}
        onMouseUp={() => setCursorStyle('grab')}
        onTouchStart={() => setCursorStyle('grabbing')}
        onTouchEnd={() => setCursorStyle('grab')}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        dragRotate={true}
        touchZoomRotate={true}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
      >
        {/* Terrain Source */}
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />

        {/* 3D Buildings Layer */}
        <Layer
          id="3d-buildings"
          type="fill-extrusion"
          source="composite"
          source-layer="building"
          filter={['==', 'extrude', 'true']}
          minzoom={15}
          paint={{
            'fill-extrusion-color': '#aaa',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }}
        />

        {/* Historical Empire Overlays - TIME-TRAVEL FEATURE! */}
        {visibleEmpires.map((empire, index) => {
          const geojson = createEmpireGeoJSON(empire);
          return (
            <Source
              key={`empire-${index}`}
              id={`empire-${index}`}
              type="geojson"
              data={geojson}
            >
              <Layer
                id={`empire-fill-${index}`}
                type="fill"
                paint={{
                  'fill-color': empire.color,
                  'fill-opacity': empire.opacity
                }}
              />
              <Layer
                id={`empire-border-${index}`}
                type="line"
                paint={{
                  'line-color': empire.color,
                  'line-width': 2,
                  'line-opacity': 0.8
                }}
              />
            </Source>
          );
        })}
        {/* Player's Golden Pin */}
        {playerPin && (
          <Marker 
            longitude={playerPin.lng} 
            latitude={playerPin.lat}
            anchor="bottom"
          >
            <div style={{ 
              cursor: 'pointer',
              filter: 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.8))'
            }}>
              <GoldPin />
            </div>
          </Marker>
        )}

        {/* Opponent's Red Pin */}
        {opponentPosition && (
          <Marker 
            longitude={opponentPosition.lng} 
            latitude={opponentPosition.lat}
            anchor="bottom"
          >
            <div style={{ 
              cursor: 'pointer',
              filter: 'drop-shadow(0 0 10px rgba(220, 38, 38, 0.8))'
            }}>
              <RedPin />
            </div>
          </Marker>
        )}
      </Map>

      {/* Globe instruction overlay */}
      <div 
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg text-xs font-medium pointer-events-none"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: '#d4af37',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          backdropFilter: 'blur(8px)'
        }}
      >
        🌍 Drag to rotate • Click to place pin • Scroll to zoom
      </div>

      {/* Historical Era Indicator - TIME-TRAVEL FEATURE! */}
      {visibleEmpires.length > 0 && (
        <div 
          className="absolute top-4 left-4 px-4 py-3 rounded-lg text-sm font-medium pointer-events-none"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: '#d4af37',
            border: '2px solid rgba(212, 175, 55, 0.5)',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
          }}
        >
          <div className="font-bold mb-1">⏰ Historical View Active</div>
          <div className="text-xs text-gray-300">
            Showing {visibleEmpires.length} empire{visibleEmpires.length > 1 ? 's' : ''}:
          </div>
          <div className="text-xs mt-1">
            {visibleEmpires.map((empire, i) => (
              <div key={i} className="flex items-center gap-2 mt-1">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: empire.color }}
                />
                <span className="text-white">{empire.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        .mapboxgl-canvas {
          outline: none;
        }
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
