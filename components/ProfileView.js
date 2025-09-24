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
      
      setLoading(false);
    }
    if (profileId) {
        getProfileData();
    }
  }, [profileId, avatarKey]);

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

  let avatarSrc = 'https://placehold.co/128x128/fcf8f0/5a4b41?text=??';
  if (profile?.avatar_url) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
    avatarSrc = data.publicUrl;
  }

  const isOwnProfile = session.user.id === profileId;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button onClick={() => setView('menu')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">&larr; Menu</button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">Profile</h1>
      </header>
      {loading ? <div className="text-center text-sepia">Loading profile...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 flex flex-col items-center bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20">
            <Image key={avatarKey} src={avatarSrc} alt="Avatar" width={128} height={128} className="w-32 h-32 rounded-full object-cover border-4 border-gold-rush mb-4"/>
            <h2 className="text-2xl font-bold font-serif text-ink">{profile?.username || 'Anonymous'}</h2>
            
            {profile?.selected_title && (
              <p className="text-sm text-sepia mt-1">{profile.selected_title}</p>
            )}
            
            <div className="w-full mt-4 text-center">
              <p className="text-lg font-bold text-ink">Level {profile?.level || 1}</p>
              <div className="w-full bg-sepia/20 rounded-full h-4 my-2 overflow-hidden border border-sepia/30 shadow-inner">
                <div 
                  className="bg-gold-rush h-4 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(((profile?.xp || 0) / xpForLevel(profile?.level)) * 100, 100)}%` }}
                ></div>
              </div>
              <p className="text-sm text-sepia">
                {(profile?.xp || 0).toLocaleString()} / {xpForLevel(profile?.level).toLocaleString()} XP
              </p>
            </div>
            
            {isOwnProfile && (
                <>
                    <label htmlFor="avatar-upload" className="mt-4 px-4 py-2 bg-sepia text-white text-sm font-semibold rounded-lg hover:bg-sepia-dark cursor-pointer">{uploading ? 'Uploading...' : 'Change Picture'}</label>
                    <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
                </>
            )}

            {profile?.is_founder && (
              <div className="mt-4 text-center text-sm text-sepia">
                  <p>Contact: <a href="mailto:your-email@example.com" className="text-gold-rush hover:underline">your-email@example.com</a></p>
              </div>
            )}
             {isOwnProfile && (
                <button
                onClick={() => setView('profileSettings')}
                className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-300"
                >
                Settings
                </button>
             )}
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20">
              <h3 className="text-2xl font-serif font-bold text-ink mb-4">Player Stats</h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20"><p className="text-3xl font-bold text-gold-rush">{(stats?.total_score || 0).toLocaleString()}</p><p className="text-sm text-sepia">Total Score</p></div>
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20"><p className="text-3xl font-bold text-gold-rush">{Math.round(stats?.average_score || 0).toLocaleString()}</p><p className="text-sm text-sepia">Average Score</p></div>
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20"><p className="text-3xl font-bold text-gold-rush">{stats?.games_played || 0}</p><p className="text-sm text-sepia">Games Played</p></div>
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20"><p className="text-3xl font-bold text-gold-rush">{stats?.wins || 0} - {stats?.losses || 0} - {stats?.draws || 0}</p><p className="text-sm text-sepia">W - L - D</p></div>
              </div>
            </div>
            <div className="bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20"><h3 className="text-2xl font-serif font-bold text-ink mb-4">Titles & Badges</h3><p className="text-center text-sepia">(Coming Soon)</p></div>
          </div>
        </div>
      )}
    </div>
  );
}