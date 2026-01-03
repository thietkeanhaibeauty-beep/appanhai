import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';
import { getUserFromRequest } from '../_shared/auth.ts';
import { batchUpsertInsights, UpsertInsightInput } from '../_shared/upsertInsight.ts';
import { batchUpsertCatalog } from '../_shared/upsertCatalog.ts';
import { NOCODB_CONFIG } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map objective to preferred action_types (priority from left to right)
const OBJECTIVE_ACTION_MAP: Record<string, string[]> = {
  'MESSAGES': ['onsite_conversion.messaging_first_reply', 'onsite_conversion.total_messaging_connection', 'messaging_conversation_started_7d', 'onsite_conversion.messaging_conversation_started_7d'],

  // ⭐ THÊM MỚI - Cho objective OUTCOME_ENGAGEMENT với destination Messages
  'OUTCOME_ENGAGEMENT': [
    'onsite_conversion.total_messaging_connection',  // Priority cao nhất - Cuộc trò chuyện
    'onsite_conversion.messaging_first_reply',
    'post_engagement',
    'page_engagement'
  ],

  'OUTCOME_LEADS': ['lead', 'onsite_conversion.lead_grouped'],
  'LEAD_GENERATION': ['lead', 'onsite_conversion.lead_grouped'],
  'OUTCOME_SALES': ['purchase', 'omni_purchase'],
  'CONVERSIONS': ['purchase', 'omni_purchase'],
  'VIDEO_VIEWS': ['video_view', 'thruplay'],
  'OUTCOME_TRAFFIC': ['landing_page_view', 'link_click'],
  'TRAFFIC': ['landing_page_view', 'link_click'],
  'OUTCOME_AWARENESS': ['reach'],
  'AWARENESS': ['reach'],
  'REACH': ['reach'],
};

// Map action_type to Vietnamese labels
const ACTION_LABELS: Record<string, string> = {
  'onsite_conversion.messaging_first_reply': 'Tin nhắn đầu tiên',
  'onsite_conversion.total_messaging_connection': 'Cuộc trò chuyện',  // ⭐ THÊM MỚI
  'messaging_conversation_started_7d': 'Cuộc trò chuyện (7d)',
  'onsite_conversion.messaging_conversation_started_7d': 'Cuộc trò chuyện (7d)',
  'post_engagement': 'Tương tác bài viết',
  'page_engagement': 'Tương tác trang',
  'lead': 'Lead',
  'onsite_conversion.lead_grouped': 'Lead',
  'purchase': 'Mua hàng',
  'omni_purchase': 'Mua hàng',
  'video_view': 'Xem video',
  'thruplay': 'ThruPlay',
  'landing_page_view': 'Xem trang đích',
  'link_click': 'Nhấp liên kết',
  'reach': 'Reach',
};

