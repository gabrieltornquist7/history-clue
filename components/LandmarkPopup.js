// components/LandmarkPopup.js
"use client";

export default function LandmarkPopup({ landmark, onClose }) {
  if (!landmark) return null;

  return (
    <>
      {/* Backdrop - click to close */}
      <div 
        className="fixed inset-0 z-40"
        onClick={onClose}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      />

      {/* Popup Card */}
      <div 
        className="absolute z-50 rounded-lg shadow-2xl overflow-hidden animate-scale-in"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(400px, 90vw)',
          backgroundColor: '#1a1a1a',
          border: '2px solid #d4af37',
          boxShadow: '0 0 40px rgba(212, 175, 55, 0.4)'
        }}
      >
        {/* Header with Icon */}
        <div 
          className="px-6 py-4 flex items-center gap-3"
          style={{
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
            borderBottom: '1px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <span className="text-4xl">{landmark.icon}</span>
          <div className="flex-1">
            <h3 className="text-xl font-bold" style={{ color: '#d4af37' }}>
              {landmark.name}
            </h3>
            <p className="text-sm text-gray-400">
              {landmark.type} • {landmark.era}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-300 leading-relaxed">
            {landmark.description}
          </p>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-3 flex justify-end"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderTop: '1px solid rgba(212, 175, 55, 0.1)'
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 hover:scale-105"
            style={{
              backgroundColor: '#d4af37',
              color: '#1a1a1a'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
}
