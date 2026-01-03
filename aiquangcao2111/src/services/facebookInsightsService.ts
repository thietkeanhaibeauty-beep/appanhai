import { fbProxy } from './facebookProxyService';
import { AdInsight, GetInsightsParams, Campaign, AdAccount } from '../types';

// Facebook Marketing API v21.0 supports WITH_ISSUES status and issues_info (since v3.2+)
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

/**
 * Normalize ad account ID - ensure it has 'act_' prefix
 * Facebook API accepts: act_123456789
 * But sometimes we store: act_123456789 or just 123456789
 */
export const normalizeAdAccountId = (adAccountId: string): string => {
  // Remove 'act_' if it exists, then add it back
  const cleanId = adAccountId.replace(/^act_/, '');
  return `act_${cleanId}`;
};

// Mapping objectives to preferred action types (priority order)
export const OBJECTIVE_ACTION_MAP: Record<string, string[]> = {
  'MESSAGES': ['onsite_conversion.messaging_conversation_started_7d'],
  'OUTCOME_ENGAGEMENT': [
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
    'post_engagement',
    'page_engagement'
  ],
  'OUTCOME_LEADS': ['lead', 'onsite_conversion.lead_grouped'],
  'OUTCOME_SALES': ['purchase', 'omni_purchase'],
  'VIDEO_VIEWS': ['video_view', 'thruplay'],
  'OUTCOME_TRAFFIC': ['landing_page_view', 'link_click'],
  'REACH': ['reach'],
  'OUTCOME_AWARENESS': ['reach'],
  'AWARENESS': ['reach']
};

// Vietnamese labels for action types
export const ACTION_LABELS: Record<string, string> = {
  'onsite_conversion.messaging_first_reply': 'Tin nhắn đầu tiên',
  'onsite_conversion.total_messaging_connection': 'Tin nhắn',
  'onsite_conversion.messaging_conversation_started_7d': 'Cuộc trò chuyện mới',
  'post_engagement': 'Tương tác bài viết',
  'page_engagement': 'Tương tác trang',
  'lead': 'Khách hàng tiềm năng',
  'onsite_conversion.lead_grouped': 'Khách hàng tiềm năng (nhóm)',
  'purchase': 'Mua hàng',
  'omni_purchase': 'Mua hàng (đa kênh)',
  'video_view': 'Lượt xem video',
  'thruplay': 'Xem video hoàn chỉnh',
  'landing_page_view': 'Lượt xem trang đích',
  'link_click': 'Nhấp chuột liên kết',
  'reach': 'Охват'
};

