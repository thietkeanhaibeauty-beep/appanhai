/**
 * NocoDB Authentication & Authorization Helpers
 * Provides functions to check user roles from NocoDB
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './nocodb-config.ts';

export type AppRole = 'super_admin' | 'admin' | 'user';

/**
 * Check if user has a specific role from NocoDB
 */
export async function hasRole(userId: string, role: AppRole): Promise<boolean> {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}?where=${whereClause}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch user roles:', response.status);
      return false;
    }

    const data = await response.json();
    const roles = data.list || [];

    return roles.some((r: any) => r.role === role);
  } catch (error) {
    console.error(`❌ Error checking ${role} role:`, error);
    return false;
  }
}

/**
 * Check if user is a super admin
 */
export async function checkSuperAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, 'super_admin');
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<AppRole[]> {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_ROLES)}?where=${whereClause}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!response.ok) {
      console.error('❌ Failed to fetch user roles:', response.status);
      return [];
    }

    const data = await response.json();
    const roles = data.list || [];

    return roles.map((r: any) => r.role as AppRole);
  } catch (error) {
    console.error('❌ Error getting user roles:', error);
    return [];
  }
}
