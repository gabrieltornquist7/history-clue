// lib/landmarks.js
// Famous historical landmarks with coordinates and information

export const landmarks = [
  // ANCIENT WONDERS & MONUMENTS
  {
    id: 'pyramids-giza',
    name: 'Great Pyramids of Giza',
    coordinates: { lng: 31.1342, lat: 29.9792 },
    yearBuilt: -2560, // 2560 BC
    era: 'Ancient',
    type: 'Monument',
    description: 'The last remaining wonder of the ancient world, built as tombs for pharaohs.',
    icon: '🏛️'
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    coordinates: { lng: 12.4924, lat: 41.8902 },
    yearBuilt: 80,
    era: 'Ancient',
    type: 'Amphitheater',
    description: 'Iconic Roman amphitheater that held gladiatorial contests and public spectacles.',
    icon: '🏛️'
  },
  {
    id: 'parthenon',
    name: 'Parthenon',
    coordinates: { lng: 23.7275, lat: 37.9715 },
    yearBuilt: -438,
    era: 'Ancient',
    type: 'Temple',
    description: 'Ancient Greek temple dedicated to Athena, symbol of classical civilization.',
    icon: '🏛️'
  },
  {
    id: 'stonehenge',
    name: 'Stonehenge',
    coordinates: { lng: -1.8262, lat: 51.1789 },
    yearBuilt: -2500,
    era: 'Ancient',
    type: 'Monument',
    description: 'Prehistoric stone circle, possibly used for astronomical observations.',
    icon: '🗿'
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu',
    coordinates: { lng: -72.5450, lat: -13.1631 },
    yearBuilt: 1450,
    era: 'Medieval',
    type: 'City',
    description: '15th-century Inca citadel set high in the Andes Mountains.',
    icon: '🏔️'
  },

  // ASIAN MONUMENTS
  {
    id: 'great-wall',
    name: 'Great Wall of China',
    coordinates: { lng: 116.5704, lat: 40.4319 }, // Badaling section
    yearBuilt: -221, // Started during Qin Dynasty
    era: 'Ancient',
    type: 'Fortification',
    description: 'Massive defensive wall stretching over 13,000 miles across northern China.',
    icon: '🏯'
  },
  {
    id: 'forbidden-city',
    name: 'Forbidden City',
    coordinates: { lng: 116.3972, lat: 39.9163 },
    yearBuilt: 1420,
    era: 'Medieval',
    type: 'Palace',
    description: 'Imperial palace complex that housed Chinese emperors for nearly 500 years.',
    icon: '🏯'
  },
  {
    id: 'angkor-wat',
    name: 'Angkor Wat',
    coordinates: { lng: 103.8670, lat: 13.4125 },
    yearBuilt: 1150,
    era: 'Medieval',
    type: 'Temple',
    description: 'Largest religious monument in the world, originally a Hindu temple.',
    icon: '🕌'
  },
  {
    id: 'taj-mahal',
    name: 'Taj Mahal',
    coordinates: { lng: 78.0421, lat: 27.1751 },
    yearBuilt: 1653,
    era: 'Early Modern',
    type: 'Mausoleum',
    description: 'White marble mausoleum built by Emperor Shah Jahan for his wife.',
    icon: '🕌'
  },
  {
    id: 'terracotta-army',
    name: 'Terracotta Army',
    coordinates: { lng: 109.2733, lat: 34.3848 },
    yearBuilt: -210,
    era: 'Ancient',
    type: 'Tomb',
    description: 'Thousands of life-sized clay soldiers buried with China\'s first emperor.',
    icon: '⚔️'
  },

  // MIDDLE EAST
  {
    id: 'petra',
    name: 'Petra',
    coordinates: { lng: 35.4444, lat: 30.3285 },
    yearBuilt: -312,
    era: 'Ancient',
    type: 'City',
    description: 'Ancient city carved into rose-red cliffs by the Nabataeans.',
    icon: '🏜️'
  },
  {
    id: 'hagia-sophia',
    name: 'Hagia Sophia',
    coordinates: { lng: 28.9802, lat: 41.0086 },
    yearBuilt: 537,
    era: 'Medieval',
    type: 'Cathedral',
    description: 'Former Byzantine cathedral and Ottoman mosque, now a museum.',
    icon: '⛪'
  },
  {
    id: 'dome-rock',
    name: 'Dome of the Rock',
    coordinates: { lng: 35.2352, lat: 31.7780 },
    yearBuilt: 691,
    era: 'Medieval',
    type: 'Shrine',
    description: 'Islamic shrine with iconic golden dome in Jerusalem.',
    icon: '🕌'
  },

  // EUROPEAN LANDMARKS
  {
    id: 'notre-dame',
    name: 'Notre-Dame de Paris',
    coordinates: { lng: 2.3522, lat: 48.8530 },
    yearBuilt: 1345,
    era: 'Medieval',
    type: 'Cathedral',
    description: 'Gothic cathedral famous for its architecture and gargoyles.',
    icon: '⛪'
  },
  {
    id: 'tower-london',
    name: 'Tower of London',
    coordinates: { lng: -0.0759, lat: 51.5081 },
    yearBuilt: 1078,
    era: 'Medieval',
    type: 'Fortress',
    description: 'Historic castle that served as royal palace, prison, and fortress.',
    icon: '🏰'
  },
  {
    id: 'versailles',
    name: 'Palace of Versailles',
    coordinates: { lng: 2.1204, lat: 48.8049 },
    yearBuilt: 1682,
    era: 'Early Modern',
    type: 'Palace',
    description: 'Opulent royal palace of Louis XIV, the Sun King.',
    icon: '🏰'
  },
  {
    id: 'sagrada-familia',
    name: 'Sagrada Família',
    coordinates: { lng: 2.1744, lat: 41.4036 },
    yearBuilt: 1882,
    era: 'Modern',
    type: 'Cathedral',
    description: 'Gaudí\'s masterpiece basilica, still under construction.',
    icon: '⛪'
  },
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    coordinates: { lng: 2.2945, lat: 48.8584 },
    yearBuilt: 1889,
    era: 'Modern',
    type: 'Monument',
    description: 'Iconic iron lattice tower built for the 1889 World\'s Fair.',
    icon: '🗼'
  },

  // AMERICAS
  {
    id: 'chichen-itza',
    name: 'Chichen Itza',
    coordinates: { lng: -88.5678, lat: 20.6843 },
    yearBuilt: 600,
    era: 'Medieval',
    type: 'City',
    description: 'Major Mayan city with the famous El Castillo pyramid.',
    icon: '🏛️'
  },
  {
    id: 'easter-island',
    name: 'Easter Island Moai',
    coordinates: { lng: -109.3497, lat: -27.1127 },
    yearBuilt: 1250,
    era: 'Medieval',
    type: 'Monument',
    description: 'Mysterious giant stone statues created by the Rapa Nui people.',
    icon: '🗿'
  },
  {
    id: 'statue-liberty',
    name: 'Statue of Liberty',
    coordinates: { lng: -74.0445, lat: 40.6892 },
    yearBuilt: 1886,
    era: 'Modern',
    type: 'Monument',
    description: 'Gift from France, symbol of freedom and democracy.',
    icon: '🗽'
  },

  // AFRICAN LANDMARKS
  {
    id: 'great-zimbabwe',
    name: 'Great Zimbabwe',
    coordinates: { lng: 30.9333, lat: -20.2667 },
    yearBuilt: 1100,
    era: 'Medieval',
    type: 'City',
    description: 'Ancient stone city, capital of the Kingdom of Zimbabwe.',
    icon: '🏛️'
  },
  {
    id: 'luxor-temple',
    name: 'Luxor Temple',
    coordinates: { lng: 32.6396, lat: 25.6989 },
    yearBuilt: -1400,
    era: 'Ancient',
    type: 'Temple',
    description: 'Ancient Egyptian temple complex on the east bank of the Nile.',
    icon: '🏛️'
  },

  // OCEANIA
  {
    id: 'sydney-opera',
    name: 'Sydney Opera House',
    coordinates: { lng: 151.2153, lat: -33.8568 },
    yearBuilt: 1973,
    era: 'Modern',
    type: 'Theater',
    description: 'Iconic performing arts venue with distinctive sail-like design.',
    icon: '🎭'
  },

  // ADDITIONAL ANCIENT SITES
  {
    id: 'pompeii',
    name: 'Pompeii',
    coordinates: { lng: 14.4897, lat: 40.7510 },
    yearBuilt: -600,
    era: 'Ancient',
    type: 'City',
    description: 'Ancient Roman city preserved by volcanic ash from Mount Vesuvius.',
    icon: '🌋'
  },
  {
    id: 'borobudur',
    name: 'Borobudur',
    coordinates: { lng: 110.2038, lat: -7.6079 },
    yearBuilt: 800,
    era: 'Medieval',
    type: 'Temple',
    description: 'World\'s largest Buddhist temple with intricate stone carvings.',
    icon: '🕌'
  },
  {
    id: 'alhambra',
    name: 'Alhambra',
    coordinates: { lng: -3.5881, lat: 37.1773 },
    yearBuilt: 1238,
    era: 'Medieval',
    type: 'Palace',
    description: 'Stunning Moorish palace and fortress complex in Granada.',
    icon: '🏰'
  },
  {
    id: 'brandenburg-gate',
    name: 'Brandenburg Gate',
    coordinates: { lng: 13.3777, lat: 52.5163 },
    yearBuilt: 1791,
    era: 'Modern',
    type: 'Monument',
    description: 'Neoclassical monument and symbol of German reunification.',
    icon: '🏛️'
  }
];

/**
 * Get landmarks that existed during a specific year
 * @param {number} year - The year to check (use negative numbers for BC)
 * @returns {Array} Array of landmarks that existed in that year
 */
export function getLandmarksForYear(year) {
  return landmarks.filter(landmark => landmark.yearBuilt <= year);
}

/**
 * Get landmarks by era
 * @param {string} era - 'Ancient', 'Medieval', 'Early Modern', or 'Modern'
 * @returns {Array} Array of landmarks from that era
 */
export function getLandmarksByEra(era) {
  return landmarks.filter(landmark => landmark.era === era);
}

/**
 * Get landmark by ID
 * @param {string} id - The landmark ID
 * @returns {Object|null} The landmark object or null if not found
 */
export function getLandmarkById(id) {
  return landmarks.find(landmark => landmark.id === id) || null;
}
