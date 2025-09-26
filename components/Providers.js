'use client';

import { ProfileCacheProvider } from '../lib/useProfileCache.js';

export function Providers({ children }) {
  return (
    <ProfileCacheProvider>
      {children}
    </ProfileCacheProvider>
  );
}