import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface FeatureFlag {
  Id?: number;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Infer category from feature key based on naming convention
 */
export const inferCategory = (key: string): string => {
  if (key.startsWith('ai_')) return 'ai';
  if (key.startsWith('manual_')) return 'manual';
  if (key.startsWith('report_')) return 'report';
  if (key.startsWith('system_')) return 'system';
  return 'general';
};

export interface RoleFeatureFlag {
  Id: number;
  feature_key: string;
  User: boolean;        // For 'user' role
  admin: boolean;       // For 'admin' role
  Superadmin: boolean;  // For 'super_admin' role
  // Package tier columns
  Trial?: boolean;
  Starter?: boolean;
  Pro?: boolean;
  Enterprise?: boolean;
  Team?: boolean;
  // Workspace member role columns
  ws_owner?: boolean;
  ws_admin?: boolean;
  ws_marketing?: boolean;
  ws_sales?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}


export interface UserFeatureOverride {
  Id?: number;
  user_id: string;
  feature_key: string;
  enabled: boolean;
  created_at?: string;
  created_by?: string;
}

const FEATURE_FLAGS_TABLE = NOCODB_CONFIG.TABLES.FEATURE_FLAGS;
const ROLE_FEATURE_FLAGS_TABLE = NOCODB_CONFIG.TABLES.ROLE_FEATURE_FLAGS;
const USER_FEATURE_OVERRIDES_TABLE = NOCODB_CONFIG.TABLES.USER_FEATURE_OVERRIDES;

/**
 * Get all feature flags
 */
export const getFeatureFlags = async (): Promise<FeatureFlag[]> => {
  const url = getNocoDBUrl(FEATURE_FLAGS_TABLE);

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.list || [];
};

/**
 * Get feature flag by key
 */
export const getFeatureFlagByKey = async (key: string): Promise<FeatureFlag | null> => {
  const whereClause = encodeURIComponent(`(key,eq,${key})`);
  const url = `${getNocoDBUrl(FEATURE_FLAGS_TABLE)}?where=${whereClause}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.list?.[0] || null;
};

/**
 * Create or update feature flag
 */
export const upsertFeatureFlag = async (flag: Omit<FeatureFlag, 'id'>): Promise<FeatureFlag> => {


  // Check if exists
  const existing = await getFeatureFlagByKey(flag.key);


  if (existing && existing.Id) {
    // Update using PATCH with Id in body (NocoDB v2 API format)
    const url = getNocoDBUrl(FEATURE_FLAGS_TABLE);
    const updateData = {
      Id: existing.Id,  // Include Id in body for update
      key: flag.key,
      name: flag.name,
      description: flag.description,
      enabled: flag.enabled,
      category: flag.category
      // DO NOT send UpdatedAt - it's auto-generated
    };


    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Update error:', response.status, errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return result;
  } else {
    // Create
    const url = getNocoDBUrl(FEATURE_FLAGS_TABLE);


    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(flag),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Create error:', response.status, errorText);
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    return result;
  }
};

/**
 * Delete feature flag
 */
export const deleteFeatureFlag = async (recordId: number): Promise<void> => {
  // Construct Proxy Command
  const fullUrl = getNocoDBUrl(FEATURE_FLAGS_TABLE);
  const proxyBaseUrl = fullUrl.split('/api/v2')[0];
  const path = `/api/v2/tables/${FEATURE_FLAGS_TABLE}/records`;

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
    console.error(`❌ DELETE failed:`, errorText);
    throw new Error(`NocoDB API error: ${response.status} - ${errorText}`);
  }
};

/**
 * Get all role feature flags (now consolidated format)
 */
export const getRoleFeatureFlags = async (role: string): Promise<RoleFeatureFlag[]> => {
  // Now returns all records since each record has all roles
  const url = `${getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE)}?limit=1000`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.list || [];
};

/**
 * Get all role feature flags
 */
export const getAllRoleFeatureFlags = async (): Promise<RoleFeatureFlag[]> => {
  const url = getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE);

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.list || [];
};

/**
 * Update role feature flag for specific roles (new consolidated format)
 */
export const updateRoleFeatureFlag = async (
  featureKey: string,
  updates: { User?: boolean; admin?: boolean; Superadmin?: boolean }
): Promise<RoleFeatureFlag> => {
  try {
    // Find existing record
    const whereClause = encodeURIComponent(`(feature_key,eq,${featureKey})`);
    const checkUrl = `${getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE)}?where=${whereClause}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error(`NocoDB API error: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();
    const existing = checkData.list?.[0];

    if (existing) {
      // Update existing record using Id
      const url = getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE);
      const response = await fetch(url, {
        method: 'PATCH',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          Id: existing.Id,
          User: updates.User ?? existing.User,
          admin: updates.admin ?? existing.admin,
          Superadmin: updates.Superadmin ?? existing.Superadmin,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update: ${response.status}`);
      }

      const updated = await response.json();

      return updated;
    } else {
      // Create new record
      const url = getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE);
      const response = await fetch(url, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          feature_key: featureKey,
          User: updates.User ?? false,
          admin: updates.admin ?? true,
          Superadmin: updates.Superadmin ?? true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create: ${response.status}`);
      }

      const created = await response.json();

      return created;
    }
  } catch (error) {
    console.error(`❌ Failed to update role feature flag for ${featureKey}:`, error);
    throw error;
  }
};

/**
 * Update package tier column for a feature (Trial/Starter/Pro/Enterprise/Team)
 */
export const updatePackageTierFeature = async (
  featureKey: string,
  tierName: string,
  enabled: boolean
): Promise<RoleFeatureFlag | null> => {
  try {
    // Find existing record
    const whereClause = encodeURIComponent(`(feature_key,eq,${featureKey})`);
    const checkUrl = `${getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE)}?where=${whereClause}`;

    const checkResponse = await fetch(checkUrl, {
      method: 'GET',
      headers: await getNocoDBHeaders(),
    });

    if (!checkResponse.ok) {
      throw new Error(`NocoDB API error: ${checkResponse.status}`);
    }

    const checkData = await checkResponse.json();
    const existing = checkData.list?.[0];

    if (!existing) {
      console.warn(`Feature ${featureKey} not found in ROLE_FEATURE_FLAGS`);
      return null;
    }

    // Update the tier column
    const url = getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE);
    const updateData: Record<string, any> = {
      Id: existing.Id,
      [tierName]: enabled,
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update tier: ${response.status}`);
    }

    const updated = await response.json();
    return updated;
  } catch (error) {
    console.error(`❌ Failed to update tier feature for ${featureKey}:`, error);
    throw error;
  }
};

