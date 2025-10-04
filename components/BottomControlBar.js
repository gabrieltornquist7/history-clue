// components/BottomControlBar.js
"use client";

// Safe score formatter
const safeScore = (value) => {
  try {
    if (value === null || value === undefined || value === '' || typeof value === 'object') return '0';
    const numValue = Number(value);
    if (isNaN(numValue) || !isFinite(numValue)) return '0';
    return numValue.toLocaleString();
  } catch (error) {
    console.warn('safeScore error in BottomControlBar:', error, 'value:', value);
    return '0';
  }
};

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

const displayYear = (year) => {
  if (year === '' || year === '-') return '';
  const yearNum = Number(year);
  if (isNaN(yearNum)) return '';
  if (yearNum < 0) return `${Math.abs(yearNum)} BCE`;
  if (yearNum === 0) return `Year 0`;
  return `${yearNum} CE`;
};

export default function BottomControlBar({ 
  year, 
  onYearChange,
  onAdjustYear,
  onEraSelect, 
  score, 
  guessCoords,
  results,
  onMakeGuess 
}) {
  // Handle input changes - allow any text including just "-"
  const handleInputChange = (e) => {
    const value = e.target.value;
    
    // Allow empty string
    if (value === '') {
      onYearChange('');
      return;
    }
    
    // Allow just "-" for negative numbers
    if (value === '-') {
      onYearChange('-');
      return;
    }
    
    // Try to parse as number
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      // Clamp to valid range
      if (parsed >= -3000 && parsed <= 2025) {
        onYearChange(parsed);
      }
    }
  };

  // Handle CE button - make value positive
  const handleCE = () => {
    if (year === '' || year === '-') {
      onYearChange(1);
    } else {
      onYearChange(Math.abs(Number(year) || 1));
    }
  };

  // Handle BCE button - make value negative
  const handleBCE = () => {
    if (year === '' || year === '-') {
      onYearChange(-1);
    } else {
      onYearChange(-Math.abs(Number(year) || 1));
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10">
      <div 
        className="backdrop-blur-lg rounded-lg p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Year Controls */}
        <div className="flex items-center gap-4 mb-3">
          <label className="text-white font-medium text-sm whitespace-nowrap">Guess Year:</label>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={year}
              onChange={handleInputChange}
              placeholder="Enter year"
              className="flex-1 max-w-[140px] px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white font-mono text-center focus:border-yellow-500 focus:outline-none transition-colors placeholder-gray-600"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 10px rgba(212, 175, 55, 0.3)',
              }}
            />
            <button
              onClick={handleCE}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium border border-gray-700/30"
            >
              CE
            </button>
            <button
              onClick={handleBCE}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium border border-gray-700/30"
            >
              BCE
            </button>
          </div>
        </div>
        
        {/* Era Buttons */}
        <div className="flex gap-1 mb-3 flex-wrap">
          {historicalEras.map((era) => (
            <button
              key={era.label}
              onClick={() => onEraSelect(era.value)}
              title={era.tooltip}
              className="relative px-2 py-1 text-xs font-medium rounded transition-all duration-300 group"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                color: Math.abs((Number(year) || 0) - era.value) < 100 ? '#d4af37' : '#9ca3af',
                border: '1px solid',
                borderColor: Math.abs((Number(year) || 0) - era.value) < 100
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
                e.currentTarget.style.borderColor = Math.abs((Number(year) || 0) - era.value) < 100
                  ? 'rgba(212, 175, 55, 0.5)'
                  : 'rgba(156, 163, 175, 0.15)';
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.color = Math.abs((Number(year) || 0) - era.value) < 100 ? '#d4af37' : '#9ca3af';
              }}
            >
              {era.label}
            </button>
          ))}
        </div>
        
        {/* Guess Display & Submit */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-400">Your Guess: </span>
              <span className="font-bold" style={{ color: '#d4af37' }}>
                {displayYear(year) || '(no year set)'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Potential Score: </span>
              <span className="font-bold text-xl" style={{ color: '#d4af37', textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}>
                {safeScore(score)}
              </span>
            </div>
          </div>
          <button
            onClick={onMakeGuess}
            disabled={!guessCoords || !!results}
            className="px-6 py-3 font-bold text-white rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            style={{ 
              background: !guessCoords || !!results ? '#374151' : 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: '16px'
            }}
            onMouseEnter={(e) => {
              if (!e.target.disabled) {
                e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 10px 30px rgba(139, 0, 0, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          >
            {!guessCoords ? 'Place Pin on Map' : 'Make Guess'}
          </button>
        </div>
      </div>
    </div>
  );
}
