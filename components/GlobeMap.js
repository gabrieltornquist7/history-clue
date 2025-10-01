// components/GlobeMap.js
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import Map, { Marker, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { getLandmarksForYear } from '../lib/landmarks';
import { getCitiesForYear } from '../lib/cities';
import { getEmpireLabelsForYear } from '../lib/empireLabels';
import MapControls from './MapControls';
import LandmarkPopup from './LandmarkPopup';

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

// Landmark Marker Component
const LandmarkMarker = ({ landmark, onClick }) => (
  <div
    onClick={(e) => {
      e.stopPropagation(); // Prevent map click
      onClick(landmark);
    }}
    className="cursor-pointer transition-transform hover:scale-110"
    style={{
      fontSize: '28px',
      filter: 'drop-shadow(0 2px 8px rgba(212, 175, 55, 0.6))',
      animation: 'gentle-pulse 3s ease-in-out infinite'
    }}
    title={landmark.name}
  >
    {landmark.icon}
  </div>
);

// City Marker Component (small dot)
const CityMarker = ({ city }) => (
  <div
    className="cursor-pointer transition-all hover:scale-150"
    style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#d4af37',
      border: '2px solid rgba(255, 215, 0, 0.8)',
      boxShadow: '0 0 8px rgba(212, 175, 55, 0.8)',
    }}
    title={city.name}
  />
);

// Empire Label Component
const EmpireLabel = ({ empire }) => (
  <div
    className="pointer-events-none select-none"
    style={{
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#d4af37',
      textShadow: '0 0 8px rgba(0, 0, 0, 0.9), 0 0 4px rgba(0, 0, 0, 0.9), 1px 1px 2px rgba(0, 0, 0, 1)',
      letterSpacing: '0.5px',
      whiteSpace: 'nowrap',
      textTransform: 'uppercase',
      opacity: 0.9
    }}
  >
    {empire.name}
  </div>
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
  
  // Layer visibility state
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showCities, setShowCities] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  
  // Data state
  const [visibleLandmarks, setVisibleLandmarks] = useState([]);
  const [visibleCities, setVisibleCities] = useState([]);
  const [visibleEmpireLabels, setVisibleEmpireLabels] = useState([]);
  const [selectedLandmark, setSelectedLandmark] = useState(null);

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

  // Update visible data based on selected year (TIME-TRAVEL FEATURE!)
  useEffect(() => {
    const landmarks = getLandmarksForYear(selectedYear);
    const cities = getCitiesForYear(selectedYear);
    const empireLabels = getEmpireLabelsForYear(selectedYear);
    
    setVisibleLandmarks(landmarks);
    setVisibleCities(cities);
    setVisibleEmpireLabels(empireLabels);
    
    console.log(`Year ${selectedYear}: ${landmarks.length} landmarks, ${cities.length} cities, ${empireLabels.length} empires`);
  }, [selectedYear]);

  const handleMapClick = useCallback((event) => {
    const { lngLat } = event;
    const newPin = { lng: lngLat.lng, lat: lngLat.lat };
    
    setPlayerPin(newPin);
    
    if (onGuess) {
      onGuess(newPin);
    }
  }, [onGuess]);

  const handleLandmarkClick = useCallback((landmark) => {
    setSelectedLandmark(landmark);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedLandmark(null);
  }, []);

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

        {/* Empire Labels */}
        {showLabels && visibleEmpireLabels.map((empire) => (
          <Marker
            key={empire.id}
            longitude={empire.coordinates.lng}
            latitude={empire.coordinates.lat}
            anchor="center"
          >
            <EmpireLabel empire={empire} />
          </Marker>
        ))}

        {/* City Markers */}
        {showCities && visibleCities.map((city) => (
          <Marker
            key={city.id}
            longitude={city.coordinates.lng}
            latitude={city.coordinates.lat}
            anchor="center"
          >
            <CityMarker city={city} />
          </Marker>
        ))}

        {/* Landmark Markers */}
        {showLandmarks && visibleLandmarks.map((landmark) => (
          <Marker
            key={landmark.id}
            longitude={landmark.coordinates.lng}
            latitude={landmark.coordinates.lat}
            anchor="center"
          >
            <LandmarkMarker 
              landmark={landmark} 
              onClick={handleLandmarkClick}
            />
          </Marker>
        ))}

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

      {/* Map Controls */}
      <MapControls 
        onToggleLandmarks={setShowLandmarks}
        onToggleCities={setShowCities}
        onToggleLabels={setShowLabels}
      />

      {/* Landmark Popup */}
      {selectedLandmark && (
        <LandmarkPopup 
          landmark={selectedLandmark}
          onClose={handleClosePopup}
        />
      )}

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
        🌍 Drag to rotate • Click landmarks for info • Click map to place pin • Scroll to zoom
      </div>

      <style jsx global>{`
        .mapboxgl-canvas {
          outline: none;
        }
        .mapboxgl-ctrl-logo {
          display: none !important;
        }
        @keyframes gentle-pulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.6));
          }
          50% {
            transform: scale(1.05);
            filter: drop-shadow(0 2px 12px rgba(212, 175, 55, 0.9));
          }
        }
      `}</style>
    </div>
  );
}
