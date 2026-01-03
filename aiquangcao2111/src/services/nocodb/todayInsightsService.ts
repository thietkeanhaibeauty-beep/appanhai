import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

export interface TodayInsight {
  id?: string;
  user_id: string;
  account_id: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  level: 'campaign' | 'adset' | 'ad';
  date_start: string;
  date_stop?: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number;
  cost_per_result: number;
  ctr: number;
  cpm: number;
  cpc: number;
  reach: number;
  frequency: number;
  effective_status?: string;
  configured_status?: string;
  status?: string;
  objective?: string;
  synced_at?: string;
}

export const getTodayInsights = async (
  userId: string,
  accountId?: string,
  level?: 'campaign' | 'adset' | 'ad'
): Promise<TodayInsight[]> => {
  try {
    // Build where clause for NocoDB - use date format (YYYY-MM-DD) not timestamp
    const today = new Date().toISOString().split('T')[0]; // "2025-11-18"

    let whereConditions = [
      `(user_id,eq,${userId})`,
      `(date_start,eq,${today})` // Match date format in NocoDB
    ];

    if (accountId) {
      whereConditions.push(`(account_id,eq,${accountId})`);
    }

    if (level) {
      whereConditions.push(`(level,eq,${level})`);
    }

    const whereClause = encodeURIComponent(whereConditions.join('~and'));
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS)}?where=${whereClause}&limit=1000&sort=-synced_at`;

    const response = await fetch(url, {
      headers: await await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch today insights: ${response.status}`);
    }

    const data = await response.json();
    return (data.list || []) as TodayInsight[];
  } catch (error) {
    console.error('Error fetching today insights from NocoDB:', error);
    throw error;
  }
};

export const getTodayInsightsByCampaign = async (
  userId: string,
  campaignId: string
): Promise<TodayInsight[]> => {
  try {
    const today = new Date().toISOString().split('T')[0]; // "2025-11-18"

    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(campaign_id,eq,${campaignId})~and(date_start,eq,${today})`
    );
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS)}?where=${whereClause}&limit=1000&sort=-synced_at`;

    const response = await fetch(url, {
      headers: await await getNocoDBHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch today insights by campaign: ${response.status}`);
    }

    const data = await response.json();
    return (data.list || []) as TodayInsight[];
  } catch (error) {
    console.error('Error fetching today insights by campaign from NocoDB:', error);
    throw error;
  }
};

export const triggerTodaySync = async (): Promise<{
  success: boolean;
  totalInsightsSynced: number;
  timestamp: string;
  storage?: string;
}> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/sync-today-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering today sync:', error);
    throw error;
  }
};

export const getLastSyncTime = async (userId: string): Promise<string | null> => {
  try {
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS)}?where=${whereClause}&limit=1&sort=-synced_at&fields=synced_at`;

    const response = await fetch(url, {
      headers: await getNocoDBHeaders(),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.list?.[0]?.synced_at || null;
  } catch (error) {
    console.error('Error fetching last sync time from NocoDB:', error);
    return null;
  }
};
