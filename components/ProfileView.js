// components/ProfileView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProfileView({ setView, session }) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function getProfileData() {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .single();
        setProfile(profileData);
        const { data: scoresData } = await supabase
          .from('scores')
          .select('score')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setScores(scoresData || []);
      }
      setLoading(false);
    }
    getProfileData();
  }, []);

  const uploadAvatar = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0)
        throw new Error('You must select an image to upload.');
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const file = event.target.files[0],
        fileExt = file.name.split('.').pop(),
        filePath = `${user.id}-${Math.random()}.${fileExt}`;
      await supabase.storage.from('avatars').upload(filePath, file);
      await supabase
        .from('profiles')
        .update({ avatar_url: filePath })
        .eq('id', user.id);
      setProfile((prev) => ({ ...prev, avatar_url: filePath }));
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  const totalScore = scores.reduce((acc, s) => acc + s.score, 0);
  const averageScore =
    scores.length > 0 ? Math.round(totalScore / scores.length) : 0;
  const avatarSrc = profile?.avatar_url
    ? `https://bisjnzssegpfhkxaayuz.supabase.co/storage/v1/object/public/avatars/${profile.avatar_url}`
    : 'https://placehold.co/128x128/fcf8f0/5a4b41?text=??';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
      <header className="mb-8 text-center relative">
        <button
          onClick={() => setView('menu')}
          className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"
        >
          &larr; Menu
        </button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush">
          Profile
        </h1>
      </header>
      {loading ? (
        <div className="text-center text-sepia">Loading profile...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 flex flex-col items-center bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20">
            <img
              src={avatarSrc}
              alt="Avatar"
              className="w-32 h-32 rounded-full object-cover border-4 border-gold-rush mb-4"
            />
            <h2 className="text-2xl font-bold font-serif text-ink">
              {profile?.username || 'Anonymous'}
            </h2>
            <label
              htmlFor="avatar-upload"
              className="mt-4 px-4 py-2 bg-sepia text-white text-sm font-semibold rounded-lg hover:bg-sepia-dark cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Change Picture'}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              onChange={uploadAvatar}
              disabled={uploading}
              className="hidden"
            />
          </div>
          <div className="md:col-span-2 space-y-6">
            <div className="bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20">
              <h3 className="text-2xl font-serif font-bold text-ink mb-4">
                Player Stats
              </h3>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20">
                  <p className="text-3xl font-bold text-gold-rush">
                    {totalScore.toLocaleString()}
                  </p>
                  <p className="text-sm text-sepia">Total Score</p>
                </div>
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20">
                  <p className="text-3xl font-bold text-gold-rush">
                    {averageScore.toLocaleString()}
                  </p>
                  <p className="text-sm text-sepia">Average Score</p>
                </div>
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20">
                  <p className="text-3xl font-bold text-gold-rush">
                    {scores.length}
                  </p>
                  <p className="text-sm text-sepia">Games Played</p>
                </div>
                <div className="p-4 bg-parchment rounded-lg border border-sepia/20">
                  <p className="text-3xl font-bold text-gold-rush">???</p>
                  <p className="text-sm text-sepia">Highest Score</p>
                </div>
              </div>
            </div>
            <div className="bg-papyrus p-6 rounded-lg shadow-lg border border-sepia/20">
              <h3 className="text-2xl font-serif font-bold text-ink mb-4">
                Titles & Badges
              </h3>
              <p className="text-center text-sepia">(Coming Soon)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}