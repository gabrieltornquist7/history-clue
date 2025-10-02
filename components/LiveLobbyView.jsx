// components/LiveLobbyView.jsx
"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { createBattle, joinBattle, findBattleByInviteCode } from '../lib/battleDatabase';
import GlassBackButton from './GlassBackButton';

export default function LiveLobbyView({ session, setView, setBattleId }) {
  const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
  const [inviteCode, setInviteCode] = useState('');
  const [createdCode, setCreatedCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinError, setJoinError] = useState(null);
  
  const handleCreateBattle = async () => {
    setLoading(true);
    setError(null);
    
    const result = await createBattle(session.user.id);
    
    if (result) {
      setCreatedCode(result.inviteCode);
      setBattleId(result.battleId);
      setMode('create');
    } else {
      setError('Failed to create battle');
    }
    
    setLoading(false);
  };
  
  const handleJoinBattle = async () => {
    if (!inviteCode || inviteCode.length !== 6) {
      setJoinError('Please enter a 6-character invite code');
      return;
    }
    
    setLoading(true);
    setJoinError(null);
    
    // First validate the code
    const validation = await findBattleByInviteCode(inviteCode.toUpperCase());
    if (validation.error) {
      setJoinError(validation.error);
      setLoading(false);
      return;
    }
    
    // Check if trying to join own battle
    if (validation.battle.player1_id === session.user.id) {
      setJoinError('You cannot join your own battle');
      setLoading(false);
      return;
    }
    
    // Join the battle
    const result = await joinBattle(inviteCode.toUpperCase(), session.user.id);
    
    if (result.error) {
      setJoinError(result.error);
    } else {
      setBattleId(result.battleId);
      setView('liveGame');
    }
    
    setLoading(false);
  };
  
  const copyInviteCode = () => {
    navigator.clipboard.writeText(createdCode);
  };
  
  // Realtime subscription to detect when opponent joins
  useEffect(() => {
    if (!mode || mode !== 'create' || !createdCode) return;
    
    // Subscribe to battle updates
    const channel = supabase
      .channel(`battle-lobby:${createdCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `invite_code=eq.${createdCode}`
        },
        (payload) => {
          console.log('Battle updated:', payload);
          // If player2 has joined and status is active, redirect to game
          if (payload.new.player2_id && payload.new.status === 'active') {
            setBattleId(payload.new.id);
            setView('liveGame');
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, createdCode, setBattleId, setView]);
  
  if (mode === 'create' && createdCode) {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center p-4"
        style={{
          background: `
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%)
          `
        }}
      >
        <GlassBackButton onClick={() => setView('menu')} fallbackUrl="/" />
        
        <div 
          className="backdrop-blur rounded-xl p-8 max-w-md w-full text-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div className="mb-6">
            <div className="text-6xl mb-4">⚔️</div>
            <h2 
              className="text-3xl font-serif font-bold text-white mb-2"
              style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
            >
              Battle Created!
            </h2>
            <p className="text-gray-400">Share this code with your opponent</p>
          </div>
          
          <div 
            className="backdrop-blur rounded-lg p-6 mb-6"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(212, 175, 55, 0.3)'
            }}
          >
            <p className="text-sm text-gray-400 mb-2">Invite Code</p>
            <p 
              className="text-5xl font-bold font-mono tracking-wider mb-4"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 20px rgba(212, 175, 55, 0.5)'
              }}
            >
              {createdCode}
            </p>
            <button
              onClick={copyInviteCode}
              className="px-6 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
            >
              📋 Copy Code
            </button>
          </div>
          
          <div className="space-y-3">
            <p className="text-gray-400 text-sm">Waiting for opponent to join...</p>
            <div className="flex justify-center">
              <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
          
          <button
            onClick={() => setView('menu')}
            className="mt-6 px-6 py-3 bg-gray-800 text-gray-300 font-medium rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel Battle
          </button>
        </div>
      </div>
    );
  }
  
  if (mode === 'join') {
    return (
      <div 
        className="min-h-screen relative flex items-center justify-center p-4"
        style={{
          background: `
            linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%)
          `
        }}
      >
        <GlassBackButton onClick={() => setMode('menu')} fallbackUrl="/" />
        
        <div 
          className="backdrop-blur rounded-xl p-8 max-w-md w-full"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid rgba(212, 175, 55, 0.3)'
          }}
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎮</div>
            <h2 
              className="text-3xl font-serif font-bold text-white mb-2"
              style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
            >
              Join Battle
            </h2>
            <p className="text-gray-400">Enter your opponent's invite code</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                maxLength={6}
                placeholder="XXXXXX"
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-md text-white text-center font-mono text-2xl tracking-wider focus:border-yellow-500 focus:outline-none"
                style={{ color: '#d4af37' }}
              />
            </div>
            
            {joinError && (
              <div 
                className="p-3 rounded-lg text-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}
              >
                <p className="text-red-400 text-sm">{joinError}</p>
              </div>
            )}
            
            <button
              onClick={handleJoinBattle}
              disabled={loading || inviteCode.length !== 6}
              className="w-full px-8 py-4 font-bold text-white rounded-md transition-all disabled:opacity-50"
              style={{ 
                background: inviteCode.length === 6 ? 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' : '#374151'
              }}
            >
              {loading ? 'Joining...' : 'Join Battle'}
            </button>
            
            <button
              onClick={() => setMode('menu')}
              className="w-full px-6 py-3 bg-gray-800 text-gray-300 font-medium rounded-md hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Main menu
  return (
    <div 
      className="min-h-screen relative flex items-center justify-center p-4"
      style={{
        background: `
          linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a2a2a 100%),
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.015) 0%, transparent 50%)
        `
      }}
    >
      <GlassBackButton onClick={() => setView('menu')} fallbackUrl="/" />
      
      <div 
        className="backdrop-blur rounded-xl p-8 max-w-md w-full"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid rgba(212, 175, 55, 0.3)'
        }}
      >
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚔️</div>
          <h2 
            className="text-4xl font-serif font-bold text-white mb-2"
            style={{ textShadow: '0 0 20px rgba(212, 175, 55, 0.5)' }}
          >
            Live Battle
          </h2>
          <p className="text-gray-400">Real-time 1v1 historical showdown</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleCreateBattle}
            disabled={loading}
            className="w-full px-8 py-4 font-bold text-white rounded-md transition-all"
            style={{ 
              background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.boxShadow = '0 0 0 2px rgba(212, 175, 55, 0.4), 0 15px 40px rgba(139, 0, 0, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = 'none';
            }}
          >
            {loading ? 'Creating...' : '🎯 Create Battle'}
          </button>
          
          <button
            onClick={() => setMode('join')}
            className="w-full px-8 py-4 font-bold text-white rounded-md transition-all border-2"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: 'rgba(212, 175, 55, 0.3)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(212, 175, 55, 0.7)';
              e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(212, 175, 55, 0.3)';
              e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            }}
          >
            🎮 Join with Code
          </button>
          
          {error && (
            <div 
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444' }}
            >
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <h3 className="text-yellow-500 font-bold mb-2 text-sm">How it works:</h3>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Best 2 out of 3 rounds</li>
            <li>• Same puzzle, who gets it right?</li>
            <li>• 3 minutes per round</li>
            <li>• Speed round if opponent submits first</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
