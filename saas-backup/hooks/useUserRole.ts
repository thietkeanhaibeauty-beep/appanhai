import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRolesByUserId } from '@/services/nocodb/userRolesService';
import type { AppRole } from '@/services/nocodb/userRolesService';

export type { AppRole };

const ROLES_CACHE_KEY = 'user_roles_cache';
const ROLES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface RolesCache {
  userId: string;
  roles: AppRole[];
  timestamp: number;
}

function getCachedRoles(userId: string): AppRole[] | null {
  try {
    const cached = sessionStorage.getItem(ROLES_CACHE_KEY);
    if (!cached) return null;

    const data: RolesCache = JSON.parse(cached);
    if (data.userId !== userId) return null;
    if (Date.now() - data.timestamp > ROLES_CACHE_DURATION) return null;

    return data.roles;
  } catch {
    return null;
  }
}

function setCachedRoles(userId: string, roles: AppRole[]) {
  try {
    const data: RolesCache = { userId, roles, timestamp: Date.now() };
    sessionStorage.setItem(ROLES_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook to get current user's roles from NocoDB
 * With caching to prevent refetching on navigation
 */
export const useUserRole = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>(() => {
    // Initialize from cache if available
    if (user) {
      const cached = getCachedRoles(user.id);
      if (cached) return cached;
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    // If we have cached roles, don't show loading
    if (user) {
      const cached = getCachedRoles(user.id);
      if (cached) return false;
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef<string | null>(null);

  useEffect(() => {
    // Skip if no user
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }

    // Check cache first - if valid, use it and don't fetch
    const cached = getCachedRoles(user.id);
    if (cached) {
      setRoles(cached);
      setLoading(false);
      // Only fetch if we haven't fetched yet for THIS user
      if (hasFetched.current === user.id) {
        return; // Already fetched for this user, skip
      }
    }

    const fetchRoles = async () => {
      // If already fetched for this user, skip
      if (hasFetched.current === user.id && roles.length > 0) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const roleData = await getUserRolesByUserId(user.id);
        const userRoles = roleData.map(r => r.role);

        setRoles(userRoles);
        setCachedRoles(user.id, userRoles);
        hasFetched.current = user.id; // Mark as fetched for this user

      } catch (err) {
        console.error('❌ Error fetching user roles:', err);
        setError('Failed to fetch user roles');
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();

    // Listen for roles update events
    const handleRolesUpdate = () => {
      hasFetched.current = null; // Force refetch
      fetchRoles();
    };

    window.addEventListener('roles-updated', handleRolesUpdate);

    return () => {
      window.removeEventListener('roles-updated', handleRolesUpdate);
    };
  }, [user?.id]); // Only depend on user.id, not entire user object

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isUser = roles.includes('user');

  return {
    roles,
    loading,
    error,
    isSuperAdmin,
    isAdmin,
    isUser,
    hasAnyRole: roles.length > 0,
  };
};
