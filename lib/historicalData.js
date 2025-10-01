// lib/historicalData.js
// Simplified historical empire boundaries for proof of concept

export const HISTORICAL_EMPIRES = {
  // ANCIENT ERA (-500 BCE to 500 CE)
  ancient: [
    {
      name: 'Roman Empire',
      color: '#8b0000', // Dark red
      opacity: 0.4,
      yearRange: [-500, 476],
      coordinates: [[
        [-10, 30], [0, 35], [10, 40], [20, 42], [30, 40], [40, 38],
        [42, 30], [40, 25], [30, 25], [20, 30], [10, 33], [0, 32],
        [-10, 30]
      ]]
    },
    {
      name: 'Persian Empire',
      color: '#9932cc', // Purple
      opacity: 0.4,
      yearRange: [-550, 651],
      coordinates: [[
        [40, 25], [50, 30], [60, 32], [70, 30], [65, 25], [55, 20],
        [45, 18], [40, 20], [40, 25]
      ]]
    },
    {
      name: 'Han Dynasty',
      color: '#ffd700', // Gold
      opacity: 0.4,
      yearRange: [-206, 220],
      coordinates: [[
        [75, 20], [85, 25], [100, 30], [115, 35], [120, 40], [115, 45],
        [100, 45], [85, 40], [75, 35], [75, 20]
      ]]
    }
  ],
  
  // MEDIEVAL ERA (500 CE to 1500 CE)
  medieval: [
    {
      name: 'Byzantine Empire',
      color: '#4169e1', // Royal blue
      opacity: 0.4,
      yearRange: [330, 1453],
      coordinates: [[
        [20, 35], [30, 40], [40, 38], [42, 32], [38, 28], [30, 30],
        [25, 32], [20, 35]
      ]]
    },
    {
      name: 'Mongol Empire',
      color: '#228b22', // Forest green
      opacity: 0.4,
      yearRange: [1206, 1368],
      coordinates: [[
        [50, 35], [70, 40], [90, 45], [110, 50], [120, 48], [115, 40],
        [100, 35], [80, 30], [60, 28], [50, 30], [50, 35]
      ]]
    },
    {
      name: 'Islamic Caliphate',
      color: '#006400', // Dark green
      opacity: 0.4,
      yearRange: [632, 1258],
      coordinates: [[
        [30, 15], [40, 20], [55, 25], [60, 28], [55, 30], [45, 28],
        [35, 25], [25, 20], [30, 15]
      ]]
    },
    {
      name: 'Holy Roman Empire',
      color: '#ffa500', // Orange
      opacity: 0.4,
      yearRange: [800, 1806],
      coordinates: [[
        [5, 45], [15, 50], [20, 48], [18, 43], [10, 42], [5, 45]
      ]]
    }
  ],

  // EARLY MODERN (1500-1800)
  earlyModern: [
    {
      name: 'Ottoman Empire',
      color: '#8b4513', // Saddle brown
      opacity: 0.4,
      yearRange: [1299, 1922],
      coordinates: [[
        [15, 30], [25, 35], [35, 38], [42, 35], [40, 28], [32, 25],
        [20, 25], [15, 28], [15, 30]
      ]]
    },
    {
      name: 'Spanish Empire',
      color: '#ff4500', // Orange red
      opacity: 0.4,
      yearRange: [1492, 1898],
      coordinates: [[
        [-10, 35], [0, 42], [5, 40], [2, 36], [-5, 35], [-10, 35]
      ]]
    },
    {
      name: 'Mughal Empire',
      color: '#8a2be2', // Blue violet
      opacity: 0.4,
      yearRange: [1526, 1857],
      coordinates: [[
        [65, 8], [75, 15], [85, 22], [92, 28], [88, 32], [80, 30],
        [72, 25], [65, 18], [65, 8]
      ]]
    },
    {
      name: 'Qing Dynasty',
      color: '#ff1493', // Deep pink
      opacity: 0.4,
      yearRange: [1644, 1912],
      coordinates: [[
        [75, 20], [90, 25], [105, 30], [120, 38], [125, 45], [120, 50],
        [105, 50], [90, 45], [80, 38], [75, 30], [75, 20]
      ]]
    }
  ]
};

// Helper function to determine which empires to show based on year
export const getEmpiresForYear = (year) => {
  const numYear = Number(year);
  
  // Ancient: -3000 to 500
  if (numYear < 500) {
    return HISTORICAL_EMPIRES.ancient.filter(empire => 
      numYear >= empire.yearRange[0] && numYear <= empire.yearRange[1]
    );
  }
  
  // Medieval: 500 to 1500
  if (numYear >= 500 && numYear < 1500) {
    return HISTORICAL_EMPIRES.medieval.filter(empire => 
      numYear >= empire.yearRange[0] && numYear <= empire.yearRange[1]
    );
  }
  
  // Early Modern: 1500 to 1900
  if (numYear >= 1500 && numYear < 1900) {
    return HISTORICAL_EMPIRES.earlyModern.filter(empire => 
      numYear >= empire.yearRange[0] && numYear <= empire.yearRange[1]
    );
  }
  
  // Modern: 1900+
  // Return empty array - show modern borders (satellite view default)
  return [];
};

// Helper to create GeoJSON from empire data
export const createEmpireGeoJSON = (empire) => ({
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {
      name: empire.name,
      color: empire.color
    },
    geometry: {
      type: 'Polygon',
      coordinates: empire.coordinates
    }
  }]
});
