// components/GuessingInterface.js
export default function GuessingInterface({
  locations, selectedCountry, setSelectedCountry, selectedCity, setSelectedCity,
  selectedYear, setSelectedYear, handleGuessSubmit
}) {
  const handleCountryChange = (e) => {
    setSelectedCountry(e.target.value);
    setSelectedCity('');
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white bg-opacity-75 rounded-xl shadow-md border border-gray-200 grid grid-cols-2 gap-6">
      <div className="flex flex-col">
        <label htmlFor="country" className="mb-2 font-bold text-left text-stone-700">Country</label>
        <select id="country" value={selectedCountry} onChange={handleCountryChange} className="p-2 border border-gray-300 rounded-md">
          <option value="">Select Country...</option>
          {Object.keys(locations).sort().map((country) => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col">
        <label htmlFor="city" className="mb-2 font-bold text-left text-stone-700">City</label>
        <select id="city" value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedCountry} className="p-2 border border-gray-300 rounded-md disabled:bg-gray-200">
          <option value="">{selectedCountry ? 'Select City...' : 'Select a country first'}</option>
          {selectedCountry && locations[selectedCountry].sort().map((city) => (
            <option key={city} value={city}>{city}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col col-span-2">
        <label htmlFor="year" className="mb-2 font-bold text-left text-stone-700">Year: {selectedYear}</label>
        <input type="range" id="year" min="1800" max="2025" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} />
      </div>
      <button
        onClick={handleGuessSubmit}
        className="col-span-2 p-3 bg-stone-800 text-white font-bold text-lg rounded-lg hover:bg-stone-900 transition-colors duration-200">
        Make Guess
      </button>
    </div>
  );
}