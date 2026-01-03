import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Extract 10 action field values from Facebook API actions array
 */
function extractActionValues(actions: any[]): {
  started_7d: number;
  total_messaging_connection: number;
  link_click: number;
  messaging_welcome_message_view: number;
  post_engagement_action: number;
  post_interaction_gross: number;
  messaging_first_reply: number;
  video_view: number;
  post_reaction: number;
  page_engagement_action: number;
} {
  const findAction = (actionType: string): number => {
    const action = actions?.find((a: any) => a.action_type === actionType);
    const value = action?.value || 0;
    return typeof value === 'string' ? parseInt(value) : Number(value) || 0;
  };

  return {
    started_7d: findAction('onsite_conversion.messaging_conversation_started_7d'),
    total_messaging_connection: findAction('onsite_conversion.total_messaging_connection'),
    link_click: findAction('link_click'),
    messaging_welcome_message_view: findAction('onsite_conversion.messaging_welcome_message_view'),
    post_engagement_action: findAction('post_engagement'),
    post_interaction_gross: findAction('post'),
    messaging_first_reply: findAction('onsite_conversion.messaging_first_reply'),
    video_view: findAction('video_view'),
    post_reaction: findAction('post_reaction'),
    page_engagement_action: findAction('page_engagement'),
  };
}

/**
 * 🧹 LAYER 1: Pre-Deduplication from Facebook API
 * Removes duplicate insights within Facebook response
 * Keeps the record with highest spend (= most recent data)
 */
function deduplicateInsights(insights: any[]): any[] {
  const uniqueMap = new Map<string, any>();

  insights.forEach(insight => {
    // Unique key: date|level|campaign_id|adset_id|ad_id
    const key = [
      insight.date_start,
      insight.level,
      insight.campaign_id || '',
      insight.adset_id || '',
      insight.ad_id || ''
    ].join('|');

    // Keep record with highest spend (= most recent data from Facebook)
    const existing = uniqueMap.get(key);
    if (!existing || insight.spend > existing.spend) {
      uniqueMap.set(key, insight);
    }
  });

  const result = Array.from(uniqueMap.values());
  if (insights.length !== result.length) {

  }
  return result;
}

/**
 * Normalize date to YYYY-MM-DD format for consistent key comparison
 */
function normalizeDateForKey(date: string | undefined): string {
  if (!date) return '';
  // Remove time part if exists: "2025-10-27T00:00:00.000Z" → "2025-10-27"
  return date.split('T')[0];
}

/**
 * Normalize level to lowercase for consistent key comparison
 * Handles case mismatch between Facebook API ('campaign') and NocoDB ('CAMPAIGN' or 'campaign')
 */
function normalizeLevelForKey(level: string | undefined): string {
  if (!level) return '';
  return level.toLowerCase().trim();
}

/**
 * Normalize ID to empty string for consistent key comparison
 * Handles: null, undefined, "null", "undefined", empty string
 */
function normalizeIdForKey(id: string | null | undefined): string {
  if (!id || id === 'null' || id === 'undefined') return '';
  return String(id).trim();
}

