// components/Map.js
"use client";
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useState, useEffect } from 'react';

// Fix for default icon issue with webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapEvents({ onMapClick, position }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
}

export default function Map({ onGuess }) {
  const [position, setPosition] = useState(null);

  const handleMapClick = (latlng) => {
    setPosition(latlng);
    onGuess(latlng); // Pass the coordinates up to the parent
  };

  return (
    <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden border-2 border-sepia-dark shadow-lg">
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapEvents onMapClick={handleMapClick} position={position} />
      </MapContainer>
    </div>
  );
}