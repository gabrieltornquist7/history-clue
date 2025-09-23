// components/LiveGameView.js
"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), { ssr: false });

// (getDistance function remains the same)
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
    const [results, setResults] = useState(null); // <-- NEW: To show results screen

    const [myState, setMyState] = useState({ unlockedClues: [1], score: 10000, guessCoords: null, selectedYear: 1950, submitted: false });
    const [opponentState, setOpponentState] = useState({ unlockedClues: [1], guessCoords: null, selectedYear: 1950, submitted: false });
    
    const CLUE_COSTS = { 1: 0, 2: 1000, 3: 1500, 4: 2000, 5: 3000 };

    const broadcast = useCallback((event, payload) => {
        if (channel) {
            channel.send({
                type: 'broadcast',
                event,
                payload: { ...payload, sender: session.user.id }
            });
        }
    }, [channel, session.user.id]);

    useEffect(() => {
        const fetchMatchData = async () => {
            // ... (rest of the function is the same)
        };
        fetchMatchData();
    }, [matchId]);

    useEffect(() => {
        if (!matchId) return;
        const newChannel = supabase.channel(`match:${matchId}`);
        newChannel
            // ... (rest of the channel subscriptions are the same)
            .subscribe((status, err) => { // <-- NEW: Add error handling
                if (status === 'SUBSCRIBE_FAILED') {
                    setError('Failed to connect for the live match. Please try again.');
                }
                if (err) {
                    console.error("Channel subscription error:", err);
                    setError('An error occurred during the match. Please try again.');
                }
            });
        setChannel(newChannel);
        return () => supabase.removeChannel(newChannel);
    }, [matchId, session.user.id]);

    useEffect(() => {
        if (!loading && timer > 0 && !results) { // <-- MODIFIED: Stop timer if results are shown
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [loading, timer, results]);

    // --- NEW: This entire useEffect block handles the game conclusion ---
    useEffect(() => {
        const concludeRound = async () => {
            if (myState.submitted && opponentState.submitted && !results) {
                // Both players have submitted, now calculate results
                const mePlayer1 = match.player1_id === session.user.id;
                
                const calculateScore = (state) => {
                    const distance = getDistance(state.guessCoords.lat, state.guessCoords.lng, parseFloat(puzzle.latitude), parseFloat(puzzle.longitude));
                    const maxDistance = 20000;
                    const distancePenalty = (distance / maxDistance) * 5000;
                    const yearDifference = Math.abs(state.selectedYear - puzzle.year);
                    const timePenalty = yearDifference * 25;
                    const initialScore = 10000 - (10000 - state.score);
                    let finalScore = Math.max(0, initialScore - distancePenalty - timePenalty);
                    if (distance < 50) finalScore += 2000; else if (distance < 200) finalScore += 1000;
                    return Math.min(15000, Math.round(finalScore));
                };

                const myFinalScore = calculateScore(myState);
                const opponentFinalScore = calculateScore(opponentState);

                const updatePayload = {
                    status: 'completed',
                    winner_id: myFinalScore > opponentFinalScore ? session.user.id : (opponentFinalScore > myFinalScore ? (mePlayer1 ? match.player2_id : match.player1_id) : null), // null for a draw
                    p1_score: mePlayer1 ? myFinalScore : opponentFinalScore,
                    p2_score: mePlayer1 ? opponentFinalScore : myFinalScore,
                };
                
                await supabase.from('live_matches').update(updatePayload).eq('id', match.id);

                setResults({ myFinalScore, opponentFinalScore, puzzle });
            }
        };

        concludeRound();
    }, [myState.submitted, opponentState.submitted, match, puzzle, results, session.user.id]);


    const handleUnlockClue = (clueNumber) => {
        // ... (function is the same)
    };
    
    const handleMapGuess = (latlng) => {
       // ... (function is the same)
    };

    const handleYearChange = (e) => {
       // ... (function is the same)
    };

    const handleGuessSubmit = async () => {
        if (!myState.guessCoords) return alert('Please place a pin on the map.');
        setMyState(prev => ({...prev, submitted: true}));
        broadcast('guess:submit', {});
        // --- MODIFIED ---
        // Improve timer logic: only drop to 30s if current time is higher
        setTimer(prev => Math.min(prev, 30)); 
    };
    
    // ... (rest of the component is mostly the same, but add the results screen)
    
    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {/* ... (header and main game grid) ... */}

            {/* --- NEW: Results Screen --- */}
            {results && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-parchment p-8 rounded-2xl shadow-2xl w-full max-w-md text-center border-2 border-gold-rush">
                        <h2 className="text-3xl font-serif font-bold text-ink mb-4">Round Over!</h2>
                        <div className="space-y-2 my-6">
                            <p>Correct Answer: <span className="font-bold">{results.puzzle.city_name}</span> in <span className="font-bold">{results.puzzle.year}</span></p>
                            <p>Your Score: <span className="font-bold text-gold-rush">{results.myFinalScore.toLocaleString()}</span></p>
                            <p>{opponentUsername}&apos;s Score: <span className="font-bold text-sepia">{results.opponentFinalScore.toLocaleString()}</span></p>
                        </div>
                        <h3 className={`text-2xl font-serif font-bold mb-6 ${results.myFinalScore > results.opponentFinalScore ? 'text-green-600' : 'text-red-600'}`}>
                            {results.myFinalScore > results.opponentFinalScore ? 'You Win!' : (results.myFinalScore < results.opponentFinalScore ? 'You Lose' : 'It\'s a Draw!')}
                        </h3>
                        <button onClick={() => setView('challenge')} className="p-4 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink w-full">Back to Challenges</button>
                    </div>
                </div>
            )}
        </main>
    );
}