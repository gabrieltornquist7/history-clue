export default function GuessingInterface({
  locations, selectedCountry, setSelectedCountry, selectedCity, setSelectedCity,
  selectedYear, setSelectedYear, handleGuessSubmit
}) {
  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setSelectedCity('');
  };
  const labelClasses = "font-bold text-left text-ink";
  const selectorClasses = "w-full p-2 border border-sepia/30 rounded-md bg-parchment focus:ring-2 focus:ring-sepia-dark focus:border-sepia-dark transition shadow-sm";

  return (
    <div className="w-full grid grid-cols-2 gap-6 pt-6 border-t border-sepia/20">
      <div className="flex flex-col gap-2">
        <label htmlFor="country" className={labelClasses}>Country</label>
        <select id="country" value={selectedCountry} onChange={handleCountryChange} className={selectorClasses}>
          <option value="">Select Country...</option>
          {Object.keys(locations).sort().map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="city" className={labelClasses}>City</label>
        <select id="city" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedCountry} className={`${selectorClasses} disabled:bg-sepia/10`}>
          <option value="">{selectedCountry ? 'Select City...' : 'Select a country first'}</option>
          {selectedCountry && locations[selectedCountry].sort().map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2 col-span-2">
        <label htmlFor="year" className={labelClasses}>Year: {selectedYear}</label>
        <input type="range" id="year" min="1800" max="2025" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="w-full" />
      </div>
      <div className="col-span-2 flex justify-center mt-4">
        <button
          onClick={handleGuessSubmit}
          className="px-12 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sepia-dark shadow-md">
          Make Guess
        </button>
      </div>
    </div>
  );
}