// Report Query Helpers for NocoDB Data
import { NOCODB_CONFIG } from '../_shared/nocodb-config.ts';

// Note: This file will be copied to ai-chat folder during deployment

export interface CampaignReport {
  campaign_id: string;
  campaign_name: string | null;
  status: string;
  effective_status: string;
  spend: number;
  results: number | null;
  cost_per_result: number | null;
  impressions: number;
  clicks: number;
  ctr: number | null;
  reach: number;
  level: string;
  date_start: string;
  date_stop: string;
}

export interface TodayMetrics {
  total: {
    spend: number;
    results: number;
    impressions: number;
    clicks: number;
    reach: number;
    comments: number;
    shares: number;
    reactions: number;
    video_views: number;
    post_engagement: number;
    ctr: number;
    cpc: number;
  };
  campaigns: CampaignReport[];
  top_performers: CampaignReport[];
}

/**
 * Get active campaigns for user
 */
export async function getActiveCampaigns(
  userId: string,
  accountId: string,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<CampaignReport[]> {
  try {
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(effective_status,in,ACTIVE,CAMPAIGN_PAUSED,ADSET_PAUSED)`
    );

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${whereClause}&limit=10000&sort=-spend`;

    console.log('📊 Fetching active campaigns (level:', level, '):', url);

    const response = await fetch(url, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`NocoDB error: ${response.status}`);
    }

    const data = await response.json();
    const allInsights = data.list || [];

    console.log(`✅ Fetched ${allInsights.length} insights`);

    // ✅ CRITICAL: Filter by level FIRST to avoid triple-counting
    const insights = allInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Group by campaign_id and aggregate
    const campaignMap = new Map<string, CampaignReport>();

    for (const insight of insights) {
      const campaignId = insight.campaign_id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          ...insight,
          spend: parseFloat(insight.spend) || 0,
          results: parseFloat(insight.results) || 0,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
        });
      } else {
        const existing = campaignMap.get(campaignId)!;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.results = (existing.results || 0) + (parseFloat(insight.results) || 0);
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        if (existing.results && existing.results > 0) {
          existing.cost_per_result = existing.spend / existing.results;
        }
      }
    }

    return Array.from(campaignMap.values());
  } catch (error) {
    console.error('❌ Error fetching active campaigns:', error);
    return [];
  }
}

/**
 * Get ALL campaigns for user (active + paused)
 */
export async function getAllCampaigns(
  userId: string,
  accountId: string,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<CampaignReport[]> {
  try {
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})`
    );

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${whereClause}&limit=10000&sort=-spend`;

    console.log('📊 Fetching all campaigns (level:', level, '):', url);

    const response = await fetch(url, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`NocoDB error: ${response.status}`);
    }

    const data = await response.json();
    const allInsights = data.list || [];

    console.log(`✅ Fetched ${allInsights.length} insights (all campaigns)`);

    // ✅ Filter by level FIRST
    const insights = allInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Group by campaign_id and aggregate
    const campaignMap = new Map<string, CampaignReport>();

    for (const insight of insights) {
      const campaignId = insight.campaign_id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          ...insight,
          spend: parseFloat(insight.spend) || 0,
          results: parseFloat(insight.results) || 0,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
        });
      } else {
        const existing = campaignMap.get(campaignId)!;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.results = (existing.results || 0) + (parseFloat(insight.results) || 0);
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        if (existing.results && existing.results > 0) {
          existing.cost_per_result = existing.spend / existing.results;
        }
      }
    }

    return Array.from(campaignMap.values());
  } catch (error) {
    console.error('❌ Error fetching all campaigns:', error);
    return [];
  }
}

/**
 * Get PAUSED campaigns only
 */
export async function getPausedCampaigns(
  userId: string,
  accountId: string,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<CampaignReport[]> {
  try {
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(effective_status,eq,PAUSED)`
    );

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${whereClause}&limit=10000&sort=-spend`;

    console.log('📊 Fetching paused campaigns (level:', level, '):', url);

    const response = await fetch(url, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`NocoDB error: ${response.status}`);
    }

    const data = await response.json();
    const allInsights = data.list || [];

    console.log(`✅ Fetched ${allInsights.length} insights (paused)`);

    // ✅ Filter by level FIRST
    const insights = allInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Group by campaign_id and aggregate
    const campaignMap = new Map<string, CampaignReport>();

    // Iterate through insights and aggregate
    for (const insight of insights) {
      const campaignId = insight.campaign_id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          ...insight,
          spend: parseFloat(insight.spend) || 0,
          results: parseFloat(insight.results) || 0,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
        });
      } else {
        const existing = campaignMap.get(campaignId)!;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.results = (existing.results || 0) + (parseFloat(insight.results) || 0);
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        if (existing.results && existing.results > 0) {
          existing.cost_per_result = existing.spend / existing.results;
        }
      }
    }

    return Array.from(campaignMap.values());
  } catch (error) {
    console.error('❌ Error fetching paused campaigns:', error);
    return [];
  }
}

