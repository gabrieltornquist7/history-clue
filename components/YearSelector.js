"use client";

export default function YearSelector({ year, setYear }) {
  // Start at 0
  const currentYear = year || 0;

  // Year adjustment buttons
  const adjustYear = (amount) => {
    const newYear = currentYear + amount;
    // Allow range from -3000 to 2025
    if (newYear >= -3000 && newYear <= 2025) {
      setYear(newYear);
    }
  };

  // Quick jump buttons
  const jumpToYear = (targetYear) => {
    setYear(targetYear);
  };

  // Format year display
  const formatYear = () => {
    if (currentYear < 0) {
      return `${Math.abs(currentYear)} BCE`;
    } else if (currentYear === 0) {
      return '0';
    } else {
      return `${currentYear} CE`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Year Display */}
      <div className="text-center">
        <div className="text-3xl font-bold text-white mb-2">
          {formatYear()}
        </div>
        <input
          type="number"
          min="-3000"
          max="2025"
          value={currentYear}
          onChange={(e) => {
            const val = parseInt(e.target.value) || 0;
            if (val >= -3000 && val <= 2025) {
              setYear(val);
            }
          }}
          className="w-32 px-3 py-2 bg-gray-900 text-white text-center rounded-md border border-gray-700/30 focus:border-yellow-500/50 focus:outline-none"
        />
      </div>

      {/* Fine Adjustment Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => adjustYear(-1000)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          -1000
        </button>
        <button
          onClick={() => adjustYear(-100)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          -100
        </button>
        <button
          onClick={() => adjustYear(-10)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          -10
        </button>
        <button
          onClick={() => adjustYear(-1)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          -1
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={() => adjustYear(1)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          +1
        </button>
        <button
          onClick={() => adjustYear(10)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          +10
        </button>
        <button
          onClick={() => adjustYear(100)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          +100
        </button>
        <button
          onClick={() => adjustYear(1000)}
          className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          +1000
        </button>
      </div>

      {/* Quick Jump Buttons */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => jumpToYear(-2000)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            2000 BCE
          </button>
          <button
            onClick={() => jumpToYear(-1500)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            1500 BCE
          </button>
          <button
            onClick={() => jumpToYear(-1000)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            1000 BCE
          </button>
          <button
            onClick={() => jumpToYear(-500)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            500 BCE
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => jumpToYear(0)}
            className="px-3 py-2 bg-red-900 text-white rounded hover:bg-red-800 transition-colors text-xs font-bold"
          >
            RESET
          </button>
          <button
            onClick={() => jumpToYear(500)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            500 CE
          </button>
          <button
            onClick={() => jumpToYear(1000)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            1000 CE
          </button>
          <button
            onClick={() => jumpToYear(1500)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            1500 CE
          </button>
          <button
            onClick={() => jumpToYear(2000)}
            className="px-3 py-2 bg-gray-900 text-yellow-500 rounded hover:bg-gray-800 transition-colors text-xs font-medium border border-gray-700/30"
          >
            2000 CE
          </button>
        </div>
      </div>
    </div>
  );
}