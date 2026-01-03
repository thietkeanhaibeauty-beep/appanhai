import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';
import { batchUpsertCatalog } from '../_shared/upsertCatalog.ts';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FACEBOOK_BASE_URL = "https://graph.facebook.com/v21.0";
// Constants removed - using NOCODB_CONFIG

const FACEBOOK_API_VERSION = "v21.0";

// --- Helpers ---
const jsonOK = (data: any) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
const jsonError = (msg: string, status = 500) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function safeNumber(val: any): number {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
}

function sanitizeStatus(status: string | null | undefined): string {
    if (!status) return "UNKNOWN";
    const s = status.toUpperCase();
    const valid = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED", "PENDING_REVIEW", "PENDING_BILLING_INFO", "CAMPAIGN_PAUSED", "ADSET_PAUSED"];
    if (valid.includes(s)) return s;

    // Mappings
    if (s === "WITH_ISSUES") return "PAUSED";
    if (s === "DISAPPROVED") return "PAUSED";
    if (s === "IN_PROCESS") return "PENDING_REVIEW";

    // Fallback
    return "PAUSED";
}

function calculateResultsAndCost(objective: string, actions: any[] | null, cost_per_action_type: any[] | null, spend: string | number, reach: string | number) {
    const ACTION_LABELS: Record<string, string> = {
        "link_click": "Lượt click vào liên kết",
        "post_engagement": "Lượt tương tác với bài viết",
        "video_view": "Lượt xem video",
        "page_engagement": "Lượt tương tác với trang",
        "onsite_conversion.messaging_conversation_started_7d": "Cuộc trò chuyện mới",
        "onsite_conversion.messaging_first_reply": "Tin nhắn phản hồi đầu tiên",
        "onsite_conversion.messaging_conversation_replied_7d": "Cuộc trò chuyện được phản hồi",
        "mobile_app_install": "Lượt cài đặt ứng dụng",
        "purchase": "Lượt mua hàng",
        "add_to_cart": "Thêm vào giỏ hàng",
        "initiate_checkout": "Bắt đầu thanh toán",
        "lead": "Khách hàng tiềm năng",
        "contact": "Liên hệ",
        "subscribe": "Đăng ký",
        "start_trial": "Bắt đầu dùng thử",
        "submit_application": "Nộp đơn đăng ký"
    };

    const OBJECTIVE_MAP: Record<string, string> = {
        "OUTCOME_TRAFFIC": "link_click",
        "OUTCOME_ENGAGEMENT": "post_engagement",
        "OUTCOME_AWARENESS": "reach",
        "OUTCOME_LEADS": "lead",
        "OUTCOME_SALES": "purchase",
        "OUTCOME_APP_PROMOTION": "mobile_app_install"
    };

    let actionType = OBJECTIVE_MAP[objective];

    // Special handling for MESSAGES objective or Engagement with messaging intent
    if (objective === "OUTCOME_ENGAGEMENT" || objective === "MESSAGES") {
        // Check if there are messaging actions
        const hasMessaging = actions?.some((a: any) =>
            a.action_type === "onsite_conversion.messaging_conversation_started_7d" ||
            a.action_type === "onsite_conversion.messaging_first_reply"
        );

        if (hasMessaging) {
            actionType = "onsite_conversion.messaging_conversation_started_7d";
        }
    }

    if (actionType && actions) {
        const action = actions.find((a: any) => a.action_type === actionType);
        if (action) {
            const results = safeNumber(action.value);
            let cost_per_result = 0;

            // Try to find cost in cost_per_action_type
            const costAction = cost_per_action_type?.find((c: any) => c.action_type === actionType);
            if (costAction) {
                cost_per_result = safeNumber(costAction.value);
            } else if (results > 0) {
                cost_per_result = safeNumber(spend) / results;
            }

            return {
                results,
                cost_per_result: Math.round(cost_per_result * 100) / 100,
                result_label: ACTION_LABELS[actionType] || actionType,
                action_type_used: actionType
            };
        }
    }

    if (["REACH", "AWARENESS", "OUTCOME_AWARENESS"].includes(objective) && reach) {
        const r = safeNumber(reach);
        const s = safeNumber(spend);
        return {
            results: r,
            cost_per_result: r > 0 ? s / (r / 1000) : 0,
            result_label: "Tiếp cận",
            action_type_used: "reach"
        };
    }

    return {
        results: 0,
        cost_per_result: 0,
        result_label: "Kết quả",
        action_type_used: "none"
    };
}

