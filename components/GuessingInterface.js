// components/GuessingInterface.js
export default function GuessingInterface({
  locations,
  selectedCountry,
  setSelectedCountry,
  selectedCity,
  setSelectedCity,
  selectedYear,
  setSelectedYear,
  handleGuessSubmit
}) {
  const groupStyle = { display: 'flex', flexDirection: 'column', gap: '5px' };
  const labelStyle = { textAlign: 'left', fontWeight: 'bold' };
  const selectorStyle = { padding: '8px', fontSize: '1em' };

  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setSelectedCity(''); // Reset city when country changes
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '600px',
      margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px'
    }}>
      <div style={groupStyle}>
        <label style={labelStyle} htmlFor="country">Country</label>
        <select id="country" style={selectorStyle} value={selectedCountry} onChange={handleCountryChange}>
          <option value="">Select Country...</option>
          {Object.keys(locations).sort().map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>
      <div style={groupStyle}>
        <label style={labelStyle} htmlFor="city">City</label>
        <select id="city" style={selectorStyle} value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedCountry}>
          <option value="">{selectedCountry ? 'Select City...' : 'Select a country first'}</option>
          {selectedCountry && locations[selectedCountry].sort().map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>
      <div style={{ ...groupStyle, gridColumn: '1 / -1' }}>
        <label style={labelStyle} htmlFor="year">Year: {selectedYear}</label>
        <input type="range" id="year" min="1800" max="2025" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
      </div>
      <button
        onClick={handleGuessSubmit}
        style={{
          gridColumn: '1 / -1', padding: '15px', fontSize: '1.2em', fontWeight: 'bold',
          backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer'
        }}>
        Make Guess
      </button>
    </div>
  );
}