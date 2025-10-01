// lib/empireLabels.js
// Empire name labels with approximate center coordinates

export const empireLabels = [
  // ANCIENT EMPIRES
  {
    id: 'roman-empire',
    name: 'Roman Empire',
    coordinates: { lng: 12.5, lat: 41.9 }, // Rome
    yearStart: -27,
    yearEnd: 476,
    era: 'Ancient',
  },
  {
    id: 'persian-empire',
    name: 'Persian Empire',
    coordinates: { lng: 52.5, lat: 32.4 }, // Persia
    yearStart: -550,
    yearEnd: -330,
    era: 'Ancient',
  },
  {
    id: 'han-dynasty',
    name: 'Han Dynasty',
    coordinates: { lng: 110.0, lat: 35.0 }, // Central China
    yearStart: -206,
    yearEnd: 220,
    era: 'Ancient',
  },
  {
    id: 'maurya-empire',
    name: 'Maurya Empire',
    coordinates: { lng: 80.0, lat: 25.0 }, // India
    yearStart: -322,
    yearEnd: -185,
    era: 'Ancient',
  },
  {
    id: 'ptolemaic-egypt',
    name: 'Ptolemaic Egypt',
    coordinates: { lng: 31.2, lat: 30.0 }, // Egypt
    yearStart: -305,
    yearEnd: -30,
    era: 'Ancient',
  },
  {
    id: 'carthage',
    name: 'Carthage',
    coordinates: { lng: 10.3, lat: 36.8 }, // Tunisia
    yearStart: -814,
    yearEnd: -146,
    era: 'Ancient',
  },

  // MEDIEVAL EMPIRES
  {
    id: 'byzantine-empire',
    name: 'Byzantine Empire',
    coordinates: { lng: 28.9, lat: 41.0 }, // Constantinople
    yearStart: 330,
    yearEnd: 1453,
    era: 'Medieval',
  },
  {
    id: 'abbasid-caliphate',
    name: 'Abbasid Caliphate',
    coordinates: { lng: 44.4, lat: 33.3 }, // Baghdad
    yearStart: 750,
    yearEnd: 1258,
    era: 'Medieval',
  },
  {
    id: 'umayyad-caliphate',
    name: 'Umayyad Caliphate',
    coordinates: { lng: 36.3, lat: 33.5 }, // Damascus
    yearStart: 661,
    yearEnd: 750,
    era: 'Medieval',
  },
  {
    id: 'holy-roman-empire',
    name: 'Holy Roman Empire',
    coordinates: { lng: 10.5, lat: 51.2 }, // Central Europe
    yearStart: 800,
    yearEnd: 1806,
    era: 'Medieval',
  },
  {
    id: 'mongol-empire',
    name: 'Mongol Empire',
    coordinates: { lng: 105.0, lat: 47.0 }, // Mongolia
    yearStart: 1206,
    yearEnd: 1368,
    era: 'Medieval',
  },
  {
    id: 'yuan-dynasty',
    name: 'Yuan Dynasty',
    coordinates: { lng: 116.4, lat: 39.9 }, // Beijing
    yearStart: 1271,
    yearEnd: 1368,
    era: 'Medieval',
  },
  {
    id: 'song-dynasty',
    name: 'Song Dynasty',
    coordinates: { lng: 120.0, lat: 30.0 }, // Central China
    yearStart: 960,
    yearEnd: 1279,
    era: 'Medieval',
  },
  {
    id: 'tang-dynasty',
    name: 'Tang Dynasty',
    coordinates: { lng: 108.9, lat: 34.3 }, // Chang'an
    yearStart: 618,
    yearEnd: 907,
    era: 'Medieval',
  },
  {
    id: 'khmer-empire',
    name: 'Khmer Empire',
    coordinates: { lng: 103.8, lat: 13.4 }, // Angkor
    yearStart: 802,
    yearEnd: 1431,
    era: 'Medieval',
  },
  {
    id: 'mali-empire',
    name: 'Mali Empire',
    coordinates: { lng: -4.0, lat: 17.6 }, // Timbuktu
    yearStart: 1235,
    yearEnd: 1670,
    era: 'Medieval',
  },

  // EARLY MODERN EMPIRES
  {
    id: 'ottoman-empire',
    name: 'Ottoman Empire',
    coordinates: { lng: 28.9, lat: 41.0 }, // Istanbul
    yearStart: 1299,
    yearEnd: 1922,
    era: 'Early Modern',
  },
  {
    id: 'safavid-empire',
    name: 'Safavid Empire',
    coordinates: { lng: 51.4, lat: 35.7 }, // Isfahan
    yearStart: 1501,
    yearEnd: 1736,
    era: 'Early Modern',
  },
  {
    id: 'mughal-empire',
    name: 'Mughal Empire',
    coordinates: { lng: 77.2, lat: 28.6 }, // Delhi
    yearStart: 1526,
    yearEnd: 1857,
    era: 'Early Modern',
  },
  {
    id: 'ming-dynasty',
    name: 'Ming Dynasty',
    coordinates: { lng: 116.4, lat: 39.9 }, // Beijing
    yearStart: 1368,
    yearEnd: 1644,
    era: 'Early Modern',
  },
  {
    id: 'qing-dynasty',
    name: 'Qing Dynasty',
    coordinates: { lng: 116.4, lat: 39.9 }, // Beijing
    yearStart: 1644,
    yearEnd: 1912,
    era: 'Early Modern',
  },
  {
    id: 'spanish-empire',
    name: 'Spanish Empire',
    coordinates: { lng: -3.7, lat: 40.4 }, // Madrid
    yearStart: 1492,
    yearEnd: 1898,
    era: 'Early Modern',
  },
  {
    id: 'portuguese-empire',
    name: 'Portuguese Empire',
    coordinates: { lng: -9.1, lat: 38.7 }, // Lisbon
    yearStart: 1415,
    yearEnd: 1999,
    era: 'Early Modern',
  },
  {
    id: 'aztec-empire',
    name: 'Aztec Empire',
    coordinates: { lng: -99.1, lat: 19.4 }, // Tenochtitlan
    yearStart: 1428,
    yearEnd: 1521,
    era: 'Early Modern',
  },
  {
    id: 'inca-empire',
    name: 'Inca Empire',
    coordinates: { lng: -71.9, lat: -13.5 }, // Cusco
    yearStart: 1438,
    yearEnd: 1533,
    era: 'Early Modern',
  },

  // MODERN EMPIRES (18th-20th Century)
  {
    id: 'british-empire',
    name: 'British Empire',
    coordinates: { lng: -0.1, lat: 51.5 }, // London
    yearStart: 1583,
    yearEnd: 1997,
    era: 'Modern',
  },
  {
    id: 'french-empire',
    name: 'French Empire',
    coordinates: { lng: 2.3, lat: 48.8 }, // Paris
    yearStart: 1804,
    yearEnd: 1815,
    era: 'Modern',
  },
  {
    id: 'russian-empire',
    name: 'Russian Empire',
    coordinates: { lng: 37.6, lat: 55.7 }, // Moscow
    yearStart: 1721,
    yearEnd: 1917,
    era: 'Modern',
  },
  {
    id: 'austro-hungarian-empire',
    name: 'Austro-Hungarian Empire',
    coordinates: { lng: 16.3, lat: 48.2 }, // Vienna
    yearStart: 1867,
    yearEnd: 1918,
    era: 'Modern',
  },
];

/**
 * Get empire labels that existed during a specific year
 * @param {number} year - The year to check (use negative numbers for BC)
 * @returns {Array} Array of empire labels that existed in that year
 */
export function getEmpireLabelsForYear(year) {
  return empireLabels.filter(empire => {
    return year >= empire.yearStart && year <= empire.yearEnd;
  });
}

/**
 * Get empire label by ID
 * @param {string} id - The empire ID
 * @returns {Object|null} The empire label object or null if not found
 */
export function getEmpireLabelById(id) {
  return empireLabels.find(empire => empire.id === id) || null;
}