/**
 * Get today's metrics for user
 */
export async function getTodayMetrics(
  userId: string,
  accountId: string,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<TodayMetrics> {
  try {
    const today = new Date().toISOString().split('T')[0];

    console.log(`🕐 Today: ${today}, Level: ${level}`);

    // ✅ CRITICAL: Query giống AdsReport - KHÔNG filter theo date trong NocoDB
    // Filter client-side sau để tránh lỗi 422
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})`
    );

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${whereClause}&limit=10000&sort=-date_start`;

    console.log('📊 Fetching insights from NocoDB:', url);
    console.log(`📊 Query params: user_id=${userId}, account_id=${accountId}`);

    const response = await fetch(url, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`NocoDB error: ${response.status}`);
    }

    const data = await response.json();
    const allInsights = data.list || [];

    console.log(`✅ Fetched ${allInsights.length} total insights from NocoDB`);

    // ✅ Filter client-side theo date (giống AdsReport)
    let dateFilteredInsights = allInsights.filter((insight: any) => {
      if (!insight.date_start) return false;
      const insightDate = insight.date_start.split('T')[0]; // Extract YYYY-MM-DD
      return insightDate === today;
    });

    console.log(`🔍 Filtered to ${dateFilteredInsights.length} insights for today (${today})`);

    // ✅ CRITICAL: Filter by level FIRST to avoid triple-counting
    let insights = dateFilteredInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Nếu không có data hôm nay, lấy 7 ngày gần nhất
    if (insights.length === 0) {
      console.log('⚠️ No data for today, using last 7 days data...');

      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
      dateFilteredInsights = allInsights.filter((insight: any) => {
        if (!insight.date_start) return false;
        const insightDate = insight.date_start.split('T')[0];
        return insightDate >= sevenDaysAgo && insightDate <= today;
      });

      // Filter by level again for fallback
      insights = dateFilteredInsights.filter((insight: any) => insight.level === level);
      console.log(`✅ Using ${insights.length} ${level}-level insights from last 7 days`);
    }

    if (insights.length > 0) {
      console.log(`📊 Sample record:`, insights[0]); // Log mẫu để xem cấu trúc data
    }

    // Aggregate ĐẦY ĐỦ metrics
    const total = insights.reduce((acc: any, item: any) => ({
      spend: acc.spend + (parseFloat(item.spend) || 0),
      results: acc.results + (parseFloat(item.results) || 0),
      impressions: acc.impressions + (parseInt(item.impressions) || 0),
      clicks: acc.clicks + (parseInt(item.clicks) || 0),
      reach: acc.reach + (parseInt(item.reach) || 0),
      comments: acc.comments + (parseInt(item.comments) || 0),
      shares: acc.shares + (parseInt(item.shares) || 0),
      reactions: acc.reactions + (parseInt(item.reactions) || 0),
      video_views: acc.video_views + (parseInt(item.video_views) || 0),
      post_engagement: acc.post_engagement + (parseInt(item.post_engagement) || 0),
      ctr: 0,
      cpc: 0
    }), {
      spend: 0, results: 0, impressions: 0, clicks: 0, reach: 0,
      comments: 0, shares: 0, reactions: 0, video_views: 0, post_engagement: 0,
      ctr: 0, cpc: 0
    });

    // Calculate derived metrics
    if (total.impressions > 0) {
      total.ctr = (total.clicks / total.impressions) * 100; // CTR %
    }
    if (total.clicks > 0) {
      total.cpc = total.spend / total.clicks; // CPC
    }

    console.log(`💰 Total spend: ${total.spend}`);
    console.log(`🎯 Total results: ${total.results}`);
    console.log(`💬 Total comments: ${total.comments}`);
    console.log(`📊 Total engagement: ${total.post_engagement}`);

    // Get campaign-level data
    const campaigns = insights.filter((i: any) => i.level === 'campaign');

    // Get top performers (lowest cost per result, with results > 0)
    const top_performers = campaigns
      .filter((c: any) => c.results > 0 && c.cost_per_result !== null)
      .sort((a: any, b: any) => (parseFloat(a.cost_per_result) || 999999) - (parseFloat(b.cost_per_result) || 999999))
      .slice(0, 5);

    return {
      total,
      campaigns,
      top_performers
    };
  } catch (error) {
    console.error('❌ Error fetching today metrics:', error);
    return {
      total: {
        spend: 0, results: 0, impressions: 0, clicks: 0, reach: 0,
        comments: 0, shares: 0, reactions: 0, video_views: 0, post_engagement: 0,
        ctr: 0, cpc: 0
      },
      campaigns: [],
      top_performers: []
    };
  }
}

