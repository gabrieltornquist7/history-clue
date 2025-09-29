import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LiveBattleViewDebug({ session, setView }) {
  const [logs, setLogs] = useState([]);
  const [battle, setBattle] = useState(null);
  const [inviteCode, setInviteCode] = useState('');

  const addLog = (message, data = null) => {
    console.log(message, data);
    setLogs(prev => [...prev, {
      time: new Date().toLocaleTimeString(),
      message,
      data
    }]);
  };

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      addLog('Component mounted', {
        propUser: session?.user?.id,
        authUser: authUser?.id,
        matching: session?.user?.id === authUser?.id
      });
    };
    checkAuth();
  }, [session]);

  const createBattle = async () => {
    addLog('Creating battle...');

    try {
      // Generate code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      addLog('Generated code', code);

      // Create battle
      const { data, error } = await supabase
        .from('battles')
        .insert({
          player1: session.user.id,
          invite_code: code,
          status: 'waiting',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        addLog('CREATE ERROR', error);
        return;
      }

      addLog('Battle created', data);
      setBattle(data);
      setInviteCode(code);

      // Subscribe to updates
      const channel = supabase
        .channel(`battle-${data.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'battles',
            filter: `id=eq.${data.id}`
          },
          (payload) => {
            addLog('Realtime update', payload);
            if (payload.new) {
              setBattle(payload.new);
            }
          }
        )
        .subscribe((status) => {
          addLog('Subscription status', status);
        });

    } catch (err) {
      addLog('Unexpected error', err.message);
    }
  };

  const joinBattle = async () => {
    const code = inviteCode.toUpperCase();
    addLog('Joining with code', code);

    try {
      // Step 1: Find the battle
      addLog('Finding battle...');
      const { data: foundBattle, error: findError } = await supabase
        .from('battles')
        .select('*')
        .eq('invite_code', code)
        .eq('status', 'waiting')
        .single();

      if (findError) {
        addLog('FIND ERROR', findError);
        return;
      }

      addLog('Found battle', foundBattle);

      // Step 2: Check if it's our own battle
      if (foundBattle.player1 === session.user.id) {
        addLog('ERROR: Cannot join own battle');
        return;
      }

      // Step 3: Join the battle
      addLog('Updating battle...');
      const { data: updatedBattle, error: updateError } = await supabase
        .from('battles')
        .update({
          player2: session.user.id,
          status: 'active'
        })
        .eq('id', foundBattle.id)
        .select()
        .single();

      if (updateError) {
        addLog('UPDATE ERROR', updateError);
        return;
      }

      addLog('Successfully joined', updatedBattle);
      setBattle(updatedBattle);

      // Subscribe to updates
      const channel = supabase
        .channel(`battle-${updatedBattle.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'battles',
            filter: `id=eq.${updatedBattle.id}`
          },
          (payload) => {
            addLog('Realtime update', payload);
            if (payload.new) {
              setBattle(payload.new);
            }
          }
        )
        .subscribe((status) => {
          addLog('Subscription status', status);
        });

    } catch (err) {
      addLog('Unexpected error', err.message);
    }
  };

  const testDatabaseAccess = async () => {
    addLog('Testing database access...');

    try {
      // Test 1: Check current user
      const { data: { user } } = await supabase.auth.getUser();
      addLog('Current user', { id: user?.id, email: user?.email });

      // Test 2: Try to select waiting battles
      const { data: waitingBattles, error: selectError } = await supabase
        .from('battles')
        .select('id, invite_code, status, player1, player2')
        .eq('status', 'waiting')
        .limit(5);

      if (selectError) {
        addLog('SELECT ERROR', selectError);
      } else {
        addLog('Found waiting battles', waitingBattles);
      }

      // Test 3: Check RLS function
      const { data: rlsTest, error: rlsError } = await supabase
        .rpc('auth.uid');

      if (rlsError) {
        addLog('RLS TEST ERROR', rlsError);
      } else {
        addLog('RLS user ID', rlsTest);
      }

    } catch (err) {
      addLog('Database test error', err.message);
    }
  };

  return (
    <div
      className="min-h-screen p-4"
      style={{
        background: `
          linear-gradient(145deg, #0d0d0d 0%, #1a1a1a 40%, #2a2a2a 100%),
          radial-gradient(circle at 25% 25%, rgba(255, 215, 0, 0.05), transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.04), transparent 50%)
        `,
        backgroundBlendMode: "overlay",
      }}
    >
      <button
        onClick={() => setView('menu')}
        className="mb-4 px-4 py-2 bg-white/20 text-white rounded hover:bg-white/30"
      >
        ← Back to Menu
      </button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Live Battle Debug</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Controls */}
          <div className="bg-white/10 p-4 rounded backdrop-blur border border-white/10">
            <h2 className="text-white font-bold mb-4">Controls</h2>

            <button
              onClick={testDatabaseAccess}
              className="w-full mb-4 px-4 py-2 bg-purple-600 text-white rounded font-bold hover:bg-purple-700"
            >
              Test Database Access
            </button>

            <button
              onClick={createBattle}
              className="w-full mb-4 px-4 py-2 bg-[#d4af37] text-black rounded font-bold hover:bg-[#b8941f]"
            >
              Create Battle
            </button>

            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter code"
              className="w-full mb-2 px-4 py-2 bg-white/20 text-white rounded placeholder-white/50"
              maxLength={6}
            />

            <button
              onClick={joinBattle}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
            >
              Join Battle
            </button>
          </div>

          {/* Battle Info */}
          <div className="bg-white/10 p-4 rounded backdrop-blur border border-white/10">
            <h2 className="text-white font-bold mb-4">Battle Info</h2>
            {battle ? (
              <div className="text-white text-sm space-y-1">
                <p>ID: {battle.id}</p>
                <p>Code: <span className="font-bold text-[#d4af37]">{battle.invite_code}</span></p>
                <p>Status: <span className="font-bold">{battle.status}</span></p>
                <p>Player 1: {battle.player1?.substring(0, 8)}...</p>
                <p>Player 2: {battle.player2?.substring(0, 8) || 'Waiting...'}</p>
                <p>Created: {new Date(battle.created_at).toLocaleTimeString()}</p>
              </div>
            ) : (
              <p className="text-white/50">No active battle</p>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-black/50 p-4 rounded max-h-96 overflow-y-auto border border-white/10">
          <h2 className="text-white font-bold mb-4">Debug Logs</h2>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="text-white/80 text-sm">
                <span className="text-yellow-400">[{log.time}]</span> {log.message}
                {log.data && (
                  <pre className="text-xs text-white/60 mt-1 bg-black/30 p-2 rounded overflow-x-auto">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
          {logs.length === 0 && (
            <p className="text-white/50 text-sm">No logs yet. Click &quot;Test Database Access&quot; to start.</p>
          )}
        </div>
      </div>
    </div>
  );
}