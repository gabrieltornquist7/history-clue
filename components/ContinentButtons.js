// components/ContinentButtons.js
"use client";

const CONTINENTS = [
  { label: 'N.America', lat: 45.0, lng: -100.0 },
  { label: 'S.America', lat: -15.0, lng: -60.0 },
  { label: 'Europe', lat: 50.0, lng: 10.0 },
  { label: 'Africa', lat: 0.0, lng: 20.0 },
  { label: 'Asia', lat: 35.0, lng: 90.0 },
  { label: 'Oceania', lat: -25.0, lng: 135.0 },
];

export default function ContinentButtons({ onJumpToContinent }) {
  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 flex-wrap justify-center max-w-2xl">
      {CONTINENTS.map((continent) => (
        <button
          key={continent.label}
          onClick={() => onJumpToContinent({ lat: continent.lat, lng: continent.lng })}
          className="relative px-3 py-2 text-sm font-medium rounded transition-all duration-300 group backdrop-blur-lg"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#9ca3af',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.7)';
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.color = '#d4af37';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)';
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.color = '#9ca3af';
          }}
        >
          {continent.label}
        </button>
      ))}
    </div>
  );
}
