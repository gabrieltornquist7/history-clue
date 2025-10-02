"use client";
import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { supabase } from "../lib/supabaseClient";

// Error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Lazy load all heavy components for better performance
const Auth = lazy(() => import("../components/Auth"));
const MainMenu = lazy(() => import("../components/MainMenu"));
const ProfileView = lazy(() => import("../components/ProfileView"));
const FriendsView = lazy(() => import("../components/FriendsView"));
const LiveBattleView = lazy(() => import("../components/LiveBattleView"));
const LiveLobbyView = lazy(() => import("../components/LiveLobbyView"));
const ChallengeView = lazy(() => import("../components/ChallengeView"));
const GameView = lazy(() => import("../components/GameView"));
const DailyChallengeView = lazy(() => import("../components/DailyChallengeView"));
const ProfileSettingsView = lazy(() => import("../components/ProfileSettingsView"));
const LeaderboardView = lazy(() => import("../components/LeaderboardView"));
const UserProfileView = lazy(() => import("../components/UserProfileView"));
const BadgeGallery = lazy(() => import("../components/BadgeGallery"));
const Shop = lazy(() => import("../components/Shop"));

// Badge notification system
import { BadgeNotificationProvider, useBadgeNotifications } from "../contexts/BadgeNotificationContext";
import BadgeNotificationContainer from "../components/BadgeNotificationContainer";

