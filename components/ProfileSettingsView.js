// components/ProfileSettingsView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProfileSettingsView({ setView, session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');

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
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-ink text-2xl font-serif">Loading settings...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button onClick={() => setView('profile')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm">&larr; Back to Profile</button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">Profile Settings</h1>
      </header>
      
      <div className="bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20">
        <h2 className="text-2xl font-serif font-bold text-ink mb-4">Customize Your Profile</h2>
        
        {profile?.titles && profile.titles.length > 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="title-select" className="block text-sm font-bold mb-1 text-ink">
                Selected Title
              </label>
              <select
                id="title-select"
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                className="w-full p-2 border border-sepia/40 rounded bg-parchment text-ink focus:ring-2 focus:ring-sepia-dark"
              >
                {profile.titles.map(title => (
                  <option key={title} value={title}>{title}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-md"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-sepia">You have no titles to select from yet. Keep playing to unlock them!</p>
        )}
      </div>
    </div>
  );
}