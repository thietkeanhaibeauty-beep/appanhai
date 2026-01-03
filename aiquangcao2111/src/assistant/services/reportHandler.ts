/**
 * reportHandler.ts - Xử lý Report Flow trong AI Chat
 * 
 * Khi user nhắn "báo cáo tuần qua", flow này:
 * 1. Parse ngày từ AI
 * 2. Query dữ liệu từ:
 *    - HÔM NAY: FACEBOOK_INSIGHTS_AUTO (real-time)
 *    - QUÁ KHỨ: FACEBOOK_INSIGHTS_HISTORY
 * 3. Trả về ReportData để hiển thị ReportCard
 */

import { supabase } from '@/integrations/supabase/client';
import { getHistoricalInsightsByUserAndDate } from '@/services/nocodb/facebookInsightsHistoryService';
import { getAllInsightsByUserAndDate as getTodayInsights } from '@/services/nocodb/facebookInsightsAutoService';
import { ReportData } from '@/components/ai-chat/ReportCard';

export interface ReportHandlerDeps {
    userId: string;
    accountId: string;
    accountName?: string;
    openaiApiKey?: string;
    addMessage: (role: 'user' | 'assistant', content: string) => void;
}

export interface ReportFlowResult {
    success: boolean;
    reportData?: ReportData;
    error?: string;
    needsFetch?: boolean;  // True if data doesn't exist and needs FB fetch
}

/**
 * Handle report request from user message
 */
export async function handleReportRequest(
    userMessage: string,
    deps: ReportHandlerDeps
): Promise<ReportFlowResult> {
    const { userId, accountId, accountName, openaiApiKey, addMessage } = deps;

    try {
        // Step 1: Parse the report request
        addMessage('assistant', '📊 Đang phân tích yêu cầu báo cáo...');

        const { data: parseResult, error: parseError } = await supabase.functions.invoke('ai-parse-report', {
            body: { userMessage, openaiApiKey },
        });

        if (parseError || !parseResult?.success) {
            return {
                success: false,
                error: parseError?.message || 'Không thể phân tích yêu cầu báo cáo',
            };
        }

        const { reportType, dateRange } = parseResult;
        const { startDate, endDate } = dateRange;

        // Step 2: Notify user about the date range
        const dateInfo = `📅 ${formatDate(startDate)} → ${formatDate(endDate)}`;
        addMessage('assistant', `Đang lấy dữ liệu ${getReportTypeName(reportType)}...\n${dateInfo}`);

        // Step 3: Smart data source selection based on report type
        const today = new Date().toISOString().split('T')[0];
        const isToday = startDate === today && endDate === today;
        const includesHistory = startDate < today;

        let insights: any[] = [];
        let salesData: any[] = [];

        // === FETCH ADS DATA (for marketing or summary) ===
        if (reportType === 'marketing' || reportType === 'summary') {
            if (isToday) {
                insights = await getTodayInsights(userId, startDate, endDate, accountId);
            } else if (includesHistory && endDate >= today) {
                const historicalData = await getHistoricalInsightsByUserAndDate(
                    userId, accountId, startDate,
                    new Date(new Date(today).setDate(new Date(today).getDate() - 1)).toISOString().split('T')[0]
                );
                const todayData = await getTodayInsights(userId, today, today, accountId);
                insights = [...historicalData, ...todayData];
            } else {
                insights = await getHistoricalInsightsByUserAndDate(userId, accountId, startDate, endDate);
            }
        }

        // === FETCH SALES DATA (for sales or summary) ===
        if (reportType === 'sales' || reportType === 'summary') {
            const { getSalesReports } = await import('@/services/nocodb/salesReportsService');

            salesData = await getSalesReports(userId, startDate, endDate);

        }

        // Check if we have data
        const hasAdsData = insights && insights.length > 0;
        const hasSalesData = salesData && salesData.length > 0;


        if (!hasAdsData && !hasSalesData) {
            // Fix: Only suggest FB sync if it's a marketing report
            if (reportType === 'marketing' || (reportType === 'summary' && !hasAdsData)) {
                addMessage('assistant', `⚠️ Không có dữ liệu trong khoảng thời gian này.\n\nVui lòng đồng bộ dữ liệu trước.`);
                return {
                    success: false,
                    needsFetch: true,
                    error: 'Không có dữ liệu.',
                };
            } else if (reportType === 'sales') {
                addMessage('assistant', `⚠️ Không tìm thấy dữ liệu doanh thu trong khoảng thời gian này.`);
                return {
                    success: false,
                    needsFetch: false, // Don't trigger FB sync suggestion
                    error: 'Không có dữ liệu doanh thu.',
                };
            }
        }

        // Step 4: Aggregate data
        const aggregated = hasAdsData ? aggregateInsightsData(insights) : {
            totalSpend: 0, totalResults: 0, totalImpressions: 0,
            totalReach: 0, totalClicks: 0, avgCTR: 0, topCampaigns: []
        };

        // Aggregate sales data
        const salesAggregated = hasSalesData ? aggregateSalesData(salesData) : {
            totalRevenue: 0, totalPhones: 0
        };

        // Step 5: Build report data
        const reportData: ReportData = {
            reportType,
            dateRange: { startDate, endDate },
            accountName: accountName || accountId,
            summary: {
                spend: aggregated.totalSpend,
                results: aggregated.totalResults,
                costPerResult: aggregated.totalResults > 0
                    ? Math.round(aggregated.totalSpend / aggregated.totalResults)
                    : 0,
                impressions: aggregated.totalImpressions,
                reach: aggregated.totalReach,
                clicks: aggregated.totalClicks,
                ctr: aggregated.avgCTR,
                // Sales metrics
                revenue: salesAggregated.totalRevenue,
                phones: salesAggregated.totalPhones,
                costPerPhone: salesAggregated.totalPhones > 0
                    ? Math.round(aggregated.totalSpend / salesAggregated.totalPhones)
                    : 0,
            },
            topCampaigns: aggregated.topCampaigns,
        };

        return {
            success: true,
            reportData,
        };

    } catch (error: any) {
        console.error('Error in handleReportRequest:', error);
        return {
            success: false,
            error: error.message || 'Lỗi không xác định',
        };
    }
}