// Helper to safely parse number
function safeNumber(val: any): number {
  if (val == null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(num) ? 0 : num;
}

// Extract specific action values from actions array (11 specific metrics)
function extractActionValues(actions: any[]) {
  if (!actions || !Array.isArray(actions)) {
    return {
      started_7d: 0,
      replied_7d: 0,
      first_reply: 0,
      messaging_connection: 0,
      depth_2_message: 0,
      depth_3_message: 0,
      welcome_message_view: 0,
      link_click: 0,
      video_view: 0,
      post_engagement: 0,
      page_engagement: 0,
    };
  }

  const findValue = (actionType: string) => {
    const item = actions.find((a: any) => a.action_type === actionType);
    return item?.value ? parseInt(item.value) : 0;
  };

  return {
    started_7d: findValue('onsite_conversion.messaging_conversation_started_7d'),
    replied_7d: findValue('onsite_conversion.messaging_conversation_replied_7d'),
    first_reply: findValue('onsite_conversion.messaging_first_reply'),
    messaging_connection: findValue('onsite_conversion.total_messaging_connection'),
    depth_2_message: findValue('onsite_conversion.messaging_user_depth_2_message_send'),
    depth_3_message: findValue('onsite_conversion.messaging_user_depth_3_message_send'),
    welcome_message_view: findValue('onsite_conversion.messaging_welcome_message_view'),
    link_click: findValue('link_click'),
    video_view: findValue('video_view'),
    post_engagement: findValue('post_engagement'),
    page_engagement: findValue('page_engagement'),
  };
}

// Extract specific cost per action values from cost_per_action_type array
function extractCostPerActionValues(costPerActions: any[]) {
  if (!costPerActions || !Array.isArray(costPerActions)) {
    return {
      cost_per_started_7d: null,
      cost_per_replied_7d: null,
      cost_per_first_reply: null,
      cost_per_messaging_connection: null,
      cost_per_depth_2_message: null,
      cost_per_depth_3_message: null,
      cost_per_welcome_message_view: null,
      cost_per_link_click: null,
      cost_per_video_view: null,
      cost_per_post_engagement: null,
      cost_per_page_engagement: null,
    };
  }

  const findValue = (actionType: string) => {
    const item = costPerActions.find((a: any) => a.action_type === actionType);
    return item?.value ? parseFloat(item.value) : null;
  };

  return {
    cost_per_started_7d: findValue('onsite_conversion.messaging_conversation_started_7d'),
    cost_per_replied_7d: findValue('onsite_conversion.messaging_conversation_replied_7d'),
    cost_per_first_reply: findValue('onsite_conversion.messaging_first_reply'),
    cost_per_messaging_connection: findValue('onsite_conversion.total_messaging_connection'),
    cost_per_depth_2_message: findValue('onsite_conversion.messaging_user_depth_2_message_send'),
    cost_per_depth_3_message: findValue('onsite_conversion.messaging_user_depth_3_message_send'),
    cost_per_welcome_message_view: findValue('onsite_conversion.messaging_welcome_message_view'),
    cost_per_link_click: findValue('link_click'),
    cost_per_video_view: findValue('video_view'),
    cost_per_post_engagement: findValue('post_engagement'),
    cost_per_page_engagement: findValue('page_engagement'),
  };
}

// Calculate results and cost_per_result from actions
interface ActionItem {
  action_type: string;
  value: string | number;
}

interface ProcessedMetrics {
  results: number;
  cost_per_result: number;
  result_label: string;
  action_type_used: string;
}

function calculateResultsAndCost(
  objective: string,
  actions: ActionItem[] | null,
  cost_per_action_type: ActionItem[] | null,
  spend: string | number,
  reach?: string | number
): ProcessedMetrics {
  const spendNum = safeNumber(spend);

  // Get preferred action types for this objective
  const preferredActions = OBJECTIVE_ACTION_MAP[objective] || [];

  let actionTypeUsed = '';
  let results = 0;
  let costPerResult = 0;

  // Special case for REACH/AWARENESS objectives
  if (objective === 'REACH' || objective === 'OUTCOME_AWARENESS' || objective === 'AWARENESS') {
    results = safeNumber(reach);
    actionTypeUsed = 'reach';
    if (results > 0) {
      costPerResult = spendNum / results;
    }
  } else {
    // Find the first matching action with value > 0
    for (const preferredAction of preferredActions) {
      const action = actions?.find(a => a.action_type === preferredAction);

      if (action && safeNumber(action.value) > 0) {
        actionTypeUsed = preferredAction;
        results = Math.round(safeNumber(action.value));

        break;
      }
    }

    // If no action found, try the first preferred action type
    if (!actionTypeUsed && preferredActions.length > 0) {
      actionTypeUsed = preferredActions[0];
      const action = actions?.find(a => a.action_type === actionTypeUsed);
      results = action ? Math.round(safeNumber(action.value)) : 0;

    }

    // Calculate cost_per_result
    if (actionTypeUsed) {
      // Try to get from cost_per_action_type first
      const costAction = cost_per_action_type?.find(a => a.action_type === actionTypeUsed);
      if (costAction) {
        costPerResult = safeNumber(costAction.value);
      } else if (results > 0) {
        // Fallback: spend / results
        costPerResult = spendNum / results;
      }
    }
  }

  // Round to 2 decimals
  costPerResult = Math.round(costPerResult * 100) / 100;

  const resultLabel = ACTION_LABELS[actionTypeUsed] || actionTypeUsed;



  return {
    results,
    cost_per_result: costPerResult,
    result_label: resultLabel,
    action_type_used: actionTypeUsed,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: any[] = [];
  const addLog = (type: string, message: string, details?: any) => {
    logs.push({ type, message, details, timestamp: new Date().toISOString() });

  };

  try {
    // ✅ CRITICAL: Authenticate user from JWT token
    const user = await getUserFromRequest(req);
    const userId = user.id;

    addLog('info', `🔐 Authenticated user: ${userId}`);

    const { accountId, accessToken, since, until } = await req.json();

    if (!accountId || !accessToken) {
      addLog('error', 'Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Account ID and access token are required', logs }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ Use authenticated user ID (no more fallback to test-user-001)
    addLog('info', `Starting sync for user ${userId}, account ${accountId} from ${since} to ${until}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const API_VERSION = 'v21.0';
    const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

    // Comprehensive fields list from Facebook Marketing API Insights
    const INSIGHT_FIELDS = [
      // IDs and Names
      'account_id',
      'account_name',
      'campaign_id',
      'campaign_name',
      'adset_id',
      'adset_name',
      'ad_id',
      'ad_name',

      // Time
      'date_start',
      'date_stop',

      // Delivery & Cost
      'spend',
      'impressions',
      'reach',
      'frequency',
      'cpc',
      'cpm',
      'cpp',
      'cost_per_unique_click',

      // Performance & Engagement
      'clicks',
      'ctr',
      'actions',

      // Rankings
      'quality_ranking',
      'engagement_rate_ranking',
      'conversion_rate_ranking',

      // Conversions
      'purchase_roas',
      'action_values',
      'cost_per_action_type',

      // Video Metrics
      'video_p25_watched_actions',
      'video_p50_watched_actions',
      'video_p75_watched_actions',
      'video_p100_watched_actions',
      'video_play_actions',
      'cost_per_thruplay',
    ];

    addLog('info', `📊 Requesting ${INSIGHT_FIELDS.length} fields from Facebook API:`, INSIGHT_FIELDS);

    // ✅ Fetch campaigns with nested insights (INCLUDING INACTIVE CAMPAIGNS)
    const objectFields = ['status', 'effective_status', 'name', 'id', 'daily_budget', 'lifetime_budget', 'objective', 'buying_type', 'start_time', 'stop_time', 'created_time', 'updated_time'];
    const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
    const insightQuery = `insights.time_increment(1).time_range(${timeRange}).action_breakdowns(action_type).limit(1000){${INSIGHT_FIELDS.join(',')}}`;
    const finalFields = [...objectFields, insightQuery].join(',');

    // ⭐ Add filtering to sync ALL campaigns (ACTIVE, PAUSED, ARCHIVED, DELETED)
    const filtering = encodeURIComponent(JSON.stringify([
      {
        field: 'effective_status',
        operator: 'IN',
        value: ['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED']
      }
    ]));

    const campaignsUrl = `${BASE_URL}/act_${accountId}/campaigns?fields=${finalFields}&filtering=${filtering}&limit=500&access_token=${accessToken}`;
    addLog('debug', `📡 Calling campaigns API (ALL statuses): ${campaignsUrl.replace(accessToken, 'TOKEN_HIDDEN')}`);

    const campaignsResponse = await fetch(campaignsUrl);

    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json();
      addLog('error', 'Facebook API error when fetching campaigns', errorData);
      throw new Error('Failed to fetch campaigns');
    }

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.data || [];

    addLog('success', `Found ${campaigns.length} campaigns`);

    const allInsights = [];
    let campaignInsightsCount = 0;
    let adsetInsightsCount = 0;
    let adInsightsCount = 0;

    // Arrays to collect catalog entities for upsert
    const campaignsToUpsert: any[] = [];
    const adsetsToUpsert: any[] = [];
    const adsToUpsert: any[] = [];

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        addLog('info', `Processing campaign: ${campaign.name} (${campaign.id})`);

        const budget = parseFloat(campaign.daily_budget || campaign.lifetime_budget || '0') / 100;
        const objective = campaign.objective || '';

        // Collect campaign for upsert
        campaignsToUpsert.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          effective_status: campaign.effective_status,
          account_id: accountId,
          user_id: userId,
          daily_budget: campaign.daily_budget,
          lifetime_budget: campaign.lifetime_budget,
          objective: campaign.objective,
          buying_type: campaign.buying_type,
          start_time: campaign.start_time,
          stop_time: campaign.stop_time,
          created_time: campaign.created_time,
          updated_time: campaign.updated_time,
        });

        // Campaign level insights
        if (campaign.insights && campaign.insights.data && campaign.insights.data.length > 0) {
          campaignInsightsCount += campaign.insights.data.length;
          addLog('success', `  ✅ Campaign level: ${campaign.insights.data.length} insights`);

          for (const insight of campaign.insights.data) {
            const actionValues = extractActionValues(insight.actions || []);
            const costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type || []);
            const metrics = calculateResultsAndCost(
              objective,
              insight.actions,
              insight.cost_per_action_type,
              insight.spend,
              insight.reach
            );

            addLog('info', `📈 [CAMPAIGN] ${campaign.name}`, {
              objective,
              'actions_count': insight.actions?.length || 0,
              'actions_types': insight.actions?.map((a: any) => a.action_type) || [],
              'calculated_metrics': metrics
            });

            allInsights.push({
              user_id: userId,
              account_id: accountId,
              account_name: insight.account_name || '',
              campaign_id: campaign.id,
              campaign_name: campaign.name,
              objective,
              date_start: insight.date_start,
              date_stop: insight.date_stop,
              sync_date: insight.date_start, // Track which day this data belongs to

              // Calculated metrics
              results: metrics.results,
              cost_per_result: metrics.cost_per_result,
              result_label: metrics.result_label,
              action_type_used: metrics.action_type_used,

              // Direct metrics from API
              spend: safeNumber(insight.spend),
              impressions: parseInt(insight.impressions || '0'),
              reach: parseInt(insight.reach || '0'),
              frequency: safeNumber(insight.frequency),
              clicks: parseInt(insight.clicks || '0'),
              ctr: safeNumber(insight.ctr),
              cpc: safeNumber(insight.cpc),
              cpm: safeNumber(insight.cpm),
              cpp: safeNumber(insight.cpp),
              cost_per_unique_click: safeNumber(insight.cost_per_unique_click),

              // Rankings
              quality_ranking: insight.quality_ranking || null,
              engagement_rate_ranking: insight.engagement_rate_ranking || null,
              conversion_rate_ranking: insight.conversion_rate_ranking || null,

              // ROAS & Actions (JSONB fields)
              purchase_roas: insight.purchase_roas,
              actions: insight.actions,
              action_values: insight.action_values,
              cost_per_action_type: insight.cost_per_action_type,

              // 11 Action values
              started_7d: actionValues.started_7d,
              replied_7d: actionValues.replied_7d,
              first_reply: actionValues.first_reply,
              messaging_connection: actionValues.messaging_connection,
              depth_2_message: actionValues.depth_2_message,
              depth_3_message: actionValues.depth_3_message,
              welcome_message_view: actionValues.welcome_message_view,
              link_click: actionValues.link_click,
              video_view: actionValues.video_view,
              post_engagement_count: actionValues.post_engagement,
              page_engagement_count: actionValues.page_engagement,

              // 11 Cost per action values
              cost_per_started_7d: costPerActionValues.cost_per_started_7d,
              cost_per_replied_7d: costPerActionValues.cost_per_replied_7d,
              cost_per_first_reply: costPerActionValues.cost_per_first_reply,
              cost_per_messaging_connection: costPerActionValues.cost_per_messaging_connection,
              cost_per_depth_2_message: costPerActionValues.cost_per_depth_2_message,
              cost_per_depth_3_message: costPerActionValues.cost_per_depth_3_message,
              cost_per_welcome_message_view: costPerActionValues.cost_per_welcome_message_view,
              cost_per_link_click: costPerActionValues.cost_per_link_click,
              cost_per_video_view: costPerActionValues.cost_per_video_view,
              cost_per_post_engagement: costPerActionValues.cost_per_post_engagement,
              cost_per_page_engagement: costPerActionValues.cost_per_page_engagement,

              // Video metrics (JSONB fields)
              video_p25_watched_actions: insight.video_p25_watched_actions,
              video_p50_watched_actions: insight.video_p50_watched_actions,
              video_p75_watched_actions: insight.video_p75_watched_actions,
              video_p100_watched_actions: insight.video_p100_watched_actions,
              video_play_actions: insight.video_play_actions,
              cost_per_thruplay: safeNumber(insight.cost_per_thruplay),

              budget,
              status: campaign.status,
              effective_status: campaign.effective_status,
            });
          }
        }

        // Get ad sets with nested insights
        const adsetFields = ['id', 'name', 'status', 'effective_status', 'daily_budget', 'lifetime_budget', 'start_time', 'end_time', 'created_time', 'updated_time'];
        const adsetInsightQuery = `insights.time_increment(1).time_range(${timeRange}).action_breakdowns(action_type).limit(1000){${INSIGHT_FIELDS.join(',')}}`;
        const adsetFinalFields = [...adsetFields, adsetInsightQuery].join(',');

        const adsetsUrl = `${BASE_URL}/${campaign.id}/adsets?fields=${adsetFinalFields}&limit=500&access_token=${accessToken}`;
        const adsetsResponse = await fetch(adsetsUrl);

        if (adsetsResponse.ok) {
          const adsetsData = await adsetsResponse.json();
          const adsets = adsetsData.data || [];
          addLog('info', `  Found ${adsets.length} ad sets`);

          for (const adset of adsets) {
            const adsetBudget = parseFloat(adset.daily_budget || adset.lifetime_budget || campaign.daily_budget || campaign.lifetime_budget || '0') / 100;

            // Collect adset for upsert
            adsetsToUpsert.push({
              id: adset.id,
              name: adset.name,
              status: adset.status,
              effective_status: adset.effective_status,
              campaign_id: campaign.id,
              account_id: accountId,
              user_id: userId,
              daily_budget: adset.daily_budget,
              lifetime_budget: adset.lifetime_budget,
              start_time: adset.start_time,
              end_time: adset.end_time,
              created_time: adset.created_time,
              updated_time: adset.updated_time,
            });

            // Adset level insights
            if (adset.insights && adset.insights.data && adset.insights.data.length > 0) {
              adsetInsightsCount += adset.insights.data.length;

              for (const insight of adset.insights.data) {
                const actionValues = extractActionValues(insight.actions || []);
                const costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type || []);
                const metrics = calculateResultsAndCost(
                  objective,
                  insight.actions,
                  insight.cost_per_action_type,
                  insight.spend,
                  insight.reach
                );

                addLog('debug', `Adset metrics:`, metrics);

                allInsights.push({
                  user_id: userId,
                  account_id: accountId,
                  account_name: insight.account_name || '',
                  campaign_id: campaign.id,
                  campaign_name: campaign.name,
                  adset_id: adset.id,
                  adset_name: adset.name,
                  objective,
                  date_start: insight.date_start,
                  date_stop: insight.date_stop,
                  sync_date: insight.date_start,

                  // Calculated metrics
                  results: metrics.results,
                  cost_per_result: metrics.cost_per_result,
                  result_label: metrics.result_label,
                  action_type_used: metrics.action_type_used,

                  // Direct metrics from API
                  spend: safeNumber(insight.spend),
                  impressions: parseInt(insight.impressions || '0'),
                  reach: parseInt(insight.reach || '0'),
                  frequency: safeNumber(insight.frequency),
                  clicks: parseInt(insight.clicks || '0'),
                  ctr: safeNumber(insight.ctr),
                  cpc: safeNumber(insight.cpc),
                  cpm: safeNumber(insight.cpm),
                  cpp: safeNumber(insight.cpp),
                  cost_per_unique_click: safeNumber(insight.cost_per_unique_click),

                  // Rankings
                  quality_ranking: insight.quality_ranking || null,
                  engagement_rate_ranking: insight.engagement_rate_ranking || null,
                  conversion_rate_ranking: insight.conversion_rate_ranking || null,

                  // ROAS & Actions
                  purchase_roas: insight.purchase_roas,
                  actions: insight.actions,
                  action_values: insight.action_values,
                  cost_per_action_type: insight.cost_per_action_type,

                  // 11 Action values
                  started_7d: actionValues.started_7d,
                  replied_7d: actionValues.replied_7d,
                  first_reply: actionValues.first_reply,
                  messaging_connection: actionValues.messaging_connection,
                  depth_2_message: actionValues.depth_2_message,
                  depth_3_message: actionValues.depth_3_message,
                  welcome_message_view: actionValues.welcome_message_view,
                  link_click: actionValues.link_click,
                  video_view: actionValues.video_view,
                  post_engagement_count: actionValues.post_engagement,
                  page_engagement_count: actionValues.page_engagement,

                  // 11 Cost per action values
                  cost_per_started_7d: costPerActionValues.cost_per_started_7d,
                  cost_per_replied_7d: costPerActionValues.cost_per_replied_7d,
                  cost_per_first_reply: costPerActionValues.cost_per_first_reply,
                  cost_per_messaging_connection: costPerActionValues.cost_per_messaging_connection,
                  cost_per_depth_2_message: costPerActionValues.cost_per_depth_2_message,
                  cost_per_depth_3_message: costPerActionValues.cost_per_depth_3_message,
                  cost_per_welcome_message_view: costPerActionValues.cost_per_welcome_message_view,
                  cost_per_link_click: costPerActionValues.cost_per_link_click,
                  cost_per_video_view: costPerActionValues.cost_per_video_view,
                  cost_per_post_engagement: costPerActionValues.cost_per_post_engagement,
                  cost_per_page_engagement: costPerActionValues.cost_per_page_engagement,

                  // Video metrics
                  video_p25_watched_actions: insight.video_p25_watched_actions,
                  video_p50_watched_actions: insight.video_p50_watched_actions,
                  video_p75_watched_actions: insight.video_p75_watched_actions,
                  video_p100_watched_actions: insight.video_p100_watched_actions,
                  video_play_actions: insight.video_play_actions,
                  cost_per_thruplay: safeNumber(insight.cost_per_thruplay),

                  budget: adsetBudget,
                  status: adset.status,
                  effective_status: adset.effective_status,
                });
              }
            }

            // Get ads with nested insights
            const adFields = ['id', 'name', 'status', 'effective_status', 'created_time', 'updated_time'];
            const adInsightQuery = `insights.time_increment(1).time_range(${timeRange}).action_breakdowns(action_type).limit(1000){${INSIGHT_FIELDS.join(',')}}`;
            const adFinalFields = [...adFields, adInsightQuery].join(',');

            const adsUrl = `${BASE_URL}/${adset.id}/ads?fields=${adFinalFields}&limit=500&access_token=${accessToken}`;
            const adsResponse = await fetch(adsUrl);

            if (adsResponse.ok) {
              const adsData = await adsResponse.json();
              const ads = adsData.data || [];

              for (const ad of ads) {
                // Collect ad for upsert
                adsToUpsert.push({
                  id: ad.id,
                  name: ad.name,
                  status: ad.status,
                  effective_status: ad.effective_status,
                  adset_id: adset.id,
                  campaign_id: campaign.id,
                  account_id: accountId,
                  user_id: userId,
                  created_time: ad.created_time,
                  updated_time: ad.updated_time,
                });

                // Ad level insights
                if (ad.insights && ad.insights.data && ad.insights.data.length > 0) {
                  adInsightsCount += ad.insights.data.length;

                  for (const insight of ad.insights.data) {
                    const actionValues = extractActionValues(insight.actions || []);
                    const costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type || []);
                    const metrics = calculateResultsAndCost(
                      objective,
                      insight.actions,
                      insight.cost_per_action_type,
                      insight.spend,
                      insight.reach
                    );

                    addLog('debug', `Ad metrics:`, metrics);

                    allInsights.push({
                      user_id: userId,
                      account_id: accountId,
                      account_name: insight.account_name || '',
                      campaign_id: campaign.id,
                      campaign_name: campaign.name,
                      adset_id: adset.id,
                      adset_name: adset.name,
                      ad_id: ad.id,
                      ad_name: ad.name,
                      objective,
                      date_start: insight.date_start,
                      date_stop: insight.date_stop,
                      sync_date: insight.date_start,

                      // Calculated metrics
                      results: metrics.results,
                      cost_per_result: metrics.cost_per_result,
                      result_label: metrics.result_label,
                      action_type_used: metrics.action_type_used,

                      // Direct metrics from API
                      spend: safeNumber(insight.spend),
                      impressions: parseInt(insight.impressions || '0'),
                      reach: parseInt(insight.reach || '0'),
                      frequency: safeNumber(insight.frequency),
                      clicks: parseInt(insight.clicks || '0'),
                      ctr: safeNumber(insight.ctr),
                      cpc: safeNumber(insight.cpc),
                      cpm: safeNumber(insight.cpm),
                      cpp: safeNumber(insight.cpp),
                      cost_per_unique_click: safeNumber(insight.cost_per_unique_click),

                      // Rankings
                      quality_ranking: insight.quality_ranking || null,
                      engagement_rate_ranking: insight.engagement_rate_ranking || null,
                      conversion_rate_ranking: insight.conversion_rate_ranking || null,

                      // ROAS & Actions
                      purchase_roas: insight.purchase_roas,
                      actions: insight.actions,
                      action_values: insight.action_values,
                      cost_per_action_type: insight.cost_per_action_type,

                      // 11 Action values
                      started_7d: actionValues.started_7d,
                      replied_7d: actionValues.replied_7d,
                      first_reply: actionValues.first_reply,
                      messaging_connection: actionValues.messaging_connection,
                      depth_2_message: actionValues.depth_2_message,
                      depth_3_message: actionValues.depth_3_message,
                      welcome_message_view: actionValues.welcome_message_view,
                      link_click: actionValues.link_click,
                      video_view: actionValues.video_view,
                      post_engagement_count: actionValues.post_engagement,
                      page_engagement_count: actionValues.page_engagement,

                      // 11 Cost per action values
                      cost_per_started_7d: costPerActionValues.cost_per_started_7d,
                      cost_per_replied_7d: costPerActionValues.cost_per_replied_7d,
                      cost_per_first_reply: costPerActionValues.cost_per_first_reply,
                      cost_per_messaging_connection: costPerActionValues.cost_per_messaging_connection,
                      cost_per_depth_2_message: costPerActionValues.cost_per_depth_2_message,
                      cost_per_depth_3_message: costPerActionValues.cost_per_depth_3_message,
                      cost_per_welcome_message_view: costPerActionValues.cost_per_welcome_message_view,
                      cost_per_link_click: costPerActionValues.cost_per_link_click,
                      cost_per_video_view: costPerActionValues.cost_per_video_view,
                      cost_per_post_engagement: costPerActionValues.cost_per_post_engagement,
                      cost_per_page_engagement: costPerActionValues.cost_per_page_engagement,

                      // Video metrics
                      video_p25_watched_actions: insight.video_p25_watched_actions,
                      video_p50_watched_actions: insight.video_p50_watched_actions,
                      video_p75_watched_actions: insight.video_p75_watched_actions,
                      video_p100_watched_actions: insight.video_p100_watched_actions,
                      video_play_actions: insight.video_play_actions,
                      cost_per_thruplay: safeNumber(insight.cost_per_thruplay),

                      budget: adsetBudget,
                      status: ad.status,
                      effective_status: ad.effective_status,
                    });
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        addLog('error', `Error processing campaign ${campaign.id}`, error);
        continue;
      }
    }

    addLog('success', `📊 Campaign insights: ${campaignInsightsCount}`);
    addLog('success', `📊 Adset insights: ${adsetInsightsCount}`);
    addLog('success', `📊 Ad insights: ${adInsightsCount}`);
    addLog('info', `Total insights collected: ${allInsights.length}`);

    // ✅ Upsert insights using NocoDB atomic upsert (NO MORE DUPLICATES)
    if (allInsights.length > 0) {
      addLog('info', `💾 Upserting ${allInsights.length} insights to NocoDB...`);

      // Map to UpsertInsightInput format
      const upsertInputs: UpsertInsightInput[] = allInsights.map(insight => ({
        user_id: insight.user_id,
        account_id: insight.account_id,
        account_name: insight.account_name,
        campaign_id: insight.campaign_id || undefined,
        campaign_name: insight.campaign_name,
        adset_id: insight.adset_id || undefined,
        adset_name: insight.adset_name,
        ad_id: insight.ad_id || undefined,
        ad_name: insight.ad_name,
        level: (insight.ad_id ? 'ad' : insight.adset_id ? 'adset' : 'campaign') as 'campaign' | 'adset' | 'ad',
        date_start: insight.date_start,
        date_stop: insight.date_stop,
        effective_status: insight.effective_status,
        configured_status: insight.status,
        status: insight.effective_status,
        objective: insight.objective,
        metrics: {
          spend: insight.spend,
          clicks: insight.clicks,
          impressions: insight.impressions,
          reach: insight.reach,
          frequency: insight.frequency,
          results: insight.results,
          cost_per_result: insight.cost_per_result,
          ctr: insight.ctr,
          cpm: insight.cpm,
          cpc: insight.cpc,
          cpp: insight.cpp,
          cost_per_unique_click: insight.cost_per_unique_click,
          quality_ranking: insight.quality_ranking,
          engagement_rate_ranking: insight.engagement_rate_ranking,
          conversion_rate_ranking: insight.conversion_rate_ranking,
          purchase_roas: insight.purchase_roas,
          actions: insight.actions,
          action_values: insight.action_values,
          cost_per_action_type: insight.cost_per_action_type,
          started_7d: insight.started_7d,
          replied_7d: insight.replied_7d,
          first_reply: insight.first_reply,
          messaging_connection: insight.messaging_connection,
          depth_2_message: insight.depth_2_message,
          depth_3_message: insight.depth_3_message,
          welcome_message_view: insight.welcome_message_view,
          link_click: insight.link_click,
          video_view: insight.video_view,
          post_engagement_count: insight.post_engagement_count,
          page_engagement_count: insight.page_engagement_count,
          cost_per_started_7d: insight.cost_per_started_7d,
          cost_per_replied_7d: insight.cost_per_replied_7d,
          cost_per_first_reply: insight.cost_per_first_reply,
          cost_per_messaging_connection: insight.cost_per_messaging_connection,
          cost_per_depth_2_message: insight.cost_per_depth_2_message,
          cost_per_depth_3_message: insight.cost_per_depth_3_message,
          cost_per_welcome_message_view: insight.cost_per_welcome_message_view,
          cost_per_link_click: insight.cost_per_link_click,
          cost_per_video_view: insight.cost_per_video_view,
          cost_per_post_engagement: insight.cost_per_post_engagement,
          cost_per_page_engagement: insight.cost_per_page_engagement,
          video_p25_watched_actions: insight.video_p25_watched_actions,
          video_p50_watched_actions: insight.video_p50_watched_actions,
          video_p75_watched_actions: insight.video_p75_watched_actions,
          video_p100_watched_actions: insight.video_p100_watched_actions,
          video_play_actions: insight.video_play_actions,
          cost_per_thruplay: insight.cost_per_thruplay,
          result_label: insight.result_label,
          action_type_used: insight.action_type_used,
          budget: insight.budget,
        }
      }));

      // Batch upsert with atomic operations
      const results = await batchUpsertInsights(upsertInputs, NOCODB_CONFIG);

      addLog('success', '✅ NocoDB upsert completed:', {
        total: upsertInputs.length,
        created: results.created,
        updated: results.updated,
        failed: results.failed,
        duplicate_rate: ((results.updated / upsertInputs.length) * 100).toFixed(2) + '%'
      });

      if (results.errors.length > 0) {
        addLog('error', `⚠️ ${results.errors.length} errors occurred:`, results.errors.slice(0, 5));
      }
    } else {
      addLog('info', '⚠️ No insights to upsert');
    }

    // ✅ NEW: Upsert Catalog (Structure)
    if (campaignsToUpsert.length > 0) {
      addLog('info', `💾 Upserting ${campaignsToUpsert.length} campaigns to Catalog...`);
      const campResults = await batchUpsertCatalog(campaignsToUpsert, NOCODB_CONFIG.TABLES.FACEBOOK_CAMPAIGNS, 'id');
      addLog('success', '✅ Campaigns Catalog updated:', campResults);
    }

    if (adsetsToUpsert.length > 0) {
      addLog('info', `💾 Upserting ${adsetsToUpsert.length} adsets to Catalog...`);
      const adsetResults = await batchUpsertCatalog(adsetsToUpsert, NOCODB_CONFIG.TABLES.FACEBOOK_ADSETS, 'id');
      addLog('success', '✅ AdSets Catalog updated:', adsetResults);
    }

    if (adsToUpsert.length > 0) {
      addLog('info', `💾 Upserting ${adsToUpsert.length} ads to Catalog...`);
      const adResults = await batchUpsertCatalog(adsToUpsert, NOCODB_CONFIG.TABLES.FACEBOOK_ADS, 'id');
      addLog('success', '✅ Ads Catalog updated:', adResults);
    }

    return new Response(
      JSON.stringify({ success: true, logs }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    addLog('error', 'Fatal error', error.message);
    return new Response(
      JSON.stringify({ error: error.message, logs }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

