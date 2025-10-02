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
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.025) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(139, 0, 0, 0.015) 0%, transparent 50%)
          `
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-96 h-96 rounded-full"
            style={{
              top: '10%',
              right: '10%',
              background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
              animation: 'pulse 4s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute w-96 h-96 rounded-full"
            style={{
              bottom: '10%',
              left: '10%',
              background: 'radial-gradient(circle, rgba(139, 0, 0, 0.06) 0%, transparent 70%)',
              animation: 'pulse 6s ease-in-out infinite'
            }}
          />
        </div>
        
        <style jsx global>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
        
        <GlassBackButton onClick={() => setView('menu')} fallbackUrl="/" />
        
        <div 
          className="backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center relative z-10"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)',
            animation: 'fadeInScale 0.4s ease-out'
          }}
        >
          {/* Status Badge */}
          <div className="mb-6">
            <div 
              className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
              style={{
                background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(139, 0, 0, 0.4)'
              }}
            >
              Battle Created
            </div>
            
            <h2 
              className="text-3xl font-serif font-bold text-white mb-2"
              style={{ textShadow: '0 0 30px rgba(212, 175, 55, 0.6)' }}
            >
              Waiting for Opponent
            </h2>
            <p className="text-gray-400 text-sm">Share this code to start the battle</p>
          </div>
          
          {/* Invite Code Display */}
          <div 
            className="backdrop-blur-xl rounded-xl p-8 mb-6 relative overflow-hidden"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: '2px solid rgba(212, 175, 55, 0.4)',
              boxShadow: 'inset 0 0 30px rgba(212, 175, 55, 0.1)'
            }}
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.1) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s linear infinite'
              }}
            />
            
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3 font-bold">Battle Code</p>
            <p 
              className="text-6xl font-bold font-mono tracking-widest mb-6 select-all"
              style={{ 
                color: '#d4af37',
                textShadow: '0 0 30px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.3)',
                letterSpacing: '0.2em'
              }}
            >
              {createdCode}
            </p>
            
            <button
              onClick={copyInviteCode}
              className="px-6 py-3 rounded-lg font-medium transition-all duration-300 group"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.15)';
                e.target.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Code
              </span>
            </button>
          </div>
          
          {/* Waiting Indicator */}
          <div className="mb-6">
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div 
                  className="w-12 h-12 border-3 rounded-full"
                  style={{
                    borderColor: 'rgba(212, 175, 55, 0.2)',
                    borderTopColor: '#d4af37',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <div 
                  className="absolute inset-0 w-12 h-12 border-3 rounded-full"
                  style={{
                    borderColor: 'transparent',
                    borderTopColor: 'rgba(139, 0, 0, 0.5)',
                    animation: 'spin 1.5s linear infinite reverse'
                  }}
                />
              </div>
            </div>
            <p className="text-gray-400 text-sm font-medium">Waiting for opponent to join...</p>
            <p className="text-gray-500 text-xs mt-1">Battle will start automatically</p>
          </div>
          
          {/* Cancel Button */}
          <button
            onClick={() => setView('menu')}
            className="w-full px-6 py-3 font-medium rounded-lg transition-all duration-300"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#9ca3af'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
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
            radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.025) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(139, 0, 0, 0.015) 0%, transparent 50%)
          `
        }}
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            className="absolute w-96 h-96 rounded-full"
            style={{
              top: '10%',
              right: '10%',
              background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
              animation: 'pulse 4s ease-in-out infinite'
            }}
          />
          <div 
            className="absolute w-96 h-96 rounded-full"
            style={{
              bottom: '10%',
              left: '10%',
              background: 'radial-gradient(circle, rgba(139, 0, 0, 0.06) 0%, transparent 70%)',
              animation: 'pulse 6s ease-in-out infinite'
            }}
          />
        </div>
        
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
        
        <GlassBackButton onClick={() => setMode('menu')} fallbackUrl="/" />
        
        <div 
          className="backdrop-blur-xl rounded-2xl p-8 max-w-md w-full relative z-10"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)',
            animation: 'fadeInScale 0.4s ease-out'
          }}
        >
          <div className="text-center mb-6">
            <div 
              className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
              style={{
                background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.1) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37'
              }}
            >
              Join Battle
            </div>
            
            <h2 
              className="text-3xl font-serif font-bold text-white mb-2"
              style={{ textShadow: '0 0 30px rgba(212, 175, 55, 0.6)' }}
            >
              Enter Battle Code
            </h2>
            <p className="text-gray-400 text-sm">Input the 6-character code from your opponent</p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-3 font-medium uppercase tracking-wider text-xs">Battle Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                maxLength={6}
                placeholder="XXXXXX"
                className="w-full px-4 py-4 rounded-lg text-white text-center font-mono tracking-widest focus:outline-none transition-all duration-300"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  border: '2px solid rgba(212, 175, 55, 0.3)',
                  color: '#d4af37',
                  fontSize: '2rem',
                  letterSpacing: '0.3em',
                  textShadow: '0 0 10px rgba(212, 175, 55, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(212, 175, 55, 0.6)';
                  e.target.style.boxShadow = '0 0 0 4px rgba(212, 175, 55, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(212, 175, 55, 0.3)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {inviteCode && inviteCode.length > 0 && (
                <div className="mt-2 text-center">
                  <span className="text-xs text-gray-500">
                    {inviteCode.length} / 6 characters
                  </span>
                </div>
              )}
            </div>
            
            {joinError && (
              <div 
                className="p-4 rounded-lg text-center backdrop-blur"
                style={{ 
                  backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">{joinError}</p>
                </div>
              </div>
            )}
            
            <button
              onClick={handleJoinBattle}
              disabled={loading || inviteCode.length !== 6}
              className="w-full px-8 py-4 font-bold text-white rounded-lg transition-all duration-300 relative overflow-hidden group"
              style={{ 
                background: inviteCode.length === 6 && !loading 
                  ? 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)' 
                  : 'rgba(55, 65, 81, 0.5)',
                opacity: loading || inviteCode.length !== 6 ? 0.5 : 1,
                cursor: loading || inviteCode.length !== 6 ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if (inviteCode.length === 6 && !loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining Battle...
                </span>
              ) : (
                'Join Battle'
              )}
            </button>
            
            <button
              onClick={() => setMode('menu')}
              className="w-full px-6 py-3 font-medium rounded-lg transition-all duration-300"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#9ca3af'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
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
          radial-gradient(circle at 30% 20%, rgba(212, 175, 55, 0.025) 0%, transparent 50%),
          radial-gradient(circle at 70% 80%, rgba(139, 0, 0, 0.015) 0%, transparent 50%)
        `
      }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 rounded-full"
          style={{
            top: '10%',
            right: '10%',
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.08) 0%, transparent 70%)',
            animation: 'pulse 4s ease-in-out infinite'
          }}
        />
        <div 
          className="absolute w-96 h-96 rounded-full"
          style={{
            bottom: '10%',
            left: '10%',
            background: 'radial-gradient(circle, rgba(139, 0, 0, 0.06) 0%, transparent 70%)',
            animation: 'pulse 6s ease-in-out infinite'
          }}
        />
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
      
      <GlassBackButton onClick={() => setView('menu')} fallbackUrl="/" />
      
      <div 
        className="backdrop-blur-xl rounded-2xl p-8 max-w-md w-full relative z-10"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 175, 55, 0.1)',
          animation: 'fadeInScale 0.4s ease-out'
        }}
      >
        <div className="text-center mb-8">
          {/* NEW Badge */}
          <div 
            className="inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
            style={{
              background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(139, 0, 0, 0.4)',
              animation: 'float 3s ease-in-out infinite'
            }}
          >
            New Feature
          </div>
          
          <h2 
            className="text-4xl font-serif font-bold text-white mb-3"
            style={{ textShadow: '0 0 30px rgba(212, 175, 55, 0.6)' }}
          >
            Live Battle
          </h2>
          <p className="text-gray-400 leading-relaxed">
            Challenge players worldwide in real-time historical showdowns
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleCreateBattle}
            disabled={loading}
            className="w-full px-8 py-5 font-bold text-white rounded-xl transition-all duration-300 relative overflow-hidden group"
            style={{ 
              background: 'linear-gradient(135deg, #8b0000 0%, #a52a2a 100%)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              boxShadow: '0 10px 30px rgba(139, 0, 0, 0.4)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'translateY(-3px)';
                e.target.style.boxShadow = '0 15px 40px rgba(139, 0, 0, 0.6), 0 0 0 2px rgba(212, 175, 55, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 10px 30px rgba(139, 0, 0, 0.4)';
            }}
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s linear infinite'
              }}
            />
            
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Battle...
              </span>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-lg font-bold">Create Battle</div>
                  <div className="text-xs font-normal text-gray-300 opacity-90 mt-0.5">
                    Generate invite code
                  </div>
                </div>
                <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            )}
          </button>
          
          <button
            onClick={() => setMode('join')}
            className="w-full px-8 py-5 font-bold text-white rounded-xl transition-all duration-300 border-2 relative overflow-hidden group"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              borderColor: 'rgba(212, 175, 55, 0.3)',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = 'rgba(212, 175, 55, 0.6)';
              e.target.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = 'rgba(212, 175, 55, 0.3)';
              e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <div className="flex items-center justify-between">
              <div className="text-left">
                <div className="text-lg font-bold">Join with Code</div>
                <div className="text-xs font-normal text-gray-400 mt-0.5">
                  Enter 6-character code
                </div>
              </div>
              <svg className="w-6 h-6 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
          </button>
          
          {error && (
            <div 
              className="p-4 rounded-lg text-center backdrop-blur"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.3)'
              }}
            >
              <div className="flex items-center justify-center gap-2 text-red-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Info */}
        <div 
          className="mt-8 p-5 rounded-xl backdrop-blur"
          style={{ 
            backgroundColor: 'rgba(212, 175, 55, 0.05)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }}
        >
          <h3 
            className="font-bold mb-3 text-sm uppercase tracking-wider"
            style={{ color: '#d4af37' }}
          >
            How it Works
          </h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#d4af37' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Best 2 out of 3 rounds</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#d4af37' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Same puzzle, who solves it best?</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#d4af37' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>3 minutes per round, speed bonus</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
