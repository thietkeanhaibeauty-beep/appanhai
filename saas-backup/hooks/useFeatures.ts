import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from './useUserRole';

// Retry logic for new user registration (subscription may not be ready yet)
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 4000, 6000]; // 2s, 4s, 6s

interface EffectiveFeature {
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  source: 'global' | 'role' | 'user_override' | 'subscription';
  category?: string;
}

interface FeaturesData {
  features: Record<string, EffectiveFeature>;
  roles: AppRole[];

}

interface CachedFeatures {
  features: Record<string, EffectiveFeature>;
  roles: AppRole[];
  userId: string;
  timestamp: number;
}

const CACHE_KEY = 'aiadsfb_features_cache';

// Helper to get initial cached data synchronously
const getInitialCachedData = (userId: string | undefined): { features: Record<string, EffectiveFeature>, roles: AppRole[] } | null => {
  if (!userId) return null;
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const data: CachedFeatures = JSON.parse(cached);
    if (data.userId === userId) {
      return { features: data.features, roles: data.roles };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Hook to get current user's effective feature flags
 * Features are cached permanently until subscription changes (call refreshFeatures)
 * ✅ Loads cached data IMMEDIATELY on mount to prevent sidebar flash
 */
export const useFeatures = () => {
  const { user } = useAuth();

  // ✅ Initialize with cached data immediately (no flash)
  const initialCache = getInitialCachedData(user?.id);
  const [features, setFeatures] = useState<Record<string, EffectiveFeature>>(initialCache?.features ?? {});
  const [roles, setRoles] = useState<AppRole[]>(initialCache?.roles ?? []);

  // ✅ If we have cached data, don't show loading state
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState<string | null>(null);

  // Retry counter ref for new user registration (subscription may not be ready)
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if cache is valid
  const getCachedFeatures = useCallback((): CachedFeatures | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedFeatures = JSON.parse(cached);

      // Cache is valid if it's for current user (no TTL - permanent until subscription changes)
      if (user && data.userId === user.id) {
        return data;
      }

      return null;
    } catch {
      return null;
    }
  }, [user]);

  // Save features to cache
  const setCachedFeatures = useCallback((featuresData: Record<string, EffectiveFeature>, rolesData: AppRole[]) => {
    if (!user) return;

    try {
      const cacheData: CachedFeatures = {
        features: featuresData,
        roles: rolesData,
        userId: user.id,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch {
      // Ignore localStorage errors
    }
  }, [user]);

  // Clear cache (call this when subscription changes)
  const clearCache = useCallback(() => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // Ignore
    }
  }, []);

  // Schedule retry for new user registration (subscription may not be ready yet)
  const scheduleRetry = useCallback(() => {
    if (retryCountRef.current >= MAX_RETRIES) {
      console.log('⚠️ Max feature retries reached, may require manual refresh');
      return;
    }
    const delay = RETRY_DELAYS[retryCountRef.current] || 6000;
    retryCountRef.current += 1;
    console.log(`🔄 Scheduling feature retry #${retryCountRef.current} in ${delay}ms`);

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      fetchFeaturesWithRetry(true);
    }, delay);
  }, []);

  const fetchFeatures = async (forceRefresh = false) => {
    if (!user) {
      setFeatures({});
      setRoles([]);

      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedFeatures();
      if (cached) {
        setFeatures(cached.features);
        setRoles(cached.roles);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Ensure we have a valid session before calling
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setFeatures({});
        setRoles([]);

        setLoading(false);
        return;
      }

      const { data, error: functionError } = await supabase.functions.invoke<FeaturesData>(
        'get-feature-flags'
      );

      if (functionError) {
        // If token is invalid/expired, try refreshing session once
        if (functionError.message?.includes('token') || functionError.message?.includes('expired')) {

          const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();

          if (!refreshError && newSession) {
            // Retry with new token
            const { data: retryData, error: retryError } = await supabase.functions.invoke<FeaturesData>(
              'get-feature-flags'
            );

            if (retryError) {
              throw retryError;
            }

            if (retryData) {
              setFeatures(retryData.features);
              setRoles(retryData.roles);
              setCachedFeatures(retryData.features, retryData.roles);

            }
            return;
          }
        }
        throw functionError;
      }

      if (data) {
        setFeatures(data.features);
        setRoles(data.roles);

        // Only cache and reset retry if we have actual features
        if (Object.keys(data.features).length > 0) {
          setCachedFeatures(data.features, data.roles);
          retryCountRef.current = 0; // Reset retry counter on success
        } else {
          // Features empty - likely new user without subscription yet
          console.log('⚠️ Features empty from API, scheduling retry...');
          scheduleRetry();
        }
      }
    } catch (err: any) {
      // Only log error if it's not a 401/403/500 auth-related error (user not logged in)
      const isAuthError = err?.message?.includes('non-2xx') ||
        err?.message?.includes('401') ||
        err?.message?.includes('403') ||
        err?.message?.includes('Unauthorized');

      if (!isAuthError) {
        console.error('❌ Error fetching features:', err);
        setError('Failed to fetch features');
      }
      setFeatures({});
    } finally {
      setLoading(false);
    }
  };

  // Wrapper to allow calling from scheduleRetry
  const fetchFeaturesWithRetry = fetchFeatures;

  useEffect(() => {
    // Reset retry counter when user changes
    retryCountRef.current = 0;
    fetchFeatures();

    // Cleanup timeout on unmount or user change
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [user]);

  const hasFeature = (key: string): boolean => {
    return features[key]?.enabled ?? false;
  };

  const getFeature = (key: string): EffectiveFeature | undefined => {
    return features[key];
  };

  // Expose refreshFeatures for manual refresh (e.g., after subscription change)
  const refreshFeatures = () => {
    clearCache();
    fetchFeatures(true);
  };

  return {
    features,
    roles,

    loading,
    error,
    hasFeature,
    getFeature,
    refreshFeatures, // Call this when subscription changes
  };
};
