import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { NOCODB_CONFIG } from "../_shared/nocodb-config.ts";

const NOCODB_BASE_URL = NOCODB_CONFIG.BASE_URL;
const NOCODB_API_TOKEN = NOCODB_CONFIG.API_TOKEN;
const TABLE_AD_ACCOUNTS = NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS;
const TABLE_INSIGHTS_AUTO = NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO;
const TABLE_INSIGHTS_ARCHIVE = NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_ARCHIVE;
const TABLE_SYNC_LOGS = NOCODB_CONFIG.TABLES.SYNC_LOGS;

const FACEBOOK_BASE_URL = "https://graph.facebook.com/v21.0";
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Helpers ---
const jsonOK = (data: any) => new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
const jsonError = (msg: string, status = 500) => new Response(JSON.stringify({ error: msg }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function safeNumber(val: any): number {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
}

// ✅ FIX: Normalize Status to ensure UI visibility
// User Requirement: Only display "ACTIVE" or "PAUSED" in UI logic
function sanitizeStatus(status: string | null | undefined): string {
    if (!status) return "PAUSED"; // Default to PAUSED if missing
    const s = status.toUpperCase();

    // Group 1: DEFINITELY ACTIVE
    if (s === "ACTIVE") return "ACTIVE";

    // Group 2: DEFINITELY STOPPED/PAUSED
    // These status mean the ad is NOT running, so we treat as PAUSED.
    // The UI handles 'ARCHIVED' differently, but if mixed here, safe to key as PAUSED then let separate ARCHIVED logic handle it.
    // BUT! Logic below separates Archive table. So here we just mean "Is it running?"
    const pausedGroup = [
        "PAUSED",
        "CAMPAIGN_PAUSED",
        "ADSET_PAUSED",
        "AD_PAUSED",
        "ARCHIVED",
        "DELETED",
        "PENDING_REVIEW",
        "PENDING_BILLING_INFO",
        "DISAPPROVED",
        "PREARCHIVED",
        "WITH_ISSUES",
        "IN_PROCESS"
    ];

    if (pausedGroup.includes(s)) return "PAUSED";

    // Fallback for any unknown status
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
        "OUTCOME_ENGAGEMENT": "onsite_conversion.messaging_conversation_started_7d",
        "OUTCOME_AWARENESS": "reach",
        "OUTCOME_LEADS": "lead",
        "OUTCOME_SALES": "purchase",
        "OUTCOME_APP_PROMOTION": "mobile_app_install",
        "MESSAGES": "onsite_conversion.messaging_conversation_started_7d"
    };

    let actionType = OBJECTIVE_MAP[objective];

    if (objective === "OUTCOME_ENGAGEMENT" || objective === "MESSAGES") {
        actionType = "onsite_conversion.messaging_conversation_started_7d";
    }

    if (actionType && actions) {
        const action = actions.find((a: any) => a.action_type === actionType);
        if (action) {
            const results = safeNumber(action.value);
            let cost_per_result = 0;

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

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    const debugLogs: string[] = [];
    const log = (msg: string) => { console.log(msg); debugLogs.push(msg); };

    try {
        log("Sync Ads Cron Invoked (v3 - Strict Status Filter & Deduplication)");

        let limit = 500;
        let datePreset = 'today';
        let timeRange = null;

        try {
            const body = await req.json();
            if (body) {
                if (body.limit) limit = body.limit;
                if (body.date_preset) datePreset = body.date_preset;
                if (body.since && body.until) {
                    timeRange = { since: body.since, until: body.until };
                    datePreset = '';
                }
            }
        } catch (e) { /* Ignore */ }

        const startTime = new Date();
        let processedCount = 0;
        let errorLog = "";

        // Fetch Accounts
        const accountsUrl = NOCODB_BASE_URL + "/api/v2/tables/" + TABLE_AD_ACCOUNTS + "/records?where=(is_active,eq,1)&limit=100";
        const accountsRes = await fetch(accountsUrl, { headers: { "xc-token": NOCODB_API_TOKEN } });
        if (!accountsRes.ok) throw new Error("Failed accounts: " + accountsRes.statusText);
        const accounts = (await accountsRes.json()).list || [];

        for (const account of accounts) {
            try {
                if (!account.access_token || !account.account_id) continue;
                const adAccountId = account.account_id.startsWith("act_") ? account.account_id : "act_" + account.account_id;

                const now = new Date();
                const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
                const today = vnTime.toISOString().split("T")[0];

                const commonFields = "id,name,status,effective_status";

                // ✅ EXTENDED STATUS LIST: Ensure we ask Facebook for ALL possible statuses
                const allStatuses = [
                    'ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED',
                    'IN_PROCESS', 'WITH_ISSUES',
                    'PENDING_REVIEW', 'PENDING_BILLING_INFO',
                    'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'AD_PAUSED',
                    'DISAPPROVED', 'PREARCHIVED'
                ];

                const filterParam = `&filtering=${encodeURIComponent(JSON.stringify([{ field: 'effective_status', operator: 'IN', value: allStatuses }]))}`;

                const insightFields = [
                    "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
                    "date_start", "date_stop", "impressions", "clicks", "spend", "reach", "frequency",
                    "ctr", "cpc", "cpm", "cpp", "cost_per_unique_click", "actions", "action_values",
                    "cost_per_action_type", "objective",
                    "video_p25_watched_actions", "video_p50_watched_actions", "video_p75_watched_actions", "video_p100_watched_actions"
                ].join(",");

                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                const fetchWithRetry = async (url: string) => {
                    for (let i = 0; i < 3; i++) {
                        const res = await fetch(url);
                        if (res.status === 429) await delay((i + 1) * 2000);
                        else if (!res.ok) {
                            const txt = await res.text();
                            console.error(`FB API Error: ${res.status} ${txt} URL: ${url}`);
                            throw new Error(txt);
                        }
                        else return await res.json();
                    }
                };

                const fetchAll = async (url: string) => {
                    let all: any[] = [];
                    let next = url;
                    while (next) {
                        try {
                            const json = await fetchWithRetry(next);
                            all = all.concat(json.data || []);
                            next = json.paging?.next || null;
                        } catch (e: any) {
                            throw e; // ✅ THROW ERROR to ensure we don't save partial data
                        }
                    }
                    return all;
                };

                let dateParam = `date_preset=${datePreset}`;
                if (timeRange) dateParam = `time_range={'since':'${timeRange.since}','until':'${timeRange.until}'}`;

                const [campaigns, adsets, ads, campInsights, adsetInsights, adInsights] = await Promise.all([
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/campaigns?fields=${commonFields},daily_budget,lifetime_budget&limit=${limit}${filterParam}&access_token=${account.access_token}`),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/adsets?fields=${commonFields},campaign{id,name},daily_budget,lifetime_budget&limit=${limit}${filterParam}&access_token=${account.access_token}`),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/ads?fields=${commonFields},campaign{id,name},adset{id,name}&limit=${limit}${filterParam}&access_token=${account.access_token}`),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/insights?level=campaign&${dateParam}&fields=${insightFields}&limit=${limit}&access_token=${account.access_token}`),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/insights?level=adset&${dateParam}&fields=${insightFields}&limit=${limit}&access_token=${account.access_token}`),
                    fetchAll(`${FACEBOOK_BASE_URL}/${adAccountId}/insights?level=ad&${dateParam}&fields=${insightFields}&limit=${limit}&access_token=${account.access_token}`)
                ]);

                // ✅ MAP SETUP (String IDs for safety)
                const campMap = new Map(campaigns.map((c: any) => [String(c.id), c]));
                const adsetMap = new Map(adsets.map((c: any) => [String(c.id), c]));
                const adMap = new Map(ads.map((c: any) => [String(c.id), c]));

                const toUpsertAuto: any[] = [];
                const toUpsertArchive: any[] = [];

                // ✅ DEDUPLICATION MAP: key -> record
                const uniqueRecordMap = new Map<string, any>();

                const process = (entity: any, level: string, insight: any) => {
                    const spend = safeNumber(insight.spend);

                    // Priority: Insight Objective > Entity Objective > Unknown
                    const objective = insight.objective || entity.objective || "UNKNOWN";

                    const actions = insight.actions || [];
                    const actionValues = extractActionValues(actions);
                    const costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type);
                    const { count: replied_7d, cost: replied_cost } = extractMessagingRepliedMetrics(actions, insight.cost_per_action_type, spend);

                    const resultCalc = calculateResultsAndCost(objective, actions, insight.cost_per_action_type, spend, insight.reach);

                    // ✅ CRITICAL: Status Normalization
                    const rawStatus = entity.effective_status || entity.status;
                    const cleanStatus = sanitizeStatus(rawStatus);

                    return {
                        user_id: account.user_id,
                        account_id: account.account_id,
                        account_name: account.name,

                        campaign_id: String(level === "campaign" ? entity.id : (entity.campaign?.id || insight.campaign_id || "")),
                        campaign_name: level === "campaign" ? entity.name : (entity.campaign?.name || insight.campaign_name),

                        adset_id: String(level === "adset" ? entity.id : (entity.adset?.id || insight.adset_id || "")),
                        adset_name: level === "adset" ? entity.name : (entity.adset?.name || insight.adset_name),

                        ad_id: String(level === "ad" ? entity.id : (insight.ad_id || "")),
                        ad_name: level === "ad" ? entity.name : (insight.ad_name),

                        date_start: insight.date_start || today,
                        date_stop: insight.date_stop || today,

                        // ✅ UNIQUE KEY GENERATION (Rigorous Format)
                        // Format: user_account_camp_adset_ad_date (missing IDs become '')
                        insight_key: `${account.user_id}_${account.account_id}_${(level === "campaign" ? entity.id : (entity.campaign?.id || insight.campaign_id)) || ""}_${(level === "adset" ? entity.id : (entity.adset?.id || insight.adset_id)) || ""}_${(level === "ad" ? entity.id : (insight.ad_id)) || ""}_${insight.date_start || today}`,

                        status: cleanStatus, // ACTIVE or PAUSED
                        effective_status: rawStatus, // Keep raw for Archive table

                        daily_budget: safeNumber(entity.daily_budget),
                        lifetime_budget: safeNumber(entity.lifetime_budget),
                        spend,
                        impressions: safeNumber(insight.impressions),
                        clicks: safeNumber(insight.clicks),
                        reach: safeNumber(insight.reach),
                        frequency: safeNumber(insight.frequency),

                        results: resultCalc.results,
                        cost_per_result: resultCalc.cost_per_result,
                        result_label: resultCalc.result_label,

                        // Metrics
                        started_7d: actionValues.started_7d,
                        total_messaging_connection: actionValues.total_messaging_connection,
                        link_click: actionValues.link_click,
                        replied_7d: replied_7d,
                        cost_per_replied_7d_calculated: replied_cost,

                        sync_date: new Date().toISOString(),
                        level
                    };
                };

                const addToMap = (rec: any) => {
                    // ✅ DEDUPLICATION LOGIC
                    // If key exists, keep the one with higher SPEND or more complete data
                    const existing = uniqueRecordMap.get(rec.insight_key);
                    if (existing) {
                        if (rec.spend > existing.spend) {
                            uniqueRecordMap.set(rec.insight_key, rec);
                        }
                    } else {
                        uniqueRecordMap.set(rec.insight_key, rec);
                    }
                };

                // 1. Campaigns
                campInsights.forEach((i: any) => addToMap(process(campMap.get(String(i.campaign_id)) || { id: i.campaign_id, name: i.campaign_name }, "campaign", i)));
                // Also process campaigns WITHOUT insights (if active/paused)
                campaigns.forEach((c: any) => {
                    // Match the rigorous key format: user_account_camp_adset_ad_date
                    const key = `${account.user_id}_${account.account_id}_${c.id}___${today}`;
                    if (!uniqueRecordMap.has(key)) addToMap(process(c, "campaign", { date_start: today }));
                });

                // 2. AdSets
                adsetInsights.forEach((i: any) => addToMap(process(adsetMap.get(String(i.adset_id)) || { id: i.adset_id, name: i.adset_name, campaign: { id: i.campaign_id } }, "adset", i)));
                // Fallback for AdSets without insights
                adsets.forEach((a: any) => {
                    const key = `${account.user_id}_${account.account_id}_${a.campaign?.id || ""}_${a.id}__${today}`;
                    if (!uniqueRecordMap.has(key)) addToMap(process(a, "adset", { date_start: today, campaign_id: a.campaign?.id, campaign_name: a.campaign?.name }));
                });

                // 3. Ads
                adInsights.forEach((i: any) => addToMap(process(adMap.get(String(i.ad_id)) || { id: i.ad_id, name: i.ad_name, campaign: { id: i.campaign_id }, adset: { id: i.adset_id } }, "ad", i)));
                // Fallback for Ads without insights
                ads.forEach((a: any) => {
                    const key = `${account.user_id}_${account.account_id}_${a.campaign?.id || ""}_${a.adset?.id || ""}_${a.id}_${today}`;
                    if (!uniqueRecordMap.has(key)) addToMap(process(a, "ad", { date_start: today, campaign_id: a.campaign?.id, campaign_name: a.campaign?.name, adset_id: a.adset?.id, adset_name: a.adset?.name }));
                });

                // Split into Auto/Archive
                uniqueRecordMap.forEach((rec) => {
                    const raw = rec.effective_status;
                    if (["DELETED", "ARCHIVED"].includes(raw)) {
                        // ARCHIVED/DELETED only go to Archive table, NOT Auto
                        toUpsertArchive.push(rec);
                    } else {
                        toUpsertAuto.push(rec);
                    }
                });

                // UPSERT HELPER
                const upsertTable = async (records: any[], tableId: string) => {
                    if (!records.length) return;
                    const chunkSize = 50;
                    for (let i = 0; i < records.length; i += chunkSize) {
                        const chunk = records.slice(i, i + chunkSize);

                        await Promise.all(chunk.map(async (rec: any) => {
                            const where = encodeURIComponent(`(insight_key,eq,${rec.insight_key})`);
                            // Try to Find ID first
                            const check = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records?where=${where}&fields=Id&limit=1`, {
                                headers: { "xc-token": NOCODB_API_TOKEN }
                            });

                            if (check.ok) {
                                const found = (await check.json()).list?.[0];
                                if (found) {
                                    // UPDATE
                                    await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records`, {
                                        method: "PATCH",
                                        headers: { "xc-token": NOCODB_API_TOKEN, "Content-Type": "application/json" },
                                        body: JSON.stringify([{ Id: found.Id, ...rec }]) // Batch format
                                    });
                                } else {
                                    // INSERT
                                    await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records`, {
                                        method: "POST",
                                        headers: { "xc-token": NOCODB_API_TOKEN, "Content-Type": "application/json" },
                                        body: JSON.stringify([rec])
                                    });
                                }
                            }
                        }));
                        processedCount += chunk.length;
                    }
                };

                await upsertTable(toUpsertAuto, TABLE_INSIGHTS_AUTO);
                await upsertTable(toUpsertArchive, TABLE_INSIGHTS_ARCHIVE);

            } catch (e: any) { errorLog += `Account ${account.account_id}: ${e.message}\n`; }
        }

        return jsonOK({ success: true, processed: processedCount, logs: debugLogs });
    } catch (e: any) { return jsonError(e.message); }
});
