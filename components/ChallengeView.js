// components/ChallengeView.js
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChallengeView({ setView, session, setActiveChallenge, setActiveLiveMatch }) {
  const [tab, setTab] = useState('challenges');
  const [profiles, setProfiles] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const currentUserId = session?.user?.id;
  const refetchData = () => setDataVersion((v) => v + 1);

  useEffect(() => {
    if (!currentUserId) {
        setLoading(false);
        return;
    }
      
    const fetchData = async () => {
      setLoading(true);
      const { data: selfProfile } = await supabase.from('profiles').select('username').eq('id', currentUserId).single();
      setCurrentUserProfile(selfProfile);
      
      const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url').not('id', 'eq', currentUserId);
      setProfiles(profilesData || []);
      const { data: friendshipsData } = await supabase.from('friendships').select(`*, user1:user_id_1(id, username), user2:user_id_2(id, username)`).or(`user_id_1.eq.${currentUserId},user_id_2.eq.${currentUserId}`);
      setFriendships(friendshipsData || []);
      const { data: challengesData } = await supabase.from('challenges').select(`*, challenger:challenger_id(id, username), opponent:opponent_id(id, username)`).or(`challenger_id.eq.${currentUserId},opponent_id.eq.${currentUserId}`).order('created_at', { ascending: false });
      setChallenges(challengesData || []);
      setLoading(false);
    };
    fetchData();

    const channel = supabase.channel('online-users');
    channel.on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const onlineUserIds = Object.values(presenceState).flat().map(p => p.user_id);
        setOnlineFriends(onlineUserIds);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: session.user.id });
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, dataVersion, session?.user?.id]);

  const startLiveMatch = async (opponentId) => {
    const { data: matchId, error } = await supabase.rpc('create_live_match', { opponent_id: opponentId });
    if (error) {
        return alert('Error creating match: ' + error.message);
    }
    
    const inviteChannel = supabase.channel(`invites:${opponentId}`);
    inviteChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await inviteChannel.send({
                type: 'broadcast',
                event: 'live_invite',
                payload: { matchId, from_username: currentUserProfile?.username || 'A player' },
            });
            supabase.removeChannel(inviteChannel);
        }
    });
    setActiveLiveMatch(matchId);
    setView('liveGame');
  };

  const friends = friendships.filter((f) => f.status === 'accepted');
  const friendProfiles = friends.map((f) => (f.user1.id === currentUserId ? f.user2 : f.user1));
  
  const onlineFriendProfiles = friendProfiles.filter(p => onlineFriends.includes(p.id));
  const offlineFriendProfiles = friendProfiles.filter(p => !onlineFriends.includes(p.id));
  
  const friendIds = friendProfiles.map(p => p.id);
  
  const pendingRequests = friendships.filter((f) => f.status === 'pending' && f.user_id_2 === currentUserId && f.action_user_id !== currentUserId);
  const sentRequests = friendships.filter((f) => f.status === 'pending' && f.action_user_id === currentUserId);
  const sentRequestIds = sentRequests.map((f) => f.user_id_2);
  const nonFriendProfiles = profiles.filter((p) => !friendIds.includes(p.id) && !sentRequestIds.includes(p.id) && !pendingRequests.map((r) => r.user1.id).includes(p.id));
  
  // Filter profiles based on search query
  const filteredNonFriendProfiles = nonFriendProfiles.filter(profile =>
    profile.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFriend = async (profileId) => {
    const { error } = await supabase.from('friendships').insert({ user_id_1: currentUserId, user_id_2: profileId, action_user_id: currentUserId, });
    if (error) alert(error.message); else { alert('Friend request sent!'); refetchData(); }
  };
  const handleAcceptRequest = async (friendship) => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted', action_user_id: currentUserId }).eq('id', friendship.id);
    if (error) alert(error.message); else { alert('Friend request accepted!'); refetchData(); }
  };
  const sendChallenge = async (opponentId) => {
    const { data: puzzles, error: puzzleError } = await supabase.rpc('get_random_puzzles', { limit_count: 3 });
    if (puzzleError || !puzzles || puzzles.length < 3) { console.error('Error fetching puzzles:', puzzleError); return alert('Could not find enough puzzles to start a challenge.'); }
    const puzzleIds = puzzles.map(p => p.id);
    const { data: challenge, error } = await supabase.from('challenges').insert({ puzzle_ids: puzzleIds, challenger_id: currentUserId, opponent_id: opponentId, next_player_id: currentUserId, challenger_scores: [], opponent_scores: [], }).select(`*, challenger:challenger_id(username), opponent:opponent_id(username)`).single();
    if (error) { return alert('Could not create challenge: ' + error.message); }
    setActiveChallenge(challenge);
    setView('game');
  };
  const playChallenge = (challenge) => { setActiveChallenge(challenge); setView('game'); };
  
  const getChallengeStatus = (c) => {
    const challengerWins = (c.challenger_scores || []).filter((s, i) => s > (c.opponent_scores || [])[i]).length;
    const opponentWins = (c.opponent_scores || []).filter((s, i) => s > (c.challenger_scores || [])[i]).length;
    
    if (c.status === 'completed') {
        if (c.winner_id === currentUserId) {
            return { text: `You Won ${challengerWins}-${opponentWins}`, color: 'text-emerald-400' };
        } else if (c.winner_id) {
            return { text: `You Lost ${opponentWins}-${challengerWins}`, color: 'text-red-400' };
        } else {
            return { text: `Draw ${challengerWins}-${opponentWins}`, color: 'text-gray-400' };
        }
    }
    
    const opponentName = c.challenger_id === currentUserId ? c.opponent?.username : c.challenger?.username;

    if (c.next_player_id === currentUserId) {
        return { 
          text: `Your turn against ${opponentName}! Round ${c.current_round}`, 
          button: (
            <button 
              onClick={() => playChallenge(c)} 
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 shadow-lg hover:shadow-pink-500/25"
            >
              Play
            </button>
          )
        };
    } else {
        return { text: `Waiting for ${opponentName}... Round ${c.current_round}` };
    }
  };

  const incomingChallenges = challenges.filter(c => c.status === 'pending' && c.next_player_id === currentUserId);
  const outgoingChallenges = challenges.filter(c => c.status === 'pending' && c.next_player_id !== currentUserId);
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  const handleInvite = () => {
    const inviteLink = `${window.location.origin}?ref=${currentUserId}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      alert('Invite link copied to clipboard!');
    });
  };

  const tabs = [
    { id: 'challenges', label: 'My Matches', count: incomingChallenges.length },
    { id: 'find', label: 'Find Players' },
    { id: 'requests', label: 'Friend Requests', count: pendingRequests.length }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent"></div>
      <div className="absolute top-0 left-1/2 w-96 h-96 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl transform -translate-x-1/2 animate-pulse"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <header className="mb-8 text-center relative">
          <button 
            onClick={() => setView('menu')} 
            className="absolute left-0 top-1/2 -translate-y-1/2 px-6 py-3 bg-black/50 backdrop-blur-sm border border-gray-700/50 text-white font-bold rounded-xl hover:bg-black/70 transition-all duration-200 shadow-lg hover:shadow-xl"
          > 
            ← Menu 
          </button>
          <h1 className="text-5xl font-serif font-bold bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg"> 
            Friend Matches 
          </h1>
          <button
            onClick={handleInvite}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-black font-bold rounded-xl hover:from-amber-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-amber-500/25"
          >
            Invite Friend
          </button>
        </header>

        {/* Tab Navigation */}
        <div className="mb-8 flex justify-center">
          <div className="bg-black/30 backdrop-blur-lg rounded-2xl p-2 border border-gray-700/50">
            <div className="flex space-x-2">
              {tabs.map((tabItem) => (
                <button
                  key={tabItem.id}
                  onClick={() => setTab(tabItem.id)}
                  className={`relative px-6 py-3 font-bold rounded-xl transition-all duration-200 ${
                    tab === tabItem.id
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xs uppercase tracking-wider">{tabItem.label}</span>
                  {tabItem.count > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-red-500 to-pink-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
                      {tabItem.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
            <p className="mt-4 text-gray-400">Loading matches...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {tab === 'challenges' && (
              <div className="space-y-8">
                {/* Online Friends */}
                <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Online Friends</h3>
                  <div className="space-y-3">
                    {onlineFriendProfiles.length > 0 ? (
                      onlineFriendProfiles.map(friend => (
                        <div key={friend.id} className="bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 rounded-lg p-4 border border-gray-700/30 hover:border-gray-600/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">{friend.username[0].toUpperCase()}</span>
                                </div>
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-gray-900 rounded-full"></span>
                              </div>
                              <span className="font-bold text-white">{friend.username}</span>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => startLiveMatch(friend.id)} 
                                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 shadow-lg hover:shadow-pink-500/25"
                              >
                                Live Battle
                              </button>
                              <button 
                                onClick={() => sendChallenge(friend.id)} 
                                className="px-4 py-2 bg-gray-700 border border-gray-600 text-white text-sm font-bold rounded-lg hover:bg-gray-600 hover:border-amber-500/50 transition-all duration-200"
                              >
                                Challenge
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center py-8">No friends are currently online.</p>
                    )}
                  </div>
                </section>

                {/* Offline Friends */}
                <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Offline Friends</h3>
                  <div className="space-y-3">
                    {offlineFriendProfiles.length > 0 ? (
                      offlineFriendProfiles.map(friend => (
                        <div key={friend.id} className="bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 rounded-lg p-4 border border-gray-700/30 hover:border-gray-600/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-bold text-white">{friend.username[0].toUpperCase()}</span>
                                </div>
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 border-2 border-gray-900 rounded-full"></span>
                              </div>
                              <span className="font-bold text-gray-300">{friend.username}</span>
                            </div>
                            <button 
                              onClick={() => sendChallenge(friend.id)} 
                              className="px-4 py-2 bg-gray-700 border border-gray-600 text-white text-sm font-bold rounded-lg hover:bg-gray-600 hover:border-amber-500/50 transition-all duration-200"
                            >
                              Challenge
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400 text-center py-8">No offline friends to challenge.</p>
                    )}
                  </div>
                </section>

                {/* Your Turn */}
                <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Your Turn</h3>
                  <div className="space-y-3">
                    {incomingChallenges.length > 0 ? (
                      incomingChallenges.map(c => {
                        const status = getChallengeStatus(c);
                        const opponentName = c.challenger_id === currentUserId ? c.opponent?.username : c.challenger?.username;
                        return (
                          <div key={c.id} className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-amber-300">Your turn against {opponentName}! Round {c.current_round}</span>
                              {status.button}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-center py-8">No matches waiting for your turn.</p>
                    )}
                  </div>
                </section>

                {/* Waiting for Opponent */}
                <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Waiting for Opponent</h3>
                  <div className="space-y-3">
                    {outgoingChallenges.length > 0 ? (
                      outgoingChallenges.map(c => {
                        const opponentName = c.challenger_id === currentUserId ? c.opponent?.username : c.challenger?.username;
                        return (
                          <div key={c.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/30">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-300">Waiting for {opponentName}... Round {c.current_round}</span>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                                <span className="text-sm text-gray-500">Pending</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-center py-8">No active matches waiting for an opponent.</p>
                    )}
                  </div>
                </section>

                {/* Completed Matches */}
                <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Match History</h3>
                  <div className="space-y-3">
                    {completedChallenges.length > 0 ? (
                      completedChallenges.map(c => {
                        const status = getChallengeStatus(c);
                        return (
                          <div key={c.id} className="bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 rounded-lg p-4 border border-gray-700/30">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-white">{c.challenger?.username || 'Player 1'} vs {c.opponent?.username || 'Player 2'}</p>
                                <p className="text-sm text-gray-400">Completed match</p>
                              </div>
                              <span className={`font-bold ${status.color} text-sm`}>{status.text}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-400 text-center py-8">No completed matches yet.</p>
                    )}
                  </div>
                </section>
              </div>
            )}

            {tab === 'find' && (
              <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Find Players</h3>
                
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search players by username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500/50 focus:bg-gray-800/70 transition-all duration-200"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredNonFriendProfiles.length > 0 ? (
                    filteredNonFriendProfiles.map(profile => (
                      <div key={profile.id} className="bg-gray-800/30 hover:bg-gray-700/40 transition-all duration-200 rounded-lg p-4 border border-gray-700/30 hover:border-gray-600/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-white">{profile.username[0].toUpperCase()}</span>
                            </div>
                            <span className="font-bold text-white">{profile.username}</span>
                          </div>
                          <button 
                            onClick={() => handleAddFriend(profile.id)} 
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
                          >
                            Add Friend
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">
                      {searchQuery ? `No players found matching "${searchQuery}"` : 'No new players to add.'}
                    </p>
                  )}
                </div>
              </section>
            )}

            {tab === 'requests' && (
              <section className="bg-black/70 backdrop-blur-lg rounded-xl border border-gray-800/50 shadow-xl p-6">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4">Friend Requests</h3>
                <div className="space-y-3">
                  {pendingRequests.length > 0 ? (
                    pendingRequests.map(req => (
                      <div key={req.id} className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-sm font-bold text-white">{req.user1.username[0].toUpperCase()}</span>
                            </div>
                            <div>
                              <span className="font-bold text-white">{req.user1.username}</span>
                              <p className="text-sm text-gray-400">wants to be your friend</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleAcceptRequest(req)} 
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-bold rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">No pending friend requests.</p>
                  )}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}