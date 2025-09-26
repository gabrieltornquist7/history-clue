'use client';

import { ProfileCacheProvider } from '../lib/useProfileCache.js';
import DebugOverlay from './DebugOverlay';

export function Providers({ children }) {
  return (
    <ProfileCacheProvider>
      {children}
      <DebugOverlay />
    </ProfileCacheProvider>
  );
}