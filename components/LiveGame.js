// components/LiveGameView.js
"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';

// Dynamically import the Map component to prevent SSR issues
const Map = dynamic(() => import('./Map'), { ssr: false });

// Helper function to calculate distance
const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function LiveGameView({ session, matchId, setView }) {
    const [match, setMatch] = useState(null);
    const [puzzle, setPuzzle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [channel, setChannel] = useState(null);
    const [timer, setTimer] = useState(180);

    // Player states
    const [myState, setMyState] = useState({ unlockedClues: [1], score: 10000, guessCoords: null, selectedYear: 1950, submitted: false });
    const [opponentState, setOpponentState] = useState({ unlockedClues: [1], guessCoords: null, selectedYear: 1950, submitted: false });
    
    const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

    // Memoize broadcast function
    const broadcast = useCallback((event, payload) => {
        if (channel) {
            channel.track({ event, payload });
        }
    }, [channel]);

    // Fetch initial match and puzzle data
    useEffect(() => {
        const fetchMatchData = async () => {
            const { data: matchData, error: matchError } = await supabase
                .from('live_matches')
                .select('*, player1:player1_id(username), player2:player2_id(username)')
                .eq('id', matchId)
                .single();

            if (matchError) {
                setError('Could not load match data.');
                return;
            }
            setMatch(matchData);

            const puzzleId = matchData.puzzle_ids[matchData.current_round - 1];
            const { data: puzzleData, error: puzzleError } = await supabase
                .from('puzzles')
                .select('*, puzzle_translations(*)')
                .eq('id', puzzleId)
                .single();
            
            if (puzzleError) {
                setError('Could not load puzzle data.');
            } else {
                setPuzzle(puzzleData);
            }
            setLoading(false);
        };
        fetchMatchData();
    }, [matchId]);

    // Subscribe to the real-time channel
    useEffect(() => {
        const newChannel = supabase.channel(`match:${matchId}`);
        newChannel
            .on('presence', { event: 'sync' }, () => {
                // Handle presence updates if needed
            })
            .on('broadcast', { event: 'clue:unlock' }, ({ payload }) => {
                if (payload.sender !== session.user.id) {
                    setOpponentState(prev => ({ ...prev, unlockedClues: [...prev.unlockedClues, payload.clue] }));
                }
            })
            .on('broadcast', { event: 'guess:location' }, ({ payload }) => {
                 if (payload.sender !== session.user.id) {
                    setOpponentState(prev => ({ ...prev, guessCoords: payload.coords }));
                }
            })
             .on('broadcast', { event: 'guess:year' }, ({ payload }) => {
                 if (payload.sender !== session.user.id) {
                    setOpponentState(prev => ({ ...prev, selectedYear: payload.year }));
                }
            })
            .on('broadcast', { event: 'guess:submit' }, ({ payload }) => {
                if (payload.sender !== session.user.id) {
                    setOpponentState(prev => ({...prev, submitted: true}));
                    setTimer(prev => Math.min(prev, 30)); // Pressure timer!
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    newChannel.track({ user: session.user.id });
                }
            });

        setChannel(newChannel);

        return () => {
            supabase.removeChannel(newChannel);
        };
    }, [matchId, session.user.id]);

    // Timer countdown effect
    useEffect(() => {
        if (!loading && timer > 0) {
            const interval = setInterval(() => {
                setTimer(t => t - 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [loading, timer]);

    const handleUnlockClue = (clueNumber) => {
        const cost = CLUE_COSTS[clueNumber];
        if (myState.score >= cost && !myState.unlockedClues.includes(clueNumber)) {
            setMyState(prev => ({
                ...prev,
                score: prev.score - cost,
                unlockedClues: [...prev.unlockedClues, clueNumber].sort()
            }));
            broadcast('clue:unlock', { clue: clueNumber, sender: session.user.id });
        }
    };
    
    // Handlers for player actions that broadcast to the opponent
    const handleMapGuess = (latlng) => {
        setMyState(prev => ({...prev, guessCoords: latlng}));
        broadcast('guess:location', { coords: latlng, sender: session.user.id });
    };

    const handleYearChange = (year) => {
        setMyState(prev => ({...prev, selectedYear: year}));
        broadcast('guess:year', { year, sender: session.user.id });
    };

    const handleGuessSubmit = async () => {
        if (!myState.guessCoords) {
            return alert('Please place a pin on the map.');
        }
        setMyState(prev => ({...prev, submitted: true}));
        broadcast('guess:submit', { sender: session.user.id });
        // Add logic here to submit the final guess to a Supabase function
        // for scoring after both players have submitted. For now, this just
        // handles the UI and timer logic.
    };

    // UI rendering and other logic...
    if (loading) return <div>Loading Match...</div>;
    if (error) return <div>Error: {error}</div>;

    const opponentUsername = match.player1_id === session.user.id ? match.player2.username : match.player1.username;

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-serif font-bold text-gold-rush">Live Match vs. {opponentUsername}</h1>
                <div className="text-4xl font-bold text-red-600">{Math.floor(timer/60)}:{('0' + timer % 60).slice(-2)}</div>
            </header>
            
            {/* Display puzzle clues */}
            <div className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm mb-8">
                {myState.unlockedClues.map(num => (
                    <p key={num} className="text-sepia-dark">{puzzle?.puzzle_translations?.[0]?.[`clue_${num}_text`]}</p>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* My View */}
                <div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-4">Your Guess</h2>
                    <div className="p-4 border border-sepia/20 rounded-lg bg-papyrus shadow-lg space-y-4">
                        <Map onGuess={handleMapGuess} />
                        {/* More UI for year selection, clue buttons, submit button */}
                        <button onClick={handleGuessSubmit} disabled={myState.submitted} className="px-8 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink">
                            {myState.submitted ? 'Waiting for opponent...' : 'Lock In Guess'}
                        </button>
                    </div>
                </div>
                {/* Opponent's View */}
                <div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-4">{opponentUsername}'s Actions</h2>
                    <div className="p-4 border border-sepia/20 rounded-lg bg-papyrus shadow-lg space-y-4 opacity-70">
                        {/* A simplified map showing only the opponent's pin */}
                        <div className="h-64 md:h-80 w-full rounded-lg overflow-hidden border-2 border-sepia-dark shadow-lg">
                            <Map onGuess={() => {}} /> 
                            {/* We'd need to enhance the Map component to show a second, non-interactive pin */}
                        </div>
                        {/* UI showing opponent's unlocked clues */}
                        <div className="flex justify-around">
                            {[1,2,3,4,5].map(num => (
                                <div key={num} className={`p-2 rounded ${opponentState.unlockedClues.includes(num) ? 'bg-gold-rush' : 'bg-sepia/20'}`}>
                                    Clue {num}
                                </div>
                            ))}
                        </div>
                         {opponentState.submitted && <p className="text-center font-bold text-green-600">Opponent has submitted!</p>}
                    </div>
                </div>
            </div>
        </main>
    );
}