// components/GlassBackButton.js
"use client";
import { useEffect, useState } from 'react';

export default function GlassBackButton({ onClick, fallbackUrl, className = '' }) {
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClick = (e) => {
    console.log('[GlassBackButton] Clicked!');
    e.preventDefault();
    e.stopPropagation();

    if (onClick && typeof onClick === 'function') {
      console.log('[GlassBackButton] Calling onClick');
      onClick();
    } else if (fallbackUrl) {
      console.log('[GlassBackButton] Using fallback URL:', fallbackUrl);
      window.location.href = fallbackUrl;
    } else {
      console.error('[GlassBackButton] No onClick handler or fallback URL provided');
    }
  };

  return (
    <button
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`fixed top-4 left-4 z-[9999] ${className}`}
      style={{
        // Safe area positioning for notch/status bar
        top: 'max(1rem, env(safe-area-inset-top, 1rem))',
        left: 'max(1rem, env(safe-area-inset-left, 1rem))',
        pointerEvents: 'auto',
      }}
    >
      <div
        className={`
          relative w-12 h-12 rounded-full
          flex items-center justify-center
          transition-all duration-200 ease-out
          ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
          ${isPressed ? 'scale-95' : 'hover:scale-105'}
        `}
        style={{
          backgroundColor: isPressed ? 'rgba(0, 0, 0, 0.45)' : 'rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Chevron Icon */}
        <svg
          className={`w-6 h-6 transition-opacity duration-200 ${
            isPressed ? 'opacity-100' : 'opacity-80 hover:opacity-100'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="white"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>

        {/* Ripple effect on press */}
        {isPressed && (
          <div
            className="absolute inset-0 rounded-full animate-ping"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              animationDuration: '400ms',
            }}
          />
        )}
      </div>
    </button>
  );
}