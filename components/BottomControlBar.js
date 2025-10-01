// components/BottomControlBar.js
"use client";

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
  const yearNum = Number(year);
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
          <label className="text-white font-medium text-sm whitespace-nowrap">Year:</label>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              min="-3000"
              max="2025"
              className="flex-1 max-w-[120px] px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white font-mono text-center focus:border-yellow-500 focus:outline-none transition-colors"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 10px rgba(212, 175, 55, 0.3)',
              }}
            />
            <div className="flex gap-1">
              <button
                onClick={() => onAdjustYear(-10)}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
              >
                -10
              </button>
              <button
                onClick={() => onAdjustYear(-1)}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
              >
                -1
              </button>
              <button
                onClick={() => onAdjustYear(1)}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
              >
                +1
              </button>
              <button
                onClick={() => onAdjustYear(10)}
                className="px-2 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 hover:text-yellow-400 transition-colors text-sm font-medium"
              >
                +10
              </button>
            </div>
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
                color: Math.abs(year - era.value) < 100 ? '#d4af37' : '#9ca3af',
                border: '1px solid',
                borderColor: Math.abs(year - era.value) < 100
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
                e.currentTarget.style.borderColor = Math.abs(year - era.value) < 100
                  ? 'rgba(212, 175, 55, 0.5)'
                  : 'rgba(156, 163, 175, 0.15)';
                e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.color = Math.abs(year - era.value) < 100 ? '#d4af37' : '#9ca3af';
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
                {displayYear(year)}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Potential Score: </span>
              <span className="font-bold text-xl" style={{ color: '#d4af37', textShadow: '0 0 10px rgba(212, 175, 55, 0.3)' }}>
                {score.toLocaleString()}
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
