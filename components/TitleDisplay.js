// components/TitleDisplay.js
"use client";
import { useEffect, useState } from 'react';

const RARITY_CONFIGS = {
  common: {
    textColor: '#9ca3af', // gray
    glowColor: 'rgba(156, 163, 175, 0.2)',
    icon: '📜',
    animation: 'none',
    fontSize: 'text-sm',
    fontWeight: 'font-medium'
  },
  rare: {
    textColor: '#60a5fa', // blue
    glowColor: 'rgba(96, 165, 250, 0.4)',
    icon: '⚔️',
    animation: 'pulse-soft',
    fontSize: 'text-sm',
    fontWeight: 'font-semibold'
  },
  epic: {
    textColor: '#a78bfa', // purple
    glowColor: 'rgba(167, 139, 250, 0.5)',
    icon: '✨',
    animation: 'shimmer',
    fontSize: 'text-base',
    fontWeight: 'font-bold'
  },
  legendary: {
    textColor: '#d4af37', // gold
    glowColor: 'rgba(212, 175, 55, 0.6)',
    icon: '👑',
    animation: 'legendary-glow',
    fontSize: 'text-base',
    fontWeight: 'font-bold'
  }
};

// Special title configurations (for unique titles like Founder)
const SPECIAL_TITLES = {
  'Founder': {
    textColor: '#FF6B35',
    glowColor: 'rgba(255, 107, 53, 0.6)',
    icon: '🔥',
    animation: 'founder-pulse',
    fontSize: 'text-base',
    fontWeight: 'font-bold'
  }
};

export default function TitleDisplay({ 
  title, 
  rarity = 'common', 
  showIcon = true, 
  size = 'default',
  animated = true 
}) {
  const [particles, setParticles] = useState([]);
  
  // Check if this is a special title
  const isSpecial = SPECIAL_TITLES[title];
  const config = isSpecial || RARITY_CONFIGS[rarity.toLowerCase()] || RARITY_CONFIGS.common;
  
  // Generate particles for legendary titles
  useEffect(() => {
    if (animated && (rarity.toLowerCase() === 'legendary' || isSpecial)) {
      const newParticles = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        delay: i * 0.2,
        left: Math.random() * 100
      }));
      setParticles(newParticles);
    }
  }, [rarity, animated, isSpecial]);

  const sizeClasses = size === 'large' 
    ? 'text-lg md:text-xl' 
    : size === 'small' 
    ? 'text-xs' 
    : config.fontSize;

  const animationClass = animated ? config.animation : '';

  return (
    <div className="relative inline-flex items-center gap-2 title-container">
      {/* Particles for legendary/special titles */}
      {animated && (rarity.toLowerCase() === 'legendary' || isSpecial) && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map(particle => (
            <div
              key={particle.id}
              className="absolute w-1 h-1 rounded-full bg-yellow-400 animate-float-up"
              style={{
                left: `${particle.left}%`,
                animationDelay: `${particle.delay}s`,
                opacity: 0.6
              }}
            />
          ))}
        </div>
      )}

      {/* Icon */}
      {showIcon && (
        <span 
          className={`title-icon ${animationClass}`}
          style={{ fontSize: size === 'large' ? '1.5rem' : size === 'small' ? '0.875rem' : '1rem' }}
        >
          {config.icon}
        </span>
      )}

      {/* Title Text */}
      <span
        className={`relative ${sizeClasses} ${config.fontWeight} ${animationClass} whitespace-nowrap`}
        style={{
          color: config.textColor,
          textShadow: `0 0 10px ${config.glowColor}, 0 0 20px ${config.glowColor}`,
          letterSpacing: '0.02em'
        }}
      >
        {title}
        
        {/* Extra glow for epic/legendary/special */}
        {animated && (rarity.toLowerCase() === 'epic' || rarity.toLowerCase() === 'legendary' || isSpecial) && (
          <span 
            className="absolute inset-0 blur-sm opacity-50"
            style={{
              color: config.textColor,
              textShadow: `0 0 15px ${config.glowColor}`
            }}
          >
            {title}
          </span>
        )}
      </span>

      {/* Rarity stars */}
      <div className="flex gap-0.5">
        {Array.from({ length: getRarityStars(rarity) }).map((_, i) => (
          <span
            key={i}
            className={animated ? "text-xs animate-twinkle" : "text-xs"}
            style={{
              color: config.textColor,
              animationDelay: `${i * 0.2}s`
            }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.02); }
        }

        @keyframes shimmer {
          0% { 
            filter: brightness(1) saturate(1);
          }
          50% { 
            filter: brightness(1.2) saturate(1.3);
          }
          100% { 
            filter: brightness(1) saturate(1);
          }
        }

        @keyframes legendary-glow {
          0%, 100% {
            filter: brightness(1) saturate(1);
            text-shadow: 0 0 10px ${config.glowColor}, 0 0 20px ${config.glowColor};
          }
          50% {
            filter: brightness(1.3) saturate(1.5);
            text-shadow: 0 0 15px ${config.glowColor}, 0 0 30px ${config.glowColor}, 0 0 40px ${config.glowColor};
          }
        }

        @keyframes founder-pulse {
          0%, 100% {
            filter: brightness(1) saturate(1);
            text-shadow: 0 0 10px ${config.glowColor}, 0 0 20px ${config.glowColor};
          }
          50% {
            filter: brightness(1.4) saturate(1.6);
            text-shadow: 0 0 20px ${config.glowColor}, 0 0 40px ${config.glowColor}, 0 0 60px ${config.glowColor};
          }
        }

        @keyframes float-up {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          100% {
            transform: translateY(-30px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .pulse-soft {
          animation: pulse-soft 3s ease-in-out infinite;
        }

        .shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }

        .legendary-glow {
          animation: legendary-glow 2.5s ease-in-out infinite;
        }

        .founder-pulse {
          animation: founder-pulse 2s ease-in-out infinite;
        }

        .animate-float-up {
          animation: float-up 2s ease-out infinite;
        }

        .animate-twinkle {
          animation: twinkle 1.5s ease-in-out infinite;
        }

        .title-icon {
          display: inline-block;
        }

        .title-icon.pulse-soft {
          animation: pulse-soft 3s ease-in-out infinite;
        }

        .title-icon.shimmer {
          animation: pulse-soft 2s ease-in-out infinite, shimmer 2s ease-in-out infinite;
        }

        .title-icon.legendary-glow {
          animation: pulse-soft 2.5s ease-in-out infinite, legendary-glow 2.5s ease-in-out infinite;
        }

        .title-icon.founder-pulse {
          animation: pulse-soft 2s ease-in-out infinite, founder-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function getRarityStars(rarity) {
  switch(rarity.toLowerCase()) {
    case 'common': return 0;
    case 'rare': return 2;
    case 'epic': return 3;
    case 'legendary': return 4;
    default: return 0;
  }
}
