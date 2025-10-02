// components/AvatarWithFrame.js
"use client";
import { getAvatarUrl } from '../lib/avatarHelpers';

// Frame styles based on frame ID
const FRAME_STYLES = {
  // Common Frames
  'frame_classic_bronze': {
    border: '3px solid #CD7F32',
    boxShadow: '0 0 15px rgba(205, 127, 50, 0.4), inset 0 0 10px rgba(205, 127, 50, 0.2)',
    animation: 'none'
  },
  'frame_simple_silver': {
    border: '3px solid #C0C0C0',
    boxShadow: '0 0 15px rgba(192, 192, 192, 0.4), inset 0 0 10px rgba(192, 192, 192, 0.2)',
    animation: 'none'
  },
  
  // Rare Frames
  'frame_ancient_gold': {
    border: '3px solid #FFD700',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), inset 0 0 15px rgba(255, 215, 0, 0.3)',
    animation: 'pulse-border'
  },
  'frame_explorer': {
    border: '3px solid #4A90E2',
    boxShadow: '0 0 20px rgba(74, 144, 226, 0.5), inset 0 0 15px rgba(74, 144, 226, 0.3)',
    animation: 'pulse-border'
  },
  'frame_scholar': {
    border: '3px solid #8B4513',
    boxShadow: '0 0 20px rgba(139, 69, 19, 0.5), inset 0 0 15px rgba(139, 69, 19, 0.3)',
    animation: 'pulse-border'
  },
  
  // Epic Frames
  'frame_royal_purple': {
    border: '4px solid #9B59B6',
    boxShadow: '0 0 25px rgba(155, 89, 182, 0.6), inset 0 0 20px rgba(155, 89, 182, 0.4)',
    animation: 'shimmer-border'
  },
  'frame_master_historian': {
    border: '4px solid #E74C3C',
    boxShadow: '0 0 25px rgba(231, 76, 60, 0.6), inset 0 0 20px rgba(231, 76, 60, 0.4)',
    animation: 'shimmer-border'
  },
  'frame_timeless': {
    border: '4px solid #1ABC9C',
    boxShadow: '0 0 25px rgba(26, 188, 156, 0.6), inset 0 0 20px rgba(26, 188, 156, 0.4)',
    animation: 'shimmer-border'
  },
  
  // Legendary Frames
  'frame_legendary_gold': {
    border: '5px solid #FFD700',
    boxShadow: '0 0 30px rgba(255, 215, 0, 0.8), 0 0 50px rgba(255, 215, 0, 0.4), inset 0 0 25px rgba(255, 215, 0, 0.5)',
    animation: 'legendary-glow-border'
  },
  'frame_eternal': {
    border: '5px solid #E8F5E9',
    boxShadow: '0 0 30px rgba(232, 245, 233, 0.8), 0 0 50px rgba(139, 195, 74, 0.4), inset 0 0 25px rgba(232, 245, 233, 0.5)',
    animation: 'legendary-glow-border'
  },
  'frame_founder_exclusive': {
    border: '5px solid #FF6B35',
    boxShadow: '0 0 35px rgba(255, 107, 53, 0.9), 0 0 60px rgba(255, 107, 53, 0.5), inset 0 0 30px rgba(255, 107, 53, 0.6)',
    animation: 'founder-glow-border'
  },
  
  // VIP Exclusive Frames
  'frame_vip_bronze': {
    border: '4px solid #CD7F32',
    boxShadow: '0 0 25px rgba(205, 127, 50, 0.7), 0 0 45px rgba(205, 127, 50, 0.3), inset 0 0 20px rgba(205, 127, 50, 0.4)',
    animation: 'shimmer-border'
  },
  'frame_vip_silver': {
    border: '4px solid #C0C0C0',
    boxShadow: '0 0 28px rgba(192, 192, 192, 0.8), 0 0 50px rgba(192, 192, 192, 0.4), inset 0 0 22px rgba(192, 192, 192, 0.5)',
    animation: 'shimmer-border'
  },
  'frame_vip_gold': {
    border: '5px solid #FFD700',
    boxShadow: '0 0 35px rgba(255, 215, 0, 0.9), 0 0 60px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.6)',
    animation: 'legendary-glow-border'
  }
};

export default function AvatarWithFrame({ 
  url, 
  frameId = null, 
  alt = "Avatar", 
  size = "w-10 h-10", 
  className = "" 
}) {
  const avatarUrl = getAvatarUrl(url);
  const frameStyle = frameId && FRAME_STYLES[frameId] ? FRAME_STYLES[frameId] : null;

  // Extract width/height classes or use defaults
  const sizeClasses = size.split(' ');
  const widthClass = sizeClasses.find(c => c.startsWith('w-')) || 'w-10';
  const heightClass = sizeClasses.find(c => c.startsWith('h-')) || 'h-10';

  return (
    <>
      <div
        className={`${widthClass} ${heightClass} rounded-full bg-gray-800 overflow-hidden flex-shrink-0 ${className} ${frameStyle?.animation || ''}`}
        style={{
          position: 'relative',
          ...(frameStyle && {
            border: frameStyle.border,
            boxShadow: frameStyle.boxShadow
          })
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={alt}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'w-full h-full flex items-center justify-center';
              fallback.innerHTML = '<span class="text-gray-500">👤</span>';
              e.target.parentElement.appendChild(fallback);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-gray-500">👤</span>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse-border {
          0%, 100% { 
            filter: brightness(1);
          }
          50% { 
            filter: brightness(1.2);
          }
        }

        @keyframes shimmer-border {
          0% { 
            filter: brightness(1) saturate(1);
          }
          50% { 
            filter: brightness(1.3) saturate(1.3);
          }
          100% { 
            filter: brightness(1) saturate(1);
          }
        }

        @keyframes legendary-glow-border {
          0%, 100% {
            filter: brightness(1) saturate(1);
            transform: scale(1);
          }
          50% {
            filter: brightness(1.4) saturate(1.4);
            transform: scale(1.02);
          }
        }

        @keyframes founder-glow-border {
          0%, 100% {
            filter: brightness(1) saturate(1);
            transform: scale(1) rotate(0deg);
          }
          50% {
            filter: brightness(1.5) saturate(1.5);
            transform: scale(1.03) rotate(1deg);
          }
        }

        .pulse-border {
          animation: pulse-border 3s ease-in-out infinite;
        }

        .shimmer-border {
          animation: shimmer-border 2.5s ease-in-out infinite;
        }

        .legendary-glow-border {
          animation: legendary-glow-border 2s ease-in-out infinite;
        }

        .founder-glow-border {
          animation: founder-glow-border 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
