import { AI_FEATURES, AI_FEATURE_NAMES, AI_FEATURE_CATEGORIES } from '@/hooks/useAIFeatures';
import { MANUAL_TOOLS, MANUAL_TOOL_NAMES } from '@/hooks/useManualTools';
import { upsertFeatureFlag, setRoleFeatureFlags, type FeatureFlag } from './featureFlagsService';

/**
 * Standard features that should be seeded into the system
 */
const STANDARD_FEATURES = [
  // AI Features
  {
    key: AI_FEATURES.QUICK_POST,
    name: AI_FEATURE_NAMES[AI_FEATURES.QUICK_POST],
    description: 'Tạo quảng cáo nhanh từ bài viết Facebook/Instagram',
    category: AI_FEATURE_CATEGORIES[AI_FEATURES.QUICK_POST],
    enabled: true,
  },
  {
    key: AI_FEATURES.CREATIVE_CAMPAIGN,
    name: AI_FEATURE_NAMES[AI_FEATURES.CREATIVE_CAMPAIGN],
    description: 'Tạo chiến dịch quảng cáo từ hình ảnh/video',
    category: AI_FEATURE_CATEGORIES[AI_FEATURES.CREATIVE_CAMPAIGN],
    enabled: true,
  },
  {
    key: AI_FEATURES.AUDIENCE_CREATOR,
    name: AI_FEATURE_NAMES[AI_FEATURES.AUDIENCE_CREATOR],
    description: 'Tạo đối tượng mục tiêu bằng AI',
    category: AI_FEATURE_CATEGORIES[AI_FEATURES.AUDIENCE_CREATOR],
    enabled: true,
  },
  {
    key: AI_FEATURES.CLONE_TOOL,
    name: AI_FEATURE_NAMES[AI_FEATURES.CLONE_TOOL],
    description: 'Nhân bản campaign/adset/ad với AI',
    category: AI_FEATURE_CATEGORIES[AI_FEATURES.CLONE_TOOL],
    enabled: true,
  },
  {
    key: AI_FEATURES.REPORT_ANALYSIS,
    name: AI_FEATURE_NAMES[AI_FEATURES.REPORT_ANALYSIS],
    description: 'Phân tích và tư vấn báo cáo quảng cáo',
    category: AI_FEATURE_CATEGORIES[AI_FEATURES.REPORT_ANALYSIS],
    enabled: true,
  },
  // Manual Tools
  {
    key: MANUAL_TOOLS.CREATE_ADS,
    name: MANUAL_TOOL_NAMES[MANUAL_TOOLS.CREATE_ADS],
    description: 'Tạo quảng cáo thủ công với form đầy đủ',
    category: 'manual',
    enabled: true,
  },
  {
    key: MANUAL_TOOLS.CREATE_MESSAGE,
    name: MANUAL_TOOL_NAMES[MANUAL_TOOLS.CREATE_MESSAGE],
    description: 'Tạo quảng cáo tin nhắn (Lead Ads)',
    category: 'manual',
    enabled: true,
  },
  {
    key: MANUAL_TOOLS.AUDIENCE,
    name: MANUAL_TOOL_NAMES[MANUAL_TOOLS.AUDIENCE],
    description: 'Tạo đối tượng mục tiêu thủ công',
    category: 'manual',
    enabled: true,
  },
  {
    key: MANUAL_TOOLS.ADVANCED_ADS,
    name: MANUAL_TOOL_NAMES[MANUAL_TOOLS.ADVANCED_ADS],
    description: 'Công cụ ADS nâng cao (clone, bulk edit)',
    category: 'manual',
    enabled: true,
  },
  {
    key: MANUAL_TOOLS.QUICK_AD,
    name: MANUAL_TOOL_NAMES[MANUAL_TOOLS.QUICK_AD],
    description: 'Tạo quảng cáo nhanh từ bài viết có sẵn',
    category: 'manual',
    enabled: true,
  },
];

/**
 * Default role permissions for features
 */
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    // All features
    AI_FEATURES.QUICK_POST,
    AI_FEATURES.CREATIVE_CAMPAIGN,
    AI_FEATURES.AUDIENCE_CREATOR,
    AI_FEATURES.CLONE_TOOL,
    AI_FEATURES.REPORT_ANALYSIS,
    MANUAL_TOOLS.CREATE_ADS,
    MANUAL_TOOLS.CREATE_MESSAGE,
    MANUAL_TOOLS.AUDIENCE,
    MANUAL_TOOLS.ADVANCED_ADS,
    MANUAL_TOOLS.QUICK_AD,
  ],
  admin: [
    // AI Features
    AI_FEATURES.QUICK_POST,
    AI_FEATURES.CREATIVE_CAMPAIGN,
    AI_FEATURES.AUDIENCE_CREATOR,
    AI_FEATURES.CLONE_TOOL,
    AI_FEATURES.REPORT_ANALYSIS,
    // Manual Tools
    MANUAL_TOOLS.CREATE_ADS,
    MANUAL_TOOLS.CREATE_MESSAGE,
    MANUAL_TOOLS.AUDIENCE,
    MANUAL_TOOLS.ADVANCED_ADS,
    MANUAL_TOOLS.QUICK_AD,
  ],
  user: [
    // Limited AI features for regular users
    AI_FEATURES.QUICK_POST,
    AI_FEATURES.CREATIVE_CAMPAIGN,
    AI_FEATURES.REPORT_ANALYSIS,
    // Basic manual tools
    MANUAL_TOOLS.CREATE_ADS,
    MANUAL_TOOLS.QUICK_AD,
  ],
};

/**
 * Seed all standard features into NocoDB
 * @param options.overwrite If true, will update existing features. Default: false
 * @returns Array of upserted features
 */
export const seedStandardFeatures = async (options: { overwrite?: boolean } = {}): Promise<FeatureFlag[]> => {
  const results: FeatureFlag[] = [];



  for (const featureData of STANDARD_FEATURES) {
    try {
      const feature = await upsertFeatureFlag(featureData);
      results.push(feature);

    } catch (error) {
      console.error(`❌ Failed to seed feature ${featureData.key}:`, error);
    }
  }


  return results;
};

/**
 * Seed default role permissions
 * @returns Number of role permissions created
 */
export const seedDefaultRolePermissions = async (): Promise<number> => {
  let count = 0;



  for (const [role, features] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const featureKey of features) {
      try {
        await setRoleFeatureFlags(role, featureKey, true);
        count++;

      } catch (error) {
        console.error(`❌ Failed to set ${role} permission for ${featureKey}:`, error);
      }
    }
  }


  return count;
};

/**
 * Full seed process: features + role permissions
 */
export const seedAll = async (options: { overwrite?: boolean } = {}): Promise<{
  features: FeatureFlag[];
  rolePermissions: number;
}> => {


  const features = await seedStandardFeatures(options);
  const rolePermissions = await seedDefaultRolePermissions();



  return { features, rolePermissions };
};
