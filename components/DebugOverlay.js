'use client';

import { useState, useEffect } from 'react';
import { useProfileCache } from '../lib/useProfileCache';
import { getSubscriberCounts } from '../lib/supabaseSubscriptions';

export default function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState({
    profileCache: {},
    subscriptions: {},
    performance: {}
  });

  const { getCacheStats } = useProfileCache();

  // Check for debug mode in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const debugMode = urlParams.get('debug') === '1';
    setIsVisible(debugMode);

    // Show/hide with keyboard shortcut
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Update stats periodically
  useEffect(() => {
    if (!isVisible) return;

    const updateStats = () => {
      try {
        const cacheStats = getCacheStats();
        const subscriptionStats = getSubscriberCounts();

        setStats({
          profileCache: cacheStats,
          subscriptions: subscriptionStats,
          performance: {
            timestamp: new Date().toLocaleTimeString(),
            memory: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'
          }
        });
      } catch (error) {
        console.error('Error updating debug stats:', error);
      }
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);

    return () => clearInterval(interval);
  }, [isVisible, getCacheStats]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#00ff00',
        padding: '15px',
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'monospace',
        zIndex: 9999,
        minWidth: '300px',
        maxHeight: '80vh',
        overflow: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#00ffff' }}>🚀 Performance Debug</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: '1px solid #666',
            color: '#fff',
            padding: '2px 6px',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#ffff00' }}>Profile Cache</h4>
        <div>• Cached profiles: <span style={{ color: '#fff' }}>{stats.profileCache.size || 0}</span></div>
        <div>• Active fetches: <span style={{ color: '#fff' }}>{stats.profileCache.fetching || 0}</span></div>
        <div>• Cache keys: <span style={{ color: '#fff' }}>{stats.profileCache.keys?.length || 0}</span></div>
        {stats.profileCache.keys?.length > 0 && (
          <div style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>
            {stats.profileCache.keys.slice(0, 3).join(', ')}{stats.profileCache.keys.length > 3 ? '...' : ''}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#ffff00' }}>Global Subscriptions</h4>
        <div>• Battle rounds: <span style={{ color: '#fff' }}>{stats.subscriptions.battleRounds || 0}</span></div>
        <div>• Battles: <span style={{ color: '#fff' }}>{stats.subscriptions.battles || 0}</span></div>
        <div>• Broadcasts: <span style={{ color: '#fff' }}>{stats.subscriptions.battleBroadcast || 0}</span></div>

        <div style={{ marginTop: '5px', fontSize: '10px' }}>
          <span style={{ color: '#aaa' }}>Active channels:</span>
          <div style={{ color: '#fff' }}>
            • Rounds: {stats.subscriptions.channels?.battleRoundsActive ? '✅' : '❌'}
            • Battles: {stats.subscriptions.channels?.battlesActive ? '✅' : '❌'}
            • Broadcasts: {stats.subscriptions.channels?.battleBroadcastActive ? '✅' : '❌'}
          </div>
        </div>

        {stats.subscriptions.battleIds && (
          <div style={{ marginTop: '5px', fontSize: '10px' }}>
            <span style={{ color: '#aaa' }}>Battle IDs:</span>
            <div style={{ color: '#888' }}>
              {stats.subscriptions.battleIds.battleRounds?.slice(0, 2).join(', ') || 'None'}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', color: '#ffff00' }}>Performance</h4>
        <div>• Last update: <span style={{ color: '#fff' }}>{stats.performance.timestamp}</span></div>
        <div>• Memory usage: <span style={{ color: '#fff' }}>{stats.performance.memory}</span></div>
      </div>

      <div style={{ fontSize: '10px', color: '#666', borderTop: '1px solid #333', paddingTop: '8px' }}>
        <div>💡 Toggle with Ctrl+Shift+D or ?debug=1</div>
        <div>🎯 Expected: Low DB load, cached profiles, global channels</div>
      </div>
    </div>
  );
}