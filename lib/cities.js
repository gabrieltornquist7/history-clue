// lib/cities.js
// Ancient and historical cities with coordinates

export const cities = [
  // ANCIENT MESOPOTAMIA
  {
    id: 'babylon',
    name: 'Babylon',
    coordinates: { lng: 44.4207, lat: 32.5355 },
    yearFounded: -1894,
    yearDeclined: 539,
    empire: 'Babylonian Empire',
    description: 'Ancient Mesopotamian city, site of the Hanging Gardens.',
  },
  {
    id: 'ur',
    name: 'Ur',
    coordinates: { lng: 46.1032, lat: 30.9625 },
    yearFounded: -3800,
    yearDeclined: -500,
    empire: 'Sumerian',
    description: 'One of the world\'s earliest cities, birthplace of Abraham.',
  },
  {
    id: 'nineveh',
    name: 'Nineveh',
    coordinates: { lng: 43.1520, lat: 36.3600 },
    yearFounded: -6000,
    yearDeclined: -612,
    empire: 'Assyrian Empire',
    description: 'Capital of the Neo-Assyrian Empire.',
  },

  // ANCIENT EGYPT
  {
    id: 'memphis',
    name: 'Memphis',
    coordinates: { lng: 31.2500, lat: 29.8467 },
    yearFounded: -3100,
    yearDeclined: 641,
    empire: 'Ancient Egypt',
    description: 'Ancient capital of Egypt, near the pyramids.',
  },
  {
    id: 'thebes',
    name: 'Thebes',
    coordinates: { lng: 32.6396, lat: 25.7188 },
    yearFounded: -3200,
    yearDeclined: -663,
    empire: 'Ancient Egypt',
    description: 'Major city of Upper Egypt, known as Luxor today.',
  },
  {
    id: 'alexandria',
    name: 'Alexandria',
    coordinates: { lng: 29.9187, lat: 31.2001 },
    yearFounded: -331,
    yearDeclined: null, // Still exists
    empire: 'Ptolemaic Kingdom',
    description: 'Founded by Alexander the Great, home to the Great Library.',
  },

  // ANCIENT GREECE
  {
    id: 'athens',
    name: 'Athens',
    coordinates: { lng: 23.7275, lat: 37.9838 },
    yearFounded: -3000,
    yearDeclined: null, // Still exists
    empire: 'Greek City-States',
    description: 'Birthplace of democracy and Western philosophy.',
  },
  {
    id: 'sparta',
    name: 'Sparta',
    coordinates: { lng: 22.4302, lat: 37.0810 },
    yearFounded: -900,
    yearDeclined: 396,
    empire: 'Greek City-States',
    description: 'Powerful military city-state of ancient Greece.',
  },
  {
    id: 'corinth',
    name: 'Corinth',
    coordinates: { lng: 22.9345, lat: 37.9065 },
    yearFounded: -3000,
    yearDeclined: 1858,
    empire: 'Greek City-States',
    description: 'Major commercial hub connecting mainland to Peloponnese.',
  },

  // ANCIENT ROME
  {
    id: 'rome',
    name: 'Rome',
    coordinates: { lng: 12.4964, lat: 41.9028 },
    yearFounded: -753,
    yearDeclined: null, // Still exists
    empire: 'Roman Empire',
    description: 'The Eternal City, capital of the Roman Empire.',
  },
  {
    id: 'constantinople',
    name: 'Constantinople',
    coordinates: { lng: 28.9784, lat: 41.0082 },
    yearFounded: 330,
    yearDeclined: 1453,
    empire: 'Byzantine Empire',
    description: 'Capital of the Eastern Roman Empire, now Istanbul.',
  },
  {
    id: 'carthage',
    name: 'Carthage',
    coordinates: { lng: 10.3233, lat: 36.8528 },
    yearFounded: -814,
    yearDeclined: 698,
    empire: 'Carthaginian Empire',
    description: 'Phoenician city-state, rival of Rome in the Punic Wars.',
  },

  // ANCIENT PERSIA
  {
    id: 'persepolis',
    name: 'Persepolis',
    coordinates: { lng: 52.8916, lat: 29.9344 },
    yearFounded: -518,
    yearDeclined: -330,
    empire: 'Persian Empire',
    description: 'Ceremonial capital of the Achaemenid Empire.',
  },
  {
    id: 'susa',
    name: 'Susa',
    coordinates: { lng: 48.2579, lat: 32.1897 },
    yearFounded: -4200,
    yearDeclined: 1218,
    empire: 'Persian Empire',
    description: 'Ancient city mentioned in the Epic of Gilgamesh.',
  },

  // ANCIENT CHINA
  {
    id: 'changan',
    name: "Chang'an",
    coordinates: { lng: 108.9398, lat: 34.3416 },
    yearFounded: -1600,
    yearDeclined: 904,
    empire: 'Various Chinese Dynasties',
    description: 'Ancient capital of China, start of the Silk Road (Xi\'an today).',
  },
  {
    id: 'luoyang',
    name: 'Luoyang',
    coordinates: { lng: 112.4539, lat: 34.6197 },
    yearFounded: -1600,
    yearDeclined: null, // Still exists
    empire: 'Various Chinese Dynasties',
    description: 'Ancient capital of multiple Chinese dynasties.',
  },
  {
    id: 'beijing',
    name: 'Beijing',
    coordinates: { lng: 116.4074, lat: 39.9042 },
    yearFounded: -1045,
    yearDeclined: null, // Still exists
    empire: 'Various Chinese Dynasties',
    description: 'Ancient city, capital of China since the Yuan Dynasty.',
  },

  // ANCIENT INDIA
  {
    id: 'mohenjo-daro',
    name: 'Mohenjo-daro',
    coordinates: { lng: 68.1357, lat: 27.3273 },
    yearFounded: -2500,
    yearDeclined: -1700,
    empire: 'Indus Valley Civilization',
    description: 'Major city of the Indus Valley Civilization.',
  },
  {
    id: 'pataliputra',
    name: 'Pataliputra',
    coordinates: { lng: 85.1376, lat: 25.5941 },
    yearFounded: -490,
    yearDeclined: 550,
    empire: 'Maurya Empire',
    description: 'Capital of the Maurya and Gupta Empires (Patna today).',
  },

  // MESOAMERICA
  {
    id: 'teotihuacan',
    name: 'Teotihuacan',
    coordinates: { lng: -98.8438, lat: 19.6925 },
    yearFounded: -100,
    yearDeclined: 750,
    empire: 'Teotihuacan',
    description: 'Ancient Mesoamerican city with massive pyramids.',
  },
  {
    id: 'tikal',
    name: 'Tikal',
    coordinates: { lng: -89.6233, lat: 17.2221 },
    yearFounded: -400,
    yearDeclined: 900,
    empire: 'Maya',
    description: 'Major Maya city with towering temples.',
  },
  {
    id: 'tenochtitlan',
    name: 'Tenochtitlan',
    coordinates: { lng: -99.1332, lat: 19.4326 },
    yearFounded: 1325,
    yearDeclined: 1521,
    empire: 'Aztec Empire',
    description: 'Capital of the Aztec Empire, now Mexico City.',
  },

  // MEDIEVAL EUROPE
  {
    id: 'paris',
    name: 'Paris',
    coordinates: { lng: 2.3522, lat: 48.8566 },
    yearFounded: -250,
    yearDeclined: null, // Still exists
    empire: 'Kingdom of France',
    description: 'Capital of France, center of medieval culture.',
  },
  {
    id: 'london',
    name: 'London',
    coordinates: { lng: -0.1276, lat: 51.5074 },
    yearFounded: 43,
    yearDeclined: null, // Still exists
    empire: 'Roman Britain / England',
    description: 'Founded as Londinium by the Romans.',
  },
  {
    id: 'baghdad',
    name: 'Baghdad',
    coordinates: { lng: 44.3661, lat: 33.3152 },
    yearFounded: 762,
    yearDeclined: null, // Still exists
    empire: 'Abbasid Caliphate',
    description: 'Center of Islamic Golden Age, House of Wisdom.',
  },
  {
    id: 'cordoba',
    name: 'Córdoba',
    coordinates: { lng: -4.7792, lat: 37.8882 },
    yearFounded: -169,
    yearDeclined: null, // Still exists
    empire: 'Umayyad Caliphate',
    description: 'Capital of Islamic Spain, renowned for learning.',
  },

  // MEDIEVAL ASIA
  {
    id: 'samarkand',
    name: 'Samarkand',
    coordinates: { lng: 66.9749, lat: 39.6542 },
    yearFounded: -700,
    yearDeclined: null, // Still exists
    empire: 'Various',
    description: 'Key city on the Silk Road, capital of Timur\'s empire.',
  },
  {
    id: 'angkor',
    name: 'Angkor',
    coordinates: { lng: 103.8670, lat: 13.4125 },
    yearFounded: 802,
    yearDeclined: 1431,
    empire: 'Khmer Empire',
    description: 'Massive temple complex and capital of the Khmer Empire.',
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    coordinates: { lng: 135.7681, lat: 35.0116 },
    yearFounded: 794,
    yearDeclined: null, // Still exists
    empire: 'Japan',
    description: 'Imperial capital of Japan for over a millennium.',
  },

  // MEDIEVAL AFRICA
  {
    id: 'timbuktu',
    name: 'Timbuktu',
    coordinates: { lng: -3.0026, lat: 16.7666 },
    yearFounded: 1100,
    yearDeclined: null, // Still exists
    empire: 'Mali Empire',
    description: 'Center of learning and trade in medieval West Africa.',
  },
  {
    id: 'cairo',
    name: 'Cairo',
    coordinates: { lng: 31.2357, lat: 30.0444 },
    yearFounded: 969,
    yearDeclined: null, // Still exists
    empire: 'Fatimid Caliphate',
    description: 'Capital of Egypt, built by the Fatimids.',
  },

  // SOUTH AMERICA
  {
    id: 'cusco',
    name: 'Cusco',
    coordinates: { lng: -71.9675, lat: -13.5319 },
    yearFounded: 1100,
    yearDeclined: null, // Still exists
    empire: 'Inca Empire',
    description: 'Historic capital of the Inca Empire.',
  },

  // ANCIENT NEAR EAST
  {
    id: 'jerusalem',
    name: 'Jerusalem',
    coordinates: { lng: 35.2137, lat: 31.7683 },
    yearFounded: -3000,
    yearDeclined: null, // Still exists
    empire: 'Various',
    description: 'Holy city for Judaism, Christianity, and Islam.',
  },
  {
    id: 'damascus',
    name: 'Damascus',
    coordinates: { lng: 36.2765, lat: 33.5138 },
    yearFounded: -10000,
    yearDeclined: null, // Still exists
    empire: 'Various',
    description: 'One of the oldest continuously inhabited cities.',
  },

  // ADDITIONAL ANCIENT CITIES
  {
    id: 'troy',
    name: 'Troy',
    coordinates: { lng: 26.2387, lat: 39.9577 },
    yearFounded: -3000,
    yearDeclined: -500,
    empire: 'Trojan',
    description: 'Legendary city of the Trojan War.',
  },
  {
    id: 'mycenae',
    name: 'Mycenae',
    coordinates: { lng: 22.7564, lat: 37.7308 },
    yearFounded: -1600,
    yearDeclined: -1100,
    empire: 'Mycenaean Greece',
    description: 'Bronze Age Greek city, home of King Agamemnon.',
  },
];

/**
 * Get cities that existed during a specific year
 * @param {number} year - The year to check (use negative numbers for BC)
 * @returns {Array} Array of cities that existed in that year
 */
export function getCitiesForYear(year) {
  return cities.filter(city => {
    const founded = city.yearFounded <= year;
    const stillExists = city.yearDeclined === null || city.yearDeclined >= year;
    return founded && stillExists;
  });
}

/**
 * Get city by ID
 * @param {string} id - The city ID
 * @returns {Object|null} The city object or null if not found
 */
export function getCityById(id) {
  return cities.find(city => city.id === id) || null;
}
