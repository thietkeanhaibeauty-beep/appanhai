import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export type UsageActionType =
  | 'campaign_created'
  | 'ad_created'
  | 'ai_chat_message'
  | 'ai_campaign_generated'
  | 'ai_creative_generated'
  | 'report_generated'
  | 'ad_account_connected'
  | 'automation_rule_created'
  | 'automation_rule_executed';

export interface UsageLog {
  Id?: number;
  user_id: string;
  action_type: UsageActionType;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

const TABLE_ID = NOCODB_CONFIG.TABLES.USAGE_LOGS;

/**
 * Track user action for usage analytics
 */
export const trackUsage = async (
  userId: string,
  actionType: UsageActionType,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const response = await fetch(getNocoDBUrl(TABLE_ID), {
      method: 'POST',
      headers: await await getNocoDBHeaders(),
      body: JSON.stringify({
        user_id: userId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata || {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error tracking usage:', response.status, errorText);
    } else {

    }
  } catch (error) {
    console.error('❌ Error in trackUsage:', error);
  }
};

/**
 * Get usage count for specific action type
 */
export const getUsageCount = async (
  userId: string,
  actionType: UsageActionType,
  daysBack: number = 30
): Promise<number> => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const sinceISO = since.toISOString();

    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(action_type,eq,${actionType})~and(created_at,ge,${sinceISO})`
    );

    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}`,
      {
        method: 'GET',
        headers: await await getNocoDBHeaders(),
      }
    );

    if (!response.ok) {
      console.error('❌ Error getting usage count:', response.status);
      return 0;
    }

    const result = await response.json();
    return result.list?.length || 0;
  } catch (error) {
    console.error('❌ Error in getUsageCount:', error);
    return 0;
  }
};

/**
 * Get all usage logs for user
 */
export const getUserUsageLogs = async (
  userId: string,
  limit: number = 100,
  daysBack: number = 30
): Promise<UsageLog[]> => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const sinceISO = since.toISOString();

    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(created_at,ge,${sinceISO})`
    );

    const response = await fetch(
      `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&sort=-created_at&limit=${limit}`,
      {
        method: 'GET',
        headers: await getNocoDBHeaders(),
      }
    );

    if (!response.ok) {
      console.error('❌ Error getting usage logs:', response.status);
      return [];
    }

    const result = await response.json();
    return result.list || [];
  } catch (error) {
    console.error('❌ Error in getUserUsageLogs:', error);
    return [];
  }
};

/**
 * Get usage summary grouped by action type
 */
export const getUsageSummary = async (
  userId: string,
  daysBack: number = 30
): Promise<Record<string, number>> => {
  try {
    const logs = await getUserUsageLogs(userId, 1000, daysBack);

    // Group by action_type
    const summary: Record<string, number> = {};
    logs.forEach((log) => {
      summary[log.action_type] = (summary[log.action_type] || 0) + 1;
    });

    return summary;
  } catch (error) {
    console.error('❌ Error in getUsageSummary:', error);
    return {};
  }
};