function extractActionValues(actions: any[] | null) {
    const findAction = (actionType: string): number => {
        const action = actions?.find((a: any) => a.action_type === actionType);
        return safeNumber(action?.value || 0);
    };

    return {
        started_7d: findAction("onsite_conversion.messaging_conversation_started_7d"),
        total_messaging_connection: findAction("onsite_conversion.total_messaging_connection"),
        link_click: findAction("link_click"),
        messaging_welcome_message_view: findAction("onsite_conversion.messaging_welcome_message_view"),
        post_engagement_action: findAction("post_engagement"),
        messaging_first_reply: findAction("onsite_conversion.messaging_first_reply"),
        video_view: findAction("video_view"),
        page_engagement_action: findAction("page_engagement"),
        replied_7d: findAction("onsite_conversion.messaging_conversation_replied_7d"),
        depth_2_message: findAction("onsite_conversion.messaging_user_depth_2_message_send"),
        depth_3_message: findAction("onsite_conversion.messaging_user_depth_3_message_send"),
    };
}

function extractCostPerActionValues(costPerActions: any[] | null) {
    const findCost = (actionType: string): number | null => {
        const cost = costPerActions?.find((a: any) => a.action_type === actionType);
        if (!cost || !cost.value) return null;
        const num = Number(cost.value);
        return isNaN(num) ? null : num;
    };

    return {
        cost_per_started_7d: findCost("onsite_conversion.messaging_conversation_started_7d"),
        cost_per_total_messaging_connection: findCost("onsite_conversion.total_messaging_connection"),
        cost_per_link_click: findCost("link_click"),
        cost_per_messaging_welcome_message_view: findCost("onsite_conversion.messaging_welcome_message_view"),
        cost_per_post_engagement: findCost("post_engagement"),
        cost_per_messaging_first_reply: findCost("onsite_conversion.messaging_first_reply"),
        cost_per_video_view: findCost("video_view"),
        cost_per_page_engagement: findCost("page_engagement"),
        cost_per_replied_7d: findCost("onsite_conversion.messaging_conversation_replied_7d"),
        cost_per_depth_2_message: findCost("onsite_conversion.messaging_user_depth_2_message_send"),
        cost_per_depth_3_message: findCost("onsite_conversion.messaging_user_depth_3_message_send"),
    };
}

function extractMessagingRepliedMetrics(actions: any[] | null, cost_per_action_type: any[] | null, spend: string | number) {
    const ACTION_TYPE = "onsite_conversion.messaging_conversation_replied_7d";
    const action = actions?.find((a: any) => a.action_type === ACTION_TYPE);
    const count = Math.round(safeNumber(action?.value || 0));

    let cost = 0;
    if (count > 0) {
        const costAction = cost_per_action_type?.find((c: any) => c.action_type === ACTION_TYPE);
        if (costAction) {
            cost = safeNumber(costAction.value);
        } else {
            cost = safeNumber(spend) / count;
        }
    }
    return { count, cost };
}

