// components/GuessingInterface.js
export default function GuessingInterface({
  locations, selectedCountry, setSelectedCountry, selectedCity, setSelectedCity,
  selectedYear, setSelectedYear, handleGuessSubmit
}) {
  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setSelectedCity('');
  };

  const labelClasses = "font-bold text-left text-stone-800";
  const selectorClasses = "w-full p-2 border border-stone-300 rounded-md bg-white focus:ring-2 focus:ring-[#785e48] focus:border-[#785e48] transition";

  return (
    <div className="w-full grid grid-cols-2 gap-6 pt-6 border-t border-stone-300">
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
        <select id="city" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedCountry} className={`${selectorClasses} disabled:bg-stone-200`}>
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
      <button
        onClick={handleGuessSubmit}
        className="col-span-2 p-4 bg-[#785e48] text-white font-bold text-lg rounded-lg hover:bg-[#5a4b41] transition-colors duration-200">
        Make Guess
      </button>
    </div>
  );
}