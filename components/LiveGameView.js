// components/LiveGameView.js
"use client";
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('./Map'), { ssr: false });

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
    const [results, setResults] = useState(null);

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
            const { data: matchData, error: matchError } = await supabase
                .from('live_matches')
                .select('*, player1:player1_id(username), player2:player2_id(username)')
                .eq('id', matchId)
                .single();

            if (matchError) { setError('Could not load match data.'); return; }
            setMatch(matchData);

            const puzzleId = matchData.puzzle_ids[matchData.current_round - 1];
            const { data: puzzleData, error: puzzleError } = await supabase
                .from('puzzles')
                .select('*, puzzle_translations(*)')
                .eq('id', puzzleId)
                .single();
            
            if (puzzleError) { setError('Could not load puzzle data.'); } else { setPuzzle(puzzleData); }
            setLoading(false);
        };
        fetchMatchData();
    }, [matchId]);

    useEffect(() => {
        if (!matchId) return;
        const newChannel = supabase.channel(`match:${matchId}`);
        newChannel
            .on('broadcast', { event: 'clue:unlock' }, ({ payload }) => {
                if (payload.sender !== session.user.id) setOpponentState(prev => ({ ...prev, unlockedClues: [...new Set([...prev.unlockedClues, payload.clue])] }));
            })
            .on('broadcast', { event: 'guess:location' }, ({ payload }) => {
                 if (payload.sender !== session.user.id) setOpponentState(prev => ({ ...prev, guessCoords: payload.coords }));
            })
             .on('broadcast', { event: 'guess:year' }, ({ payload }) => {
                 if (payload.sender !== session.user.id) setOpponentState(prev => ({ ...prev, selectedYear: payload.year }));
            })
            .on('broadcast', { event: 'guess:submit' }, ({ payload }) => {
                if (payload.sender !== session.user.id) {
                    setOpponentState(prev => ({...prev, submitted: true}));
                    setTimer(prev => Math.min(prev, 30));
                }
            })
            .subscribe();
        setChannel(newChannel);
        return () => supabase.removeChannel(newChannel);
    }, [matchId, session.user.id]);

    useEffect(() => {
        if (!loading && timer > 0 && !(myState.submitted && opponentState.submitted)) {
            const interval = setInterval(() => setTimer(t => t - 1), 1000);
            return () => clearInterval(interval);
        }
    }, [loading, timer, myState.submitted, opponentState.submitted]);

    useEffect(() => {
        const concludeRound = async () => {
            if (myState.submitted && opponentState.submitted && !results) {
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
        const cost = CLUE_COSTS[clueNumber];
        if (myState.score >= cost && !myState.unlockedClues.includes(clueNumber)) {
            setMyState(prev => ({ ...prev, score: prev.score - cost, unlockedClues: [...prev.unlockedClues, clueNumber].sort() }));
            broadcast('clue:unlock', { clue: clueNumber });
        }
    };
    
    const handleMapGuess = (latlng) => {
        if(myState.submitted) return;
        setMyState(prev => ({...prev, guessCoords: latlng}));
        broadcast('guess:location', { coords: latlng });
    };

    const handleYearChange = (e) => {
        const year = e.target.value;
        if(myState.submitted) return;
        setMyState(prev => ({...prev, selectedYear: year}));
        broadcast('guess:year', { year });
    };

    const handleGuessSubmit = async () => {
        if (!myState.guessCoords) return alert('Please place a pin on the map.');
        setMyState(prev => ({...prev, submitted: true}));
        broadcast('guess:submit', {});
    };

    const displayYear = (year) => { const yearNum = Number(year); if (yearNum < 0) return `${Math.abs(yearNum)} BC`; return yearNum; };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Match...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center">Error: {error} <button onClick={() => setView('menu')}>Home</button></div>;

    const opponentUsername = match?.player1_id === session.user.id ? match?.player2.username : match?.player1.username;

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-serif font-bold text-gold-rush">Live Match vs. {opponentUsername}</h1>
                <div className="text-4xl font-bold text-red-600">{Math.floor(timer/60)}:{('0' + timer % 60).slice(-2)}</div>
            </header>
            
            <div className="p-4 bg-papyrus border border-sepia/20 rounded-lg shadow-sm mb-8">
                {myState.unlockedClues.map(num => (
                    <p key={num} className="text-sepia-dark">{puzzle?.puzzle_translations?.[0]?.[`clue_${num}_text`]}</p>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-4">Your Guess</h2>
                    <div className="p-4 border border-sepia/20 rounded-lg bg-papyrus shadow-lg space-y-4">
                        <Map onGuess={handleMapGuess} opponentPosition={opponentState.guessCoords} initialPosition={myState.guessCoords} />
                        <div>
                            <label className="block text-sm font-bold mb-1 text-ink">Year</label>
                            <input type="range" min={-4000} max={2025} value={myState.selectedYear} onChange={handleYearChange} className="w-full accent-sepia-dark" disabled={myState.submitted}/>
                            <div className="mt-2 text-center text-sm text-ink">Guess year:{' '}<span className="font-bold text-lg">{displayYear(myState.selectedYear)}</span></div>
                        </div>
                        <button onClick={handleGuessSubmit} disabled={myState.submitted} className="px-8 py-3 bg-sepia-dark text-white font-bold text-lg rounded-lg hover:bg-ink disabled:bg-sepia/50">
                            {myState.submitted ? 'Waiting for opponent...' : 'Lock In Guess'}
                        </button>
                    </div>
                </div>
                <div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-4">{opponentUsername}&apos;s Actions</h2>
                    <div className="p-4 border border-sepia/20 rounded-lg bg-papyrus shadow-lg space-y-4 opacity-70">
                        <Map opponentPosition={opponentState.guessCoords} />
                         <div className="mt-2 text-center text-sm text-ink">Opponent&apos;s Year Guess:{' '}<span className="font-bold text-lg">{displayYear(opponentState.selectedYear)}</span></div>
                        <div className="flex justify-around">
                            {[1,2,3,4,5].map(num => (
                                <div key={num} className={`p-2 text-sm rounded ${opponentState.unlockedClues.includes(num) ? 'bg-gold-rush text-ink' : 'bg-sepia/20'}`}>
                                    Clue {num}
                                </div>
                            ))}
                        </div>
                         {opponentState.submitted && <p className="text-center font-bold text-green-600 animate-pulse">Opponent has submitted!</p>}
                    </div>
                </div>
            </div>

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