/**
 * Aggregate insights data by campaign
 */
function aggregateInsightsData(insights: any[]) {
    const campaignMap = new Map<string, {
        name: string;
        spend: number;
        results: number;
    }>();

    let totalSpend = 0;
    let totalResults = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    let totalClicks = 0;

    for (const row of insights) {
        // Only count campaign-level to avoid double-counting
        if (row.level !== 'campaign') continue;

        const spend = Number(row.spend) || 0;
        const results = Number(row.results) || Number(row.started_7d) || 0;
        const impressions = Number(row.impressions) || 0;
        const reach = Number(row.reach) || 0;
        const clicks = Number(row.clicks) || 0;

        totalSpend += spend;
        totalResults += results;
        totalImpressions += impressions;
        totalReach += reach;
        totalClicks += clicks;

        // Group by campaign
        const campaignId = row.campaignId || row.campaign_id;
        const campaignName = row.campaign_name || row.campaignName || `Campaign ${campaignId?.slice(-6)}`;

        if (campaignId) {
            const existing = campaignMap.get(campaignId);
            if (existing) {
                existing.spend += spend;
                existing.results += results;
            } else {
                campaignMap.set(campaignId, { name: campaignName, spend, results });
            }
        }
    }

    // Top campaigns by results
    const topCampaigns = Array.from(campaignMap.values())
        .filter(c => c.results > 0)
        .sort((a, b) => b.results - a.results)
        .slice(0, 5);

    return {
        totalSpend: Math.round(totalSpend),
        totalResults: Math.round(totalResults),
        totalImpressions: Math.round(totalImpressions),
        totalReach: Math.round(totalReach),
        totalClicks: Math.round(totalClicks),
        avgCTR: totalImpressions > 0
            ? Math.round((totalClicks / totalImpressions) * 10000) / 100
            : 0,
        topCampaigns,
    };
}

/**
 * Aggregate sales data
 */
function aggregateSalesData(salesRecords: any[]) {
    let totalRevenue = 0;
    let totalPhones = 0;

    for (const record of salesRecords) {
        // Count as phone if it has a phone number
        if (record.phone_number) {
            totalPhones++;
        }

        // Sum revenue (use service_revenue or total_revenue as fallback)
        const revenue = Number(record.total_revenue) || Number(record.service_revenue) || 0;
        totalRevenue += revenue;
    }

    return {
        totalRevenue: Math.round(totalRevenue),
        totalPhones,
    };
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Get Vietnamese name for report type
 */
function getReportTypeName(type: 'marketing' | 'sales' | 'summary'): string {
    switch (type) {
        case 'sales': return 'báo cáo doanh thu';
        case 'summary': return 'báo cáo tổng hợp';
        default: return 'báo cáo marketing';
    }
}

export { aggregateInsightsData, formatDate, getReportTypeName };