/**
 * Get campaigns by label
 */
export async function getCampaignsByLabel(
  userId: string,
  labelName: string,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<CampaignReport[]> {
  try {
    // Step 1: Find label ID
    const labelWhereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(label_name,eq,${labelName})`
    );
    const labelUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABELS}/records?where=${labelWhereClause}&limit=1`;

    console.log('📊 Fetching label:', labelUrl);

    const labelResponse = await fetch(labelUrl, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!labelResponse.ok) {
      throw new Error(`NocoDB error: ${labelResponse.status}`);
    }

    const labelData = await labelResponse.json();
    const labelId = labelData.list?.[0]?.Id;

    if (!labelId) {
      console.log('❌ Label not found:', labelName);
      return [];
    }

    console.log('✅ Found label ID:', labelId);

    // Step 2: Get campaign IDs from assignments
    const assignmentsWhereClause = encodeURIComponent(`(label_id,eq,${labelId})`);
    const assignmentsUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=${assignmentsWhereClause}&limit=1000`;

    console.log('📊 Fetching label assignments:', assignmentsUrl);

    const assignmentsResponse = await fetch(assignmentsUrl, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!assignmentsResponse.ok) {
      throw new Error(`NocoDB error: ${assignmentsResponse.status}`);
    }

    const assignmentsData = await assignmentsResponse.json();
    const campaignIds = assignmentsData.list?.map((a: any) => a.campaign_id).filter(Boolean) || [];

    if (campaignIds.length === 0) {
      console.log('❌ No campaigns found for label:', labelName);
      return [];
    }

    console.log(`✅ Found ${campaignIds.length} campaigns with label`);

    // Step 3: Get insights for those campaigns
    const insightsWhereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(campaign_id,in,${campaignIds.join(',')})`
    );
    const insightsUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${insightsWhereClause}&limit=10000&sort=-spend`;

    console.log('📊 Fetching campaign insights (level:', level, '):', insightsUrl);

    const insightsResponse = await fetch(insightsUrl, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!insightsResponse.ok) {
      throw new Error(`NocoDB error: ${insightsResponse.status}`);
    }

    const insightsData = await insightsResponse.json();
    const allInsights = insightsData.list || [];

    console.log(`✅ Found ${allInsights.length} insights for label "${labelName}"`);

    // ✅ Filter by level FIRST
    const insights = allInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Group by campaign_id and aggregate
    const campaignMap = new Map<string, CampaignReport>();

    for (const insight of insights) {
      const campaignId = insight.campaign_id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          ...insight,
          spend: parseFloat(insight.spend) || 0,
          results: parseFloat(insight.results) || 0,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
        });
      } else {
        const existing = campaignMap.get(campaignId)!;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.results = (existing.results || 0) + (parseFloat(insight.results) || 0);
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        if (existing.results && existing.results > 0) {
          existing.cost_per_result = existing.spend / existing.results;
        }
      }
    }

    return Array.from(campaignMap.values());
  } catch (error) {
    console.error('❌ Error fetching campaigns by label:', error);
    return [];
  }
}

/**
 * Format currency for Vietnamese
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0đ';
  return `${Math.round(value).toLocaleString('vi-VN')}đ`;
}

/**
 * Format number
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return Math.round(value).toLocaleString('vi-VN');
}

/**
 * Get campaign SUMMARY (for when user asks for detailed metrics)
 */
export function getCampaignSummary(campaigns: CampaignReport[]): string {
  if (campaigns.length === 0) {
    return '⚠️ Không tìm thấy chiến dịch nào.';
  }

  return campaigns.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Ngân sách chi tiêu: ${formatCurrency(c.spend)}
   - Số kết quả: ${formatNumber(c.results)}
   - Chi phí trên kết quả: ${c.cost_per_result !== null ? formatCurrency(c.cost_per_result) : 'Không có kết quả'}
   - Trạng thái: ${c.effective_status}
`).join('\n');
}

/**
 * Get campaign LIST ONLY (for when user asks "chiến dịch nào")
 */