// Helper to safely convert to number
const safeNumber = (value: any): number => {
  if (value === null || value === undefined || value === '') return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Extract 10 action field values from Facebook API actions array
 */
export function extractActionValues(actions: any[] | null): {
  started_7d: number;
  total_messaging_connection: number;
  link_click: number;
  messaging_welcome_message_view: number;
  post_engagement_action: number;
  messaging_first_reply: number;
  video_view: number;
  page_engagement_action: number;
  replied_7d: number;
  depth_2_message: number;
  depth_3_message: number;
} {
  const findAction = (actionType: string): number => {
    const action = actions?.find(a => a.action_type === actionType);
    return safeNumber(action?.value || 0);
  };

  return {
    started_7d: findAction('onsite_conversion.messaging_conversation_started_7d'),
    total_messaging_connection: findAction('onsite_conversion.total_messaging_connection'),
    link_click: findAction('link_click'),
    messaging_welcome_message_view: findAction('onsite_conversion.messaging_welcome_message_view'),
    post_engagement_action: findAction('post_engagement'),
    messaging_first_reply: findAction('onsite_conversion.messaging_first_reply'),
    video_view: findAction('video_view'),
    page_engagement_action: findAction('page_engagement'),
    replied_7d: findAction('onsite_conversion.messaging_conversation_replied_7d'),
    depth_2_message: findAction('onsite_conversion.messaging_user_depth_2_message_send'),
    depth_3_message: findAction('onsite_conversion.messaging_user_depth_3_message_send'),
  };
}

/**
 * Extract 11 cost_per_action values from Facebook API cost_per_action_type array
 */
export function extractCostPerActionValues(costPerActions: any[] | null): {
  cost_per_started_7d: number | null;
  cost_per_total_messaging_connection: number | null;
  cost_per_link_click: number | null;
  cost_per_messaging_welcome_message_view: number | null;
  cost_per_post_engagement: number | null;
  cost_per_messaging_first_reply: number | null;
  cost_per_video_view: number | null;
  cost_per_page_engagement: number | null;
  cost_per_replied_7d: number | null;
  cost_per_depth_2_message: number | null;
  cost_per_depth_3_message: number | null;
} {


  const findCost = (actionType: string): number | null => {
    const cost = costPerActions?.find(a => a.action_type === actionType);
    const value = cost?.value || null;

    if (!cost || !cost.value) return null;
    const num = Number(cost.value);
    return isNaN(num) ? null : num;
  };

  const result = {
    cost_per_started_7d: findCost('onsite_conversion.messaging_conversation_started_7d'),
    cost_per_total_messaging_connection: findCost('onsite_conversion.total_messaging_connection'),
    cost_per_link_click: findCost('link_click'),
    cost_per_messaging_welcome_message_view: findCost('onsite_conversion.messaging_welcome_message_view'),
    cost_per_post_engagement: findCost('post_engagement'),
    cost_per_messaging_first_reply: findCost('onsite_conversion.messaging_first_reply'),
    cost_per_video_view: findCost('video_view'),
    cost_per_page_engagement: findCost('page_engagement'),
    cost_per_replied_7d: findCost('onsite_conversion.messaging_conversation_replied_7d'),
    cost_per_depth_2_message: findCost('onsite_conversion.messaging_user_depth_2_message_send'),
    cost_per_depth_3_message: findCost('onsite_conversion.messaging_user_depth_3_message_send'),
  };


  return result;
}

/**
 * Calculate results and cost_per_result strictly from messaging_conversation_started_7d
 * Always returns "Cuộc trò chuyện (7d)" as the result metric
 */
export function calculateResultsAndCost(
  objective: string,
  actions: any[] | null,
  cost_per_action_type: any[] | null,
  spend: string | number,
  reach?: string | number
): {
  results: number;
  cost_per_result: number;
  result_label: string;
  action_type_used: string;
} {
  const preferredActions = OBJECTIVE_ACTION_MAP[objective] || [];
  let actionTypeUsed = '';
  let results = 0;
  let cost_per_result = 0;

  // Special case for REACH/AWARENESS objectives
  if (['REACH', 'OUTCOME_AWARENESS', 'AWARENESS'].includes(objective)) {
    results = safeNumber(reach);
    actionTypeUsed = 'reach';
    if (results > 0) {
      cost_per_result = safeNumber(spend) / results;
    }
  } else {
    // Find first matching action from priority list
    for (const preferredAction of preferredActions) {
      const action = actions?.find((a) => a.action_type === preferredAction);
      if (action && safeNumber(action.value) > 0) {
        actionTypeUsed = preferredAction;
        results = Math.round(safeNumber(action.value));
        break;
      }
    }

    // Fallback: if no preferred action found with value > 0, try the first one anyway (even if 0)
    if (!actionTypeUsed && preferredActions.length > 0) {
      actionTypeUsed = preferredActions[0];
      const action = actions?.find((a) => a.action_type === actionTypeUsed);
      results = action ? Math.round(safeNumber(action.value)) : 0;
    }

    // Calculate cost_per_result
    if (actionTypeUsed) {
      // Prioritize cost_per_action_type
      const costAction = cost_per_action_type?.find((a) => a.action_type === actionTypeUsed);
      if (costAction) {
        cost_per_result = safeNumber(costAction.value);
      } else if (results > 0) {
        // Fallback: spend / results
        cost_per_result = safeNumber(spend) / results;
      }
    }
  }

  const resultLabel = ACTION_LABELS[actionTypeUsed] || actionTypeUsed;

  return {
    results,
    cost_per_result: Math.round(cost_per_result * 100) / 100,
    result_label: resultLabel,
    action_type_used: actionTypeUsed,
  };
}

/**
 * Extract messaging_replied_7d metrics specifically
 */
export function extractMessagingRepliedMetrics(
  actions: any[] | null,
  cost_per_action_type: any[] | null,
  spend: string | number
): {
  count: number;
  cost: number;
} {
  const ACTION_TYPE = 'onsite_conversion.messaging_conversation_replied_7d';

  const action = actions?.find(a => a.action_type === ACTION_TYPE);
  const count = Math.round(safeNumber(action?.value || 0));

  let cost = 0;
  if (count > 0) {
    const costAction = cost_per_action_type?.find(c => c.action_type === ACTION_TYPE);
    if (costAction) {
      cost = safeNumber(costAction.value);
    } else {
      // Fallback: calculate from spend
      cost = safeNumber(spend) / count;
    }
  }

  return { count, cost };
}

export interface FacebookInsight {
  Id?: number;
  user_id?: string;
  account_id: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  objective?: string;
  date_start: string;
  date_stop: string;
  sync_date?: string;

  // Metrics
  spend: number;
  impressions: number;
  clicks: number;
  reach: number;
  frequency?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  cpp?: number;

  results?: number;
  cost_per_result?: number;
  result_label?: string;
  action_type_used?: string;

  // Messaging-specific metrics
  results_messaging_replied_7d?: number;
  cost_per_messaging_replied_7d?: number;

  // 10 Action Fields (Vietnamese column names in NocoDB)
  started_7d?: number; // Trò chuyện 7d
  total_messaging_connection?: number; // Tổng kết nối tin nhắn
  link_click?: number; // Nhấp liên kết
  messaging_welcome_message_view?: number; // Xem tin nhắn chào mừng
  post_engagement_action?: number; // Tương tác bài viết
  post_interaction_gross?: number; // Tương tác tổng
  messaging_first_reply?: number; // Tin nhắn đầu tiên
  video_view?: number; // Xem video
  post_reaction?: number; // Phản ứng bài viết
  page_engagement_action?: number; // Tương tác trang

  // JSONB fields
  actions?: any;
  action_values?: any;
  cost_per_action_type?: any;
  video_p25_watched_actions?: any;
  video_p50_watched_actions?: any;
  video_p75_watched_actions?: any;
  video_p100_watched_actions?: any;

  // Status
  status?: string;
  configured_status?: string; // User-set status (ACTIVE/PAUSED)
  effective_status?: string; // Actual status from Facebook (can be DELETED, WITH_ISSUES, etc.)
  budget?: number;

  // Level indicator
  level?: 'campaign' | 'adset' | 'ad';

  created_at?: string;
  updated_at?: string;
}

const INSIGHT_FIELDS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'date_start',
  'date_stop',
  'impressions',
  'clicks',
  'spend',
  'reach',
  'frequency',
  'ctr',
  'cpc',
  'cpm',
  'cpp',
  'cost_per_unique_click',
  'actions',
  'action_values',
  'cost_per_action_type',
  'objective',
  'website_ctr',
  'purchase_roas',
  'quality_ranking',
  'engagement_rate_ranking',
  'conversion_rate_ranking',

  // Video Metrics
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
  'video_play_actions',
  'cost_per_thruplay',
];

