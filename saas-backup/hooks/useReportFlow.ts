import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getHistoricalInsightsByUserAndDate } from '@/services/nocodb/facebookInsightsHistoryService';
import { ReportData } from '@/components/ai-chat/ReportCard';

interface ReportFlowState {
    isActive: boolean;
    isLoading: boolean;
    isFetching: boolean;  // True when fetching from FB API (long operation)
    progress: number;     // 0-100 for long fetches
    reportData: ReportData | null;
    error: string | null;
}

interface ParsedReportRequest {
    reportType: 'marketing' | 'sales' | 'summary';
    dateRange: {
        startDate: string;
        endDate: string;
    };
    metrics?: string[];
}

export function useReportFlow(userId: string, accountId: string, accountName?: string) {
    const [state, setState] = useState<ReportFlowState>({
        isActive: false,
        isLoading: false,
        isFetching: false,
        progress: 0,
        reportData: null,
        error: null,
    });

    /**
     * Parse user message to get report parameters
     */
    const parseReportRequest = useCallback(async (
        userMessage: string,
        openaiApiKey?: string
    ): Promise<ParsedReportRequest | null> => {
        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            const { data, error } = await supabase.functions.invoke('ai-parse-report', {
                body: { userMessage, openaiApiKey },
            });

            if (error) {
                console.error('Error parsing report request:', error);
                setState(prev => ({ ...prev, isLoading: false, error: error.message }));
                return null;
            }

            setState(prev => ({ ...prev, isLoading: false }));
            return data as ParsedReportRequest;
        } catch (err: any) {
            console.error('Error in parseReportRequest:', err);
            setState(prev => ({ ...prev, isLoading: false, error: err.message }));
            return null;
        }
    }, []);

    /**
     * Fetch report data from history or Facebook API
     */
    const fetchReportData = useCallback(async (
        request: ParsedReportRequest
    ): Promise<ReportData | null> => {
        try {
            setState(prev => ({ ...prev, isActive: true, isLoading: true, error: null }));

            const { startDate, endDate } = request.dateRange;

            // Try to get data from history first
            const historicalData = await getHistoricalInsightsByUserAndDate(
                userId,
                accountId,
                startDate,
                endDate
            );

            if (historicalData.length === 0) {
                // No historical data - need to fetch from Facebook
                setState(prev => ({
                    ...prev,
                    isFetching: true,
                    isLoading: false,
                    progress: 0
                }));

                // TODO: Call fetch-historical-range Edge Function
                // For now, return empty data with a message
                setState(prev => ({
                    ...prev,
                    isFetching: false,
                    error: 'Không có dữ liệu lịch sử. Vui lòng đồng bộ dữ liệu từ Facebook trước.'
                }));
                return null;
            }

            // Aggregate historical data
            const aggregated = aggregateInsights(historicalData, request.reportType);

            const reportData: ReportData = {
                reportType: request.reportType,
                dateRange: request.dateRange,
                accountName: accountName || accountId,
                summary: {
                    spend: aggregated.spend,
                    results: aggregated.results,
                    costPerResult: aggregated.results > 0 ? Math.round(aggregated.spend / aggregated.results) : 0,
                    impressions: aggregated.impressions,
                    reach: aggregated.reach,
                    clicks: aggregated.clicks,
                    ctr: aggregated.ctr,
                },
                topCampaigns: aggregated.topCampaigns,
            };

            setState(prev => ({
                ...prev,
                isActive: true,
                isLoading: false,
                reportData
            }));

            return reportData;
        } catch (err: any) {
            console.error('Error fetching report data:', err);
            setState(prev => ({
                ...prev,
                isLoading: false,
                isFetching: false,
                error: err.message
            }));
            return null;
        }
    }, [userId, accountId, accountName]);

    /**
     * Start the report flow
     */
    const startReportFlow = useCallback(async (
        userMessage: string,
        openaiApiKey?: string
    ): Promise<ReportData | null> => {
        // Step 1: Parse user request
        const parsed = await parseReportRequest(userMessage, openaiApiKey);
        if (!parsed) return null;

        // Step 2: Fetch data
        const data = await fetchReportData(parsed);
        return data;
    }, [parseReportRequest, fetchReportData]);

    /**
     * Reset the flow
     */
    const reset = useCallback(() => {
        setState({
            isActive: false,
            isLoading: false,
            isFetching: false,
            progress: 0,
            reportData: null,
            error: null,
        });
    }, []);

    return {
        ...state,
        startReportFlow,
        parseReportRequest,
        fetchReportData,
        reset,
    };
}

/**
 * Helper: Aggregate insights data
 */
function aggregateInsights(
    data: any[],
    reportType: 'marketing' | 'sales' | 'summary'
) {
    // Group by campaign for top campaigns
    const campaignMap = new Map<string, { name: string; spend: number; results: number }>();

    let totalSpend = 0;
    let totalResults = 0;
    let totalImpressions = 0;
    let totalReach = 0;
    let totalClicks = 0;

    for (const row of data) {
        // Only count campaign-level data to avoid double counting
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

        // Track campaign totals
        const campaignId = row.campaignId || row.campaign_id;
        const campaignName = row.campaign_name || row.campaignName || campaignId;

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

    // Sort campaigns by results
    const topCampaigns = Array.from(campaignMap.values())
        .sort((a, b) => b.results - a.results)
        .slice(0, 5);

    return {
        spend: Math.round(totalSpend),
        results: Math.round(totalResults),
        impressions: Math.round(totalImpressions),
        reach: Math.round(totalReach),
        clicks: Math.round(totalClicks),
        ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 10000) / 100 : 0,
        topCampaigns,
    };
}

export default useReportFlow;