/**
 * Legacy function for backward compatibility - converts to new format
 */
export const setRoleFeatureFlags = async (
  role: string,
  featureKey: string,
  enabled: boolean
): Promise<RoleFeatureFlag> => {
  const updates: { User?: boolean; admin?: boolean; Superadmin?: boolean } = {};

  if (role === 'user') {
    updates.User = enabled;
  } else if (role === 'admin') {
    updates.admin = enabled;
  } else if (role === 'super_admin') {
    updates.Superadmin = enabled;
  }

  return updateRoleFeatureFlag(featureKey, updates);
};

/**
 * Delete role feature flag assignments for a feature
 */
export const deleteRoleFeatureFlagsByFeatureKey = async (featureKey: string): Promise<void> => {
  const whereClause = encodeURIComponent(`(feature_key,eq,${featureKey})`);
  const url = `${getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE)}?where=${whereClause}`;

  // Get all matching records first
  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const records = data.list || [];

  // Delete each record using Proxy Command Pattern
  for (const record of records) {
    if (record.Id) {
      const fullUrl = getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE);
      const proxyBaseUrl = fullUrl.split('/api/v2')[0];
      const path = `/api/v2/tables/${ROLE_FEATURE_FLAGS_TABLE}/records`;

      await fetch(proxyBaseUrl, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify({
          path: path,
          method: 'DELETE',
          data: [{ Id: record.Id }]
        }),
      });
    }
  }
};

/**
 * Get user feature overrides by user ID
 */
