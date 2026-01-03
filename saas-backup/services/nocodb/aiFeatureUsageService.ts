import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface AIFeatureUsageLog {
  Id?: number;
  user_id: string;
  feature_key: string;
  action: 'start' | 'complete' | 'error';
  metadata?: Record<string, any>;
  CreatedAt?: string;
}

/**
 * Log AI feature usage
 */
export const logAIFeatureUsage = async (logData: Omit<AIFeatureUsageLog, 'Id' | 'created_at'>): Promise<void> => {
  try {
    // For now, just log to console since NocoDB table doesn't exist yet


    // TODO: Implement when NocoDB table is created
    // const response = await fetch(
    //   getNocoDBUrl(NOCODB_CONFIG.TABLES.AI_FEATURE_USAGE_LOGS),
    //   {
    //     method: 'POST',
    //     headers: await getNocoDBHeaders(),
    //     body: JSON.stringify(log),
    //   }
    // );

    // if (!response.ok) {
    //   throw new Error(`Failed to log AI feature usage: ${response.statusText}`);
    // }
  } catch (error) {
    console.error('❌ Error logging AI feature usage:', error);
  }
};

/**
 * Get AI feature usage stats for a user
 */
export const getUserAIFeatureStats = async (
  userId: string,
  featureKey?: string
): Promise<AIFeatureUsageLog[]> => {
  try {
    // For now, return empty array since NocoDB table doesn't exist yet

    return [];

    // TODO: Implement when NocoDB table is created
    // let url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.AI_FEATURE_USAGE_LOGS)}?where=(user_id,eq,${userId})`;
    // if (featureKey) {
    //   url += `~and(feature_key,eq,${featureKey})`;
    // }

    // const response = await fetch(url, {
    //   method: 'GET',
    //   headers: await getNocoDBHeaders(),
    // });

    // if (!response.ok) {
    //   throw new Error(`Failed to fetch AI feature stats: ${response.statusText}`);
    // }

    // const data = await response.json();
    // return data.list || [];
  } catch (error) {
    console.error('❌ Error fetching AI feature stats:', error);
    return [];
  }
};
