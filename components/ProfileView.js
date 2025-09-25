// components/ProfileView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function ProfileView({ setView, session, userId = null }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now());
  const [streak, setStreak] = useState(0);

  const profileId = userId || session.user.id;

  useEffect(() => {
    async function getProfileData() {
      setLoading(true);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, xp, level, is_founder, titles, selected_title')
        .eq('id', profileId)
        .single();
      setProfile(profileData);

      const { data: statsData, error: statsError } = await supabase.rpc('get_player_stats', { p_user_id: profileId }).single();
      if(statsError) console.error("Error fetching stats:", statsError);
      setStats(statsData);

      // Fetch streak data
      if (session.user.id === profileId) {
        const { data: streakData } = await supabase
          .from("streaks")
          .select("streak_count")
          .eq("user_id", profileId)
          .single();
        if (streakData) {
          setStreak(streakData.streak_count);
        }
      }
      
      setLoading(false);
    }
    if (profileId) {
        getProfileData();
    }
  }, [profileId, avatarKey, session.user.id]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('You must select an image to upload.');
      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}.${fileExt}`;
      
      await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      await supabase.from('profiles').update({ avatar_url: filePath }).eq('id', user.id);
      
      setAvatarKey(Date.now());

    } catch (error) { 
      alert(error.message); 
    } finally { 
      setUploading(false); 
    }
  };
  
  const xpForLevel = (level) => {
    return Math.floor(1000 * Math.pow(level || 1, 1.5));
  };

  const getNextLevelXP = (level) => {
    return Math.floor(1000 * Math.pow((level || 1) + 1, 1.5));
  };

  let avatarSrc = 'https://placehold.co/128x128/fcf8f0/5a4b41?text=??';
  if (profile?.avatar_url) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
    avatarSrc = data.publicUrl;
  }

  const isOwnProfile = session.user.id === profileId;
  const currentXP = profile?.xp || 0;
  const currentLevel = profile?.level || 1;
  const xpForCurrentLevel = xpForLevel(currentLevel);
  const xpForNextLevel = getNextLevelXP(currentLevel);
  const xpProgress = ((currentXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  // Mock badges data (replace with real data when implemented)
  const mockBadges = [
    { id: 'first_win', name: 'First Victory', unlocked: true, icon: '🏆' },
    { id: 'streak_5', name: '5 Day Streak', unlocked: streak >= 5, icon: '🔥' },
    { id: 'high_scorer', name: 'High Scorer', unlocked: (stats?.total_score || 0) > 10000, icon: '⭐' },
    { id: 'social_player', name: 'Social Player', unlocked: false, icon: '👥' },
    { id: 'puzzle_master', name: 'Puzzle Master', unlocked: false, icon: '🧩' },
    { id: 'speed_demon', name: 'Speed Demon', unlocked: false, icon: '⚡' }
  ];

  if (loading) {
    return (
      <div 
        className="min-h-screen relative"
        style={{
          background: `
            linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
            radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
          `,
          backgroundBlendMode: "overlay",
        }}
      >
        {/* Metallic shine overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
            backgroundSize: "200% 200%",
            animation: "shine 12s linear infinite",
          }}
        ></div>

        <style jsx>{`
          @keyframes shine {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>

        <header className="p-8 relative z-10">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <button
              onClick={() => setView('menu')}
              className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
            >
              ← Menu
              <div 
                className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{ backgroundColor: '#d4af37' }}
              ></div>
            </button>
            <div className="text-center flex-1 mx-8">
              <h1 
                className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2" 
                style={{ 
                  letterSpacing: '0.02em',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                }}
              >
                Profile
              </h1>
              <p 
                className="text-sm italic font-light"
                style={{ 
                  color: '#d4af37', 
                  opacity: 0.9, 
                  letterSpacing: '0.05em' 
                }}
              >
                Player statistics • Achievements • Progress
              </p>
            </div>
            <div className="w-24"></div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading profile...</div>
            <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: `
          linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
          radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
        `,
        backgroundBlendMode: "overlay",
      }}
    >
      {/* Metallic shine overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(115deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)",
          backgroundSize: "200% 200%",
          animation: "shine 12s linear infinite",
        }}
      ></div>

      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(212, 175, 55, 0.3); }
          50% { box-shadow: 0 0 30px rgba(212, 175, 55, 0.5); }
        }
        .slide-up {
          animation: slideUp 0.6s ease-out;
        }
        .level-glow {
          animation: glow 3s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <header className="p-8 relative z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => setView('menu')}
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
          >
            ← Menu
            <div 
              className="absolute bottom-0 left-5 right-5 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
              style={{ backgroundColor: '#d4af37' }}
            ></div>
          </button>
          <div className="text-center flex-1 mx-8">
            <h1 
              className="text-4xl sm:text-5xl font-serif font-bold text-white mb-2" 
              style={{ 
                letterSpacing: '0.02em',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
              }}
            >
              Profile
            </h1>
            <p 
              className="text-sm italic font-light"
              style={{ 
                color: '#d4af37', 
                opacity: 0.9, 
                letterSpacing: '0.05em' 
              }}
            >
              Player statistics • Achievements • Progress
            </p>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div 
              className="backdrop-blur rounded-xl shadow-2xl border slide-up level-glow"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '2px solid rgba(212, 175, 55, 0.3)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="p-6 text-center">
                {/* Avatar */}
                <div className="relative mx-auto mb-4">
                  <div 
                    className="w-32 h-32 rounded-full p-1 mx-auto"
                    style={{ 
                      background: 'linear-gradient(45deg, #d4af37 0%, #f4e376 50%, #d4af37 100%)',
                      boxShadow: '0 0 30px rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <Image 
                      key={avatarKey} 
                      src={avatarSrc} 
                      alt="Avatar" 
                      width={120} 
                      height={120} 
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                  {isOwnProfile && (
                    <label 
                      htmlFor="avatar-upload" 
                      className="absolute bottom-0 right-0 w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center cursor-pointer border-2 border-gray-700 hover:border-yellow-500 transition-all duration-300"
                    >
                      <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                    </label>
                  )}
                </div>

                {/* Username & Title */}
                <h2 
                  className="text-2xl font-serif font-bold text-white mb-1"
                  style={{ textShadow: '0 0 15px rgba(212, 175, 55, 0.3)' }}
                >
                  {profile?.username || 'Anonymous'}
                </h2>
                
                {profile?.selected_title && (
                  <p 
                    className="text-sm mb-4"
                    style={{ color: '#d4af37', opacity: 0.9 }}
                  >
                    "&ldquo;{profile.selected_title}&rdquo;
"
                  </p>
                )}

                {/* Level & XP */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div 
                      className="px-4 py-2 rounded-lg border"
                      style={{ 
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        border: '1px solid rgba(212, 175, 55, 0.3)'
                      }}
                    >
                      <span 
                        className="text-lg font-bold"
                        style={{ color: '#d4af37' }}
                      >
                        Level {currentLevel}
                      </span>
                    </div>
                    {session.user.id === profileId && streak > 0 && (
                      <div 
                        className="px-3 py-1 rounded-lg border flex items-center gap-1"
                        style={{ 
                          backgroundColor: 'rgba(255, 100, 50, 0.1)',
                          border: '1px solid rgba(255, 100, 50, 0.3)'
                        }}
                      >
                        <span className="text-sm">🔥</span>
                        <span className="text-sm font-bold text-orange-400">{streak}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* XP Progress Bar */}
                  <div 
                    className="w-full h-3 rounded-full overflow-hidden border"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${Math.max(5, Math.min(xpProgress, 100))}%`,
                        background: 'linear-gradient(90deg, #d4af37 0%, #f4e376 50%, #d4af37 100%)',
                        boxShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{currentXP.toLocaleString()} XP</span>
                    <span>Next: {xpForNextLevel.toLocaleString()} XP</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  {isOwnProfile && (
                    <button
                      onClick={() => setView('profileSettings')}
                      className="w-full px-4 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Settings
                      <div 
                        className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                        style={{ backgroundColor: '#d4af37' }}
                      ></div>
                    </button>
                  )}
                </div>

                {/* Contact Info for Founders */}
                {profile?.is_founder && (
                  <div className="mt-6 pt-4 border-t border-gray-700/30">
                    <p className="text-xs text-gray-500 mb-1">Contact</p>
                    <a 
                      href="mailto:GABRIEL.TORNQUIST@HISTORYCLUE.COM" 
                      className="text-sm hover:underline transition-colors"
                      style={{ color: '#d4af37' }}
                    >
                      GABRIEL.TORNQUIST@HISTORYCLUE.COM
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats & Achievements */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Player Stats */}
            <div 
              className="backdrop-blur rounded-xl shadow-2xl border slide-up"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="p-6">
                <h3 
                  className="text-xs font-semibold uppercase mb-6"
                  style={{
                    color: '#d4af37',
                    opacity: 0.8,
                    letterSpacing: '0.15em'
                  }}
                >
                  Player Stats
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* Total Score - Featured */}
                  <div 
                    className="col-span-2 lg:col-span-2 p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                    style={{ 
                      backgroundColor: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <p 
                      className="text-3xl font-bold mb-1"
                      style={{ 
                        color: '#d4af37',
                        textShadow: '0 0 15px rgba(212, 175, 55, 0.3)'
                      }}
                    >
                      {(stats?.total_score || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400 uppercase tracking-wider">Total Score</p>
                    {(stats?.total_score || 0) > 50000 && (
                      <p className="text-xs text-yellow-400 mt-1">🏆 High Achiever</p>
                    )}
                  </div>

                  {/* Other Stats */}
                  <div 
                    className="p-4 rounded-lg border transition-all duration-300 hover:border-gray-600/50"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <p className="text-2xl font-bold text-white mb-1">
                      {Math.round(stats?.average_score || 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400 uppercase tracking-wider">Average Score</p>
                  </div>

                  <div 
                    className="p-4 rounded-lg border transition-all duration-300 hover:border-gray-600/50"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <p className="text-2xl font-bold text-white mb-1">{stats?.games_played || 0}</p>
                    <p className="text-sm text-gray-400 uppercase tracking-wider">Games Played</p>
                  </div>

                  <div 
                    className="col-span-2 lg:col-span-2 p-4 rounded-lg border transition-all duration-300 hover:border-gray-600/50"
                    style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}
                  >
                    <p className="text-2xl font-bold text-white mb-1">
                      {stats?.wins || 0} - {stats?.losses || 0} - {stats?.draws || 0}
                    </p>
                    <p className="text-sm text-gray-400 uppercase tracking-wider">Win - Loss - Draw</p>
                    {(stats?.wins || 0) > 0 && (
                      <p className="text-xs text-green-400 mt-1">
                        {Math.round(((stats?.wins || 0) / ((stats?.wins || 0) + (stats?.losses || 0) + (stats?.draws || 0))) * 100)}% Win Rate
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Badges & Achievements */}
            <div 
              className="backdrop-blur rounded-xl shadow-2xl border slide-up"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="p-6">
                <h3 
                  className="text-xs font-semibold uppercase mb-6"
                  style={{
                    color: '#d4af37',
                    opacity: 0.8,
                    letterSpacing: '0.15em'
                  }}
                >
                  Achievements & Badges
                </h3>
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
                  {mockBadges.map(badge => (
                    <div 
                      key={badge.id}
                      className={`p-4 rounded-lg border text-center transition-all duration-300 ${
                        badge.unlocked 
                          ? 'hover:border-yellow-500/30' 
                          : 'opacity-40 hover:opacity-60'
                      }`}
                      style={{ 
                        backgroundColor: badge.unlocked 
                          ? 'rgba(212, 175, 55, 0.1)' 
                          : 'rgba(0, 0, 0, 0.5)',
                        border: badge.unlocked 
                          ? '1px solid rgba(212, 175, 55, 0.3)'
                          : '1px solid rgba(255, 255, 255, 0.05)'
                      }}
                    >
                      <div className="text-2xl mb-2">{badge.icon}</div>
                      <p className={`text-xs font-medium ${
                        badge.unlocked ? 'text-white' : 'text-gray-500'
                      }`}>
                        {badge.name}
                      </p>
                      {badge.unlocked && (
                        <div 
                          className="w-2 h-2 rounded-full mx-auto mt-1"
                          style={{ backgroundColor: '#d4af37' }}
                        ></div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-center text-gray-500 text-sm mt-6">
                  Unlocked badges will appear here as you achieve milestones
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}