import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper to safely parse number (keeps decimals)
function safeNumber(val: any): number {
  if (val == null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(num) ? 0 : num;
}

// Helper to safely parse integer (rounds decimals for bigint columns)
function safeInt(val: any): number {
  if (val == null) return 0;
  const num = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(num) ? 0 : Math.round(num);
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

// Map objective to preferred action_types (priority from left to right)
const OBJECTIVE_ACTION_MAP: Record<string, string[]> = {
  'MESSAGES': ['onsite_conversion.messaging_conversation_started_7d'],
  'OUTCOME_ENGAGEMENT': [
    'onsite_conversion.messaging_conversation_started_7d',
    'onsite_conversion.total_messaging_connection',
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

// Calculate results and cost_per_result strictly from messaging_conversation_started_7d
function calculateResultsAndCost(
  objective: string,
  actions: any[] | null,
  cost_per_action_type: any[] | null,
  spend: string | number,
  reach?: string | number
) {
  const spendNum = safeNumber(spend);
  const STARTED_KEY = 'onsite_conversion.messaging_conversation_started_7d';

  const started = actions?.find((a: any) => a.action_type === STARTED_KEY);
  const results = started ? Math.round(safeNumber(started.value)) : 0;

  let costPerResult = 0;
  if (results > 0) {
    const cost = cost_per_action_type?.find((a: any) => a.action_type === STARTED_KEY);
    costPerResult = cost ? safeNumber(cost.value) : (spendNum > 0 ? spendNum / results : 0);
  }

  return {
    results,
    cost_per_result: Math.round(costPerResult * 100) / 100,
    result_label: STARTED_KEY,
    action_type_used: STARTED_KEY,
  };
}

// Generate list of dates between since and until (YYYY-MM-DD format)
function generateDateRange(since: string, until: string): string[] {
  const dates: string[] = [];
  const start = new Date(since);
  const end = new Date(until);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

// Check which dates already exist in history table for this user+account
async function getExistingDates(
  nocodbUrl: string,
  nocodbHeaders: any,
  historyTableId: string,
  userId: string,
  accountId: string,
  since: string,
  until: string
): Promise<Set<string>> {
  const existingDates = new Set<string>();

  // Query: WHERE user_id = X AND account_id = Y (filter dates in memory to avoid 422 error)
  const whereClause = `(user_id,eq,${userId})~and(account_id,eq,${accountId})`;

  const url = `${nocodbUrl}/api/v2/tables/${historyTableId}/records?where=${encodeURIComponent(whereClause)}&fields=date_start&limit=10000`;

  try {
    const response = await fetch(url, { headers: nocodbHeaders });
    if (!response.ok) {
      console.warn('⚠️ Failed to fetch existing dates, will sync all');
      return existingDates;
    }

    const data = await response.json();
    const records = data.list || [];

    // Filter dates in memory instead of in query to avoid API limitations
    const sinceDate = new Date(since);
    const untilDate = new Date(until);

    records.forEach((record: any) => {
      if (record.date_start) {
        const dateOnly = record.date_start.split('T')[0]; // Normalize to YYYY-MM-DD
        const recordDate = new Date(dateOnly);

        // Only add dates within the requested range
        if (recordDate >= sinceDate && recordDate <= untilDate) {
          existingDates.add(dateOnly);
        }
      }
    });

    return existingDates;
  } catch (error) {
    console.warn('⚠️ Error checking existing dates:', error);
    return existingDates;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const logs: any[] = [];
  const addLog = (type: string, message: string, details?: any) => {
    logs.push({ type, message, details, timestamp: new Date().toISOString() });

  };

  try {
    const { userId, accountId, since, until } = await req.json();
    addLog('info', `🔄 Syncing historical insights for user=${userId}, account=${accountId}, ${since} to ${until}`);

    if (!userId || !accountId || !since || !until) {
      throw new Error('Missing required parameters: userId, accountId, since, until');
    }

    // NocoDB configuration (from shared config)
    const nocodbUrl = NOCODB_CONFIG.BASE_URL;
    const nocodbToken = NOCODB_CONFIG.API_TOKEN;
    const adAccountsTableId = NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS;
    const historyTableId = NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_HISTORY;

    const nocodbHeaders = getNocoDBHeaders();

    // Fetch all accounts then filter (same approach as sync-today-insights)
    addLog('debug', `📡 Fetching accounts from ${nocodbUrl}/api/v2/tables/${adAccountsTableId}/records`);

    const accountsResponse = await fetch(`${nocodbUrl}/api/v2/tables/${adAccountsTableId}/records?limit=10000`, {
      headers: nocodbHeaders,
    });

    if (!accountsResponse.ok) {
      const errorText = await accountsResponse.text();
      addLog('error', `❌ Failed to fetch accounts: ${accountsResponse.status}`, { errorText });
      throw new Error(`Failed to fetch accounts: ${accountsResponse.status} - ${errorText}`);
    }

    const accountsData = await accountsResponse.json();
    const accounts: any[] = accountsData.list || [];
    addLog('info', `📋 Found ${accounts.length} accounts in NocoDB`);

    // Pick the requested account (accountId may or may not include act_)
    const normalizedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
    const account = accounts.find((a: any) => a.account_id === normalizedId || a.account_id === accountId);

    if (!account) {
      addLog('error', `❌ Account not found: ${accountId} (normalized: ${normalizedId})`);
      addLog('debug', `Available accounts: ${accounts.map((a: any) => a.account_id).join(', ')}`);
      throw new Error(`Account not found: ${accountId}`);
    }

    if (!account.access_token) {
      addLog('error', `❌ No access_token for account ${account.account_id}`);
      throw new Error('No access token found for account');
    }

    const accessToken = account.access_token as string;
    addLog('success', `✅ Found access token for ${account.account_id}`);

    // ✅ Check which dates already exist in history table
    const allDates = generateDateRange(since, until);
    addLog('info', `📅 Date range contains ${allDates.length} days: ${allDates[0]} → ${allDates[allDates.length - 1]}`);

    const existingDates = await getExistingDates(
      nocodbUrl,
      nocodbHeaders,
      historyTableId,
      userId,
      normalizedId,
      since,
      until
    );

    addLog('info', `✅ Found ${existingDates.size} existing dates in history table`);

    // ✅ Filter out dates that already exist
    const datesToSync = allDates.filter(date => !existingDates.has(date));

    if (datesToSync.length === 0) {
      addLog('success', '🎉 All dates already synced! Nothing to do.');
      return new Response(
        JSON.stringify({
          success: true,
          totalSynced: 0,
          updated: 0,
          inserted: 0,
          skipped: allDates.length,
          datesSkipped: Array.from(existingDates),
          message: 'All dates already exist in history table',
          timestamp: new Date().toISOString(),
          logs,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    addLog('info', `🔄 Need to sync ${datesToSync.length} new dates`);
    if (existingDates.size > 0) {
      addLog('info', `   ⏭️ Skipping ${existingDates.size} dates: ${Array.from(existingDates).slice(0, 5).join(', ')}${existingDates.size > 5 ? '...' : ''}`);
    }
    addLog('info', `   📥 Syncing: ${datesToSync.slice(0, 5).join(', ')}${datesToSync.length > 5 ? '...' : ''}`);

    const API_VERSION = 'v21.0';
    const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

    const fields = [
      'campaign_id', 'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
      'date_start', 'date_stop', 'impressions', 'clicks', 'spend', 'reach', 'frequency', 'ctr', 'cpc', 'cpm', 'cpp', 'cost_per_unique_click',
      'actions', 'action_values', 'cost_per_action_type', 'objective', 'website_ctr', 'purchase_roas',
      'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
      'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions', 'video_play_actions', 'cost_per_thruplay'
    ].join(',');

    // ✅ Only fetch insights for dates that need syncing
    const minDate = datesToSync[0];
    const maxDate = datesToSync[datesToSync.length - 1];
    const timeRangeParam = encodeURIComponent(JSON.stringify({ since: minDate, until: maxDate }));
    const levels: Array<'campaign' | 'adset' | 'ad'> = ['campaign', 'adset', 'ad'];

    const allInsights: any[] = [];
    let campaignInsightsCount = 0;
    let adsetInsightsCount = 0;
    let adInsightsCount = 0;

    for (const level of levels) {
      const fbUrl = `${BASE_URL}/${normalizedId}/insights?level=${level}&time_range=${timeRangeParam}&time_increment=1&fields=${fields}&limit=1000&action_breakdowns=action_type&access_token=${accessToken}`;
      addLog('debug', `📡 Fetching ${level} insights`, { url: fbUrl.replace(accessToken, 'TOKEN_HIDDEN') });

      const fbResponse = await fetch(fbUrl);
      const fbData = await fbResponse.json();

      if (!fbResponse.ok || fbData.error) {
        addLog('error', `❌ Facebook API error for ${level}`, fbData.error || fbData);
        continue;
      }

      const data = fbData.data || [];
      addLog('success', `✅ ${level} insights count: ${data.length}`);

      for (const insight of data) {
        const actionValues = extractActionValues(insight.actions || []);
        const costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type || []);
        const metrics = calculateResultsAndCost(
          insight.objective || '',
          insight.actions,
          insight.cost_per_action_type,
          insight.spend,
          insight.reach
        );

        allInsights.push({
          user_id: userId,
          account_id: normalizedId,
          campaign_id: insight.campaign_id || null,
          campaign_name: insight.campaign_name || null,
          adset_id: insight.adset_id || null,
          adset_name: insight.adset_name || null,
          ad_id: insight.ad_id || null,
          ad_name: insight.ad_name || null,
          level,
          objective: insight.objective || null,
          date_start: insight.date_start,
          date_stop: insight.date_stop,

          // Calculated
          results: safeInt(metrics.results),
          cost_per_result: safeInt(metrics.cost_per_result),
          result_label: metrics.result_label,
          action_type_used: metrics.action_type_used,

          // Direct - using safeInt for bigint columns
          spend: safeInt(insight.spend),
          impressions: safeInt(insight.impressions),
          reach: safeInt(insight.reach),
          frequency: safeNumber(insight.frequency),
          clicks: safeInt(insight.clicks),
          ctr: safeNumber(insight.ctr),
          cpc: safeInt(insight.cpc),
          cpm: safeInt(insight.cpm),
          cpp: safeInt(insight.cpp),
          cost_per_unique_click: safeInt(insight.cost_per_unique_click),

          // Rankings
          quality_ranking: insight.quality_ranking || null,
          engagement_rate_ranking: insight.engagement_rate_ranking || null,
          conversion_rate_ranking: insight.conversion_rate_ranking || null,

          // JSON fields
          purchase_roas: insight.purchase_roas,
          actions: insight.actions,
          action_values: insight.action_values,
          cost_per_action_type: insight.cost_per_action_type,

          // 11 Action values
          started_7d: actionValues.started_7d,
          results_messaging_replied_7d: actionValues.replied_7d,
          first_reply: actionValues.first_reply,
          messaging_connection: actionValues.messaging_connection,
          depth_2_message: actionValues.depth_2_message,
          depth_3_message: actionValues.depth_3_message,
          welcome_message_view: actionValues.welcome_message_view,
          link_click: actionValues.link_click,
          video_view: actionValues.video_view,
          post_engagement_count: actionValues.post_engagement,
          page_engagement_count: actionValues.page_engagement,

          // 11 Cost per action values - using safeInt for bigint columns
          cost_per_started_7d: safeInt(costPerActionValues.cost_per_started_7d),
          cost_per_messaging_replied_7d: safeInt(costPerActionValues.cost_per_replied_7d),
          cost_per_first_reply: safeInt(costPerActionValues.cost_per_first_reply),
          cost_per_messaging_connection: safeInt(costPerActionValues.cost_per_messaging_connection),
          cost_per_depth_2_message: safeInt(costPerActionValues.cost_per_depth_2_message),
          cost_per_depth_3_message: safeInt(costPerActionValues.cost_per_depth_3_message),
          cost_per_welcome_message_view: safeInt(costPerActionValues.cost_per_welcome_message_view),
          cost_per_link_click: safeInt(costPerActionValues.cost_per_link_click),
          cost_per_video_view: safeInt(costPerActionValues.cost_per_video_view),
          cost_per_post_engagement: safeInt(costPerActionValues.cost_per_post_engagement),
          cost_per_page_engagement: safeInt(costPerActionValues.cost_per_page_engagement),

          // Video metrics
          video_p25_watched_actions: insight.video_p25_watched_actions,
          video_p50_watched_actions: insight.video_p50_watched_actions,
          video_p75_watched_actions: insight.video_p75_watched_actions,
          video_p100_watched_actions: insight.video_p100_watched_actions,
          video_play_actions: insight.video_play_actions,
          cost_per_thruplay: safeInt(insight.cost_per_thruplay),
        });
      }

      if (level === 'campaign') campaignInsightsCount += data.length;
      if (level === 'adset') adsetInsightsCount += data.length;
      if (level === 'ad') adInsightsCount += data.length;
    }

    addLog('success', `📊 Campaign insights: ${campaignInsightsCount}`);
    addLog('success', `📊 Adset insights: ${adsetInsightsCount}`);
    addLog('success', `📊 Ad insights: ${adInsightsCount}`);
    addLog('info', `Total insights collected: ${allInsights.length}`);

    // ✅ Filter allInsights to ONLY include dates we want to sync
    const filteredInsights = allInsights.filter((insight: any) => {
      const insightDate = insight.date_start.split('T')[0];
      return datesToSync.includes(insightDate);
    });

    addLog('info', `🔍 Filtered ${allInsights.length} → ${filteredInsights.length} insights (removed existing dates)`);

    // UPSERT to NocoDB history table (same strategy as today function)
    let totalUpdated = 0;
    let totalInserted = 0;

    const tableUrl = `${nocodbUrl}/api/v2/tables/${historyTableId}/records`;

    // Build map of existing records for range [since, until]
    const existingWhere = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${normalizedId})~and(date_start,gte,${since})~and(date_start,lte,${until})`
    );

    const existingResp = await fetch(`${tableUrl}?where=${existingWhere}&limit=10000`, { headers: nocodbHeaders });
    const existingMap = new Map<string, any>();
    if (existingResp.ok) {
      const existingData = await existingResp.json();
      const existing = existingData.list || [];
      existing.forEach((r: any) => {
        const key = [
          r.user_id,
          r.account_id,
          r.date_start,
          r.level,
          r.campaign_id || '',
          r.adset_id || '',
          r.ad_id || ''
        ].join('|');
        existingMap.set(key, r);
      });
      addLog('info', `📦 Loaded ${existing.length} existing records for UPSERT map`);
    } else {
      addLog('warn', `⚠️ Failed to load existing records: ${existingResp.status}`);
    }

    // Split into update vs insert
    const toUpdate: any[] = [];
    const toInsert: any[] = [];

    for (const rec of filteredInsights) {
      const key = [
        userId,
        normalizedId,
        rec.date_start,
        rec.level,
        rec.campaign_id || '',
        rec.adset_id || '',
        rec.ad_id || ''
      ].join('|');

      const existing = existingMap.get(key);
      if (existing) toUpdate.push({ ...rec, Id: existing.Id });
      else toInsert.push(rec);
    }

    // Perform UPDATEs in small batches
    if (toUpdate.length > 0) {
      const CONCURRENCY = 10;
      for (let i = 0; i < toUpdate.length; i += CONCURRENCY) {
        const batch = toUpdate.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async (row) => {
          const { Id, ...payload } = row;
          const resp = await fetch(`${tableUrl}/${Id}`, {
            method: 'PATCH',
            headers: nocodbHeaders,
            body: JSON.stringify(payload),
          });
          if (resp.ok) totalUpdated++; else addLog('error', `❌ Failed to update ${Id}`, await resp.text());
        }));
      }
      addLog('success', `✅ Updated ${totalUpdated} records`);
    }

    // Perform INSERTs in batches
    if (toInsert.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < toInsert.length; i += BATCH) {
        const batch = toInsert.slice(i, i + BATCH);
        const resp = await fetch(tableUrl, {
          method: 'POST',
          headers: nocodbHeaders,
          body: JSON.stringify(batch),
        });
        if (resp.ok) totalInserted += batch.length; else addLog('error', '❌ Failed to insert batch', await resp.text());
      }
      addLog('success', `✅ Inserted ${totalInserted} records`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalSynced: filteredInsights.length,
        updated: totalUpdated,
        inserted: totalInserted,
        skipped: existingDates.size,
        datesSynced: datesToSync,
        datesSkipped: Array.from(existingDates),
        campaignInsightsCount,
        adsetInsightsCount,
        adInsightsCount,
        timestamp: new Date().toISOString(),
        logs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Fatal error in sync-historical-insights:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
