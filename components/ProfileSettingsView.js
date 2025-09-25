// components/ProfileSettingsView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProfileSettingsView({ setView, session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function getProfileData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, titles, selected_title')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
        setSelectedTitle(profileData?.selected_title || '');
      }
      setLoading(false);
    }
    getProfileData();
  }, [session.user.id]);

  const handleSave = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ selected_title: selectedTitle })
        .eq('id', user.id);
      
      if (error) {
        alert('Error updating title: ' + error.message);
      } else {
        alert('Title updated successfully!');
        setView('profile');
      }
    }
    setSaving(false);
  };

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
              onClick={() => setView('profile')}
              className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
              style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
            >
              ← Back to Profile
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
                Profile Settings
              </h1>
              <p 
                className="text-sm italic font-light"
                style={{ 
                  color: '#d4af37', 
                  opacity: 0.9, 
                  letterSpacing: '0.05em' 
                }}
              >
                Customize your profile • Manage preferences
              </p>
            </div>
            <div className="w-24"></div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading settings...</div>
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
        .slide-up {
          animation: slideUp 0.6s ease-out;
        }
      `}</style>

      {/* Header */}
      <header className="p-8 relative z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={() => setView('profile')}
            className="px-5 py-2.5 bg-gray-900 text-gray-300 font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 hover:text-white transition-all duration-300 relative group"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}
          >
            ← Back to Profile
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
              Profile Settings
            </h1>
            <p 
              className="text-sm italic font-light"
              style={{ 
                color: '#d4af37', 
                opacity: 0.9, 
                letterSpacing: '0.05em' 
              }}
            >
              Customize your profile • Manage preferences
            </p>
          </div>
          <div className="w-24"></div>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-2xl mx-auto">
          
          {/* Main Settings Card */}
          <div 
            className="backdrop-blur rounded-xl shadow-2xl border slide-up"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
            }}
          >
            <div className="p-8">
              <h2 
                className="text-xs font-semibold uppercase mb-8"
                style={{
                  color: '#d4af37',
                  opacity: 0.8,
                  letterSpacing: '0.15em'
                }}
              >
                Customize Your Profile
              </h2>
              
              {profile?.titles && profile.titles.length > 0 ? (
                <div className="space-y-6">
                  
                  {/* Current Selection Display */}
                  <div 
                    className="p-6 rounded-lg border"
                    style={{ 
                      backgroundColor: 'rgba(212, 175, 55, 0.1)',
                      border: '1px solid rgba(212, 175, 55, 0.3)'
                    }}
                  >
                    <h3 className="text-lg font-semibold text-white mb-2">Current Title</h3>
                    <p 
                      className="text-2xl font-serif"
                      style={{ color: '#d4af37' }}
                    >
                      &quot;{selectedTitle || 'No title selected'}&quot;
                    </p>
                  </div>

                  {/* Title Selection */}
                  <div className="space-y-4">
                    <label 
                      htmlFor="title-select" 
                      className="block text-sm font-semibold text-white mb-3"
                      style={{ letterSpacing: '0.02em' }}
                    >
                      Available Titles
                    </label>
                    
                    {/* Custom styled select */}
                    <div className="relative">
                      <select
                        id="title-select"
                        value={selectedTitle}
                        onChange={(e) => setSelectedTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 focus:border-yellow-500/50 focus:outline-none transition-all duration-300 appearance-none cursor-pointer"
                        style={{
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          letterSpacing: '-0.01em'
                        }}
                      >
                        {profile.titles.map(title => (
                          <option key={title} value={title} className="bg-gray-900 text-white py-2">
                            {title}
                          </option>
                        ))}
                      </select>
                      
                      {/* Custom dropdown arrow */}
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Preview of available titles */}
                    <div className="grid grid-cols-1 gap-3 mt-6">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Preview your unlocked titles:</h4>
                      {profile.titles.map(title => (
                        <div 
                          key={title}
                          onClick={() => setSelectedTitle(title)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                            selectedTitle === title 
                              ? 'border-yellow-500/50 bg-yellow-500/10' 
                              : 'border-gray-700/30 bg-gray-800/30 hover:border-gray-600/50 hover:bg-gray-800/50'
                          }`}
                        >
                          <span 
                            className={`font-medium ${
                              selectedTitle === title ? 'text-yellow-400' : 'text-gray-300'
                            }`}
                          >
                            &quot;{title}&quot;
                          </span>
                          {selectedTitle === title && (
                            <span className="ml-2 text-xs text-yellow-500">✓ Selected</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ 
                        background: saving ? 'rgba(139, 0, 0, 0.5)' : 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.02em',
                        boxShadow: saving ? 'none' : '0 10px 30px rgba(139, 0, 0, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        if (!saving) {
                          e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!saving) {
                          e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
                        }
                      }}
                    >
                      {saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                    
                    <button
                      onClick={() => setView('profile')}
                      className="px-6 py-3 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                      style={{
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.01em'
                      }}
                    >
                      Cancel
                      <div 
                        className="absolute bottom-0 left-6 right-6 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                        style={{ backgroundColor: '#d4af37' }}
                      ></div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-xl font-serif text-white mb-4">No Titles Yet</p>
                  <p className="text-gray-400 leading-relaxed max-w-md mx-auto">
                    You haven&apos;t unlocked any titles yet. Keep playing to earn achievements and unlock special titles to display on your profile!
                  </p>
                  <div className="mt-8">
                    <button
                      onClick={() => setView('menu')}
                      className="px-7 py-5 font-bold text-white rounded-md transition-all duration-300 relative group"
                      style={{ 
                        background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        letterSpacing: '-0.02em',
                        boxShadow: '0 10px 30px rgba(139, 0, 0, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.3)';
                      }}
                    >
                      Start Playing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tips Card */}
          {profile?.titles && profile.titles.length > 0 && (
            <div 
              className="mt-8 backdrop-blur rounded-xl shadow-2xl border slide-up"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="p-6">
                <h3 
                  className="text-xs font-semibold uppercase mb-4"
                  style={{
                    color: '#d4af37',
                    opacity: 0.8,
                    letterSpacing: '0.15em'
                  }}
                >
                  Tips
                </h3>
                <div className="space-y-3 text-sm text-gray-400">
                  <p>• Titles are earned by completing specific achievements</p>
                  <p>• Your selected title will be displayed on your profile and leaderboards</p>
                  <p>• Some titles are rarer than others - show off your accomplishments!</p>
                  <p>• You can change your title anytime from this settings page</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
