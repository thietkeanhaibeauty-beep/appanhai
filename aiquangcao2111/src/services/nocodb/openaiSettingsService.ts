// OpenAI Settings Service for NocoDB
// Handles CRUD operations for OpenAI settings

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

// Helper for generating UUIDs that works in non-secure contexts (HTTP)
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for HTTP/Mobile where crypto.randomUUID is missing
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * OpenAI Settings interface matching NocoDB schema
 */
export interface OpenAISetting {
  Id?: number; // NocoDB auto-generated ID
  CreatedAt?: string;
  UpdatedAt?: string;
  record_id?: string;
  name_api?: string; // ✅ Provider name: 'gemini' or 'openai'
  api_key: string;
  model: string;
  is_active: boolean;
  user_id: string; // ✅ Required for user isolation
}

/**
 * Get OpenAI settings by user ID
 */
export const getOpenAISettingsByUserId = async (userId: string): Promise<OpenAISetting[]> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.OPENAI_SETTINGS)}?where=${whereClause}&limit=100`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [NocoDB] Failed to fetch:', response.status, errorText);
      throw new Error(`Failed to fetch OpenAI settings: ${response.statusText}`);
    }

    const data = await response.json();
    return data.list || [];
  } catch (error) {
    console.error('❌ [NocoDB] Error fetching AI settings:', error);
    throw error;
  }
};

// ✅ Phase 2: Removed deprecated getAllOpenAISettings() function
// All code should use getOpenAISettingsByUserId(userId) instead

/**
 * Upsert (create or update) OpenAI setting
 * @param userId - Required user ID for ownership
 */
export const upsertOpenAISetting = async (
  setting: Partial<OpenAISetting>,
  userId: string
): Promise<OpenAISetting> => {
  try {
    // ✅ Validate user_id is provided
    if (!userId) {
      throw new Error('userId is required for upsertOpenAISetting. User must be authenticated.');
    }

    if (!setting.user_id && userId) {
      setting.user_id = userId;
    }

    // First, check if setting for this provider exists for this user
    const userSettings = await getOpenAISettingsByUserId(userId);

    // ✅ For AI Beauty Pro, allow multiple instances (different service names)
    // Check by both name_api AND model to differentiate services
    const existingSetting = setting.name_api === 'aibeautypro'
      ? userSettings.find(
        s => s.name_api === setting.name_api &&
          s.model === setting.model &&
          s.user_id === userId
      )
      : userSettings.find(
        s => s.name_api === setting.name_api && s.user_id === userId
      );

    if (existingSetting) {
      // Update existing setting
      const { CreatedAt, UpdatedAt, ...updateData } = setting;
      return await updateOpenAISetting(existingSetting.Id!, { ...updateData, user_id: userId });
    } else {
      // Create new setting
      const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.OPENAI_SETTINGS);

      // Convert boolean to number for NocoDB bigint column
      const isActiveValue = setting.is_active !== undefined
        ? (setting.is_active ? 1 : 0)
        : 0;

      // ✅ Prioritize name_api from input, fallback to detect from model
      const model = setting.model || 'gpt-4o-mini';
      const name_api = setting.name_api ||
        (model.toLowerCase().includes('gemini') ? 'gemini' :
          model.toLowerCase().includes('gpt') ? 'openai' : 'openai');

      const requestBody = {
        record_id: generateUUID(),
        name_api, // ✅ Add provider field
        api_key: setting.api_key,
        model,
        is_active: isActiveValue,
        user_id: userId, // ✅ Always set user_id
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [NocoDB] Failed to create AI setting:', response.status, errorText);
        throw new Error(`Failed to create AI setting: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    }
  } catch (error) {
    console.error('Error upserting OpenAI setting:', error);
    throw error;
  }
};

/**
 * Update OpenAI setting by record ID
 */
export const updateOpenAISetting = async (
  recordId: number,
  data: Partial<OpenAISetting>
): Promise<OpenAISetting> => {
  try {
    const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.OPENAI_SETTINGS);

    // Remove auto-generated fields that cannot be updated
    const { CreatedAt, UpdatedAt, ...updateData } = data;

    // Convert boolean to number for NocoDB bigint column if is_active exists
    if ('is_active' in updateData && updateData.is_active !== undefined) {
      (updateData as any).is_active = updateData.is_active ? 1 : 0;
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        Id: recordId,
        ...updateData,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to update OpenAI setting:', response.status, errorText);
      throw new Error(`Failed to update OpenAI setting: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating OpenAI setting:', error);
    throw error;
  }
};

/**
 * Deactivate all OpenAI settings for a specific user and provider
 * @param userId - User ID
 * @param provider - Provider name ('gemini' or 'openai'). If not provided, deactivates all.
 */
export const deactivateAllOpenAISettings = async (
  userId: string,
  provider?: string
): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('userId is required for deactivateAllOpenAISettings');
    }

    const userSettings = await getOpenAISettingsByUserId(userId);

    const settingsToDeactivate = provider
      ? userSettings.filter(s => s.name_api === provider)
      : userSettings;

    // Update filtered settings to is_active = false
    const updatePromises = settingsToDeactivate.map(setting =>
      updateOpenAISetting(setting.Id!, { is_active: false })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    console.error('Error deactivating OpenAI settings:', error);
    throw error;
  }
};

/**
 * Delete OpenAI setting by record ID
 */
export const deleteOpenAISetting = async (recordId: number): Promise<void> => {
  try {
    // Construct Proxy Command
    const fullUrl = getNocoDBUrl(NOCODB_CONFIG.TABLES.OPENAI_SETTINGS);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records`;

    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: recordId }]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to delete OpenAI setting:', response.status, errorText);
      throw new Error(`Failed to delete OpenAI setting: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting OpenAI setting:', error);
    throw error;
  }
};

/**
 * Delete all OpenAI/AI settings for a specific user
 * @param userId - User ID
 */
export const deleteAllOpenAISettings = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('userId is required for deleteAllOpenAISettings');
    }

    const userSettings = await getOpenAISettingsByUserId(userId);

    if (userSettings.length === 0) {
      return;
    }

    // Delete all settings for this user
    await Promise.all(
      userSettings.map(setting =>
        setting.Id ? deleteOpenAISetting(setting.Id) : Promise.resolve()
      )
    );
  } catch (error) {
    console.error('Error deleting all OpenAI settings:', error);
    throw error;
  }
};
