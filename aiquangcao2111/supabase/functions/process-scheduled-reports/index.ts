import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { NOCODB_CONFIG } from "../_shared/nocodb-config.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// NocoDB Config
const NOCODB_BASE_URL = NOCODB_CONFIG.BASE_URL;
const NOCODB_API_TOKEN = NOCODB_CONFIG.API_TOKEN;

// ✅ HARDCODED TABLE IDs (From User & Config)
const CONFIG_TABLE_ID = NOCODB_CONFIG.TABLES.NOTIFICATION_CONFIGS; // notification_settings
const NOTIFICATION_TABLE_ID = NOCODB_CONFIG.TABLES.NOTIFICATIONS; // notifications
const SALES_TABLE_ID = NOCODB_CONFIG.TABLES.SALES_REPORTS; // sales_reports
const TABLE_INSIGHTS_AUTO = NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_AUTO; // FacebookInsights_Auto
const AD_ACCOUNTS_TABLE_ID = NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS; // FacebookAdAccounts
const AUTOMATED_RULES_TABLE_ID = NOCODB_CONFIG.TABLES.AUTOMATED_RULES;
const AUTOMATION_LOGS_TABLE_ID = NOCODB_CONFIG.TABLES.AUTOMATION_RULE_EXECUTION_LOGS;