export const getUserFeatureOverrides = async (userId: string): Promise<UserFeatureOverride[]> => {
  const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
  const url = `${getNocoDBUrl(USER_FEATURE_OVERRIDES_TABLE)}?where=${whereClause}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.list || [];
};

/**
 * Set user feature override
 */
export const setUserFeatureOverride = async (
  userId: string,
  featureKey: string,
  enabled: boolean,
  createdBy?: string
): Promise<UserFeatureOverride> => {
  // Check if exists
  const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and(feature_key,eq,${featureKey})`);
  const checkUrl = `${getNocoDBUrl(USER_FEATURE_OVERRIDES_TABLE)}?where=${whereClause}`;

  const checkResponse = await fetch(checkUrl, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!checkResponse.ok) {
    throw new Error(`NocoDB API error: ${checkResponse.status} ${checkResponse.statusText}`);
  }

  const checkData = await checkResponse.json();
  const existing = checkData.list?.[0];

  if (existing && existing.Id) {
    // Update
    const url = getNocoDBUrl(USER_FEATURE_OVERRIDES_TABLE, existing.Id.toString());
    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } else {
    // Create
    const url = getNocoDBUrl(USER_FEATURE_OVERRIDES_TABLE);
    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({ user_id: userId, feature_key: featureKey, enabled, created_by: createdBy }),
    });

    if (!response.ok) {
      throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }
};

/**
 * Delete user feature override
 */
export const deleteUserFeatureOverride = async (userId: string, featureKey: string): Promise<void> => {
  const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and(feature_key,eq,${featureKey})`);
  const url = `${getNocoDBUrl(USER_FEATURE_OVERRIDES_TABLE)}?where=${whereClause}`;

  // Get matching record
  const response = await fetch(url, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`NocoDB API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const record = data.list?.[0];

  if (record && record.id) {
    const fullUrl = getNocoDBUrl(USER_FEATURE_OVERRIDES_TABLE);
    const proxyBaseUrl = fullUrl.split('/api/v2')[0];
    const path = `/api/v2/tables/${USER_FEATURE_OVERRIDES_TABLE}/records`;

    await fetch(proxyBaseUrl, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({
        path: path,
        method: 'DELETE',
        data: [{ Id: record.id }]
      }),
    });
  }
};

/**
 * Create a new feature flag with role/tier permissions
 * This adds the feature to both FEATURE_FLAGS and ROLE_FEATURE_FLAGS tables
 */
export const createNewFeature = async (config: {
  key: string;
  name: string;
  description?: string;
  category?: string;
  tiers?: {
    Trial?: boolean;
    Starter?: boolean;
    Pro?: boolean;
    Enterprise?: boolean;
    Team?: boolean;
  };
}): Promise<{ flag: FeatureFlag; roleFlag: RoleFeatureFlag }> => {
  // 1. Create in FEATURE_FLAGS table
  const flag = await upsertFeatureFlag({
    key: config.key,
    name: config.name,
    description: config.description || '',
    enabled: true,
    category: config.category || inferCategory(config.key),
  });

  // 2. Create in ROLE_FEATURE_FLAGS table with tier permissions
  const url = getNocoDBUrl(ROLE_FEATURE_FLAGS_TABLE);

  // Check if already exists
  const checkUrl = `${url}?where=${encodeURIComponent(`(feature_key,eq,${config.key})`)}`;
  const checkResponse = await fetch(checkUrl, {
    method: 'GET',
    headers: await getNocoDBHeaders(),
  });
  const checkData = await checkResponse.json();
  const existing = checkData.list?.[0];

  const tierData = {
    feature_key: config.key,
    User: false,
    admin: true,
    Superadmin: true,
    Trial: config.tiers?.Trial ?? false,
    Starter: config.tiers?.Starter ?? false,
    Pro: config.tiers?.Pro ?? false,
    Enterprise: config.tiers?.Enterprise ?? true,
    Team: config.tiers?.Team ?? false,
  };

  let roleFlag: RoleFeatureFlag;

  if (existing) {
    // Update existing
    const response = await fetch(url, {
      method: 'PATCH',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify({ ...tierData, Id: existing.Id }),
    });
    roleFlag = await response.json();
  } else {
    // Create new
    const response = await fetch(url, {
      method: 'POST',
      headers: await getNocoDBHeaders(),
      body: JSON.stringify(tierData),
    });
    roleFlag = await response.json();
  }

  return { flag, roleFlag };
};

