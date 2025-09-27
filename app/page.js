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

// Optimized loading component that matches your app's design
const LoadingSpinner = ({ message = "Loading..." }) => (
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

    // Setup invite channel for live battles
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
      subscription.unsubscribe();
      if (inviteChannel) {
        supabase.removeChannel(inviteChannel);
      }
    };
  }, [session]);

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
      const { data: dailyPuzzleData } = await supabase
        .from("daily_puzzles")
        .select("puzzle_ids")
        .eq("id", activeDailyPuzzle.dailyPuzzleId)
        .single();
      setActiveDailyPuzzle({
        ...activeDailyPuzzle,
        puzzleId: dailyPuzzleData.puzzle_ids[nextStep - 1],
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
        view === "liveGame") &&
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
                    <p className="text-red-400 mb-4">Failed to load battle</p>
                    <button onClick={() => setView('menu')} className="px-4 py-2 bg-gray-700 rounded">
                      Back to Menu
                    </button>
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
      case "contact":
        return (
          <div 
            className="min-h-screen relative flex items-center justify-center p-6"
            style={{
              background: `
                linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
                radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
              `,
              backgroundBlendMode: "overlay",
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
    <>
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
    </>
  );
}
