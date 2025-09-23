// app/page.js
"use client";
import { useState, useEffect } from "react";
import { supabase } from '../lib/supabaseClient';
import Auth from '../components/Auth';
import MainMenu from '../components/MainMenu';
import ProfileView from '../components/ProfileView';
import ChallengeView from '../components/ChallengeView';
import GameView from '../components/GameView';
import DailyChallengeView from '../components/DailyChallengeView';

export default function Page() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState('menu');
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeDailyPuzzle, setActiveDailyPuzzle] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

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

  if ((view === 'profile' || view === 'challenge' || view === 'game' || view === 'daily') && !session) {
    return <Auth setView={setView} />;
  }

  if (view === 'game') return <GameView setView={setView} challenge={activeChallenge} session={session} onChallengeComplete={onChallengeComplete} dailyPuzzleInfo={activeDailyPuzzle} onDailyStepComplete={handleDailyStepComplete} />;
  if (view === 'daily') return <DailyChallengeView setView={setView} session={session} setActiveDailyPuzzle={setActiveDailyPuzzle} />;
  if (view === 'auth') return <Auth setView={setView} />;
  if (view === 'profile') return <ProfileView setView={setView} session={session} />;
  if (view === 'challenge') return <ChallengeView setView={setView} session={session} setActiveChallenge={setActiveChallenge} />;
  
  return <MainMenu setView={setView} session={session} onSignOut={handleSignOut} />;
}