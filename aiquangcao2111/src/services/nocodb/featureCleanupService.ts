import { AI_FEATURES } from '@/hooks/useAIFeatures';
import { MANUAL_TOOLS } from '@/hooks/useManualTools';
import {
  getFeatureFlags,
  deleteFeatureFlag,
  deleteRoleFeatureFlagsByFeatureKey,
  type FeatureFlag
} from './featureFlagsService';

/**
 * Get all valid feature keys that should exist in the system
 */
export const getValidFeatureKeys = (): string[] => {
  return [
    ...Object.values(AI_FEATURES),
    ...Object.values(MANUAL_TOOLS),
  ];
};

/**
 * Get features that exist in NocoDB but not in code
 */
export const getOrphanedFeatures = async (): Promise<FeatureFlag[]> => {
  const allFeatures = await getFeatureFlags();
  const validKeys = new Set(getValidFeatureKeys());
  return allFeatures.filter(f => !validKeys.has(f.key));
};

/**
 * Get features that are defined in code
 */
export const getValidFeatures = async (): Promise<FeatureFlag[]> => {
  const allFeatures = await getFeatureFlags();
  const validKeys = new Set(getValidFeatureKeys());
  return allFeatures.filter(f => validKeys.has(f.key));
};

/**
 * Get missing features that are in code but not in NocoDB
 */
export const getMissingFeatures = async (): Promise<string[]> => {
  const allFeatures = await getFeatureFlags();
  const existingKeys = new Set(allFeatures.map(f => f.key));
  const validKeys = getValidFeatureKeys();
  return validKeys.filter(key => !existingKeys.has(key));
};

/**
 * Delete all orphaned features and their related data
 * @returns Number of features deleted
 */
export const cleanupOrphanedFeatures = async (): Promise<number> => {
  const orphaned = await getOrphanedFeatures();
  let deletedCount = 0;
  const errors: string[] = [];

  for (const feature of orphaned) {
    try {
      // Delete role feature flags first
      await deleteRoleFeatureFlagsByFeatureKey(feature.key);

      // Delete the feature flag itself
      if (feature.Id) {
        await deleteFeatureFlag(feature.Id);
        deletedCount++;

      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Failed to delete feature ${feature.key}:`, errorMsg);
      errors.push(`${feature.key}: ${errorMsg}`);
    }
  }

  // Throw nếu có lỗi
  if (errors.length > 0) {
    throw new Error(`Deleted ${deletedCount}, failed ${errors.length}: ${errors.join('; ')}`);
  }

  return deletedCount;
};

/**
 * Delete a specific orphaned feature by its record ID
 */
export const deleteOrphanedFeature = async (recordId: number, featureKey: string): Promise<void> => {
  try {


    // Delete role feature flags first
    await deleteRoleFeatureFlagsByFeatureKey(featureKey);


    // Delete the feature flag itself
    await deleteFeatureFlag(recordId);

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Failed to delete feature ${featureKey}:`, errorMsg);
    throw new Error(`Không thể xóa feature ${featureKey}: ${errorMsg}`);
  }
};

/**
 * Get statistics about features
 */
export const getFeatureStatistics = async () => {
  const allFeatures = await getFeatureFlags();
  const orphaned = await getOrphanedFeatures();
  const valid = await getValidFeatures();
  const missing = await getMissingFeatures();

  return {
    total: allFeatures.length,
    valid: valid.length,
    orphaned: orphaned.length,
    missing: missing.length,
    expectedTotal: getValidFeatureKeys().length,
  };
};