// --- Main Logic ---
serve(async (req) => {
    // 1. Handle CORS immediately
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const debugLogs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        debugLogs.push(msg);
    };

    try {
        log("Sync Ads Cron Invoked");

        // 2. Parse Body safely
        let limit = 5000;
        let datePreset = 'today';
        let timeRange = null;

        try {
            const body = await req.json();
            if (body) {
                if (body.limit) limit = body.limit;
                if (body.date_preset) datePreset = body.date_preset;
                if (body.since && body.until) {
                    timeRange = { since: body.since, until: body.until };
                    datePreset = ''; // Clear preset if range is used
                }
            }
        } catch (e) {
            // Body might be empty, ignore
        }
        log(`Limit: ${limit}, DatePreset: ${datePreset}, TimeRange: ${JSON.stringify(timeRange)}`);

        const startTime = new Date();
        let processedCount = 0;
        let errorLog = "";

        // 3. Fetch Accounts
        // ✅ FIX: Filter by is_active = true OR is_active = 1 (handle both boolean and number)
        const accountsUrl = NOCODB_CONFIG.BASE_URL + "/api/v2/tables/" + NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS + "/records?where=(is_active,eq,true)~or(is_active,eq,1)&limit=100";
        const accountsRes = await fetch(accountsUrl, {
            headers: { "xc-token": NOCODB_CONFIG.API_TOKEN }
        });

        if (!accountsRes.ok) throw new Error("Failed to fetch accounts: " + accountsRes.statusText);
        const accountsData = await accountsRes.json();
        const accounts = accountsData.list || [];

        log("Active accounts found: " + accounts.length);

        // 4. Process Accounts
        for (const account of accounts) {
            try {
                if (!account.access_token || !account.account_id) continue;

                const adAccountId = account.account_id.startsWith("act_") ? account.account_id : "act_" + account.account_id;

                // Fix: Use Vietnam time (UTC+7) for "today"
                const now = new Date();
                const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
                const today = vnTime.toISOString().split("T")[0];

                // A. Fetch Structure & Insights (Parallel)
                const commonFields = "id,name,status,effective_status";
                const campaignFields = `${commonFields},daily_budget,lifetime_budget,objective,buying_type,start_time,stop_time,created_time,updated_time`;
                const adsetFields = `${commonFields},daily_budget,lifetime_budget,campaign{id,name},start_time,end_time,created_time,updated_time`;
                const adFields = `${commonFields},campaign{id,name},adset{id,name},created_time,updated_time`;

                const insightFields = [
                    "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
                    "date_start", "date_stop", "impressions", "clicks", "spend", "reach", "frequency",
                    "ctr", "cpc", "cpm", "cpp", "cost_per_unique_click", "actions", "action_values",
                    "cost_per_action_type", "objective", "website_ctr", "purchase_roas",
                    "quality_ranking", "engagement_rate_ranking", "conversion_rate_ranking",
                    "video_p25_watched_actions", "video_p50_watched_actions", "video_p75_watched_actions",
                    "video_p100_watched_actions", "video_play_actions", "cost_per_thruplay"
                ].join(",");

                log(`Fetching data for account ${account.account_id}...`);

                // Prepare filtering for ALL statuses to ensure we get the "74 campaigns"
                // ✅ FIX: Encode the filtering parameter to ensure it works correctly
                const rawStatusFilter = `[{'field':'effective_status','operator':'IN','value':['ACTIVE','PAUSED','DELETED','ARCHIVED','IN_PROCESS','WITH_ISSUES']}]`;
                const statusFilter = `&filtering=${encodeURIComponent(rawStatusFilter)}`;

                // Prepare Date Param
                let dateParam = `date_preset=${datePreset}`;
                if (timeRange) {
                    dateParam = `time_range={'since':'${timeRange.since}','until':'${timeRange.until}'}`;
                }

                // Helper to fetch all pages
                const fetchAll = async (url: string, name: string) => {
                    let allData: any[] = [];
                    let nextUrl: string | null = url;
                    let page = 1;

                    while (nextUrl) {
                        try {
                            const res = await fetch(nextUrl);
                            if (!res.ok) {
                                const txt = await res.text();
                                console.error(`${name} Error (Page ${page}): ${txt}`);
                                errorLog += `${name} Error (Page ${page}): ${txt.substring(0, 100)}\n`;
                                break;
                            }
                            const json = await res.json();
                            const data = json.data || [];
                            allData = allData.concat(data);

                            nextUrl = json.paging?.next || null;
                            if (nextUrl) {
                                page++;
                                // Optional: log(`Fetching ${name} page ${page}...`);
                            }
                        } catch (e: any) {
                            console.error(`${name} Exception (Page ${page}): ${e.message}`);
                            errorLog += `${name} Exception (Page ${page}): ${e.message}\n`;
                            break;
                        }
                    }
                    return allData;
                };

                const [
                    campaignsList, adsetsList, adsList,
                    campInsightsList, adsetInsightsList, adInsightsList
                ] = await Promise.all([
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/campaigns?fields=${campaignFields}&limit=${limit}${statusFilter}&access_token=${account.access_token}`, "Campaigns"),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/adsets?fields=${adsetFields}&limit=${limit}${statusFilter}&access_token=${account.access_token}`, "AdSets"),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/ads?fields=${adFields}&limit=${limit}${statusFilter}&access_token=${account.access_token}`, "Ads"),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/insights?level=campaign&${dateParam}&fields=${insightFields}&limit=${limit}&access_token=${account.access_token}`, "Campaign Insights"),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/insights?level=adset&${dateParam}&fields=${insightFields}&limit=${limit}&access_token=${account.access_token}`, "AdSet Insights"),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/insights?level=ad&${dateParam}&fields=${insightFields}&limit=${limit}&access_token=${account.access_token}`, "Ad Insights")
                ]);

                log(`Fetched: ${campaignsList.length} Campaigns, ${adsetsList.length} AdSets, ${adsList.length} Ads`);
                log(`Fetched Insights: ${campInsightsList.length} Camp, ${adsetInsightsList.length} AdSet, ${adInsightsList.length} Ad`);

                // B. Map Insights for quick lookup
                const campInsightsMap = new Map(campInsightsList.map((i: any) => [i.campaign_id, i]));
                const adsetInsightsMap = new Map(adsetInsightsList.map((i: any) => [i.adset_id, i]));
                const adInsightsMap = new Map(adInsightsList.map((i: any) => [i.ad_id, i]));

                const allRecordsToUpsert: any[] = [];
                const processedCampaignIds = new Set<string>();
                const processedAdsetIds = new Set<string>();
                const processedAdIds = new Set<string>();

                // Arrays to collect catalog entities for upsert
                const campaignsToUpsert: any[] = [];
                const adsetsToUpsert: any[] = [];
                const adsToUpsert: any[] = [];

                // C. Process and Normalize Data
                const processRecord = (entity: any, level: "campaign" | "adset" | "ad", insight: any) => {
                    const spend = safeNumber(insight.spend);
                    const impressions = safeNumber(insight.impressions);
                    const clicks = safeNumber(insight.clicks);
                    const reach = safeNumber(insight.reach);
                    const frequency = safeNumber(insight.frequency);
                    const ctr = safeNumber(insight.ctr);
                    const cpc = safeNumber(insight.cpc);
                    const cpm = safeNumber(insight.cpm);
                    const cpp = safeNumber(insight.cpp);
                    const cost_per_unique_click = safeNumber(insight.cost_per_unique_click);
                    const objective = insight.objective || entity.objective;

                    const actions = insight.actions || [];
                    const actionValues = extractActionValues(actions);
                    const costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type);

                    const { count: replied_7d_count, cost: replied_7d_cost } = extractMessagingRepliedMetrics(actions, insight.cost_per_action_type, spend);

                    // Use calculateResultsAndCost instead of getPrimaryResult
                    const primaryResult = calculateResultsAndCost(
                        objective || "",
                        actions,
                        insight.cost_per_action_type || [],
                        spend,
                        reach
                    );

                    return {
                        user_id: account.user_id,
                        account_id: account.account_id,
                        account_name: account.name,
                        campaign_id: level === "campaign" ? entity.id : entity.campaign?.id,
                        campaign_name: level === "campaign" ? entity.name : entity.campaign?.name,
                        adset_id: level === "adset" ? entity.id : entity.adset?.id,
                        adset_name: level === "adset" ? entity.name : entity.adset?.name,
                        ad_id: level === "ad" ? entity.id : null,
                        ad_name: level === "ad" ? entity.name : null,
                        date_start: insight.date_start || today,
                        date_stop: insight.date_stop || today,
                        insight_key: `${account.account_id}_${entity.id}_${insight.date_start || today}`,
                        status: entity.status || "UNKNOWN",
                        effective_status: entity.effective_status || "UNKNOWN",
                        daily_budget: safeNumber(entity.daily_budget),
                        lifetime_budget: safeNumber(entity.lifetime_budget),

                        objective: objective,
                        impressions: impressions,
                        clicks: clicks,
                        spend: spend,
                        reach: reach,
                        frequency: frequency,
                        ctr: ctr,
                        cpc: cpc,
                        cpm: cpm,
                        cpp: cpp,
                        cost_per_unique_click: cost_per_unique_click,

                        results: primaryResult.results,
                        cost_per_result: primaryResult.cost_per_result,
                        result_label: primaryResult.result_label,
                        action_type_used: primaryResult.action_type_used,

                        started_7d: actionValues.started_7d,
                        total_messaging_connection: actionValues.total_messaging_connection,
                        link_click: actionValues.link_click,
                        messaging_welcome_message_view: actionValues.messaging_welcome_message_view,
                        post_engagement_action: actionValues.post_engagement_action,
                        messaging_first_reply: actionValues.messaging_first_reply,
                        video_view: actionValues.video_view,
                        page_engagement_action: actionValues.page_engagement_action,
                        replied_7d: replied_7d_count,
                        cost_per_replied_7d_calculated: replied_7d_cost,
                        depth_2_message: actionValues.depth_2_message,
                        depth_3_message: actionValues.depth_3_message,
                        cost_per_started_7d: costPerActionValues.cost_per_started_7d,
                        cost_per_total_messaging_connection: costPerActionValues.cost_per_total_messaging_connection,
                        cost_per_link_click: costPerActionValues.cost_per_link_click,
                        cost_per_messaging_welcome_message_view: costPerActionValues.cost_per_messaging_welcome_message_view,
                        cost_per_post_engagement: costPerActionValues.cost_per_post_engagement,
                        cost_per_messaging_first_reply: costPerActionValues.cost_per_messaging_first_reply,
                        cost_per_video_view: costPerActionValues.cost_per_video_view,
                        cost_per_page_engagement: costPerActionValues.cost_per_page_engagement,
                        cost_per_replied_7d: costPerActionValues.cost_per_replied_7d,
                        cost_per_depth_2_message: costPerActionValues.cost_per_depth_2_message,
                        cost_per_depth_3_message: costPerActionValues.cost_per_depth_3_message,
                        sync_date: new Date().toISOString(),
                        level: level
                    };
                };

                // 1. Process Campaigns
                campaignsList.forEach((camp: any) => {
                    const insight = campInsightsMap.get(camp.id) || {};
                    allRecordsToUpsert.push(processRecord(camp, "campaign", insight));
                    processedCampaignIds.add(camp.id);

                    // Collect campaign for upsert
                    campaignsToUpsert.push({
                        id: camp.id,
                        name: camp.name,
                        status: camp.status,
                        effective_status: camp.effective_status,
                        account_id: account.account_id,
                        user_id: account.user_id,
                        daily_budget: camp.daily_budget,
                        lifetime_budget: camp.lifetime_budget,
                        objective: camp.objective,
                        buying_type: camp.buying_type,
                        start_time: camp.start_time,
                        stop_time: camp.stop_time,
                        created_time: camp.created_time,
                        updated_time: camp.updated_time,
                    });
                });

                // ✅ SAFETY NET: Process Campaigns found in Insights but NOT in Campaigns List
                campInsightsList.forEach((insight: any) => {
                    if (!processedCampaignIds.has(insight.campaign_id)) {
                        // Construct a minimal campaign object from insight
                        const camp = {
                            id: insight.campaign_id,
                            name: insight.campaign_name,
                            status: "ACTIVE", // Assume active if spending
                            effective_status: "ACTIVE"
                        };
                        allRecordsToUpsert.push(processRecord(camp, "campaign", insight));
                        processedCampaignIds.add(insight.campaign_id);
                        log(`Recovered missing campaign: ${insight.campaign_name} (${insight.campaign_id})`);
                    }
                });

                // 2. Process AdSets
                adsetsList.forEach((adset: any) => {
                    const insight = adsetInsightsMap.get(adset.id) || {};
                    allRecordsToUpsert.push(processRecord(adset, "adset", insight));
                    processedAdsetIds.add(adset.id);

                    // Collect adset for upsert
                    adsetsToUpsert.push({
                        id: adset.id,
                        name: adset.name,
                        status: adset.status,
                        effective_status: adset.effective_status,
                        campaign_id: adset.campaign?.id,
                        account_id: account.account_id,
                        user_id: account.user_id,
                        daily_budget: adset.daily_budget,
                        lifetime_budget: adset.lifetime_budget,
                        start_time: adset.start_time,
                        end_time: adset.end_time,
                        created_time: adset.created_time,
                        updated_time: adset.updated_time,
                    });
                });

                // ✅ SAFETY NET: Process AdSets found in Insights but NOT in AdSets List
                adsetInsightsList.forEach((insight: any) => {
                    if (!processedAdsetIds.has(insight.adset_id)) {
                        const adset = {
                            id: insight.adset_id,
                            name: insight.adset_name,
                            campaign: { id: insight.campaign_id, name: insight.campaign_name },
                            status: "ACTIVE",
                            effective_status: "ACTIVE"
                        };
                        allRecordsToUpsert.push(processRecord(adset, "adset", insight));
                        processedAdsetIds.add(insight.adset_id);
                        log(`Recovered missing adset: ${insight.adset_name} (${insight.adset_id})`);
                    }
                });

                // 3. Process Ads
                adsList.forEach((ad: any) => {
                    const insight = adInsightsMap.get(ad.id) || {};
                    allRecordsToUpsert.push(processRecord(ad, "ad", insight));
                    processedAdIds.add(ad.id);

                    // Collect ad for upsert
                    adsToUpsert.push({
                        id: ad.id,
                        name: ad.name,
                        status: ad.status,
                        effective_status: ad.effective_status,
                        adset_id: ad.adset?.id,
                        campaign_id: ad.campaign?.id,
                        account_id: account.account_id,
                        user_id: account.user_id,
                        created_time: ad.created_time,
                        updated_time: ad.updated_time,
                    });
                });

                // ✅ SAFETY NET: Process Ads found in Insights but NOT in Ads List
                adInsightsList.forEach((insight: any) => {
                    if (!processedAdIds.has(insight.ad_id)) {
                        const ad = {
                            id: insight.ad_id,
                            name: insight.ad_name,
                            campaign: { id: insight.campaign_id, name: insight.campaign_name },
                            adset: { id: insight.adset_id, name: insight.adset_name },
                            status: "ACTIVE",
                            effective_status: "ACTIVE"
                        };
                        allRecordsToUpsert.push(processRecord(ad, "ad", insight));
                        processedAdIds.add(insight.ad_id);
                        log(`Recovered missing ad: ${insight.ad_name} (${insight.ad_id})`);
                    }
                });

                log(`Total records to upsert: ${allRecordsToUpsert.length}`);

                // D. Bulk Upsert
                // 1. Check existing
                const existingMap = new Map();
                const uniqueDates = [...new Set(allRecordsToUpsert.map((r: any) => r.date_start))];

                for (const dateToCheck of uniqueDates) {
                    let offset = 0;
                    let hasMore = true;

                    while (hasMore) {
                        const whereClause = encodeURIComponent(`(account_id,eq,${account.account_id})~and(insight_key,like,%${dateToCheck})`);
                        const checkUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO}/records?where=${whereClause}&fields=Id,insight_key&limit=1000&offset=${offset}`;

                        const checkRes = await fetch(checkUrl, { headers: { "xc-token": NOCODB_CONFIG.API_TOKEN } });
                        if (checkRes.ok) {
                            const checkData = await checkRes.json();
                            const list = checkData.list || [];
                            list.forEach((r: any) => existingMap.set(r.insight_key, r.Id));
                            if (list.length < 1000) hasMore = false;
                            else offset += 1000;
                        } else {
                            log("Check Failed: " + checkRes.status);
                            hasMore = false;
                        }
                    }
                }

                const toInsert: any[] = [];
                const toUpdate: any[] = [];

                for (const record of allRecordsToUpsert) {
                    if (existingMap.has(record.insight_key)) {
                        toUpdate.push({ Id: existingMap.get(record.insight_key), ...record });
                    } else {
                        toInsert.push(record);
                    }
                }

                log(`To Insert: ${toInsert.length}, To Update: ${toUpdate.length}`);

                // 2. Insert
                if (toInsert.length > 0) {
                    const chunkSize = 50;
                    for (let i = 0; i < toInsert.length; i += chunkSize) {
                        const chunk = toInsert.slice(i, i + chunkSize);
                        await fetch(NOCODB_CONFIG.BASE_URL + "/api/v2/tables/" + NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO + "/records", {
                            method: "POST",
                            headers: { "xc-token": NOCODB_CONFIG.API_TOKEN, "Content-Type": "application/json" },
                            body: JSON.stringify(chunk)
                        });
                        processedCount += chunk.length;
                    }
                }

                // 3. Update
                if (toUpdate.length > 0) {
                    const chunkSize = 50;
                    for (let i = 0; i < toUpdate.length; i += chunkSize) {
                        const chunk = toUpdate.slice(i, i + chunkSize);
                        await fetch(NOCODB_CONFIG.BASE_URL + "/api/v2/tables/" + NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO + "/records", {
                            method: "PATCH",
                            headers: { "xc-token": NOCODB_CONFIG.API_TOKEN, "Content-Type": "application/json" },
                            body: JSON.stringify(chunk)
                        });
                        processedCount += chunk.length;
                    }
                }

                // ✅ NEW: Upsert Catalog (Structure)
                if (campaignsToUpsert.length > 0) {
                    log(`💾 Upserting ${campaignsToUpsert.length} campaigns to Catalog...`);
                    const campResults = await batchUpsertCatalog(campaignsToUpsert, NOCODB_CONFIG.TABLES.FACEBOOK_CAMPAIGNS, 'id');
                    log(`✅ Campaigns Catalog updated: Created ${campResults.created}, Updated ${campResults.updated}`);
                }

                if (adsetsToUpsert.length > 0) {
                    log(`💾 Upserting ${adsetsToUpsert.length} adsets to Catalog...`);
                    const adsetResults = await batchUpsertCatalog(adsetsToUpsert, NOCODB_CONFIG.TABLES.FACEBOOK_ADSETS, 'id');
                    log(`✅ AdSets Catalog updated: Created ${adsetResults.created}, Updated ${adsetResults.updated}`);
                }

                if (adsToUpsert.length > 0) {
                    log(`💾 Upserting ${adsToUpsert.length} ads to Catalog...`);
                    const adResults = await batchUpsertCatalog(adsToUpsert, NOCODB_CONFIG.TABLES.FACEBOOK_ADS, 'id');
                    log(`✅ Ads Catalog updated: Created ${adResults.created}, Updated ${adResults.updated}`);
                }

            } catch (accErr: any) {
                console.error("Account Error " + account.account_id + ": " + accErr.message);
                errorLog += "Account Error " + account.account_id + ": " + accErr.message + "\n";
                log("Account Error: " + accErr.message);
            }
        }

        // 5. Log
        const logUrl = NOCODB_CONFIG.BASE_URL + "/api/v2/tables/" + NOCODB_CONFIG.TABLES.SYNC_LOGS + "/records";
        await fetch(logUrl, {
            method: "POST",
            headers: { "xc-token": NOCODB_CONFIG.API_TOKEN, "Content-Type": "application/json" },
            body: JSON.stringify({
                started_at: startTime.toISOString(),
                finished_at: new Date().toISOString(),
                status: errorLog ? "PARTIAL_ERROR" : "SUCCESS",
                records_processed: processedCount,
                error_message: errorLog || null
            })
        });

        // 6. CLEANUP: Delete old records (Keep only Today and Yesterday - VN Time)
        try {
            log("Starting cleanup of old records...");

            // Calculate Yesterday (VN Time)
            const now = new Date();
            const vnTimeCleanup = new Date(now.getTime() + 7 * 60 * 60 * 1000);

            const yesterdayVN = new Date(vnTimeCleanup);
            yesterdayVN.setDate(yesterdayVN.getDate() - 1);
            const yesterdayStr = yesterdayVN.toISOString().split("T")[0];

            log(`Retention Policy: Keep records >= ${yesterdayStr}`);

            // Find records to delete (date_start < yesterdayStr)
            const deleteWhere = encodeURIComponent(`(date_start,lt,${yesterdayStr})`);
            const deleteCheckUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO}/records?where=${deleteWhere}&limit=1000&fields=Id,date_start`;

            const deleteCheckRes = await fetch(deleteCheckUrl, { headers: { "xc-token": NOCODB_CONFIG.API_TOKEN } });
            if (deleteCheckRes.ok) {
                const deleteData = await deleteCheckRes.json();
                const recordsToDelete = deleteData.list || [];

                if (recordsToDelete.length > 0) {
                    log(`Found ${recordsToDelete.length} old records to delete.`);

                    // Delete in batches
                    const chunkSize = 50;
                    for (let i = 0; i < recordsToDelete.length; i += chunkSize) {
                        const chunk = recordsToDelete.slice(i, i + chunkSize);
                        await Promise.all(chunk.map(async (r: any) => {
                            await fetch(`${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO}/records/${r.Id}`, {
                                method: "DELETE",
                                headers: { "xc-token": NOCODB_CONFIG.API_TOKEN }
                            });
                        }));
                    }
                    log(`Deleted ${recordsToDelete.length} old records.`);
                } else {
                    log("No old records found to delete.");
                }
            } else {
                log("Failed to check for old records: " + deleteCheckRes.status);
            }

        } catch (cleanupErr: any) {
            console.error("Cleanup Error: " + cleanupErr.message);
            log("Cleanup Error: " + cleanupErr.message);
        }

        return jsonOK({ success: true, processed: processedCount, logs: debugLogs });

    } catch (e: any) {
        console.error("Fatal Error: " + e.message);
        return jsonError(e.message || "Unknown error");
    }
});
