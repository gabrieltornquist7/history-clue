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

// Replace the useEffect in components/ChallengeView.js around line 45
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
  let isMounted = true;  // ADD THIS - prevents memory leaks

  channel.on('presence', { event: 'sync' }, () => {
      if (!isMounted) return;  // ADD THIS - prevents updates after unmount
      
      const presenceState = channel.presenceState();
      const onlineUserIds = Object.values(presenceState).flat().map(p => p.user_id);
      setOnlineFriends(onlineUserIds);
  }).subscribe(async (status) => {
    if (status === 'SUBSCRIBED' && isMounted) {  // ADD isMounted check
      await channel.track({ user_id: session.user.id });
    }
  });

  return () => {
    isMounted = false;  // ADD THIS - marks component as unmounted
    if (channel.state === 'joined') {  // ADD THIS - proper cleanup
      channel.untrack();
    }
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
            return { text: `You Won ${challengerWins}-${opponentWins}`, color: '#d4af37' };
        } else if (c.winner_id) {
            return { text: `You Lost ${opponentWins}-${challengerWins}`, color: '#ff6b6b' };
        } else {
            return { text: `Draw ${challengerWins}-${opponentWins}`, color: '#888' };
        }
    }
    
    const opponentName = c.challenger_id === currentUserId ? c.opponent?.username : c.challenger?.username;

    if (c.next_player_id === currentUserId) {
        return { 
          text: `Your turn against ${opponentName}! Round ${c.current_round}`, 
          button: (
            <button 
              onClick={() => playChallenge(c)} 
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
              Play Now
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
    { id: 'challenges', label: 'Matches', count: incomingChallenges.length },
    { id: 'find', label: 'Find Players' },
    { id: 'requests', label: 'Requests', count: pendingRequests.length }
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
                Friend Matches
              </h1>
              <p 
                className="text-sm italic font-light"
                style={{ 
                  color: '#d4af37', 
                  opacity: 0.9, 
                  letterSpacing: '0.05em' 
                }}
              >
                Challenge friends • Compete for glory
              </p>
            </div>
            <div className="w-24"></div>
          </div>
        </header>
        
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="text-2xl font-serif text-white mb-4">Loading friend matches...</div>
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
              Friend Matches
            </h1>
            <p 
              className="text-sm italic font-light"
              style={{ 
                color: '#d4af37', 
                opacity: 0.9, 
                letterSpacing: '0.05em' 
              }}
            >
              Challenge friends • Compete for glory
            </p>
          </div>
          <button
            onClick={handleInvite}
            className="px-6 py-3 font-bold text-white rounded-md transition-all duration-300 relative group"
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
            Invite Friend
          </button>
        </div>
      </header>

      <div className="px-8 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          
          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div 
              className="backdrop-blur rounded-lg p-1.5 border"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="flex space-x-2">
                {tabs.map((tabItem) => (
                  <button
                    key={tabItem.id}
                    onClick={() => setTab(tabItem.id)}
                    className={`relative px-5 py-2.5 font-medium rounded-md transition-all duration-300 ${
                      tab === tabItem.id
                        ? 'bg-gray-800 text-white border border-gray-700/30'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
                    }`}
                    style={{
                      fontFamily: 'system-ui, -apple-system, sans-serif',
                      letterSpacing: '-0.01em'
                    }}
                  >
                    {tabItem.label}
                    {tabItem.count > 0 && (
                      <span 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs text-white flex items-center justify-center font-bold"
                        style={{ backgroundColor: '#d4af37' }}
                      >
                        {tabItem.count}
                      </span>
                    )}
                    {tab === tabItem.id && (
                      <div 
                        className="absolute bottom-0 left-5 right-5 h-px"
                        style={{ backgroundColor: '#d4af37' }}
                      ></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {tab === 'challenges' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Online Friends */}
                <div 
                  className="backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Online Friends
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {onlineFriendProfiles.length > 0 ? onlineFriendProfiles.map(friend => (
                        <div 
                          key={friend.id} 
                          className="p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                          style={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: '#d4af37' }}
                                ></div>
                                <span className="font-semibold text-white">{friend.username}</span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={() => startLiveMatch(friend.id)} 
                              className="px-4 py-2.5 font-bold text-white rounded-md transition-all duration-300 relative group border border-pink-600/15"
                              style={{
                                background: 'linear-gradient(135deg, #b00050 0%, #d81b60 100%)',
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                letterSpacing: '-0.02em'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.borderColor = 'rgba(216, 27, 96, 0.4)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.borderColor = 'rgba(216, 27, 96, 0.15)';
                              }}
                            >
                              Live Battle
                            </button>
                            <button 
                              onClick={() => sendChallenge(friend.id)} 
                              className="px-4 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                              style={{
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                letterSpacing: '-0.01em'
                              }}
                            >
                              Challenge
                              <div 
                                className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                                style={{ backgroundColor: '#d4af37' }}
                              ></div>
                            </button>
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-gray-400 italic py-8">No friends are currently online.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Offline Friends */}
                <div 
                  className="backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Offline Friends
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {offlineFriendProfiles.length > 0 ? offlineFriendProfiles.map(friend => (
                        <div 
                          key={friend.id} 
                          className="p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                          style={{ 
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                <span className="font-semibold text-gray-300">{friend.username}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => sendChallenge(friend.id)} 
                              className="px-4 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                              style={{
                                fontFamily: 'system-ui, -apple-system, sans-serif',
                                letterSpacing: '-0.01em'
                              }}
                            >
                              Challenge
                              <div 
                                className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                                style={{ backgroundColor: '#d4af37' }}
                              ></div>
                            </button>
                          </div>
                        </div>
                      )) : (
                        <p className="text-center text-gray-400 italic py-8">No offline friends to challenge.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Your Turn */}
                <div 
                  className="backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Your Turn
                    </h2>
                    <div className="space-y-3">
                      {incomingChallenges.length > 0 ? incomingChallenges.map(c => {
                        const status = getChallengeStatus(c);
                        const opponentName = c.challenger_id === currentUserId ? c.opponent?.username : c.challenger?.username;
                        return (
                          <div 
                            key={c.id} 
                            className="p-4 rounded-lg border"
                            style={{ 
                              backgroundColor: 'rgba(139, 69, 19, 0.1)',
                              border: '1px solid rgba(139, 69, 19, 0.3)'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-white mb-1">vs {opponentName}</p>
                                <p className="text-sm text-gray-400">Round {c.current_round}</p>
                              </div>
                              {status.button}
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="text-center text-gray-400 italic py-8">No matches waiting for your turn.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Waiting for Opponent */}
                <div 
                  className="backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Waiting for Opponent
                    </h2>
                    <div className="space-y-3">
                      {outgoingChallenges.length > 0 ? outgoingChallenges.map(c => {
                        const opponentName = c.challenger_id === currentUserId ? c.opponent?.username : c.challenger?.username;
                        return (
                          <div 
                            key={c.id} 
                            className="p-4 rounded-lg border transition-all duration-300"
                            style={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-white mb-1">vs {opponentName}</p>
                                <p className="text-sm text-gray-400">Round {c.current_round}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full animate-pulse"
                                  style={{ backgroundColor: '#d4af37' }}
                                ></div>
                                <span className="text-sm text-gray-500">Waiting</span>
                              </div>
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="text-center text-gray-400 italic py-8">No matches waiting for an opponent.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Completed Matches - Full Width */}
                <div 
                  className="lg:col-span-2 backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Match History
                    </h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {completedChallenges.length > 0 ? completedChallenges.map(c => {
                        const status = getChallengeStatus(c);
                        return (
                          <div 
                            key={c.id} 
                            className="p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                            style={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-white mb-1">
                                  {c.challenger?.username || 'Player 1'} vs {c.opponent?.username || 'Player 2'}
                                </p>
                                <p className="text-sm text-gray-400">Completed match</p>
                              </div>
                              <span 
                                className="font-bold text-sm"
                                style={{ color: status.color }}
                              >
                                {status.text}
                              </span>
                            </div>
                          </div>
                        );
                      }) : (
                        <p className="text-center text-gray-400 italic py-8">No completed matches yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'find' && (
              <div className="max-w-2xl mx-auto">
                <div 
                  className="backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Find Players
                    </h2>
                    
                    {/* Search Bar */}
                    <div className="mb-6">
                      <input
                        type="text"
                        placeholder="Search players by username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 text-white font-medium rounded-md border border-gray-700/30 hover:border-yellow-500/50 focus:border-yellow-500/50 focus:outline-none transition-all duration-300"
                        style={{
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                          letterSpacing: '-0.01em'
                        }}
                      />
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {filteredNonFriendProfiles.length > 0 ? (
                        filteredNonFriendProfiles.map(profile => (
                          <div 
                            key={profile.id} 
                            className="p-4 rounded-lg border transition-all duration-300 hover:border-yellow-500/30"
                            style={{ 
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-white">{profile.username}</span>
                              <button 
                                onClick={() => handleAddFriend(profile.id)} 
                                className="px-4 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                                style={{
                                  fontFamily: 'system-ui, -apple-system, sans-serif',
                                  letterSpacing: '-0.01em'
                                }}
                              >
                                Add Friend
                                <div 
                                  className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                                  style={{ backgroundColor: '#d4af37' }}
                                ></div>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-400 italic py-8">
                          {searchQuery ? `No players found matching "${searchQuery}"` : 'No new players to add.'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === 'requests' && (
              <div className="max-w-2xl mx-auto">
                <div 
                  className="backdrop-blur rounded-xl shadow-2xl border slide-up"
                  style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
                  }}
                >
                  <div className="p-6">
                    <h2 
                      className="text-xs font-semibold uppercase mb-6"
                      style={{
                        color: '#d4af37',
                        opacity: 0.8,
                        letterSpacing: '0.15em'
                      }}
                    >
                      Friend Requests
                    </h2>
                    <div className="space-y-3">
                      {pendingRequests.length > 0 ? (
                        pendingRequests.map(req => (
                          <div 
                            key={req.id} 
                            className="p-4 rounded-lg border"
                            style={{ 
                              backgroundColor: 'rgba(139, 69, 19, 0.1)',
                              border: '1px solid rgba(139, 69, 19, 0.3)'
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-white mb-1">{req.user1.username}</p>
                                <p className="text-sm text-gray-400">wants to be your friend</p>
                              </div>
                              <button 
                                onClick={() => handleAcceptRequest(req)} 
                                className="px-4 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 transition-all duration-300 border border-gray-700/20 relative group"
                                style={{
                                  fontFamily: 'system-ui, -apple-system, sans-serif',
                                  letterSpacing: '-0.01em'
                                }}
                              >
                                Accept
                                <div 
                                  className="absolute bottom-0 left-4 right-4 h-px transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                                  style={{ backgroundColor: '#d4af37' }}
                                ></div>
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-gray-400 italic py-8">No pending friend requests.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}