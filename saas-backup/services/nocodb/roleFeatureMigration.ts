import { NOCODB_CONFIG, getNocoDBHeaders } from './config';

const NOCODB_TABLES = {
  OLD_ROLE_FEATURE_FLAGS: 'mskba16vzzcofe6',
  FEATURE_FLAGS: 'mbctnl9dbktdz9f',
  NEW_SIMPLIFIED_ROLE_FEATURES: '', // Will be set after table creation
};

interface OldRoleFeatureFlag {
  Id?: number;
  role: 'super_admin' | 'admin' | 'user';
  feature_key: string;
  enabled: boolean;
}

interface SimplifiedRoleFeature {
  feature_key: string;
  enabled_user_id: boolean;  // Cho User
  admin_super: boolean;       // Cho Admin & Super Admin
}

export async function migrateToSimplifiedRoleFeatures() {
  if (!NOCODB_TABLES.NEW_SIMPLIFIED_ROLE_FEATURES) {
    throw new Error('❌ Please set NEW_SIMPLIFIED_ROLE_FEATURES table ID first');
  }



  // Step 1: Fetch all existing role feature flags
  const oldDataUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_TABLES.OLD_ROLE_FEATURE_FLAGS}/records?limit=1000`;
  const oldDataResponse = await fetch(oldDataUrl, {
    headers: await getNocoDBHeaders(),
  });

  if (!oldDataResponse.ok) {
    throw new Error(`Failed to fetch old data: ${oldDataResponse.statusText}`);
  }

  const oldData = await oldDataResponse.json();
  const oldFlags: OldRoleFeatureFlag[] = oldData.list || [];



  // Step 2: Fetch all feature keys to ensure we have them all
  const featuresUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_TABLES.FEATURE_FLAGS}/records?limit=1000`;
  const featuresResponse = await fetch(featuresUrl, {
    headers: await getNocoDBHeaders(),
  });

  if (!featuresResponse.ok) {
    throw new Error(`Failed to fetch features: ${featuresResponse.statusText}`);
  }

  const featuresData = await featuresResponse.json();
  const allFeatures = featuresData.list || [];



  // Step 3: Group old flags by feature_key
  const groupedByFeature: Record<string, OldRoleFeatureFlag[]> = {};

  for (const flag of oldFlags) {
    if (!groupedByFeature[flag.feature_key]) {
      groupedByFeature[flag.feature_key] = [];
    }
    groupedByFeature[flag.feature_key].push(flag);
  }

  // Step 4: Create simplified records (1 per feature)
  const simplifiedRecords: SimplifiedRoleFeature[] = [];

  for (const feature of allFeatures) {
    const featureKey = feature.key;
    const roleFlags = groupedByFeature[featureKey] || [];

    // Check if user role is enabled
    const userFlag = roleFlags.find(f => f.role === 'user');
    const enabled_user_id = userFlag?.enabled || false;

    // Check if admin OR super_admin is enabled
    const adminFlag = roleFlags.find(f => f.role === 'admin');
    const superAdminFlag = roleFlags.find(f => f.role === 'super_admin');
    const admin_super = (adminFlag?.enabled || superAdminFlag?.enabled) || true;

    simplifiedRecords.push({
      feature_key: featureKey,
      enabled_user_id,
      admin_super,
    });
  }



  // Step 5: Insert into new table
  const insertUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_TABLES.NEW_SIMPLIFIED_ROLE_FEATURES}/records`;

  for (const record of simplifiedRecords) {
    try {
      const response = await fetch(insertUrl, {
        method: 'POST',
        headers: await getNocoDBHeaders(),
        body: JSON.stringify(record),
      });

      if (!response.ok) {
        console.error(`❌ Failed to insert ${record.feature_key}:`, await response.text());
      } else {

      }
    } catch (error) {
      console.error(`❌ Error inserting ${record.feature_key}:`, error);
    }
  }




  return {
    oldRowCount: oldFlags.length,
    newRowCount: simplifiedRecords.length,
    simplifiedRecords,
  };
}

// Helper function to verify migration
export async function verifyMigration() {
  if (!NOCODB_TABLES.NEW_SIMPLIFIED_ROLE_FEATURES) {
    throw new Error('❌ Please set NEW_SIMPLIFIED_ROLE_FEATURES table ID first');
  }

  const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_TABLES.NEW_SIMPLIFIED_ROLE_FEATURES}/records?limit=1000`;
  const response = await fetch(url, {
    headers: await getNocoDBHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to verify: ${response.statusText}`);
  }

  const data = await response.json();
  const records = data.list || [];





  return records;
}
