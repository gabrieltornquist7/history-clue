"use client";

// Historical eras with representative years
const historicalEras = [
  { label: 'Ancient', value: -2500, tooltip: '~3000 BCE - 500 CE' },
  { label: 'Classical', value: -300, tooltip: '~800 BCE - 500 CE' },
  { label: 'Medieval', value: 1000, tooltip: '~500 - 1500 CE' },
  { label: 'Renaissance', value: 1450, tooltip: '~1400 - 1600 CE' },
  { label: 'Enlightenment', value: 1700, tooltip: '~1650 - 1800 CE' },
  { label: 'Industrial', value: 1850, tooltip: '~1760 - 1900 CE' },
  { label: 'Modern', value: 1950, tooltip: '~1900 - 2000 CE' },
  { label: 'Contemporary', value: 2010, tooltip: '~2000 - Present' },
];

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

      {/* Historical Era Buttons */}
      <div className="space-y-3">
        <div className="text-xs text-gray-400 text-center font-medium uppercase tracking-wide">
          Jump to Historical Era
        </div>

        {/* Desktop: Era buttons in grid */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            {historicalEras.slice(0, 4).map((era) => (
              <button
                key={era.label}
                onClick={() => jumpToYear(era.value)}
                title={era.tooltip}
                className="relative px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 group"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: Math.abs(currentYear - era.value) < 100 ? '#d4af37' : '#9ca3af',
                  border: '1px solid',
                  borderColor: Math.abs(currentYear - era.value) < 100
                    ? 'rgba(212, 175, 55, 0.5)'
                    : 'rgba(156, 163, 175, 0.15)',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.color = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Math.abs(currentYear - era.value) < 100
                    ? 'rgba(212, 175, 55, 0.5)'
                    : 'rgba(156, 163, 175, 0.15)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.color = Math.abs(currentYear - era.value) < 100 ? '#d4af37' : '#9ca3af';
                }}
              >
                {era.label}

                {/* Tooltip on hover */}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/90 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                  {era.tooltip}
                </span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {historicalEras.slice(4).map((era) => (
              <button
                key={era.label}
                onClick={() => jumpToYear(era.value)}
                title={era.tooltip}
                className="relative px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 group"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: Math.abs(currentYear - era.value) < 100 ? '#d4af37' : '#9ca3af',
                  border: '1px solid',
                  borderColor: Math.abs(currentYear - era.value) < 100
                    ? 'rgba(212, 175, 55, 0.5)'
                    : 'rgba(156, 163, 175, 0.15)',
                  backdropFilter: 'blur(4px)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.color = '#d4af37';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = Math.abs(currentYear - era.value) < 100
                    ? 'rgba(212, 175, 55, 0.5)'
                    : 'rgba(156, 163, 175, 0.15)';
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.color = Math.abs(currentYear - era.value) < 100 ? '#d4af37' : '#9ca3af';
                }}
              >
                {era.label}

                {/* Tooltip on hover */}
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/90 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                  {era.tooltip}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile: Dropdown selector */}
        <div className="sm:hidden">
          <select
            onChange={(e) => jumpToYear(Number(e.target.value))}
            value={currentYear}
            className="w-full px-3 py-2 bg-black/50 border rounded-md text-white text-sm"
            style={{ borderColor: 'rgba(212, 175, 55, 0.3)' }}
          >
            <option value={currentYear}>Jump to Era...</option>
            {historicalEras.map(era => (
              <option key={era.label} value={era.value}>
                {era.label} ({era.tooltip})
              </option>
            ))}
          </select>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={() => jumpToYear(0)}
            className="px-4 py-1.5 bg-red-900 text-white rounded hover:bg-red-800 transition-colors text-xs font-bold border border-red-700/30"
          >
            RESET TO YEAR 0
          </button>
        </div>
      </div>
    </div>
  );
}