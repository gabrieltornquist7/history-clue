// components/ProfileView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import Image from 'next/image';

export default function ProfileView({ setView, session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarKey, setAvatarKey] = useState(Date.now()); // Used to force image refresh

  useEffect(() => {
    async function getProfileData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
        setProfile(profileData);

        const { data: statsData, error: statsError } = await supabase.rpc('get_player_stats', { p_user_id: user.id }).single();
        if(statsError) console.error("Error fetching stats:", statsError);
        setStats(statsData);
      }
      setLoading(false);
    }
    getProfileData();
  }, [session.user.id]);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('You must select an image to upload.');
      const { data: { user } } = await supabase.auth.getUser();
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Use a consistent file path to ensure overwriting the old avatar
      const filePath = `${user.id}.${fileExt}`;
      
      await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

      // **Important:** We now ONLY store the filePath in the database.
      await supabase.from('profiles').update({ avatar_url: filePath }).eq('id', user.id);
      
      setProfile(prev => ({...prev, avatar_url: filePath }));
      setAvatarKey(Date.now()); // Force the Image component to re-render with a new key

    } catch (error) { 
      alert(error.message); 
    } finally { 
      setUploading(false); 
    }
  };
  
  // This new logic correctly constructs the URL every time.
  let avatarSrc = 'https://placehold.co/128x128/fcf8f0/5a4b41?text=??';
  if (profile?.avatar_url) {
    const { data } = supabase.storage.from('avatars').getPublicUrl(profile.avatar_url);
    // We add a timestamp to the key of the Image component to force a fresh download.
    avatarSrc = data.publicUrl;
  }

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
            <label htmlFor="avatar-upload" className="mt-4 px-4 py-2 bg-sepia text-white text-sm font-semibold rounded-lg hover:bg-sepia-dark cursor-pointer">{uploading ? 'Uploading...' : 'Change Picture'}</label>
            <input id="avatar-upload" type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} className="hidden" />
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