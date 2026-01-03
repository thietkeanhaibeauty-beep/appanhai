import { NOCODB_CONFIG, getNocoDBHeaders } from './config';

const SIMPLIFIED_ROLE_FEATURES_TABLE_ID = ''; // Will be updated after table creation

export interface SimplifiedRoleFeature {
  Id?: number;
  feature_key: string;
  enabled_user_id: boolean;  // Cho User
  admin_super: boolean;       // Cho Admin & Super Admin
  CreatedAt?: string;
  UpdatedAt?: string;
}

async function fetchFromNocoDB(params?: Record<string, string>) {
  if (!SIMPLIFIED_ROLE_FEATURES_TABLE_ID) {
    throw new Error('❌ SIMPLIFIED_ROLE_FEATURES_TABLE_ID not configured');
  }

  const url = new URL(`${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${SIMPLIFIED_ROLE_FEATURES_TABLE_ID}/records`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));
  }

  const response = await fetch(url.toString(), {
    headers: await await getNocoDBHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`NocoDB request failed: ${response.status} - ${errorBody}`);
  }

  return response.json();
}

/**
 * Get all simplified role features
 */
export async function getAllSimplifiedRoleFeatures(): Promise<SimplifiedRoleFeature[]> {
  try {
    const data = await fetchFromNocoDB({ limit: '1000' });
    return data.list || [];
  } catch (error) {
    console.error('❌ Error fetching simplified role features:', error);
    throw error;
  }
}

/**
 * Get simplified role feature by feature_key
 */
export async function getSimplifiedRoleFeatureByKey(featureKey: string): Promise<SimplifiedRoleFeature | null> {
  try {
    const data = await fetchFromNocoDB({
      where: `(feature_key,eq,${featureKey})`,
    });

    const records = data.list || [];
    return records.length > 0 ? records[0] : null;
  } catch (error) {
    console.error(`❌ Error fetching role feature for ${featureKey}:`, error);
    throw error;
  }
}

/**
 * Update simplified role feature
 */
export async function updateSimplifiedRoleFeature(
  featureKey: string,
  updates: Partial<Pick<SimplifiedRoleFeature, 'enabled_user_id' | 'admin_super'>>
): Promise<SimplifiedRoleFeature> {
  if (!SIMPLIFIED_ROLE_FEATURES_TABLE_ID) {
    throw new Error('❌ SIMPLIFIED_ROLE_FEATURES_TABLE_ID not configured');
  }

  try {
    // First, get the existing record
    const existing = await getSimplifiedRoleFeatureByKey(featureKey);

    if (!existing || !existing.id) {
      // Create new record if it doesn't exist
      const createUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${SIMPLIFIED_ROLE_FEATURES_TABLE_ID}/records`;
      const response = await fetch(createUrl, {
        method: 'POST',
        headers: await await getNocoDBHeaders(),
        body: JSON.stringify({
          feature_key: featureKey,
          enabled_user_id: updates.enabled_user_id ?? false,
          admin_super: updates.admin_super ?? true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to create role feature: ${response.status} - ${errorBody}`);
      }

      return response.json();
    }

    // Update existing record
    const updateUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${SIMPLIFIED_ROLE_FEATURES_TABLE_ID}/records`;
    const response = await fetch(updateUrl, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        Id: existing.Id,
        ...updates,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to update role feature: ${response.status} - ${errorBody}`);
    }

    return response.json();
  } catch (error) {
    console.error(`❌ Error updating role feature ${featureKey}:`, error);
    throw error;
  }
}

/**
 * Create simplified role feature for a new feature
 */
export async function createSimplifiedRoleFeature(
  featureKey: string,
  enabledUserId: boolean = false,
  adminSuper: boolean = true
): Promise<SimplifiedRoleFeature> {
  if (!SIMPLIFIED_ROLE_FEATURES_TABLE_ID) {
    throw new Error('❌ SIMPLIFIED_ROLE_FEATURES_TABLE_ID not configured');
  }

  try {
    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${SIMPLIFIED_ROLE_FEATURES_TABLE_ID}/records`;
    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        feature_key: featureKey,
        enabled_user_id: enabledUserId,
        admin_super: adminSuper,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to create role feature: ${response.status} - ${errorBody}`);
    }

    return response.json();
  } catch (error) {
    console.error(`❌ Error creating role feature ${featureKey}:`, error);
    throw error;
  }
}

/**
 * Delete simplified role feature
 */
export async function deleteSimplifiedRoleFeature(featureKey: string): Promise<void> {
  if (!SIMPLIFIED_ROLE_FEATURES_TABLE_ID) {
    throw new Error('❌ SIMPLIFIED_ROLE_FEATURES_TABLE_ID not configured');
  }

  try {
    const existing = await getSimplifiedRoleFeatureByKey(featureKey);

    if (!existing || !existing.Id) {
      console.warn(`⚠️ No role feature found for ${featureKey}`);
      return;
    }

    const proxyBaseUrl = NOCODB_CONFIG.BASE_URL;
    const path = `/api/v2/tables/${SIMPLIFIED_ROLE_FEATURES_TABLE_ID}/records`;

    const response = await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: existing.Id }]
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to delete role feature: ${response.status} - ${errorBody}`);
    }


  } catch (error) {
    console.error(`❌ Error deleting role feature ${featureKey}:`, error);
    throw error;
  }
}
