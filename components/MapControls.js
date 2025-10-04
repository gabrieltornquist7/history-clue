// components/MapControls.js
"use client";
import { useState, useEffect } from 'react';

export default function MapControls({ onToggleLandmarks, onToggleCities, onToggleLabels }) {
  // Load preferences from localStorage
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [showCities, setShowCities] = useState(false);
  const [showLabels, setShowLabels] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    const savedLandmarks = localStorage.getItem('map_show_landmarks');
    const savedCities = localStorage.getItem('map_show_cities');
    const savedLabels = localStorage.getItem('map_show_labels');

    if (savedLandmarks !== null) setShowLandmarks(savedLandmarks === 'true');
    if (savedCities !== null) setShowCities(savedCities === 'true');
    if (savedLabels !== null) setShowLabels(savedLabels === 'true');
  }, []);

  // Update callbacks when state changes
  useEffect(() => {
    if (onToggleLandmarks) onToggleLandmarks(showLandmarks);
  }, [showLandmarks, onToggleLandmarks]);

  useEffect(() => {
    if (onToggleCities) onToggleCities(showCities);
  }, [showCities, onToggleCities]);

  useEffect(() => {
    if (onToggleLabels) onToggleLabels(showLabels);
  }, [showLabels, onToggleLabels]);

  const handleToggleLandmarks = () => {
    const newValue = !showLandmarks;
    setShowLandmarks(newValue);
    localStorage.setItem('map_show_landmarks', String(newValue));
  };

  const handleToggleCities = () => {
    const newValue = !showCities;
    setShowCities(newValue);
    localStorage.setItem('map_show_cities', String(newValue));
  };

  const handleToggleLabels = () => {
    const newValue = !showLabels;
    setShowLabels(newValue);
    localStorage.setItem('map_show_labels', String(newValue));
  };

  return (
    <div 
      className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-1 sm:gap-2 z-10"
      style={{
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Landmarks Toggle */}
      <button
        onClick={handleToggleLandmarks}
        className="flex items-center gap-1 px-1.5 py-0.5 sm:px-3 sm:py-2 sm:gap-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: showLandmarks ? 'rgba(212, 175, 55, 0.9)' : 'rgba(0, 0, 0, 0.8)',
          color: showLandmarks ? '#1a1a1a' : '#d4af37',
          border: '1px solid ' + (showLandmarks ? '#d4af37' : 'rgba(212, 175, 55, 0.3)'),
          boxShadow: showLandmarks ? '0 0 20px rgba(212, 175, 55, 0.5)' : 'none'
        }}
        title="Toggle historical landmarks"
      >
        <span className="text-base">🏛️</span>
        <span>Landmarks</span>
      </button>

      {/* Cities Toggle */}
      <button
        onClick={handleToggleCities}
        className="flex items-center gap-1 px-1.5 py-0.5 sm:px-3 sm:py-2 sm:gap-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: showCities ? 'rgba(212, 175, 55, 0.9)' : 'rgba(0, 0, 0, 0.8)',
          color: showCities ? '#1a1a1a' : '#d4af37',
          border: '1px solid ' + (showCities ? '#d4af37' : 'rgba(212, 175, 55, 0.3)'),
          boxShadow: showCities ? '0 0 20px rgba(212, 175, 55, 0.5)' : 'none'
        }}
        title="Toggle ancient cities"
      >
        <span className="text-base">🏙️</span>
        <span>Cities</span>
      </button>

      {/* Labels Toggle */}
      <button
        onClick={handleToggleLabels}
        className="flex items-center gap-1 px-1.5 py-0.5 sm:px-3 sm:py-2 sm:gap-2 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 hover:scale-105"
        style={{
          backgroundColor: showLabels ? 'rgba(212, 175, 55, 0.9)' : 'rgba(0, 0, 0, 0.8)',
          color: showLabels ? '#1a1a1a' : '#d4af37',
          border: '1px solid ' + (showLabels ? '#d4af37' : 'rgba(212, 175, 55, 0.3)'),
          boxShadow: showLabels ? '0 0 20px rgba(212, 175, 55, 0.5)' : 'none'
        }}
        title="Toggle empire labels"
      >
        <span className="text-base">🗺️</span>
        <span>Labels</span>
      </button>
    </div>
  );
}
