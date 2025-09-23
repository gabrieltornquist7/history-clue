// app/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import Auth from '../components/Auth';
import LiveBattleView from '../components/LiveBattleView';
import MainMenu from '../components/MainMenu';
import ProfileView from '../components/ProfileView';
import ChallengeView from '../components/ChallengeView';
import GameView from '../components/GameView';
import DailyChallengeView from '../components/DailyChallengeView';
import LiveGameView from '../components/LiveGameView';

export default function Page() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('menu');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeDailyPuzzle, setActiveDailyPuzzle] = useState(null);
  const [activeLiveMatch, setActiveLiveMatch] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });

    let inviteChannel;
    // --- THIS IS THE FIX ---
    // We must check for session AND session.user before subscribing
    if (session && session.user) {
        inviteChannel = supabase.channel(`invites:${session.user.id}`);
        inviteChannel
            .on('broadcast', { event: 'live_invite' }, ({ payload }) => {
                setIncomingInvite(payload);
            })
            .subscribe();
    }
    
    return () => {
        subscription.unsubscribe();
        if (inviteChannel) {
            supabase.removeChannel(inviteChannel);
        }
    };
  }, [session]);

  const handleSignOut = async () => { await supabase.auth.signOut(); setView('menu'); };
  const onChallengeComplete = () => { setActiveChallenge(null); setView('challenge'); };

  const handleDailyStepComplete = async (score) => {
    const SCORE_TARGETS = [3000, 3500, 5000, 7500, 10000];
    const currentStep = activeDailyPuzzle.step;
    const newTotalScore = activeDailyPuzzle.totalScore + score;

    if (score >= SCORE_TARGETS[currentStep - 1] && currentStep < 5) {
      const nextStep = currentStep + 1;
      const { data: dailyPuzzleData } = await supabase.from('daily_puzzles').select('puzzle_ids').eq('id', activeDailyPuzzle.dailyPuzzleId).single();
      setActiveDailyPuzzle({ ...activeDailyPuzzle, puzzleId: dailyPuzzleData.puzzle_ids[nextStep - 1], step: nextStep, scoreTarget: SCORE_TARGETS[nextStep - 1], totalScore: newTotalScore });
    } else {
      const puzzlesCompleted = score >= SCORE_TARGETS[currentStep - 1] ? currentStep : currentStep - 1;
      await supabase.from('daily_attempts').update({ puzzles_completed: puzzlesCompleted, final_score: newTotalScore }).eq('id', activeDailyPuzzle.attemptId);
      setActiveDailyPuzzle(null);
      setView('daily');
    }
  };

  const acceptInvite = () => {
    setActiveLiveMatch(incomingInvite.matchId);
    setIncomingInvite(null);
    setView('liveGame');
  };

  const declineInvite = () => {
    setIncomingInvite(null);
  };
  
  const renderView = () => {
    if ((view === 'endless' || view === 'profile' || view === 'challenge' || view === 'game' || view === 'daily' || view === 'liveGame') && !session) {
      return <Auth setView={setView} />;
    }
    
    switch(view) {
        case 'liveGame':
            return <LiveGameView session={session} matchId={activeLiveMatch} setView={setView} />;
        case 'game':
            return <GameView setView={setView} challenge={activeChallenge} session={session} onChallengeComplete={onChallengeComplete} dailyPuzzleInfo={activeDailyPuzzle} onDailyStepComplete={handleDailyStepComplete} />;
        case 'endless':
            return <GameView setView={setView} session={session} />;
        case 'daily':
            return <DailyChallengeView setView={setView} session={session} setActiveDailyPuzzle={setActiveDailyPuzzle} />;
        case 'auth':
            return <Auth setView={setView} />;
        case 'profile':
            return <ProfileView setView={setView} session={session} />;
        case 'challenge':
            return <ChallengeView setView={setView} session={session} setActiveChallenge={setActiveChallenge} setActiveLiveMatch={setActiveLiveMatch} />;
        default:
            return <MainMenu setView={setView} session={session} onSignOut={handleSignOut} />;
    }
  }

  return (
    <>
      {incomingInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-parchment p-8 rounded-lg shadow-lg text-center border-2 border-gold-rush">
            <h3 className="text-2xl font-serif font-bold text-ink">{incomingInvite.from_username || 'A player'} has challenged you to a live match!</h3>
            <div className="flex gap-4 mt-6">
                <button onClick={acceptInvite} className="px-6 py-2 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800">Accept</button>
                <button onClick={declineInvite} className="px-6 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800">Decline</button>
            </div>
          </div>
        </div>
      )}
      {renderView()}
    </>
  );
}