// Extract specific cost per action values from cost_per_action_type array
// Returns findValue function for additional use in payload
function extractCostPerActionValues(costPerActions: any[]): {
  values: any;
  findValue: (actionType: string) => number | null;
} {
  const findValue = (actionType: string): number | null => {
    if (!costPerActions || !Array.isArray(costPerActions)) return null;
    const item = costPerActions.find((a: any) => a.action_type === actionType);
    return item?.value ? parseFloat(item.value) : null;
  };

  const values = {
    cost_per_started_7d: findValue('onsite_conversion.messaging_conversation_started_7d'),
    cost_per_replied_7d: findValue('onsite_conversion.messaging_conversation_replied_7d'),
    cost_per_first_reply: findValue('onsite_conversion.messaging_first_reply'),
    cost_per_messaging_connection: findValue('onsite_conversion.total_messaging_connection'),
    cost_per_depth_2_message: findValue('onsite_conversion.messaging_user_depth_2_message_send'),
    cost_per_depth_3_message: findValue('onsite_conversion.messaging_user_depth_3_message_send'),
    cost_per_welcome_message_view: findValue('onsite_conversion.messaging_welcome_message_view'),
    cost_per_link_click: findValue('link_click'),
    cost_per_video_view: findValue('video_view'),
    cost_per_interaction_gross: findValue('post'),
    cost_per_post_reaction: findValue('post_reaction'),
    cost_per_post_engagement: findValue('post_engagement'),
    cost_per_page_engagement: findValue('page_engagement'),
  };

  return { values, findValue };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {


    // Parse request body for userId and options
    const body = await req.json().catch(() => ({} as any));
    const { userId: bodyUserId, accountIds, hardClean } = body;



    // NocoDB configuration
    const nocodbUrl = Deno.env.get('NOCODB_API_URL') || 'https://db.hpb.edu.vn';
    const nocodbToken = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
    const adAccountsTableId = 'm85j7noglexpeh3';
    const facebookInsightsTableId = 'm2uao1is9j02wfn';

    const nocodbHeaders = {
      'xc-token': nocodbToken,
      'Content-Type': 'application/json',
    };

    // Get all active ad accounts from NocoDB
    const accountsResponse = await fetch(`${nocodbUrl}/api/v2/tables/${adAccountsTableId}/records`, {
      headers: nocodbHeaders,
    });

    const accountsData = await accountsResponse.json();
    let activeAccounts = accountsData.list?.filter((acc: any) =>
      acc.is_active && acc.access_token
    ) || [];

    // Filter by accountIds if provided
    if (accountIds && accountIds.length > 0) {
      activeAccounts = activeAccounts.filter((acc: any) => accountIds.includes(acc.account_id));
    }



    let totalInsightsSynced = 0;
    let totalDeleted = 0;

    for (const account of activeAccounts) {
      let lockId: string | null = null;

      try {
        const accessToken = account.access_token;
        const accountId = account.account_id;
        // ✅ Use userId from request body, fallback to account, then test-user-001
        const effectiveUserId = bodyUserId || account.user_id || 'test-user-001';



        // 🔒 LAYER 2: DISTRIBUTED LOCK (prevent race conditions)
        const today = new Date().toISOString().split('T')[0];
        const lockKey = `LOCK_${effectiveUserId}_${accountId}_${today}`;
        const lockCheckUrl = `${nocodbUrl}/api/v2/tables/${facebookInsightsTableId}/records?where=${encodeURIComponent(`(synced_at,eq,${lockKey})`)}&limit=1`;

        const lockCheckResponse = await fetch(lockCheckUrl, { headers: nocodbHeaders });
        if (lockCheckResponse.ok) {
          const lockData = await lockCheckResponse.json();
          if (lockData.list && lockData.list.length > 0) {
            const lockRecord = lockData.list[0];
            const lockTime = new Date(lockRecord.CreatedAt);
            const now = new Date();
            const lockAgeMinutes = (now.getTime() - lockTime.getTime()) / 1000 / 60;

            if (lockAgeMinutes < 5) {  // Lock valid for 5 minutes
              continue;  // Skip to next account
            } else {
              // Delete stale lock
              await fetch(`${nocodbUrl}/api/v2/tables/${facebookInsightsTableId}/records/${lockRecord.Id}`, {
                method: 'DELETE',
                headers: nocodbHeaders
              });
            }
          }
        }

        // 🔒 CREATE LOCK

        const lockResponse = await fetch(`${nocodbUrl}/api/v2/tables/${facebookInsightsTableId}/records`, {
          method: 'POST',
          headers: nocodbHeaders,
          body: JSON.stringify({
            user_id: effectiveUserId,
            account_id: accountId,
            synced_at: lockKey,  // Special marker
            date_start: today,
            level: 'lock',
            campaign_name: '🔒 SYNC_LOCK_DO_NOT_DELETE'
          })
        });

        if (lockResponse.ok) {
          const lockResult = await lockResponse.json();
          lockId = lockResult.Id;

        }

        // STEP 1: COLLECT IDs from Facebook API for targeted query
        const startOfDay = `${today}T00:00:00Z`;
        const endOfDay = `${today}T23:59:59Z`;

        // ========================================
        // ✅ UPSERT Strategy với insight_key
        // ========================================
        // POST record mới. Nếu trùng unique (409/422) → GET id theo insight_key → PATCH metrics
        // insight_key = user_id|account_id|campaign_id|adset_id|ad_id|YYYY-MM-DD
        // Không xóa data cũ, chỉ update metrics (spend, clicks, impressions, ...)


        const allInsights: any[] = [];
        const levels = ['campaign', 'adset', 'ad'];

        // STEP 1: Fetch FULL insights from Facebook API for all levels
        for (const level of levels) {
          try {
            const accountPath = accountId.startsWith('act_') ? accountId : `act_${accountId}`;
            const fbUrl = `https://graph.facebook.com/v21.0/${accountPath}/insights?level=${level}&date_preset=today&fields=campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,actions,cost_per_action_type,ctr,cpm,cpc,reach,frequency,objective,effective_status,configured_status&access_token=${accessToken}`;



            const fbResponse = await fetch(fbUrl);
            const fbData = await fbResponse.json();

            if (fbData.error) {
              console.error(`❌ Facebook API error for ${level}:`, fbData.error);
              continue;
            }

            if (fbData.data && fbData.data.length > 0) {


              // Transform and prepare data for NocoDB
              const insightsToAdd = fbData.data.map((insight: any) => {
                const actionValues = extractActionValues(insight.actions || []);
                const { values: costPerActionValues, findValue } = extractCostPerActionValues(insight.cost_per_action_type || []);

                const STARTED_KEY = 'onsite_conversion.messaging_conversation_started_7d';
                const started = insight.actions?.find((a: any) => a.action_type === STARTED_KEY);
                const results = started ? parseInt(started.value || 0) : 0;

                const costStarted = insight.cost_per_action_type?.find((c: any) => c.action_type === STARTED_KEY);
                const spend = parseFloat(insight.spend || 0);
                const costPerResult = costStarted ? parseFloat(costStarted.value || 0) :
                  (results > 0 && spend > 0 ? spend / results : 0);

                // ✅ Map effective_status values to valid NocoDB enum options
                let mappedEffectiveStatus = insight.effective_status;
                const statusMap: Record<string, string> = {
                  'WITH_ISSUES': 'ACTIVE',  // Map invalid status to ACTIVE
                  'ARCHIVED': 'PAUSED',     // Map ARCHIVED to PAUSED
                  'DELETED': 'PAUSED',      // Map DELETED to PAUSED
                  'PENDING_REVIEW': 'PAUSED',
                  'PENDING_BILLING_INFO': 'PAUSED'
                };

                if (mappedEffectiveStatus && statusMap[mappedEffectiveStatus]) {
                  mappedEffectiveStatus = statusMap[mappedEffectiveStatus];
                }

                // ✅ Map status values to valid options
                let mappedStatus = insight.effective_status || insight.configured_status;
                if (mappedStatus && statusMap[mappedStatus]) {
                  mappedStatus = statusMap[mappedStatus];
                }

                return {
                  user_id: effectiveUserId,
                  account_id: accountId,
                  account_name: account.account_name || accountId,
                  campaign_id: insight.campaign_id || null,
                  campaign_name: insight.campaign_name || null,
                  adset_id: insight.adset_id || null,
                  adset_name: insight.adset_name || null,
                  ad_id: insight.ad_id || null,
                  ad_name: insight.ad_name || null,
                  level: level,
                  date_start: today,
                  date_stop: today,
                  spend: parseFloat(insight.spend || 0),
                  impressions: parseInt(insight.impressions || 0),
                  clicks: parseInt(insight.clicks || 0),
                  results: results,
                  cost_per_result: costPerResult,
                  ctr: parseFloat(insight.ctr || 0),
                  cpm: parseFloat(insight.cpm || 0),
                  cpc: parseFloat(insight.cpc || 0),
                  reach: parseInt(insight.reach || 0),
                  frequency: parseFloat(insight.frequency || 0),
                  effective_status: mappedEffectiveStatus || null,
                  configured_status: insight.configured_status || null,
                  status: mappedStatus || null,
                  objective: insight.objective || null,
                  sync_date: today,

                  // Action Fields
                  started_7d: actionValues.started_7d,
                  "Tổng kết nối tin nhắn": actionValues.total_messaging_connection,
                  "Nhấp liên kết": actionValues.link_click,
                  "Xem tin nhắn chào mừng": actionValues.messaging_welcome_message_view,
                  "Tương tác bài viết": actionValues.post_engagement_action,
                  "Tương tác tổng": actionValues.post_interaction_gross,
                  "Tin nhắn đầu tiên": actionValues.messaging_first_reply,
                  "Xem video": actionValues.video_view,
                  "Phản ứng bài viết": actionValues.post_reaction,
                  "Tương tác trang": actionValues.page_engagement_action,

                  // Cost Per Action Fields
                  cost_per_started_7d: costPerActionValues.cost_per_started_7d,
                  cost_per_replied_7d: costPerActionValues.cost_per_replied_7d,
                  cost_per_first_reply: costPerActionValues.cost_per_first_reply,
                  cost_per_messaging_connection: costPerActionValues.cost_per_messaging_connection,
                  cost_per_depth_2_message: costPerActionValues.cost_per_depth_2_message,
                  cost_per_welcome_message_view: costPerActionValues.cost_per_welcome_message_view,
                  cost_per_link_click: costPerActionValues.cost_per_link_click,
                  cost_per_video_view: costPerActionValues.cost_per_video_view,
                  cost_per_interaction_gross: costPerActionValues.cost_per_interaction_gross,
                  cost_per_post_reaction: costPerActionValues.cost_per_post_reaction,
                  cost_per_page_engagement: costPerActionValues.cost_per_page_engagement,
                  cost_per_total_messaging_connection: findValue('onsite_conversion.total_messaging_connection'),
                  cost_per_messaging_welcome_message_view: findValue('onsite_conversion.messaging_welcome_message_view'),
                  cost_per_post_interaction_gross: findValue('post'),
                  cost_per_messaging_first_reply: findValue('onsite_conversion.messaging_first_reply'),
                  cost_per_messaging_user_depth_2: findValue('onsite_conversion.messaging_user_depth_2_message_send'),
                };
              });

              // Deduplicate before adding
              const uniqueInsights = deduplicateInsights(insightsToAdd);
              allInsights.push(...uniqueInsights);


            }
          } catch (levelError: any) {
            console.error(`❌ Error fetching ${level}:`, levelError.message);
          }
        }

        // STEP 2: UPSERT insights (POST new, PATCH existing)


        if (allInsights.length === 0) {
          continue;
        }

        // Import upsert helpers
        const { batchUpsertInsights } = await import('../_shared/upsertInsight.ts');

        // Transform insights to upsert format
        const insightsToUpsert = allInsights.map(insight => ({
          user_id: effectiveUserId,
          account_id: accountId,
          account_name: insight.account_name,
          campaign_id: insight.campaign_id,
          campaign_name: insight.campaign_name,
          adset_id: insight.adset_id,
          adset_name: insight.adset_name,
          ad_id: insight.ad_id,
          ad_name: insight.ad_name,
          level: insight.level,
          date_start: insight.date_start,
          date_stop: insight.date_stop,
          effective_status: insight.effective_status,
          configured_status: insight.configured_status,
          status: insight.status,
          objective: insight.objective,
          metrics: {
            spend: insight.spend,
            impressions: insight.impressions,
            clicks: insight.clicks,
            results: insight.results,
            cost_per_result: insight.cost_per_result,
            ctr: insight.ctr,
            cpm: insight.cpm,
            cpc: insight.cpc,
            reach: insight.reach,
            frequency: insight.frequency,
            started_7d: insight.started_7d,
            "Tổng kết nối tin nhắn": insight["Tổng kết nối tin nhắn"],
            "Nhấp liên kết": insight["Nhấp liên kết"],
            "Xem tin nhắn chào mừng": insight["Xem tin nhắn chào mừng"],
            "Tương tác bài viết": insight["Tương tác bài viết"],
            "Tương tác tổng": insight["Tương tác tổng"],
            "Tin nhắn đầu tiên": insight["Tin nhắn đầu tiên"],
            "Xem video": insight["Xem video"],
            "Phản ứng bài viết": insight["Phản ứng bài viết"],
            "Tương tác trang": insight["Tương tác trang"],
            cost_per_started_7d: insight.cost_per_started_7d,
            cost_per_replied_7d: insight.cost_per_replied_7d,
            cost_per_first_reply: insight.cost_per_first_reply,
            cost_per_messaging_connection: insight.cost_per_messaging_connection,
            cost_per_depth_2_message: insight.cost_per_depth_2_message,
            cost_per_welcome_message_view: insight.cost_per_welcome_message_view,
            cost_per_link_click: insight.cost_per_link_click,
            cost_per_video_view: insight.cost_per_video_view,
            cost_per_interaction_gross: insight.cost_per_interaction_gross,
            cost_per_post_reaction: insight.cost_per_post_reaction,
            cost_per_page_engagement: insight.cost_per_page_engagement,
            cost_per_total_messaging_connection: insight.cost_per_total_messaging_connection,
            cost_per_messaging_welcome_message_view: insight.cost_per_messaging_welcome_message_view,
            cost_per_post_interaction_gross: insight.cost_per_post_interaction_gross,
            cost_per_messaging_first_reply: insight.cost_per_messaging_first_reply,
            cost_per_messaging_user_depth_2: insight.cost_per_messaging_user_depth_2,
          },
        }));

        // Perform batch upsert
        const upsertResult = await batchUpsertInsights(insightsToUpsert, {
          url: nocodbUrl,
          token: nocodbToken,
          projectId: adAccountsTableId,
          tableId: facebookInsightsTableId,
        });



        if (upsertResult.failed > 0) {
          console.error(`❌ Some upserts failed:`, upsertResult.errors.slice(0, 5));
        }


        totalInsightsSynced += upsertResult.created + upsertResult.updated
      } catch (accountError: any) {
        console.error(`❌ Error syncing account ${account.account_id}:`, accountError.message);
      } finally {
        // 🔓 LAYER 2: RELEASE LOCK (always release, even on error)
        if (lockId) {
          try {
            await fetch(`${nocodbUrl}/api/v2/tables/${facebookInsightsTableId}/records/${lockId}`, {
              method: 'DELETE',
              headers: nocodbHeaders
            });

          } catch (unlockError) {
            console.warn(`⚠️ Failed to release lock ${lockId}:`, unlockError);
          }
        }
      }
    }

    // ✅ NO CLEANUP - Keep all historical data
    // According to SYNC_RULES_DOCUMENTATION.md:
    // - Only UPDATE metrics for existing records
    // - Only CREATE new records for new campaigns
    // - NEVER DELETE old data

    return new Response(
      JSON.stringify({
        success: true,
        totalInsightsSynced,
        accountsProcessed: activeAccounts.length,
        timestamp: new Date().toISOString(),
        storage: 'NocoDB',
        strategy: 'UPSERT (insight_key)',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Fatal error in sync-today-insights:', error);
    return new Response(
      JSON.stringify({
        error: error?.message || 'Unknown error',
        stack: error?.stack,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
