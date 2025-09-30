// components/Map.js
"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';

// Main player icon (default blue)
const playerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Opponent icon (custom red color via CSS filter)
const opponentIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  className: 'leaflet-marker-opponent' // Class for CSS targeting
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
      <style>
        {`
          .leaflet-marker-opponent {
            filter: hue-rotate(180deg) brightness(0.8);
          }
        `}
      </style>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapEvents onMapClick={onGuess ? handleMapClick : null} position={position} />
        {/* This will now render the opponent's marker with the red icon */}
        {opponentPosition && <Marker position={opponentPosition} icon={opponentIcon} />}
      </MapContainer>
    </div>
  );
}