export function getCampaignListOnly(campaigns: CampaignReport[]): string {
  if (campaigns.length === 0) {
    return '⚠️ Không tìm thấy chiến dịch nào.';
  }

  return campaigns.map((c, idx) => `${idx + 1}. ${c.campaign_name || 'Không có tên'}`).join('\n');
}

/**
 * Get campaigns by timeframe (last X days)
 */
export async function getCampaignsByTimeframe(
  userId: string,
  accountId: string,
  days: number,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<CampaignReport[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const endDateStr = endDate.toISOString().split('T')[0];
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`📅 Fetching campaigns from ${startDateStr} to ${endDateStr} (level: ${level})`);

    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,gte,${startDateStr})~and(date_start,lte,${endDateStr})`
    );

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${whereClause}&limit=10000&sort=-spend`;

    console.log('📊 Fetching campaigns by timeframe:', url);

    const response = await fetch(url, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`NocoDB error: ${response.status}`);
    }

    const data = await response.json();
    const allInsights = data.list || [];

    console.log(`✅ Found ${allInsights.length} insights in last ${days} days`);

    // ✅ Filter by level FIRST
    const insights = allInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Group by campaign_id and aggregate
    const campaignMap = new Map<string, CampaignReport>();

    for (const insight of insights) {
      const campaignId = insight.campaign_id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          ...insight,
          spend: parseFloat(insight.spend) || 0,
          results: parseFloat(insight.results) || 0,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
        });
      } else {
        const existing = campaignMap.get(campaignId)!;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.results = (existing.results || 0) + (parseFloat(insight.results) || 0);
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        if (existing.results && existing.results > 0) {
          existing.cost_per_result = existing.spend / existing.results;
        }
      }
    }

    return Array.from(campaignMap.values());
  } catch (error) {
    console.error('❌ Error fetching campaigns by timeframe:', error);
    return [];
  }
}

/**
 * Get campaigns by budget range
 */
export async function getCampaignsByBudget(
  userId: string,
  accountId: string,
  minBudget?: number,
  maxBudget?: number,
  level: 'campaign' | 'adset' | 'ad' = 'campaign'
): Promise<CampaignReport[]> {
  try {
    // First get all campaigns
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})`
    );

    const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS}/records?where=${whereClause}&limit=10000&sort=-spend`;

    console.log('📊 Fetching campaigns for budget filter (level:', level, '):', url);
    console.log(`💰 Budget filter: min=${minBudget || 'none'}, max=${maxBudget || 'none'}`);

    const response = await fetch(url, {
      headers: { 'xc-token': NOCODB_CONFIG.API_TOKEN }
    });

    if (!response.ok) {
      throw new Error(`NocoDB error: ${response.status}`);
    }

    const data = await response.json();
    const allInsights = data.list || [];

    console.log(`✅ Found ${allInsights.length} insights`);

    // ✅ Filter by level FIRST
    const insights = allInsights.filter((insight: any) => insight.level === level);
    console.log(`🔍 Filtered to ${insights.length} ${level}-level insights`);

    // Group by campaign_id and aggregate
    const campaignMap = new Map<string, CampaignReport>();

    for (const insight of insights) {
      const campaignId = insight.campaign_id;
      if (!campaignMap.has(campaignId)) {
        campaignMap.set(campaignId, {
          ...insight,
          spend: parseFloat(insight.spend) || 0,
          results: parseFloat(insight.results) || 0,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
        });
      } else {
        const existing = campaignMap.get(campaignId)!;
        existing.spend += parseFloat(insight.spend) || 0;
        existing.results = (existing.results || 0) + (parseFloat(insight.results) || 0);
        existing.impressions += parseInt(insight.impressions) || 0;
        existing.clicks += parseInt(insight.clicks) || 0;
        if (existing.results && existing.results > 0) {
          existing.cost_per_result = existing.spend / existing.results;
        }
      }
    }

    let campaigns = Array.from(campaignMap.values());

    // Filter by budget range
    if (minBudget !== undefined) {
      campaigns = campaigns.filter(c => c.spend >= minBudget);
      console.log(`🔍 Filtered to ${campaigns.length} campaigns with spend >= ${minBudget}`);
    }
    if (maxBudget !== undefined) {
      campaigns = campaigns.filter(c => c.spend <= maxBudget);
      console.log(`🔍 Filtered to ${campaigns.length} campaigns with spend <= ${maxBudget}`);
    }

    console.log(`✅ Final result: ${campaigns.length} campaigns`);

    return campaigns;
  } catch (error) {
    console.error('❌ Error fetching campaigns by budget:', error);
    return [];
  }
}