// Optimized loading component that matches your app's design
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div 
    className="min-h-screen relative"
    style={{
      background: `
        linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
        radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
        radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
        radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
      `
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

    <div className="flex items-center justify-center min-h-screen relative z-10">
      <div className="text-center">
        <div className="text-2xl font-serif text-white mb-4">{message}</div>
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  </div>
);

export default function Page() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("menu");
  const [viewPayload, setViewPayload] = useState(null);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [activeDailyPuzzle, setActiveDailyPuzzle] = useState(null);
  const [activeLiveMatch, setActiveLiveMatch] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [dailyChallengeCoins, setDailyChallengeCoins] = useState(null);

  const inviteChannelRef = useRef(null);

  const handleSetView = (newView, payload = null) => {
    console.log('[Main] handleSetView called:', {
      oldView: view,
      newView: newView,
      payload: payload,
      hasSession: !!session,
      userId: session?.user?.id
    });
    console.log('[Main] handleSetView function type:', typeof handleSetView);
    console.log('[Main] setView function type:', typeof setView);

    // Clear daily challenge coins when leaving daily view
    if (view === "daily" && newView !== "daily") {
      setDailyChallengeCoins(null);
    }

    setView(newView);
    setViewPayload(payload);
  };

  useEffect(() => {
    // Get initial session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Fixed: Empty dependency array to prevent infinite remounting

  // Separate useEffect for invite channel to avoid remounting loops
  useEffect(() => {
    let inviteChannel;
    if (session && session.user) {
      inviteChannel = supabase.channel(`invites:${session.user.id}`);
      inviteChannelRef.current = inviteChannel;

      inviteChannel
        .on("broadcast", { event: "live_invite" }, ({ payload }) => {
          console.log('Received live invite:', payload);
          setIncomingInvite({
            ...payload,
            matchId: payload.battle_id || payload.matchId // Support both field names for compatibility
          });
        })
        .subscribe();
    }

    return () => {
      if (inviteChannel) {
        supabase.removeChannel(inviteChannel);
      }
    };
  }, [session?.user?.id]); // Only depend on user ID, not entire session object

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    handleSetView("menu");
  };

  const onChallengeComplete = () => {
    setActiveChallenge(null);
    handleSetView("challenge");
  };

  const handleDailyStepComplete = async (score) => {
    const SCORE_TARGETS = [3000, 3500, 5000, 7500, 10000];
    const currentStep = activeDailyPuzzle.step;
    const newTotalScore = activeDailyPuzzle.totalScore + score;

    if (score >= SCORE_TARGETS[currentStep - 1] && currentStep < 5) {
      const nextStep = currentStep + 1;
      // Get the next puzzle (next difficulty level) for today's challenge
      const { data: nextPuzzle } = await supabase
        .from("daily_challenge_puzzles")
        .select(`
          id,
          daily_challenge_translations!daily_challenge_id (
            language_code,
            clue_1_text,
            clue_2_text,
            clue_3_text,
            clue_4_text,
            clue_5_text
          )
        `)
        .eq("scheduled_date", activeDailyPuzzle.challengeDate)
        .eq("difficulty_level", nextStep)
        .eq('daily_challenge_translations.language_code', 'en')
        .single();

      setActiveDailyPuzzle({
        ...activeDailyPuzzle,
        puzzleId: nextPuzzle.id,
        step: nextStep,
        scoreTarget: SCORE_TARGETS[nextStep - 1],
        totalScore: newTotalScore,
      });
    } else {
      const puzzlesCompleted =
        score >= SCORE_TARGETS[currentStep - 1] ? currentStep : currentStep - 1;
      await supabase
        .from("daily_attempts")
        .update({
          puzzles_completed: puzzlesCompleted,
          final_score: newTotalScore,
        })
        .eq("id", activeDailyPuzzle.attemptId);

      // Award XP and coins for daily challenge completion based on highest level reached
      if (session?.user?.id) {
        const highestLevel = puzzlesCompleted;
        let coinsEarned = 0;

        // Award XP for daily challenge completion (base score * level multiplier)
        const xpScore = newTotalScore * highestLevel; // More levels completed = higher XP multiplier
        console.log('About to award daily challenge XP:', { user_id: session.user.id, score: xpScore, totalScore: newTotalScore, levelMultiplier: highestLevel });

        const { data: xpData, error: xpError } = await supabase.rpc('award_xp', {
          p_user_id: session.user.id,
          p_xp_amount: xpScore
        });

        if (xpError) {
          console.error('Error awarding daily challenge XP:', xpError);
          console.error('Daily XP error details:', {
            message: xpError.message,
            details: xpError.details,
            hint: xpError.hint,
            code: xpError.code
          });
        } else {
          console.log('Daily challenge XP awarded:', xpData);
        }

        // Award coins based on highest level reached
        switch (highestLevel) {
          case 1: coinsEarned = 25; break;
          case 2: coinsEarned = 50; break;
          case 3: coinsEarned = 100; break;
          case 4: coinsEarned = 200; break;
          case 5: coinsEarned = 1000; break;
          default: coinsEarned = 0; break;
        }

        if (coinsEarned > 0) {
          const dailyCoinParams = {
            p_user_id: session.user.id,
            p_amount: coinsEarned,
            p_source: 'daily_challenge',
            p_game_mode: 'daily',
            p_metadata: { level_reached: highestLevel }
          };
          console.log('Daily challenge award_coins parameters:', dailyCoinParams);
          const { error: coinError } = await supabase.rpc('award_coins', dailyCoinParams);

          if (coinError) {
            console.error('Error awarding daily challenge coins:', coinError);
            console.error('Daily coin error details:', {
              message: coinError.message,
              details: coinError.details,
              hint: coinError.hint,
              code: coinError.code
            });
          } else {
            console.log('Daily challenge coins awarded:', coinsEarned, 'for level:', highestLevel);
            // Store coin results for display
            setDailyChallengeCoins({
              coinsEarned: coinsEarned,
              levelReached: highestLevel
            });

            // Check daily challenge badges (completed all 5 levels)
            const dailyBadges = ['daily_first', 'daily_3_days'];

            for (const badgeId of dailyBadges) {
              try {
                const { data } = await supabase.rpc('check_and_award_badge', {
                  p_user_id: session.user.id,
                  p_badge_id: badgeId
                });

                // Badge will be shown via notification when returning to daily view
                // The notification system is active inside BadgeNotificationProvider
                if (data?.awarded) {
                  console.log(`Badge ${badgeId} awarded:`, data);
                  // Store badges to show when returning to view
                  if (!window.pendingBadgeNotifications) {
                    window.pendingBadgeNotifications = [];
                  }
                  window.pendingBadgeNotifications.push(data);
                }
              } catch (error) {
                console.error(`Error checking badge ${badgeId}:`, error);
              }
            }

            // Track daily streak for streak badges
            try {
              // Get today's date and yesterday's date (normalized to midnight UTC)
              const today = new Date();
              today.setUTCHours(0, 0, 0, 0);
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);

              // Check if user completed yesterday's challenge
              const { data: yesterdayAttempt } = await supabase
                .from('daily_attempts')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('challenge_date', yesterday.toISOString().split('T')[0])
                .eq('puzzles_completed', 5)
                .maybeSingle();

              // Get current streak from badge_progress
              const { data: currentProgress } = await supabase
                .from('badge_progress')
                .select('current_value')
                .eq('user_id', session.user.id)
                .eq('badge_id', 'daily_streak_tracker')
                .maybeSingle();

              const currentStreak = currentProgress?.current_value || 0;

              // Update streak
              const newStreak = yesterdayAttempt ? currentStreak + 1 : 1;

              await supabase.rpc('update_badge_progress', {
                p_user_id: session.user.id,
                p_badge_id: 'daily_streak_tracker',
                p_new_value: newStreak,
                p_metadata: null
              });

              console.log(`Daily streak updated: ${newStreak} days`);

              // Check streak badges
              const streakBadges = ['daily_streak_7', 'daily_streak_30', 'daily_streak_100'];
              for (const badgeId of streakBadges) {
                const { data } = await supabase.rpc('check_and_award_badge', {
                  p_user_id: session.user.id,
                  p_badge_id: badgeId
                });

                if (data?.awarded) {
                  console.log(`Streak badge ${badgeId} awarded:`, data);
                  if (!window.pendingBadgeNotifications) {
                    window.pendingBadgeNotifications = [];
                  }
                  window.pendingBadgeNotifications.push(data);
                }
              }
            } catch (error) {
              console.error('Error tracking daily streak:', error);
            }

            // Check for perfect day (all 5 levels perfect - score 10000 each)
            // This would require tracking per-level scores, skipping for now
          }
        }
      }

      setActiveDailyPuzzle(null);
      handleSetView("daily");
    }
  };

  const acceptInvite = () => {
    const battleId = incomingInvite.battle_id || incomingInvite.matchId;
    setActiveLiveMatch(battleId);
    setIncomingInvite(null);
    handleSetView("liveGame");
  };

  const declineInvite = async () => {
    // Clean up the battle invitation
    const battleId = incomingInvite?.battle_id || incomingInvite?.matchId;
    if (battleId) {
      await supabase
        .from('battles')
        .delete()
        .eq('id', battleId);
    }
    setIncomingInvite(null);
  };

  const renderView = () => {
    console.log('[Main] renderView called:', {
      view: view,
      hasSession: !!session,
      userId: session?.user?.id
    });

    if (
      (view === "endless" ||
        view === "profile" ||
        view === "challenge" ||
        view === "game" ||
        view === "daily" ||
        view === "profileSettings" ||
        view === "leaderboard" ||
        view === "liveLobby" ||
        view === "liveGame" ||
        view === "shop") &&
      !session
    ) {
      console.log('[Main] No session detected for protected view, redirecting to auth');
      console.log('[Main] Session state:', session);
      return (
        <Suspense fallback={<LoadingSpinner message="Loading authentication..." />}>
          <Auth setView={handleSetView} />
        </Suspense>
      );
    }

    switch (view) {
      case "liveGame":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading live battle..." />}>
            <ErrorBoundary
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-black text-white">
                  <div className="text-center">
                    <h2 className="text-2xl font-serif font-bold text-red-400 mb-4">Battle Error</h2>
                    <p className="text-gray-300 mb-6">Something went wrong with the live battle.</p>
                    <div className="space-y-3">
                      <button
                        onClick={() => window.location.reload()}
                        className="block w-full px-6 py-3 bg-yellow-600 text-black font-bold rounded hover:bg-yellow-500"
                      >
                        Reload Battle
                      </button>
                      <button
                        onClick={() => setView('menu')}
                        className="block w-full px-6 py-3 bg-gray-700 text-white rounded hover:bg-gray-600"
                      >
                        Back to Menu
                      </button>
                    </div>
                  </div>
                </div>
              }
            >
              <LiveBattleView
                session={session}
                battleId={activeLiveMatch}
                setView={handleSetView}
              />
            </ErrorBoundary>
          </Suspense>
        );
      case "liveLobby":
        console.log('[Main] Rendering LiveLobby view', {
          view: view,
          hasSession: !!session,
          userId: session?.user?.id,
          activeLiveMatch: activeLiveMatch
        });
        return (
          <Suspense fallback={<LoadingSpinner message="Loading battle lobby..." />}>
            <LiveLobbyView
              session={session}
              setView={handleSetView}
              setActiveLiveMatch={setActiveLiveMatch}
            />
          </Suspense>
        );
      case "game":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading puzzle..." />}>
            <GameView
              setView={handleSetView}
              challenge={activeChallenge}
              session={session}
              onChallengeComplete={onChallengeComplete}
              dailyPuzzleInfo={activeDailyPuzzle}
              onDailyStepComplete={handleDailyStepComplete}
            />
          </Suspense>
        );
      case "endless":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading endless mode..." />}>
            <GameView setView={handleSetView} session={session} />
          </Suspense>
        );
      case "daily":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading daily challenge..." />}>
            <DailyChallengeView
              setView={handleSetView}
              session={session}
              setActiveDailyPuzzle={setActiveDailyPuzzle}
              coinResults={dailyChallengeCoins}
            />
          </Suspense>
        );
      case "auth":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading authentication..." />}>
            <Auth setView={handleSetView} />
          </Suspense>
        );
      case "profile":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading profile..." />}>
            <ProfileView
              setView={handleSetView}
              session={session}
              userId={viewPayload}
            />
          </Suspense>
        );
      case "friends":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading friends..." />}>
            <FriendsView setView={handleSetView} session={session} />
          </Suspense>
        );
      case "challenge":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading challenges..." />}>
            <ChallengeView
              setView={handleSetView}
              session={session}
              setActiveChallenge={setActiveChallenge}
            />
          </Suspense>
        );
      case "profileSettings":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading settings..." />}>
            <ProfileSettingsView setView={handleSetView} session={session} />
          </Suspense>
        );
      case "leaderboard":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading leaderboard..." />}>
            <LeaderboardView setView={handleSetView} />
          </Suspense>
        );
      case "badges":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading badges..." />}>
            <BadgeGallery setView={handleSetView} session={session} />
          </Suspense>
        );
      case "shop":
        return (
          <Suspense fallback={<LoadingSpinner message="Loading shop..." />}>
            <Shop setView={handleSetView} session={session} />
          </Suspense>
        );
      case "contact":
        return (
          <div 
            className="min-h-screen relative flex items-center justify-center p-6"
            style={{
              background: `
                linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
                radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
                radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
              `
            }}
          >
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

            <div 
              className="p-8 rounded-2xl shadow-2xl max-w-lg text-center relative z-10 backdrop-blur border"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <h1 
                className="text-3xl font-serif font-bold mb-4"
                style={{ 
                  color: '#d4af37',
                  textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                }}
              >
                Contact Me
              </h1>
              <p className="text-lg text-white mb-4">
                You can always reach me at:
              </p>
              <a
                href="mailto:GABRIEL@HISTORYCLUE.COM"
                className="text-xl font-semibold text-blue-400 underline hover:text-blue-300 transition-colors"
              >
                GABRIEL@HISTORYCLUE.COM
              </a>
              <div className="mt-6">
                <button
                  onClick={() => handleSetView("menu")}
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
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );
      case "news":
        return (
          <div 
            className="min-h-screen relative flex items-center justify-center p-6"
            style={{
              background: `
                linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
                radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
                radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
              `
            }}
          >
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

            <div 
              className="p-8 rounded-2xl shadow-2xl max-w-2xl relative z-10 backdrop-blur border"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="text-center mb-6">
                <h1 
                  className="text-4xl font-serif font-bold mb-2"
                  style={{ 
                    color: '#d4af37',
                    textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                  }}
                >
                  📰 News
                </h1>
                <p className="text-sm text-gray-400">Latest updates from HistoryClue</p>
              </div>

              {/* News items */}
              <div className="space-y-6 text-left">
                <div 
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(212, 175, 55, 0.05)',
                    borderColor: 'rgba(212, 175, 55, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎉</span>
                    <h2 className="text-xl font-bold text-white">HistoryClue has launched!</h2>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    We&apos;re thrilled to have you here! HistoryClue is now live and ready for history enthusiasts around the world. 
                    Try the Daily Challenge, compete in Live Battles, or explore Endless Mode. Thank you for being part of our community!
                  </p>
                  <p className="text-xs text-gray-400 mt-3">October 2025</p>
                </div>

                <div 
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(139, 0, 0, 0.1)',
                    borderColor: 'rgba(139, 0, 0, 0.3)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">⚔️</span>
                    <h2 className="text-xl font-bold text-white">Live Battle Mode (BETA)</h2>
                  </div>
                  <p className="text-gray-300 leading-relaxed">
                    Challenge your friends in real-time! Live Battle mode is now available in beta. 
                    Experience the thrill of head-to-head competition with a 90-second countdown and pressure mechanics.
                  </p>
                  <p className="text-xs text-gray-400 mt-3">October 2025</p>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => handleSetView("menu")}
                  className="px-7 py-3.5 font-bold text-white rounded-md transition-all duration-300"
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
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );
      case "info":
        return (
          <div 
            className="min-h-screen relative flex items-center justify-center p-6"
            style={{
              background: `
                linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
                radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%),
                radial-gradient(circle at 70% 80%, rgba(212, 175, 55, 0.01) 0%, transparent 50%),
                radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)
              `
            }}
          >
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

            <div 
              className="p-8 rounded-2xl shadow-2xl max-w-2xl relative z-10 backdrop-blur border"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="text-center mb-6">
                <h1 
                  className="text-4xl font-serif font-bold mb-2"
                  style={{ 
                    color: '#d4af37',
                    textShadow: '0 0 20px rgba(212, 175, 55, 0.3)'
                  }}
                >
                  ℹ️ Info
                </h1>
                <p className="text-sm text-gray-400">Helpful tips and guides</p>
              </div>

              {/* Info sections */}
              <div className="space-y-6 text-left">
                <div 
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    borderColor: 'rgba(59, 130, 246, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📱</span>
                    <h2 className="text-xl font-bold text-white">Install as App (iOS)</h2>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-3">
                    Experience HistoryClue like a native app! Follow these steps to add it to your home screen:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300">
                    <li>Tap the <strong className="text-blue-400">Share button</strong> (square with arrow) in Safari</li>
                    <li>Scroll down and tap <strong className="text-blue-400">&quot;Add to Home Screen&quot;</strong></li>
                    <li>Tap <strong className="text-blue-400">&quot;Add&quot;</strong> in the top right corner</li>
                    <li>Open HistoryClue from your home screen - no browser bars!</li>
                  </ol>
                  <div className="mt-3 p-3 bg-black/30 rounded border border-blue-500/20">
                    <p className="text-xs text-blue-300">💡 <strong>Tip:</strong> Once installed, the app works offline and feels just like a native app!</p>
                  </div>
                </div>

                <div 
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(34, 197, 94, 0.05)',
                    borderColor: 'rgba(34, 197, 94, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🤖</span>
                    <h2 className="text-xl font-bold text-white">Install as App (Android)</h2>
                  </div>
                  <p className="text-gray-300 leading-relaxed mb-3">
                    Add HistoryClue to your Android home screen:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-gray-300">
                    <li>Tap the <strong className="text-green-400">menu icon</strong> (three dots) in Chrome</li>
                    <li>Tap <strong className="text-green-400">&quot;Add to Home screen&quot;</strong></li>
                    <li>Tap <strong className="text-green-400">&quot;Add&quot;</strong> to confirm</li>
                    <li>Launch HistoryClue from your home screen!</li>
                  </ol>
                </div>

                <div 
                  className="p-5 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(168, 85, 247, 0.05)',
                    borderColor: 'rgba(168, 85, 247, 0.2)'
                  }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">🎮</span>
                    <h2 className="text-xl font-bold text-white">How to Play</h2>
                  </div>
                  <ul className="space-y-2 text-gray-300">
                    <li>• <strong className="text-purple-400">Daily Challenge:</strong> Complete 5 progressive puzzles each day</li>
                    <li>• <strong className="text-purple-400">Endless Mode:</strong> Play continuously and level up</li>
                    <li>• <strong className="text-purple-400">Live Battle:</strong> Real-time multiplayer with 3 rounds</li>
                    <li>• <strong className="text-purple-400">Challenge Friend:</strong> Private 1v1 competition</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => handleSetView("menu")}
                  className="px-7 py-3.5 font-bold text-white rounded-md transition-all duration-300"
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
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <Suspense fallback={<LoadingSpinner message="Loading menu..." />}>
            <MainMenu
              setView={handleSetView}
              session={session}
              onSignOut={handleSignOut}
            />
          </Suspense>
        );
    }
  };

  return (
    <BadgeNotificationProvider>
      <BadgeNotificationContainer setView={handleSetView} />
      {incomingInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div 
            className="p-8 rounded-lg shadow-2xl text-center border-2 max-w-md backdrop-blur"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderColor: '#d4af37',
              boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)'
            }}
          >
            <h3 className="text-2xl font-serif font-bold text-white mb-4">
              {incomingInvite.from_username || "A player"} has challenged you to
              a live match!
            </h3>
            <div className="flex gap-4 mt-6">
              <button
                onClick={acceptInvite}
                className="px-6 py-2 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={declineInvite}
                className="px-6 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {renderView()}
    </BadgeNotificationProvider>
  );
}
