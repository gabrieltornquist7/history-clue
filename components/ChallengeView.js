// components/ChallengeView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChallengeView({ setView, session, setActiveChallengeId }) {
  const [tab, setTab] = useState('challenges');
  const [profiles, setProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const currentUserId = session.user.id;
  const refetchData = () => setDataVersion((v) => v + 1);
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .not('id', 'eq', currentUserId);
      setProfiles(profilesData || []);
      const { data: friendshipsData } = await supabase
        .from('friendships')
        .select(`*, user1:user_id_1(id, username), user2:user_id_2(id, username)`)
        .or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);
      setFriendships(friendshipsData || []);
      const { data: challengesData } = await supabase
        .from('challenges')
        .select(`*, challenger:challenger_id(username), opponent:opponent_id(username)`)
        .or(`challenger_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false });
      setChallenges(challengesData || []);
      setLoading(false);
    };
    fetchData();
  }, [currentUserId, dataVersion]);
  const friends = friendships.filter((f) => f.status === 'accepted'),
    friendProfiles = friends.map((f) =>
      f.user1.id === currentUserId ? f.user2 : f.user1
    ),
    friendIds = friendProfiles.map((p) => p.id);
  const pendingRequests = friendships.filter(
      (f) =>
        f.status === 'pending' &&
        f.user_id_2 === currentUserId &&
        f.action_user_id !== currentUserId
    ),
    sentRequests = friendships.filter(
      (f) => f.status === 'pending' && f.action_user_id === currentUserId
    ),
    sentRequestIds = sentRequests.map((f) => f.user_id_2);
  const nonFriendProfiles = profiles.filter(
    (p) =>
      !friendIds.includes(p.id) &&
      !sentRequestIds.includes(p.id) &&
      !pendingRequests.map((r) => r.user1.id).includes(p.id)
  );
  const handleAddFriend = async (profileId) => {
    const { error } = await supabase
      .from('friendships')
      .insert({
        user_id_1: currentUserId,
        user_id_2: profileId,
        action_user_id: currentUserId,
      });
    if (error) alert(error.message);
    else {
      alert('Friend request sent!');
      refetchData();
    }
  };
  const handleAcceptRequest = async (friendship) => {
    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted', action_user_id: currentUserId })
      .eq('id', friendship.id);
    if (error) alert(error.message);
    else {
      alert('Friend request accepted!');
      refetchData();
    }
  };
  const sendChallenge = async (opponentId) => {
    const { count } = await supabase
      .from('puzzles')
      .select('id', { count: 'exact', head: true });
    if (!count) return alert('Could not find any puzzles.');
    const randomIndex = Math.floor(Math.random() * count);
    const { data: puzzle } = await supabase
      .from('puzzles')
      .select('id')
      .range(randomIndex, randomIndex)
      .single();
    if (!puzzle) return alert('Error selecting a puzzle.');
    const { data: challenge, error } = await supabase
      .from('challenges')
      .insert({
        puzzle_id: puzzle.id,
        challenger_id: currentUserId,
        opponent_id: opponentId,
      })
      .select()
      .single();
    if (error) return alert('Could not create challenge: ' + error.message);
    setActiveChallengeId(challenge.id);
    setView('game');
  };
  const playChallenge = (challengeId) => {
    setActiveChallengeId(challengeId);
    setView('game');
  };
  const incomingChallenges = challenges.filter(
      (c) =>
        c.opponent_id === currentUserId &&
        c.status === 'pending' &&
        c.opponent_score === null
    ),
    outgoingChallenges = challenges.filter(
      (c) => c.challenger_id === currentUserId && c.status === 'pending'
    ),
    completedChallenges = challenges.filter((c) => c.status === 'completed');
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
          Challenge Mode
        </h1>
      </header>
      <div className="border-b border-sepia/20 mb-6">
        <nav className="flex space-x-6">
          <button
            onClick={() => setTab('challenges')}
            className={`py-3 px-1 font-semibold ${
              tab === 'challenges'
                ? 'text-gold-rush border-b-2 border-gold-rush'
                : 'text-sepia'
            }`}
          >
            My Challenges
          </button>
          <button
            onClick={() => setTab('find')}
            className={`py-3 px-1 font-semibold ${
              tab === 'find'
                ? 'text-gold-rush border-b-2 border-gold-rush'
                : 'text-sepia'
            }`}
          >
            Find Players
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`py-3 px-1 font-semibold relative ${
              tab === 'requests'
                ? 'text-gold-rush border-b-2 border-gold-rush'
                : 'text-sepia'
            }`}
          >
            Friend Requests{' '}
            {pendingRequests.length > 0 && (
              <span className="absolute top-2 -right-3 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </nav>
      </div>
      {loading ? (
        <div className="text-center text-sepia">Loading...</div>
      ) : (
        <div>
          {tab === 'challenges' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">
                  Incoming &amp; Pending
                </h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                  {incomingChallenges.length > 0 ? (
                    incomingChallenges.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 bg-parchment rounded-lg"
                      >
                        <span className="font-bold text-ink">
                          {c.challenger.username} challenged you!
                        </span>
                        <button
                          onClick={() => playChallenge(c.id)}
                          className="px-3 py-1 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800"
                        >
                          Play
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sepia">
                      You have no incoming challenges.
                    </p>
                  )}
                  {outgoingChallenges.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 bg-parchment rounded-lg"
                    >
                      <span className="font-bold text-ink">
                        Waiting for {c.opponent.username} to play...
                      </span>
                      <span className="text-sm text-sepia">
                        Your Score: {c.challenger_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">
                  Completed Challenges
                </h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                  {completedChallenges.length > 0 ? (
                    completedChallenges.map((c) => {
                      const won = c.winner_id === currentUserId,
                        lost =
                          c.winner_id !== null &&
                          c.winner_id !== currentUserId,
                        draw = c.winner_id === null;
                      return (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between p-2 bg-parchment rounded-lg ${
                            won ? 'border-2 border-green-500' : ''
                          } ${lost ? 'border-2 border-red-500' : ''}`}
                        >
                          <div>
                            <p className="font-bold text-ink">
                              {c.challenger.username} vs {c.opponent.username}
                            </p>
                            <p className="text-sm text-sepia">
                              {c.challenger_score} - {c.opponent_score}
                            </p>
                          </div>
                          {won && (
                            <span className="font-bold text-green-600">
                              You Won
                            </span>
                          )}
                          {lost && (
                            <span className="font-bold text-red-600">
                              You Lost
                            </span>
                          )}
                          {draw && (
                            <span className="font-bold text-sepia">Draw</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sepia">No completed challenges yet.</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">
                  Challenge a Friend
                </h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                  {friendProfiles.length > 0 ? (
                    friendProfiles.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-2 bg-parchment rounded-lg"
                      >
                        <span className="font-bold text-ink">
                          {friend.username}
                        </span>
                        <button
                          onClick={() => sendChallenge(friend.id)}
                          className="px-3 py-1 bg-sepia-dark text-white text-sm font-bold rounded-lg hover:bg-ink"
                        >
                          Challenge
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sepia">
                      You haven&apos;t added any friends yet. Go to the
                      &quot;Find Players&quot; tab.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {tab === 'find' && (
            <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
              {nonFriendProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-2 bg-parchment rounded-lg"
                >
                  <span className="font-bold text-ink">{profile.username}</span>
                  <button
                    onClick={() => handleAddFriend(profile.id)}
                    className="px-3 py-1 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800"
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
          {tab === 'requests' && (
            <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-2 bg-parchment rounded-lg"
                  >
                    <span className="font-bold text-ink">
                      {req.user1.username} sent you a request.
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(req)}
                        className="px-3 py-1 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sepia">
                  You have no pending friend requests.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}