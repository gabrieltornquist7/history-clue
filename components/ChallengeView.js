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
        const onlineUserIds = Object.keys(presenceState); 
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

  const pendingRequests = friendships.filter((f) => f.status === 'pending' && f.user_id_2 === currentUserId && f.action_user_id !== currentUserId);
  const sentRequests = friendships.filter((f) => f.status === 'pending' && f.action_user_id === currentUserId);
  const sentRequestIds = sentRequests.map((f) => f.user_id_2);
  const nonFriendProfiles = profiles.filter((p) => !friendIds.includes(p.id) && !sentRequestIds.includes(p.id) && !pendingRequests.map((r) => r.user1.id).includes(p.id));
  
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
        if (c.winner_id === currentUserId) return { text: `You Won ${challengerWins}-${opponentWins}`, color: 'text-green-600' };
        if (c.winner_id) return { text: `You Lost ${opponentWins}-${challengerWins}`, color: 'text-red-600' };
        return { text: `Draw ${challengerWins}-${opponentWins}`, color: 'text-sepia' };
    }
    if (c.next_player_id === currentUserId) {
        return { text: 'Your Turn!', button: <button onClick={() => playChallenge(c)} className="px-3 py-1 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800">Play</button> };
    } else {
        return { text: `Waiting for ${c.opponent?.username || 'Opponent'}...` };
    }
  };
  const incomingChallenges = challenges.filter(c => c.status === 'pending' && c.next_player_id === currentUserId);
  const outgoingChallenges = challenges.filter(c => c.status === 'pending' && c.next_player_id !== currentUserId);
  const completedChallenges = challenges.filter(c => c.status === 'completed');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-h-screen">
       <header className="mb-8 text-center relative">
        <button onClick={() => setView('menu')} className="absolute left-0 top-1/2 -translate-y-1/2 px-4 py-2 bg-sepia-dark text-white font-bold rounded-lg hover:bg-ink transition-colors shadow-sm"> &larr; Menu </button>
        <h1 className="text-5xl font-serif font-bold text-gold-rush"> Friend Matches </h1>
      </header>
      <div className="border-b border-sepia/20 mb-6">
        <nav className="flex space-x-6">
          <button onClick={() => setTab('challenges')} className={`py-3 px-1 font-semibold ${tab === 'challenges' ? 'text-gold-rush border-b-2 border-gold-rush' : 'text-sepia'}`}>My Matches</button>
          <button onClick={() => setTab('find')} className={`py-3 px-1 font-semibold ${tab === 'find' ? 'text-gold-rush border-b-2 border-gold-rush' : 'text-sepia'}`}>Find Players</button>
          <button onClick={() => setTab('requests')} className={`py-3 px-1 font-semibold relative ${tab === 'requests' ? 'text-gold-rush border-b-2 border-gold-rush' : 'text-sepia'}`}>Friend Requests {pendingRequests.length > 0 && <span className="absolute top-2 -right-3 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">{pendingRequests.length}</span>}</button>
        </nav>
      </div>
      {loading ? <div className="text-center text-sepia">Loading...</div> : (
        <div>
          {tab === 'challenges' && (
             <div className="space-y-8">
              
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">Online Friends</h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                  {onlineFriendProfiles.length > 0 ? onlineFriendProfiles.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-2 bg-parchment rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-green-500"></span>
                          <span className="font-bold text-ink">{friend.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => startLiveMatch(friend.id)} className="px-3 py-1 bg-red-700 text-white text-xs font-bold rounded-lg hover:bg-red-800">Challenge (Live)</button>
                          <button onClick={() => sendChallenge(friend.id)} className="px-3 py-1 bg-sepia-dark text-white text-xs font-bold rounded-lg hover:bg-ink">Challenge (Turn-based)</button>
                        </div>
                      </div>
                  )) : <p className="text-sepia">No friends are currently online.</p>}
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">Offline Friends</h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                  {offlineFriendProfiles.length > 0 ? offlineFriendProfiles.map(friend => (
                      <div key={friend.id} className="flex items-center justify-between p-2 bg-parchment rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-sepia/40"></span>
                          <span className="font-bold text-ink">{friend.username}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => sendChallenge(friend.id)} className="px-3 py-1 bg-sepia-dark text-white text-xs font-bold rounded-lg hover:bg-ink">Challenge (Turn-based)</button>
                        </div>
                      </div>
                  )) : <p className="text-sepia">No offline friends to challenge.</p>}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">Active Turn-Based Matches</h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                  {incomingChallenges.length === 0 && outgoingChallenges.length === 0 && <p className="text-sepia">No active turn-based matches.</p>}
                  {incomingChallenges.map(c => {
                    const status = getChallengeStatus(c);
                    return (<div key={c.id} className="flex items-center justify-between p-2 bg-parchment rounded-lg"><span className="font-bold text-ink">{c.challenger?.username || 'A friend'} challenged you!</span>{status.button}</div>)
                  })}
                  {outgoingChallenges.map(c => {
                    return (<div key={c.id} className="flex items-center justify-between p-2 bg-parchment rounded-lg"><span className="font-bold text-ink">Waiting for {c.opponent?.username || 'your friend'}...</span></div>)
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-4">Completed Matches</h3>
                <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                    {completedChallenges.length > 0 ? completedChallenges.map(c => {
                        const status = getChallengeStatus(c);
                        return (<div key={c.id} className={`flex items-center justify-between p-2 bg-parchment rounded-lg`}><div><p className="font-bold text-ink">{c.challenger?.username || 'Player 1'} vs {c.opponent?.username || 'Player 2'}</p></div><span className={`font-bold ${status.color}`}>{status.text}</span></div>)
                    }) : <p className="text-sepia">No completed matches yet.</p>}
                </div>
              </div>

            </div>
          )}
          {tab === 'find' && (
            <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                {nonFriendProfiles.map(profile => (
                    <div key={profile.id} className="flex items-center justify-between p-2 bg-parchment rounded-lg">
                        <span className="font-bold text-ink">{profile.username}</span>
                        <button onClick={() => handleAddFriend(profile.id)} className="px-3 py-1 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800">Add Friend</button>
                    </div>
                ))}
            </div>
          )}
          {tab === 'requests' && (
             <div className="bg-papyrus p-4 rounded-lg shadow-inner border border-sepia/20 space-y-3">
                {pendingRequests.length > 0 ? pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-parchment rounded-lg">
                        <span className="font-bold text-ink">{req.user1.username} sent you a request.</span>
                        <div className="flex gap-2">
                            <button onClick={() => handleAcceptRequest(req)} className="px-3 py-1 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800">Accept</button>
                        </div>
                    </div>
                )) : <p className="text-sepia">You have no pending friend requests.</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}