// Helper to fetch all pages of data using fbProxy
const fetchAll = async (accessToken: string, endpoint: string, params: Record<string, any>): Promise<any[]> => {
  let allData: any[] = [];
  let currentParams = { ...params };
  let hasNext = true;

  while (hasNext) {
    try {
      const response = await fbProxy.request<{ data: any[]; paging?: any }>({
        accessToken,
        endpoint,
        params: currentParams
      });

      const items = response.data || [];
      allData = allData.concat(items);

      if (response.paging?.cursors?.after) {
        currentParams.after = response.paging.cursors.after;
      } else if (response.paging?.next) {
        // Fallback if cursors missing but next link exists
        try {
          const nextUrl = new URL(response.paging.next);
          const after = nextUrl.searchParams.get('after');
          if (after) {
            currentParams.after = after;
          } else {
            hasNext = false;
          }
        } catch (e) {
          hasNext = false;
        }
      } else {
        hasNext = false;
      }
    } catch (error) {
      console.error('Error in fetchAll:', error);
      throw error;
    }
  }
  return allData;
};

export async function getCampaigns(accessToken: string, adAccountId: string): Promise<Campaign[]> {
  const normalizedId = normalizeAdAccountId(adAccountId);

  try {
    const data = await fetchAll(accessToken, `${normalizedId}/campaigns`, {
      fields: 'id,name,status,effective_status,daily_budget,lifetime_budget',
      limit: '100'
    });

    // Log campaigns status breakdown
    const statusBreakdown = data.reduce((acc: Record<string, number>, c: any) => {
      const status = c.effective_status || c.status || 'UNKNOWN';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // Log deleted campaigns
    const deletedCampaigns = data.filter((c: any) =>
      c.effective_status === 'DELETED' || c.status === 'DELETED'
    ) || [];

    return data || [];
  } catch (error) {
    console.error('Facebook API Error (getCampaigns):', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching campaigns.');
  }
}

export async function getAdSets(accessToken: string, adAccountId: string, campaignId?: string): Promise<Array<{ id: string; name: string; status?: string; effective_status?: string; campaign_id?: string; daily_budget?: string; lifetime_budget?: string; issues_info?: any[] }>> {
  const normalizedId = normalizeAdAccountId(adAccountId);

  const params: Record<string, any> = {
    fields: 'id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget',
    limit: '100'
  };

  if (campaignId) {
    // ✅ Pass as object/array, let the Edge Function stringify it
    params.filtering = [{
      field: 'campaign.id',
      operator: 'IN',
      value: [campaignId]
    }];
  }

  try {
    const data = await fetchAll(accessToken, `${normalizedId}/adsets`, params);
    return data || [];
  } catch (error) {
    console.error('Facebook API Error (getAdSets):', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching adsets.');
  }
}

export async function getAds(accessToken: string, adAccountId: string, campaignId?: string, adsetId?: string): Promise<Array<{ id: string; name: string; status?: string; effective_status?: string; adset_id?: string; campaign_id?: string; issues_info?: any[] }>> {
  const normalizedId = normalizeAdAccountId(adAccountId);

  const params: Record<string, any> = {
    fields: 'id,name,status,effective_status,adset_id,campaign_id',
    limit: '100'
  };

  const filtering: any[] = [];
  if (campaignId) {
    filtering.push({
      field: 'campaign.id',
      operator: 'IN',
      value: [campaignId]
    });
  }
  if (adsetId) {
    filtering.push({
      field: 'adset.id',
      operator: 'IN',
      value: [adsetId]
    });
  }
  if (filtering.length > 0) {
    // ✅ Pass as object/array
    params.filtering = filtering;
  }

  try {
    const data = await fetchAll(accessToken, `${normalizedId}/ads`, params);
    return data || [];
  } catch (error) {
    console.error('Facebook API Error (getAds):', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching ads.');
  }
}

// ... skipped intermediate functions ...

/**
 * Get insights from Facebook API for a given level (campaign, adset, or ad)
 */
export async function getInsights({
  accessToken,
  adAccountId,
  level,
  since,
  until,
}: GetInsightsParams): Promise<AdInsight[]> {
  const normalizedId = normalizeAdAccountId(adAccountId);

  const endpoint = level === 'campaign' ? 'campaigns' :
    level === 'adset' ? 'adsets' : 'ads';

  const objectFields = ['status', 'effective_status', 'name', 'id'];
  if (level === 'campaign') {
    objectFields.push('daily_budget', 'lifetime_budget', 'objective');
  } else if (level === 'adset') {
    objectFields.push('campaign_id', 'daily_budget', 'lifetime_budget');
  } else {
    objectFields.push('campaign_id', 'adset_id');
  }

  const timeRange = { since, until }; // Pass as object
  // time_range is tricky because it's inside a convoluted string field in original code.
  // Original: `insights...time_range(${timeRange})...` 

  // Actually, for getInsights, the fields param is very complex string.
  // We can't easily pass it as object.
  // So we keep `fields` as string.

  const timeRangeStr = encodeURIComponent(JSON.stringify(timeRange));
  const insightQuery = `insights.time_increment(1).time_range(${timeRangeStr}).action_breakdowns(action_type).limit(1000){${INSIGHT_FIELDS.join(',')}}`;
  const finalFields = [...objectFields, insightQuery].join(',');

  // ✅ Pass filtering as Object
  const filtering = [
    {
      field: 'effective_status',
      operator: 'IN',
      value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED']
    }
  ];

  try {
    // ✅ Use fetchAll to handle pagination
    // Pass params for fbProxy
    const items = await fetchAll(accessToken, `${normalizedId}/${endpoint}`, {
      fields: finalFields,
      filtering, // Pass object directly
      limit: '500'
    });

    // ⭐ FLATTEN NESTED INSIGHTS
    const allInsights: AdInsight[] = [];

    for (const item of items) {
      const baseInfo = {
        id: item.id,
        name: item.name,
        status: item.status,
        effective_status: item.effective_status,
        campaign_id: level === 'campaign' ? item.id : item.campaign_id,
        adset_id: level === 'adset' ? item.id : item.adset_id,
        ad_id: level === 'ad' ? item.id : undefined,
        objective: item.objective,
        daily_budget: item.daily_budget,
        lifetime_budget: item.lifetime_budget,
      };

      // Extract nested insights
      if (item.insights?.data?.length > 0) {
        for (const insight of item.insights.data) {
          allInsights.push({
            ...insight,
            ...baseInfo,
            campaign_name: level === 'campaign' ? item.name : insight.campaign_name,
            adset_name: level === 'adset' ? item.name : insight.adset_name,
            ad_name: level === 'ad' ? item.name : insight.ad_name,
          } as AdInsight);
        }
      } else {
        // Placeholder for entities without insights
        allInsights.push({
          ...baseInfo,
          campaign_name: level === 'campaign' ? item.name : '',
          adset_name: level === 'adset' ? item.name : '',
          ad_name: level === 'ad' ? item.name : '',
          date_start: since,
          date_stop: until,
          spend: 0,
          impressions: 0,
          reach: 0,
          clicks: 0,
          ctr: 0,
          cpc: 0,
          cpm: 0,
        } as AdInsight);
      }
    }

    return allInsights;
  } catch (error) {
    console.error(`Facebook API Error (getInsights - ${level}):`, error);
    throw error;
  }
}


export async function getAdAccount(accessToken: string, adAccountId: string): Promise<AdAccount> {
  const normalizedId = normalizeAdAccountId(adAccountId);

  try {
    const data = await fbProxy.request<AdAccount>({
      accessToken,
      endpoint: normalizedId,
      params: { fields: 'id,name,account_status,currency,timezone_name' }
    });
    return data;

    /*
    const url = new URL(`${BASE_URL}/${normalizedId}`);
    ...
    const response = await fetch(url.toString());
    */
  } catch (error) {
    console.error('Facebook API Error (getAdAccount):', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching ad account.');
  }
}


/**
 * Get all ad accounts for the current user
 */
export async function getAdAccounts(accessToken: string): Promise<AdAccount[]> {
  try {
    const data = await fbProxy.request<{ data: AdAccount[] }>({
      accessToken,
      endpoint: 'me/adaccounts',
      params: {
        fields: 'id,name,account_status,currency,timezone_name',
        limit: '100'
      }
    });
    return data.data || [];

    /*
    const url = new URL(`${BASE_URL}/me/adaccounts`);
    ...
    const response = await fetch(url.toString());
    */
  } catch (error) {
    console.error('Facebook API Error (getAdAccounts):', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred while fetching ad accounts.');
  }
}

/**
 * Get ad account details by ID
 */
export async function getAdAccountDetails(accessToken: string, adAccountId: string): Promise<AdAccount> {
  return getAdAccount(accessToken, adAccountId);
}

/**
 * Update status of campaign/adset/ad
 */
export async function updateObjectStatus(
  accessToken: string,
  objectId: string,
  status: 'ACTIVE' | 'PAUSED'
): Promise<{ success: boolean }> {
  try {
    await fbProxy.request({
      accessToken,
      endpoint: objectId,
      method: 'POST',
      body: { status }
    });

    return { success: true };

    /*
    const url = `${BASE_URL}/${objectId}`;
    const response = await fetch(url, { ... });
    */
  } catch (error) {
    console.error('Facebook API Error (updateObjectStatus):', error);
    throw error;
  }
}
