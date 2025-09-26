import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient.js';

// Create context for profile cache
const ProfileCacheContext = createContext();

// In-memory cache for profiles
const profileCache = new Map();
const fetchingProfiles = new Set(); // Track which profiles are being fetched to prevent duplicates

/**
 * Profile Cache Provider - wrap your app with this
 */
export function ProfileCacheProvider({ children }) {
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load current user profile on mount
  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserProfile = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          setIsLoading(false);
          return;
        }

        // Check cache first
        const cachedProfile = profileCache.get(session.user.id);
        if (cachedProfile) {
          if (isMounted) {
            setCurrentUserProfile(cachedProfile);
            setIsLoading(false);
          }
          return;
        }

        // Fetch from database
        console.log('Fetching current user profile from DB:', session.user.id);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, is_founder, created_at')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching current user profile:', profileError);
          setIsLoading(false);
          return;
        }

        // Cache the profile
        profileCache.set(session.user.id, profile);

        if (isMounted) {
          setCurrentUserProfile(profile);
          setIsLoading(false);
        }

      } catch (error) {
        console.error('Error loading current user profile:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    loadCurrentUserProfile();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        setCurrentUserProfile(null);
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        loadCurrentUserProfile();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch profile by ID (cached)
  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null;

    // Check cache first
    const cachedProfile = profileCache.get(userId);
    if (cachedProfile) {
      console.log('Profile cache hit:', userId);
      return cachedProfile;
    }

    // Prevent duplicate fetches
    if (fetchingProfiles.has(userId)) {
      console.log('Profile fetch already in progress:', userId);
      // Wait for the ongoing fetch to complete
      while (fetchingProfiles.has(userId)) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      return profileCache.get(userId) || null;
    }

    try {
      fetchingProfiles.add(userId);
      console.log('Fetching profile from DB:', userId);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, is_founder, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      // Cache the result
      profileCache.set(userId, profile);
      console.log('Profile cached:', userId, profile.username);
      return profile;

    } catch (error) {
      console.error('Error in fetchProfile:', error);
      return null;
    } finally {
      fetchingProfiles.delete(userId);
    }
  }, []);

  // Batch fetch multiple profiles
  const fetchProfiles = useCallback(async (userIds) => {
    if (!userIds || userIds.length === 0) return [];

    const uniqueIds = [...new Set(userIds)];
    const results = [];
    const idsToFetch = [];

    // Check cache first
    for (const userId of uniqueIds) {
      const cachedProfile = profileCache.get(userId);
      if (cachedProfile) {
        results.push(cachedProfile);
      } else {
        idsToFetch.push(userId);
      }
    }

    if (idsToFetch.length === 0) {
      console.log('All profiles found in cache');
      return results;
    }

    try {
      console.log('Batch fetching profiles from DB:', idsToFetch);
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username, is_founder, created_at')
        .in('id', idsToFetch);

      if (error) {
        console.error('Error batch fetching profiles:', error);
        return results; // Return what we have from cache
      }

      // Cache the results
      profiles.forEach(profile => {
        profileCache.set(profile.id, profile);
        results.push(profile);
      });

      console.log('Batch cached profiles:', profiles.length);
      return results;

    } catch (error) {
      console.error('Error in fetchProfiles:', error);
      return results; // Return what we have from cache
    }
  }, []);

  // Get cached profile (no fetch)
  const getCachedProfile = useCallback((userId) => {
    return profileCache.get(userId) || null;
  }, []);

  // Clear cache (useful for testing)
  const clearCache = useCallback(() => {
    profileCache.clear();
    console.log('Profile cache cleared');
  }, []);

  // Get cache stats
  const getCacheStats = useCallback(() => {
    return {
      size: profileCache.size,
      fetching: fetchingProfiles.size,
      keys: Array.from(profileCache.keys())
    };
  }, []);

  const value = {
    currentUserProfile,
    isLoading,
    fetchProfile,
    fetchProfiles,
    getCachedProfile,
    clearCache,
    getCacheStats
  };

  return (
    <ProfileCacheContext.Provider value={value}>
      {children}
    </ProfileCacheContext.Provider>
  );
}

/**
 * Hook to use profile cache
 */
export function useProfileCache() {
  const context = useContext(ProfileCacheContext);

  if (!context) {
    throw new Error('useProfileCache must be used within a ProfileCacheProvider');
  }

  return context;
}

/**
 * Hook to fetch a single profile (with caching)
 */
export function useProfile(userId) {
  const { fetchProfile, getCachedProfile } = useProfileCache();
  const [profile, setProfile] = useState(() => getCachedProfile(userId));
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = getCachedProfile(userId);
    if (cached) {
      setProfile(cached);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch from database
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchProfile(userId)
      .then(fetchedProfile => {
        if (isMounted) {
          setProfile(fetchedProfile);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [userId, fetchProfile, getCachedProfile]);

  return { profile, loading, error };
}

/**
 * Hook to fetch multiple profiles (with caching)
 */
export function useProfiles(userIds) {
  const { fetchProfiles, getCachedProfile } = useProfileCache();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userIds || userIds.length === 0) {
      setProfiles([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Check if all profiles are cached
    const uniqueIds = [...new Set(userIds)];
    const cachedProfiles = [];
    const missingIds = [];

    uniqueIds.forEach(id => {
      const cached = getCachedProfile(id);
      if (cached) {
        cachedProfiles.push(cached);
      } else {
        missingIds.push(id);
      }
    });

    if (missingIds.length === 0) {
      setProfiles(cachedProfiles);
      setLoading(false);
      setError(null);
      return;
    }

    // Fetch missing profiles
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchProfiles(uniqueIds)
      .then(fetchedProfiles => {
        if (isMounted) {
          setProfiles(fetchedProfiles);
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [JSON.stringify(userIds), fetchProfiles, getCachedProfile]);

  return { profiles, loading, error };
}