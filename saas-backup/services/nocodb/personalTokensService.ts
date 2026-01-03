import { NOCODB_CONFIG, getNocoDBHeaders } from './config';

export interface PersonalToken {
  Id?: number;
  user_id: string;
  facebook_user_id: string;
  facebook_user_name: string;
  facebook_email?: string | null;
  access_token: string;
  permissions: string[];
  token_expires_at?: string | null;
  validation_status: 'valid' | 'invalid' | 'expired';
  is_active: boolean;
  token_type: 'primary' | 'secondary';
  last_validated_at?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.FACEBOOK_PERSONAL_TOKENS;

/**
 * Get all personal tokens for a user
 */
export const getPersonalTokensByUserId = async (userId: string): Promise<PersonalToken[]> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&sort=-CreatedAt`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const data = await response.json();
    return data.list || [];
  } catch (error) {
    console.error('Error fetching personal tokens:', error);
    throw error;
  }
};

/**
 * Get token by Facebook user ID (to check for duplicates)
 */
export const getTokenByFacebookUserId = async (
  userId: string,
  facebookUserId: string
): Promise<PersonalToken | null> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and(facebook_user_id,eq,${facebookUserId})`);
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to check token: ${response.status}`);
    }

    const data = await response.json();
    return data.list && data.list.length > 0 ? data.list[0] : null;
  } catch (error) {
    console.error('Error checking token:', error);
    throw error;
  }
};

/**
 * Create a new personal token
 */
export const createPersonalToken = async (tokenData: PersonalToken): Promise<PersonalToken> => {
  try {
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records`;

    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(tokenData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create token: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating personal token:', error);
    throw error;
  }
};

/**
 * Update a personal token
 */
export const updatePersonalToken = async (
  recordId: number,
  data: Partial<PersonalToken>
): Promise<void> => {
  try {
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({ Id: recordId, ...data }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update token: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error updating personal token:', error);
    throw error;
  }
};

/**
 * Delete a personal token
 */
export const deletePersonalToken = async (recordId: number): Promise<void> => {
  try {
    // Construct Proxy Command
    const proxyBaseUrl = NOCODB_CONFIG.BASE_URL;
    const path = `/api/v2/tables/${TABLE_ID}/records`;

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
      throw new Error(`Failed to delete token: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    console.error('Error deleting personal token:', error);
    throw error;
  }
};

/**
 * Activate a token (and deactivate all others for the user)
 */
export const activatePersonalToken = async (recordId: number, userId: string): Promise<void> => {
  try {
    // Get all user's tokens
    const tokens = await getPersonalTokensByUserId(userId);

    // Update all tokens
    const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records`;

    for (const token of tokens) {
      await fetch(updateUrl, {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          Id: token.Id,
          is_active: token.Id === recordId,
        }),
      });
    }
  } catch (error) {
    console.error('Error activating token:', error);
    throw error;
  }
};

/**
 * Get the currently active personal token for a user
 */
export const getActivePersonalToken = async (userId: string): Promise<PersonalToken | null> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and(is_active,eq,true)`);
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch active token: ${response.status}`);
    }

    const data = await response.json();
    return data.list && data.list.length > 0 ? data.list[0] : null;
  } catch (error) {
    console.error('Error fetching active token:', error);
    throw error;
  }
};
