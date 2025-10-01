// components/Map.js
"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';

// Custom gold pin SVG for player
const goldPinSvg = `
<svg width="36" height="46" viewBox="-3 -3 36 46" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path d="M15 0C9.477 0 5 4.477 5 10c0 8 10 20 10 20s10-12 10-20c0-5.523-4.477-10-10-10z" 
        fill="#d4af37" 
        stroke="#ffd700" 
        stroke-width="2"
        filter="url(#glow)"/>
  <circle cx="15" cy="10" r="4" fill="#1a1a1a"/>
</svg>`;

const playerIcon = new L.DivIcon({
  html: goldPinSvg,
  iconSize: [36, 46],
  iconAnchor: [18, 43],
  className: 'custom-gold-pin'
});

// Custom red pin SVG for opponent
const redPinSvg = `
<svg width="36" height="46" viewBox="-3 -3 36 46" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="redGlow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <path d="M15 0C9.477 0 5 4.477 5 10c0 8 10 20 10 20s10-12 10-20c0-5.523-4.477-10-10-10z" 
        fill="#dc2626" 
        stroke="#ef4444" 
        stroke-width="2"
        filter="url(#redGlow)"/>
  <circle cx="15" cy="10" r="4" fill="#1a1a1a"/>
</svg>`;

const opponentIcon = new L.DivIcon({
  html: redPinSvg,
  iconSize: [36, 46],
  iconAnchor: [18, 43],
  className: 'custom-red-pin'
});

function MapEvents({ onMapClick, position }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return position ? <Marker position={position} icon={playerIcon} /> : null;
}

export default function Map({ onGuess, opponentPosition = null, initialPosition = null, guessCoords = null }) {
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    setPosition(initialPosition);
  }, [initialPosition]);

  // Update position when guessCoords prop changes (for continent buttons)
  useEffect(() => {
    if (guessCoords) {
      setPosition(guessCoords);
    }
  }, [guessCoords]);

  const handleMapClick = (latlng) => {
    setPosition(latlng);
    if (onGuess) {
      onGuess(latlng);
    }
  };
  
  return (
    <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden border-2 border-sepia-dark shadow-lg">
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.mapbox.com/">Mapbox</a>'
          url="https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoiZnJlZW1hbjExMTExMSIsImEiOiJjbWc4MTRidHAwMnB3MmxzOHRueHFjdTA4In0.ZTM8iAIySz1g7IzCf0fNiA"
          tileSize={512}
          zoomOffset={-1}
        />
        <MapEvents onMapClick={onGuess ? handleMapClick : null} position={position} />
        {/* This will now render the opponent's marker with the red icon */}
        {opponentPosition && <Marker position={opponentPosition} icon={opponentIcon} />}
      </MapContainer>
    </div>
  );
}