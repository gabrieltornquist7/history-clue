"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import Auth from "../components/Auth";
import LiveBattleView from "../components/LiveBattleView";
import MainMenu from "../components/MainMenu";
import ProfileView from "../components/ProfileView";
import ChallengeView from "../components/ChallengeView";
import GameView from "../components/GameView";
import DailyChallengeView from "../components/DailyChallengeView";
import LiveGameView from "../components/LiveGameView";
import LiveLobbyView from "../components/LiveLobbyView";
import ProfileSettingsView from "../components/ProfileSettingsView";
import LeaderboardView from "../components/LeaderboardView"; // Import the new component

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

    let inviteChannel;
    if (session && session.user) {
      inviteChannel = supabase.channel(`invites:${session.user.id}`);
      inviteChannel
        .on("broadcast", { event: "live_invite" }, ({ payload }) => {
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
    setActiveLiveMatch(incomingInvite.matchId);
    setIncomingInvite(null);
    handleSetView("liveGame");
  };

  const declineInvite = () => {
    setIncomingInvite(null);
  };

  const renderView = () => {
    if (
      (view === "endless" ||
        view === "profile" ||
        view === "challenge" ||
        view === "game" ||
        view === "daily" ||
        view === "liveGame" ||
        view === "liveLobby" ||
        view === "profileSettings" ||
        view === "leaderboard") &&
      !session
    ) {
      return <Auth setView={handleSetView} />;
    }

    switch (view) {
      case "liveGame":
        return (
          <LiveGameView
            session={session}
            matchId={activeLiveMatch}
            setView={handleSetView}
          />
        );
      case "liveLobby":
        return (
          <LiveLobbyView
            session={session}
            setView={handleSetView}
            setActiveLiveMatch={setActiveLiveMatch}
          />
        );
      case "game":
        return (
          <GameView
            setView={handleSetView}
            challenge={activeChallenge}
            session={session}
            onChallengeComplete={onChallengeComplete}
            dailyPuzzleInfo={activeDailyPuzzle}
            onDailyStepComplete={handleDailyStepComplete}
          />
        );
      case "endless":
        return <GameView setView={handleSetView} session={session} />;
      case "daily":
        return (
          <DailyChallengeView
            setView={handleSetView}
            session={session}
            setActiveDailyPuzzle={setActiveDailyPuzzle}
          />
        );
      case "auth":
        return <Auth setView={handleSetView} />;
      case "profile":
        return (
          <ProfileView
            setView={handleSetView}
            session={session}
            userId={viewPayload}
          />
        );
      case "challenge":
        return (
          <ChallengeView
            setView={handleSetView}
            session={session}
            setActiveChallenge={setActiveChallenge}
            setActiveLiveMatch={setActiveLiveMatch}
          />
        );
      case "profileSettings":
        return <ProfileSettingsView setView={handleSetView} session={session} />;
      case "leaderboard":
        return <LeaderboardView setView={handleSetView} />;
      case "contact": // 👈 NEW VIEW
        return (
          <div className="flex items-center justify-center min-h-screen bg-parchment p-6">
            <div className="p-8 bg-papyrus border border-sepia/20 rounded-2xl shadow-lg max-w-lg text-center">
              <h1 className="text-3xl font-bold text-gold-rush mb-4">
                Contact Me
              </h1>
              <p className="text-lg text-sepia mb-4">
                You can always reach me at:
              </p>
              <a
                href="mailto:GABRIEL@HISTORYCLUE.COM"
                className="text-xl font-semibold text-blue-700 underline"
              >
                GABRIEL@HISTORYCLUE.COM
              </a>
              <div className="mt-6">
                <button
                  onClick={() => handleSetView("menu")}
                  className="px-6 py-2 bg-gold-rush text-ink font-bold rounded-lg hover:bg-amber-600 transition-colors shadow-md"
                >
                  Back to Menu
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <MainMenu
            setView={handleSetView}
            session={session}
            onSignOut={handleSignOut}
          />
        );
    }
  };

  return (
    <>
      {incomingInvite && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-parchment p-8 rounded-lg shadow-lg text-center border-2 border-gold-rush">
            <h3 className="text-2xl font-serif font-bold text-ink">
              {incomingInvite.from_username || "A player"} has challenged you to
              a live match!
            </h3>
            <div className="flex gap-4 mt-6">
              <button
                onClick={acceptInvite}
                className="px-6 py-2 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800"
              >
                Accept
              </button>
              <button
                onClick={declineInvite}
                className="px-6 py-2 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800"
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