// Helper to safely parse numbers
const safeNumber = (val: any) => {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

// Helper to normalize date string to YYYY-MM-DD
const normalizeDate = (dateStr: any) => {
    if (!dateStr) return '';
    try {
        // Handle "YYYY-MM-DD HH:mm:ss+..." or ISO strings
        const d = new Date(dateStr);
        // Adjust to VN time if needed, but usually date_start is just a date.
        // Let's assume date_start is the reporting date.
        // If it's a full timestamp, we might need to be careful.
        // For now, let's just take the YYYY-MM-DD part of the string if it exists, 
        // or convert date object to ISO string YYYY-MM-DD.
        if (dateStr.includes('T')) return dateStr.split('T')[0];
        if (dateStr.includes(' ')) return dateStr.split(' ')[0];
        return new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    } catch (e) {
        return String(dateStr).substring(0, 10);
    }
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        console.log('🚀 Starting process-scheduled-reports...');

        let body = {};
        try {
            body = await req.json();
        } catch (e) {
            // Body might be empty if triggered by cron
        }
        const { config_id, user_id, force } = body as { config_id?: string; user_id?: string; force?: boolean };

        // 1. Fetch Active Configs
        // STRATEGY: Fetch by user_id (if provided) or all active, then filter in memory
        // because NocoDB v2 filtering by CreatedAt is unreliable/unsupported via API.
        let url = `${NOCODB_BASE_URL}/api/v2/tables/${CONFIG_TABLE_ID}/records?where=(is_active,eq,true)`;

        if (user_id) {
            url = `${NOCODB_BASE_URL}/api/v2/tables/${CONFIG_TABLE_ID}/records?where=(user_id,eq,${user_id})`;
        }

        const configsRes = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });

        if (!configsRes.ok) {
            const errText = await configsRes.text();
            throw new Error(`Failed to fetch configs: ${configsRes.status} - ${errText}`);
        }

        const configsData = await configsRes.json();
        let configs = configsData.list || [];

        // In-memory filter for specific config_id (Id or CreatedAt)
        if (config_id) {
            configs = configs.filter((c: any) =>
                String(c.Id) === String(config_id) || c.CreatedAt === config_id
            );
            if (configs.length === 0) {
                console.warn(`⚠️ Config with ID ${config_id} not found in fetched list.`);
            }
        }

        console.log(`Found ${configs.length} configs to process`);

        const results = [];

        // 2. Process each config in batches
        const BATCH_SIZE = 10;

        // Helper function to process a single config
        const processConfig = async (config: any) => {
            try {
                const now = new Date();
                // Adjust to Vietnam Time (UTC+7) for correct daily scheduling
                const nowVN = new Date(now.getTime() + 7 * 60 * 60 * 1000);
                const todayStr = nowVN.toISOString().split('T')[0]; // YYYY-MM-DD (VN Time)

                const lastRun = config.last_run_at ? new Date(config.last_run_at) : new Date(0);

                let shouldRun = false;

                if (force) {
                    shouldRun = true;
                } else if (config.schedule_type === 'interval') {
                    const minutes = parseInt(config.schedule_value || '60');
                    const diffMs = now.getTime() - lastRun.getTime();
                    // Allow 1 minute margin of error
                    if (diffMs >= (minutes * 60 * 1000) - 60000) {
                        shouldRun = true;
                    }
                } else if (config.schedule_type === 'daily') {
                    // Check if current time matches schedule_value (HH:mm)
                    const [targetHour, targetMinute] = (config.schedule_value || '07:00').split(':').map(Number);

                    const currentHour = nowVN.getUTCHours();
                    const currentMinute = nowVN.getUTCMinutes();

                    // Check if we are in the same day as last run (in VN time)
                    const lastRunVN = new Date(lastRun.getTime() + 7 * 60 * 60 * 1000);
                    const isSameDay = lastRunVN.getUTCDate() === nowVN.getUTCDate() &&
                        lastRunVN.getUTCMonth() === nowVN.getUTCMonth() &&
                        lastRunVN.getUTCFullYear() === nowVN.getUTCFullYear();

                    // Run if not same day AND current time is past target time
                    if (!isSameDay && (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute))) {
                        shouldRun = true;
                    }
                }

                if (!shouldRun) {
                    return { config: config.name, status: 'skipped' };
                }

                console.log(`Running config: ${config.name} (ID: ${config.Id || config.CreatedAt})`);

                // Determine Target Date Range (VN Time)
                // Based on schedule_type: 'interval' = today, 'daily' = yesterday/week/month
                const yesterdayVN = new Date(nowVN.getTime() - 24 * 60 * 60 * 1000);
                let startDateStr: string;
                let endDateStr: string;

                const reportDays = config.report_days || 'day';

                // ✅ FIX: interval reports use TODAY's data, daily reports use YESTERDAY's data
                if (config.schedule_type === 'interval') {
                    // Interval (every X hours): report TODAY's data
                    startDateStr = todayStr;
                    endDateStr = todayStr;
                    console.log(`📅 Interval report: ${startDateStr} (today)`);
                } else if (config.schedule_type === 'daily') {
                    const currentDayOfWeek = nowVN.getUTCDay(); // 0=Sun, 1=Mon, ...
                    const currentDayOfMonth = nowVN.getUTCDate(); // 1-31

                    if (reportDays === 'week') {
                        // ✅ TUẦN TRƯỚC: Chỉ chạy vào THỨ HAI, báo cáo tuần trước (Mon-Sun)
                        if (currentDayOfWeek !== 1 && !force) {
                            // Không phải Thứ Hai → skip (trừ khi force=true)
                            console.log(`⏭️ Weekly report skipped: Today is not Monday (day ${currentDayOfWeek})`);
                            return { config: config.name, status: 'skipped', reason: 'Not Monday' };
                        }
                        // Tuần trước: Thứ Hai tuần trước → Chủ Nhật tuần trước
                        const lastSundayVN = new Date(nowVN.getTime() - currentDayOfWeek * 24 * 60 * 60 * 1000);
                        const lastMondayVN = new Date(lastSundayVN.getTime() - 6 * 24 * 60 * 60 * 1000);
                        startDateStr = lastMondayVN.toISOString().split('T')[0];
                        endDateStr = lastSundayVN.toISOString().split('T')[0];
                        console.log(`📅 Weekly report (LAST WEEK): ${startDateStr} to ${endDateStr}`);

                    } else if (reportDays === 'month') {
                        // ✅ THÁNG TRƯỚC: Chỉ chạy vào NGÀY 1, báo cáo tháng trước
                        if (currentDayOfMonth !== 1 && !force) {
                            // Không phải ngày 1 → skip (trừ khi force=true)
                            console.log(`⏭️ Monthly report skipped: Today is not 1st (day ${currentDayOfMonth})`);
                            return { config: config.name, status: 'skipped', reason: 'Not 1st of month' };
                        }
                        // Tháng trước: Ngày 1 → Ngày cuối tháng trước
                        const lastDayPrevMonth = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), 0));
                        const firstDayPrevMonth = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth() - 1, 1));
                        startDateStr = firstDayPrevMonth.toISOString().split('T')[0];
                        endDateStr = lastDayPrevMonth.toISOString().split('T')[0];
                        console.log(`📅 Monthly report (LAST MONTH): ${startDateStr} to ${endDateStr}`);

                    } else {
                        // Hôm qua (mặc định)
                        startDateStr = yesterdayVN.toISOString().split('T')[0];
                        endDateStr = yesterdayVN.toISOString().split('T')[0];
                        console.log(`📅 Daily report: ${startDateStr}`);
                    }
                } else {
                    // Fallback: use today
                    startDateStr = todayStr;
                    endDateStr = todayStr;
                }

                // For backward compat, targetDateStr is used for single-day query
                let targetDateStr = startDateStr;

                // 2.1 Fetch Active Ad Account for User
                let activeAccountId = null;
                try {
                    const accUrl = `${NOCODB_BASE_URL}/api/v2/tables/${AD_ACCOUNTS_TABLE_ID}/records?where=(user_id,eq,${config.user_id})~and(is_active,eq,true)&limit=1`;
                    const accRes = await fetch(accUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                    const accData = await accRes.json();
                    if (accData.list && accData.list.length > 0) {
                        activeAccountId = accData.list[0].account_id;
                        console.log(`✅ Found active ad account: ${activeAccountId}`);
                    } else {
                        console.warn(`⚠️ No active ad account found for user ${config.user_id}`);
                    }
                } catch (e) {
                    console.error('Error fetching ad account:', e);
                }

                // 3. Fetch Data (Insights) from NocoDB directly
                // For week/month reports, we need to fetch multiple days
                let allInsights: any[] = [];

                if (reportDays === 'day' || config.schedule_type !== 'daily') {
                    // Single day query (original logic)
                    let whereClause = `(user_id,eq,${config.user_id})~and(insight_key,like,%${targetDateStr})`;
                    if (activeAccountId) {
                        whereClause += `~and(account_id,eq,${activeAccountId})`;
                    }
                    const insightsUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_INSIGHTS_AUTO}/records?where=${encodeURIComponent(whereClause)}&limit=1000`;
                    const insightsRes = await fetch(insightsUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                    if (!insightsRes.ok) {
                        const errorText = await insightsRes.text();
                        throw new Error(`Failed to fetch insights: ${insightsRes.status} - ${errorText}`);
                    }
                    const insightsData = await insightsRes.json();
                    allInsights = insightsData.list || [];
                } else {
                    // Date range query for week/month
                    // Use date_start >= startDateStr AND date_start <= endDateStr
                    let whereClause = `(user_id,eq,${config.user_id})~and(date_start,ge,${startDateStr})~and(date_start,le,${endDateStr})`;
                    if (activeAccountId) {
                        whereClause += `~and(account_id,eq,${activeAccountId})`;
                    }
                    console.log(`📊 Fetching date range: ${startDateStr} to ${endDateStr}`);
                    const insightsUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_INSIGHTS_AUTO}/records?where=${encodeURIComponent(whereClause)}&limit=5000`;
                    const insightsRes = await fetch(insightsUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                    if (!insightsRes.ok) {
                        const errorText = await insightsRes.text();
                        throw new Error(`Failed to fetch insights: ${insightsRes.status} - ${errorText}`);
                    }
                    const insightsData = await insightsRes.json();
                    allInsights = insightsData.list || [];
                    console.log(`📊 Fetched ${allInsights.length} records for date range`);
                }

                let insights = allInsights;
                let todayInsights = insights;

                // Fallback: If no data for today, try to find latest available date
                if (insights.length === 0) {
                    console.log(`⚠️ No data found for today (${todayStr}). Checking latest available date...`);

                    // Fetch just 1 record sorted by date desc to find latest date
                    const latestUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_INSIGHTS_AUTO}/records?where=(user_id,eq,${config.user_id})&sort=-date_start&limit=1`;
                    const latestRes = await fetch(latestUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                    const latestData = await latestRes.json();

                    if (latestData.list && latestData.list.length > 0) {
                        const latestRecord = latestData.list[0];
                        // Use normalizeDate helper logic here
                        const d = new Date(latestRecord.date_start);
                        // Adjust to VN time if needed or just take YYYY-MM-DD
                        const latestDateStr = latestRecord.date_start.includes('T') ? latestRecord.date_start.split('T')[0] : latestRecord.date_start;

                        if (latestDateStr && latestDateStr !== targetDateStr) {
                            targetDateStr = latestDateStr;
                            console.log(`⚠️ Fallback to latest date: ${targetDateStr}`);

                            // Re-fetch with new target date using insight_key
                            let fallbackWhere = `(user_id,eq,${config.user_id})~and(insight_key,like,%${targetDateStr})`;
                            if (activeAccountId) {
                                fallbackWhere += `~and(account_id,eq,${activeAccountId})`;
                            }
                            const fallbackUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLE_INSIGHTS_AUTO}/records?where=${encodeURIComponent(fallbackWhere)}&limit=1000`;
                            const fallbackRes = await fetch(fallbackUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                            const fallbackData = await fallbackRes.json();
                            insights = fallbackData.list || [];
                            todayInsights = insights;
                        }
                    }
                }

                // DEBUG: Count by level
                const levelCounts = todayInsights.reduce((acc: any, row: any) => {
                    const lvl = row.level || (row.ad_id ? 'ad' : row.adset_id ? 'adset' : 'campaign');
                    acc[lvl] = (acc[lvl] || 0) + 1;
                    return acc;
                }, {});
                console.log(`📊 Level Counts for ${targetDateStr}:`, JSON.stringify(levelCounts));

                // Deduplicate logic (MATCHING SummaryReport.tsx)
                // Group by campaign_id + date + level, keep latest created_at
                const dedupedInsights = todayInsights.reduce((acc: any, insight: any) => {
                    const normalizedDate = normalizeDate(insight.date_start);
                    // ✅ Infer level if missing (Matches SummaryReport logic)
                    const effectiveLevel = insight.level || (insight.ad_id ? 'ad' : insight.adset_id ? 'adset' : 'campaign');
                    const key = `${insight.campaign_id}_${normalizedDate}_${effectiveLevel}`;

                    if (!acc[key]) {
                        acc[key] = { ...insight, level: effectiveLevel }; // Ensure level is set
                    } else {
                        const existingDate = new Date(acc[key].created_at || 0);
                        const newDate = new Date(insight.created_at || 0);
                        if (newDate > existingDate) {
                            acc[key] = { ...insight, level: effectiveLevel };
                        }
                    }
                    return acc;
                }, {});

                const uniqueInsights = Object.values(dedupedInsights);

                // FIX: If we have 'campaign' level data, use it. If not, fallback to 'ad' or 'adset' to show SOMETHING.
                // Ideally we only want 'campaign' to avoid double counting.
                let targetInsights = uniqueInsights.filter((row: any) => row.level === 'campaign');

                if (targetInsights.length === 0 && uniqueInsights.length > 0) {
                    console.log("⚠️ No campaign level data found. Fallback to ALL unique records (might double count if mixed levels exist).");
                    targetInsights = uniqueInsights;
                }

                // 3.1 Fetch Sales Data (Target Date)
                const salesRes = await fetch(
                    `${NOCODB_BASE_URL}/api/v2/tables/${SALES_TABLE_ID}/records?where=(user_id,eq,${config.user_id})&limit=1000`,
                    { headers: { 'xc-token': NOCODB_API_TOKEN } }
                );
                const salesData = await salesRes.json();
                const allSales = salesData.list || [];

                // Filter sales for target date (VN Time)
                const todaySales = allSales.filter((sale: any) => {
                    if (!sale.created_at) return false;
                    try {
                        const saleDate = new Date(sale.created_at); // UTC
                        if (isNaN(saleDate.getTime())) return false;

                        const saleDateVN = new Date(saleDate.getTime() + 7 * 60 * 60 * 1000);
                        return saleDateVN.toISOString().split('T')[0] === targetDateStr;
                    } catch (e) {
                        return false;
                    }
                });

                // Aggregate Ads data using targetInsights
                let totalSpend = 0;
                let totalResults = 0;
                let totalMess7d = 0; // ✅ New Metric
                let totalImpressions = 0;
                let totalClicks = 0;
                let totalReach = 0;

                // ✅ Helper to extract specific metric: Mess 7d
                const calculateMess7d = (row: any) => {
                    let val = safeNumber(row['onsite_conversion.messaging_conversation_started_7d']) || safeNumber(row['started_7d']);
                    if (val > 0) return val;

                    // Fallback to actions JSON
                    if (row.actions) {
                        try {
                            const actions = typeof row.actions === 'string' ? JSON.parse(row.actions) : row.actions;
                            if (Array.isArray(actions)) {
                                const action = actions.find((a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d');
                                if (action) return safeNumber(action.value);
                            }
                        } catch (e) { }
                    }
                    return 0;
                };

                targetInsights.forEach((row: any) => {
                    totalSpend += safeNumber(row.spend);
                    // ✅ STRICT REQUIREMENT: Results MUST be Mess 7d. If 0, then 0. Do not use row.results (which might be clicks/engagement).
                    totalResults += calculateMess7d(row);
                    totalMess7d += calculateMess7d(row);
                    totalImpressions += safeNumber(row.impressions);
                    totalClicks += safeNumber(row.clicks);
                    totalReach += safeNumber(row.reach);
                });

                // Aggregate Sales data
                const totalAppointments = todaySales.length;
                const totalCustomers = new Set(todaySales.map((s: any) => s.phone_number)).size;
                const totalRevenue = todaySales.reduce((sum: number, s: any) => sum + Number(s.total_revenue || 0), 0);
                const answeredCalls = todaySales.filter((s: any) => s.call_answered).length;

                // Calculate derived metrics
                const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
                const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
                const cpr = totalResults > 0 ? totalSpend / totalResults : 0;
                const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
                const cpp = totalReach > 0 ? totalSpend / totalReach : 0;
                const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
                const conversionRate = totalAppointments > 0 ? (answeredCalls / totalAppointments) * 100 : 0;

                // 4. Format Message
                const selectedMetrics = typeof config.selected_metrics === 'string'
                    ? (() => {
                        try {
                            const parsed = JSON.parse(config.selected_metrics);
                            return Array.isArray(parsed) ? parsed : [];
                        } catch (e) {
                            return config.selected_metrics.split(',').map((s: string) => s.trim()).filter(Boolean);
                        }
                    })()
                    : (config.selected_metrics || []);

                // Format time for display (VN)
                const timeString = nowVN.toISOString().substring(11, 16);
                let content = `Báo cáo lúc ${timeString} (${targetDateStr}):\n`;
                if (targetDateStr !== todayStr) {
                    content = `Báo cáo ngày ${targetDateStr} (Lúc ${timeString}):\n`;
                }

                const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
                const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN').format(val);

                // Ads Metrics
                if (selectedMetrics.includes('spend')) content += `- Chi tiêu: ${formatCurrency(totalSpend)}\n`;
                if (selectedMetrics.includes('results')) content += `- Kết quả: ${formatNumber(totalResults)}\n`;
                if (selectedMetrics.includes('mess_7d')) content += `- Tin nhắn (7d): ${formatNumber(totalMess7d)}\n`; // ✅ Add to content
                if (selectedMetrics.includes('cost_per_result')) content += `- Chi phí/KQ: ${formatCurrency(cpr)}\n`;
                if (selectedMetrics.includes('revenue')) content += `- Doanh thu: ${formatCurrency(totalRevenue)}\n`;
                if (selectedMetrics.includes('roas')) content += `- ROAS: ${roas.toFixed(2)}x\n`;
                if (selectedMetrics.includes('impressions')) content += `- Hiển thị: ${formatNumber(totalImpressions)}\n`;
                if (selectedMetrics.includes('clicks')) content += `- Click: ${formatNumber(totalClicks)}\n`;
                if (selectedMetrics.includes('cpc')) content += `- CPC: ${formatCurrency(cpc)}\n`;
                if (selectedMetrics.includes('ctr')) content += `- CTR: ${ctr.toFixed(2)}%\n`;
                if (selectedMetrics.includes('reach')) content += `- Tiếp cận: ${formatNumber(totalReach)}\n`;
                if (selectedMetrics.includes('cpm')) content += `- CPM: ${formatCurrency(cpm)}\n`;
                if (selectedMetrics.includes('cpp')) content += `- CPP: ${formatCurrency(cpp)}\n`;

                // Sales Metrics
                if (selectedMetrics.includes('total_appointments')) content += `- Số đặt lịch: ${formatNumber(totalAppointments)}\n`;
                if (selectedMetrics.includes('total_customers')) content += `- Số khách hàng: ${formatNumber(totalCustomers)}\n`;
                if (selectedMetrics.includes('answered_calls')) content += `- Nghe máy: ${formatNumber(answeredCalls)}\n`;
                if (selectedMetrics.includes('conversion_rate')) content += `- Tỷ lệ chốt: ${conversionRate.toFixed(2)}%\n`;

                // Detailed Sales List
                const showSalesDetails = selectedMetrics.some((m: string) => ['sales_campaign_name', 'sales_appointment_time', 'sales_status'].includes(m));

                if (showSalesDetails && todaySales.length > 0) {
                    content += `\n📋 Chi tiết Sale (${todaySales.length}):\n`;
                    todaySales.forEach((sale: any, index: number) => {
                        let details = [];
                        if (selectedMetrics.includes('sales_appointment_time')) {
                            const time = sale.appointment_time ? new Date(sale.appointment_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                            details.push(`[${time}]`);
                        }
                        details.push(sale.phone_number);
                        if (selectedMetrics.includes('sales_campaign_name')) details.push(`- ${sale.campaign_name || 'No Camp'}`);
                        if (selectedMetrics.includes('sales_status')) {
                            const statusMap: any = { 'scheduled': 'Đã đặt', 'completed': 'Hoàn thành', 'cancelled': 'Hủy' };
                            details.push(`(${statusMap[sale.appointment_status] || sale.appointment_status})`);
                        }
                        content += `${index + 1}. ${details.join(' ')}\n`;
                    });
                }

                // 4.1 Fetch Automation Logs (If selected)
                if (selectedMetrics.includes('rule_execution')) {
                    try {
                        const ruleSince = lastRun.toISOString();
                        const timeWindow = (lastRun.getFullYear() === 1970)
                            ? new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
                            : ruleSince;

                        const rulesUrl = `${NOCODB_BASE_URL}/api/v2/tables/${AUTOMATED_RULES_TABLE_ID}/records?where=(user_id,eq,${config.user_id})&fields=Id,rule_name`;
                        const rulesRes = await fetch(rulesUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                        const rulesData = await rulesRes.json();
                        const userRules = rulesData.list || [];
                        const ruleMap = userRules.reduce((acc: any, r: any) => {
                            acc[r.Id] = r.rule_name;
                            return acc;
                        }, {});

                        if (userRules.length > 0) {
                            const ruleIds = userRules.map((r: any) => r.Id).join(',');
                            const logWhere = `(rule_id,in,${ruleIds})~and(executed_at,gt,${timeWindow})`;
                            const logsUrl = `${NOCODB_BASE_URL}/api/v2/tables/${AUTOMATION_LOGS_TABLE_ID}/records?where=${encodeURIComponent(logWhere)}&sort=-executed_at&limit=100`;

                            const logsRes = await fetch(logsUrl, { headers: { 'xc-token': NOCODB_API_TOKEN } });
                            if (logsRes.ok) {
                                const logsData = await logsRes.json();
                                let logs = logsData.list || [];
                                logs = logs.filter((l: any) => ['success', 'failed'].includes(l.status));

                                if (logs.length > 0) {
                                    content += `\n🤖 Hoạt động quy tắc:\n`;
                                    logs.forEach((log: any) => {
                                        const ruleName = ruleMap[log.rule_id] || `Rule #${log.rule_id}`;
                                        const icon = log.status === 'success' ? '✅' : '❌';
                                        let message = log.status === 'success' ? 'Đã thực thi' : 'Thất bại';
                                        if (log.details) {
                                            try {
                                                const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                                                if (Array.isArray(details) && details.length > 0) {
                                                    message = details.map((d: any) => d.message).join(', ');
                                                }
                                            } catch (e) {
                                                message = String(log.details).substring(0, 50);
                                            }
                                        }
                                        content += `- ${icon} ${ruleName}: ${message}\n`;
                                    });
                                } else {
                                    content += `\n🤖 Hoạt động quy tắc:\n- (Không có dữ liệu mới)\n`;
                                }
                            }
                        } else {
                            content += `\n🤖 Hoạt động quy tắc:\n- (Không có dữ liệu mới)\n`;
                        }
                    } catch (ruleErr) {
                        console.error('Error fetching rule logs:', ruleErr);
                        content += `\n🤖 Hoạt động quy tắc:\n- (Lỗi lấy dữ liệu)\n`;
                    }
                }

                // 5. Create Notification
                await fetch(
                    `${NOCODB_BASE_URL}/api/v2/tables/${NOTIFICATION_TABLE_ID}/records`,
                    {
                        method: 'POST',
                        headers: {
                            'xc-token': NOCODB_API_TOKEN,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: config.user_id,
                            config_id: config.Id ? String(config.Id) : config.CreatedAt,
                            title: `📊 ${config.name}`,
                            content: content,
                            type: 'report',
                            is_read: false
                        })
                    }
                );

                // 5.1 Send to Zalo if configured (groups or individual receivers)
                if (config.zalo_own_id && config.zalo_group_id) {
                    // Use Direct API call - endpoint is /api/sendmessage (NOT /sendmessage)
                    const ZALO_API_URL = 'https://zaloapi.hpb.edu.vn/api/sendmessage';
                    const ZALO_API_KEY = 'zalo_33752f0e1b1057e2f1cd837d04e704e49ac6693d675e467c657701a0e67e38c5';

                    const threadIds = [...new Set(config.zalo_group_id.split(',').map((id: string) => id.trim()).filter(Boolean))];

                    console.log(`📱 Sending Zalo notification to ${threadIds.length} recipients via Direct API`);

                    for (const rawIdVal of threadIds) {
                        const rawId = String(rawIdVal);
                        let threadId = rawId;

                        try {
                            // Parse prefix: g: = group, u: = user, no prefix = use length heuristic
                            let isGroup = true; // default to group

                            if (rawId.startsWith('g:')) {
                                threadId = rawId.substring(2);
                                isGroup = true;
                            } else if (rawId.startsWith('u:')) {
                                threadId = rawId.substring(2);
                                isGroup = false;
                            } else {
                                // Fallback: Group IDs are typically 17+ chars
                                isGroup = threadId.length >= 17;
                            }

                            const zaloRes = await fetch(ZALO_API_URL, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-api-key': ZALO_API_KEY,
                                    'ngrok-skip-browser-warning': 'true'
                                },
                                body: JSON.stringify({
                                    message: content,
                                    threadId: threadId,
                                    type: isGroup ? 1 : 0,
                                    ownId: config.zalo_own_id
                                })
                            });

                            if (zaloRes.ok) {
                                console.log(`✅ Zalo sent to ${threadId} (${isGroup ? 'Group' : 'User'})`);
                            } else {
                                const errText = await zaloRes.text();
                                console.error(`⚠️ Zalo failed for ${threadId}: ${zaloRes.status} - ${errText}`);
                            }
                        } catch (zaloErr: any) {
                            console.error(`⚠️ Zalo error for ${threadId}:`, zaloErr.message);
                        }
                    }
                }

                // 6. Update Last Run
                if (config.Id) {
                    const updateRes = await fetch(
                        `${NOCODB_BASE_URL}/api/v2/tables/${CONFIG_TABLE_ID}/records`,
                        {
                            method: 'PATCH',
                            headers: {
                                'xc-token': NOCODB_API_TOKEN,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify([{
                                Id: config.Id,
                                last_run_at: now.toISOString()
                            }])
                        }
                    );
                    if (!updateRes.ok) {
                        console.error(`❌ Failed to update last_run_at for config ${config.Id}:`, await updateRes.text());
                    } else {
                        console.log(`✅ Updated last_run_at for config ${config.Id}`);
                    }
                } else {
                    await fetch(
                        `${NOCODB_BASE_URL}/api/v2/tables/${CONFIG_TABLE_ID}/records?where=(CreatedAt,eq,${config.CreatedAt})`,
                        {
                            method: 'PATCH',
                            headers: {
                                'xc-token': NOCODB_API_TOKEN,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                last_run_at: now.toISOString()
                            })
                        }
                    );
                }

                const sampleDates = insights.slice(0, 5).map((r: any) => r.date_start);
                const debugInfo = {
                    todayStr,
                    targetDateStr,
                    sampleDates,
                    totalFetched: insights.length,
                    todayCount: todayInsights.length,
                    targetCount: targetInsights.length,
                    firstRecordKeys: insights.length > 0 ? Object.keys(insights[0]) : []
                };

                return {
                    config: config.name,
                    status: 'success',
                    metrics: {
                        spend: totalSpend,
                        results: totalResults,
                        revenue: totalRevenue,
                        appointments: totalAppointments
                    },
                    counts: {
                        insights: targetInsights.length,
                        sales: todaySales.length
                    },
                    debug: debugInfo
                };

            } catch (err: any) {
                console.error(`Error processing config ${config.CreatedAt}:`, err);
                return { config: config.name, status: 'error', error: err.message };
            }
        };

        // Execute in batches
        for (let i = 0; i < configs.length; i += BATCH_SIZE) {
            const batch = configs.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i / BATCH_SIZE + 1} (${batch.length} configs)...`);
            const batchResults = await Promise.all(batch.map((config: any) => processConfig(config)));
            results.push(...batchResults);
        }

        return new Response(
            JSON.stringify({ success: true, results }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error: any) {
        console.error('❌ Error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
    }
});
