// User Sync Settings Service for NocoDB
// Handles CRUD operations for user sync settings

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

/**
 * User Sync Settings interface matching NocoDB schema
 */
export interface UserSyncSettings {
  Id?: number; // NocoDB auto-generated ID
  CreatedAt?: string;
  UpdatedAt?: string;
  user_id: string;
  auto_sync_enabled: number; // 0 or 1 from NocoDB
  sync_interval_seconds: number;
  last_sync_at?: string | null;
}

/**
 * Get user's sync settings
 */
export const getUserSyncSettings = async (userId: string): Promise<UserSyncSettings | null> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_SYNC_SETTINGS)}?where=${whereClause}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sync settings: ${response.statusText}`);
    }

    const data = await response.json();
    const record = data.list?.[0] || null;

    // Ensure numeric types from NocoDB
    if (record) {
      record.auto_sync_enabled = Number(record.auto_sync_enabled ?? 0);
      record.sync_interval_seconds = Number(record.sync_interval_seconds ?? 120);
    }

    return record;
  } catch (error) {
    console.error('Error fetching sync settings:', error);
    throw error;
  }
};

/**
 * Upsert (create or update) user sync settings
 */
export const upsertUserSyncSettings = async (
  userId: string,
  settings: Partial<Pick<UserSyncSettings, 'auto_sync_enabled' | 'sync_interval_seconds' | 'last_sync_at'>>
): Promise<UserSyncSettings> => {
  try {
    if (!userId) {
      throw new Error('userId is required for upsertUserSyncSettings');
    }

    // Check if settings exist for this user
    const existing = await getUserSyncSettings(userId);

    if (existing) {
      // Update existing settings using NocoDB PATCH API without record ID in URL
      const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_SYNC_SETTINGS);

      // Build update data with Id in body
      const updateData: any = {
        Id: existing.Id, // Id goes in body, not URL
      };

      if ('auto_sync_enabled' in settings) {
        updateData.auto_sync_enabled = settings.auto_sync_enabled ? 1 : 0;
      }
      if ('sync_interval_seconds' in settings) {
        updateData.sync_interval_seconds = settings.sync_interval_seconds;
      }
      if ('last_sync_at' in settings) {
        updateData.last_sync_at = settings.last_sync_at ?? null;
      }

      const response = await fetch(url, {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update sync settings: ${response.statusText} - ${errorText}`);
      }

      const patchResult = await response.json();

      // ✅ Refetch to get the latest data from DB
      const refreshed = await getUserSyncSettings(userId);
      if (!refreshed) {
        throw new Error('Failed to refetch sync settings after update');
      }

      return refreshed;
    } else {
      // Create new settings
      const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.USER_SYNC_SETTINGS);

      const response = await fetch(url, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          user_id: userId,
          auto_sync_enabled: settings.auto_sync_enabled ? 1 : 0,
          sync_interval_seconds: settings.sync_interval_seconds ?? 120,
          last_sync_at: settings.last_sync_at || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create sync settings: ${response.statusText} - ${errorText}`);
      }

      const created = await response.json();
      // Ensure proper format for newly created record
      // IMPORTANT: Convert to number to avoid type issues
      return {
        ...created,
        auto_sync_enabled: Number(created.auto_sync_enabled ?? 0),
        sync_interval_seconds: Number(created.sync_interval_seconds ?? 120),
      };
    }
  } catch (error) {
    console.error('Error upserting sync settings:', error);
    throw error;
  }
};
