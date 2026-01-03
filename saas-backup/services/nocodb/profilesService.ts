import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface UserProfile {
  Id?: number;
  user_id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at?: string;
  updated_at?: string;
  report_settings?: any; // JSON column for user preferences
  // AI Assistant personalization
  ai_nickname?: string;
  ai_avatar?: any; // NocoDB Attachment type (array of file objects)
  ai_self_pronoun?: string; // How AI refers to itself (e.g., "Em", "Em yêu")
  ai_user_pronoun?: string; // How AI refers to user (e.g., "Anh", "Anh yêu")
}

const TABLE_ID = NOCODB_CONFIG.TABLES.PROFILES || 'profiles';

/**
 * Get user profile by user_id
 */
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  try {
    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=(user_id,eq,${userId})&limit=1`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders()
      }
    );

    // Handle 404 gracefully - table or record not found
    if (response.status === 404) {
      console.warn('Profile table or record not found (404), returning null');
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const profile = result.list?.[0] || null;

    // Parse JSON fields if they come as strings (NocoDB sometimes returns JSON as string)
    if (profile && typeof profile.report_settings === 'string') {
      try {
        profile.report_settings = JSON.parse(profile.report_settings);
      } catch (e) {
        console.warn('Failed to parse report_settings:', e);
        profile.report_settings = {};
      }
    }

    return profile;
  } catch (error) {
    console.error('❌ getUserProfile error:', error);
    // Return null instead of throwing to allow fallback to create
    return null;
  }
};

/**
 * Create user profile
 */
export const createUserProfile = async (
  profileData: Omit<UserProfile, 'Id' | 'created_at' | 'updated_at'>
): Promise<UserProfile> => {
  try {
    // Stringify JSON fields if needed
    const payload = { ...profileData };
    if (payload.report_settings && typeof payload.report_settings !== 'string') {
      payload.report_settings = JSON.stringify(payload.report_settings);
    }

    const response = await fetch(
      getNocoDBUrl(TABLE_ID),
      {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ createUserProfile error:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<UserProfile> => {
  try {
    // Check if profile exists
    let profile = await getUserProfile(userId);

    // Auto-create profile if not exists (upsert pattern)
    if (!profile) {
      profile = await createUserProfile({
        user_id: userId,
        email: '', // Will be empty, can be updated later
      });
    }

    // Build a clean payload with only known fields
    const cleanPayload: Record<string, any> = {};
    if (updates.full_name !== undefined) cleanPayload.full_name = updates.full_name;
    if (updates.avatar_url !== undefined) cleanPayload.avatar_url = updates.avatar_url;
    if (updates.report_settings !== undefined) {
      cleanPayload.report_settings = typeof updates.report_settings === 'string'
        ? updates.report_settings
        : JSON.stringify(updates.report_settings);
    }
    // AI Assistant personalization fields
    if (updates.ai_nickname !== undefined) cleanPayload.ai_nickname = updates.ai_nickname;
    if (updates.ai_avatar !== undefined) cleanPayload.ai_avatar = updates.ai_avatar;
    if (updates.ai_self_pronoun !== undefined) cleanPayload.ai_self_pronoun = updates.ai_self_pronoun;
    if (updates.ai_user_pronoun !== undefined) cleanPayload.ai_user_pronoun = updates.ai_user_pronoun;

    // NocoDB: Use bulk PATCH with where clause (user_id as unique key)
    const url = `${getNocoDBUrl(TABLE_ID)}?where=(user_id,eq,${userId})`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(cleanPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    // Return updated profile
    return await getUserProfile(userId) || profile;
  } catch (error) {
    console.error('❌ updateUserProfile error:', error);
    throw error;
  }
};

/**
 * Get or create user profile (upsert pattern)
 * 🛡️ Race condition protection: double-check after create
 */
export const getOrCreateProfile = async (
  userId: string,
  email: string,
  fullName?: string
): Promise<UserProfile> => {
  try {
    // First check
    const existing = await getUserProfile(userId);
    if (existing) {
      return existing;
    }

    // Small delay to let any concurrent request finish
    await new Promise(resolve => setTimeout(resolve, 100));

    // Double-check before create (race condition protection)
    const doubleCheck = await getUserProfile(userId);
    if (doubleCheck) {
      return doubleCheck;
    }

    // Create new profile
    const newProfile = await createUserProfile({
      user_id: userId,
      email,
      full_name: fullName
    });

    return newProfile;
  } catch (error) {
    console.error('❌ getOrCreateProfile error:', error);

    // If create failed, try to fetch again (might have been created by concurrent request)
    const fallback = await getUserProfile(userId);
    if (fallback) {
      return fallback;
    }

    throw error;
  }
};
