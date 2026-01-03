import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';
import { FacebookInsight } from './facebookInsightsAutoService';

interface NocoDBListResponse {
    list: FacebookInsight[];
    pageInfo: {
        totalRows: number;
        page: number;
        pageSize: number;
        isFirstPage: boolean;
        isLastPage: boolean;
    };
}

/**
 * Get ALL ARCHIVED insights by user ID, account ID, and date range (Handles pagination automatically)
 */
export const getAllArchivedInsightsByUserAndDate = async (
    userId: string,
    startDate: string,
    endDate: string,
    accountId: string
): Promise<FacebookInsight[]> => {
    try {
        let allData: FacebookInsight[] = [];
        let offset = 0;
        const limit = 1000;
        let hasMore = true;

        while (hasMore) {
            if (!userId || !accountId) {
                console.error('❌ getAllArchivedInsightsByUserAndDate: Missing userId or accountId', { userId, accountId });
                return [];
            }

            // ✅ FIX: Filter by user_id + account_id + date_start in API query
            const whereClause = encodeURIComponent(
                `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,gte,${startDate})~and(date_start,lte,${endDate})`
            );
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_ARCHIVE)}?where=${whereClause}&offset=${offset}&limit=${limit}&sort=-date_start`;

            const response = await fetch(url, {
                method: 'GET',
                headers: await getNocoDBHeaders(),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ NocoDB Archive error:', response.status, errorText);
                throw new Error(`NocoDB Archive API error: ${response.status} ${response.statusText}`);
            }

            const data: NocoDBListResponse = await response.json();
            const items = data.list || [];

            allData = allData.concat(items);

            // Check if there are more pages using NocoDB pageInfo
            if (data.pageInfo && !data.pageInfo.isLastPage) {
                offset += limit;
            } else {
                hasMore = false;
            }
        }

        // ✅ Date filtering is now done in API query, no need for client-side filter
        const filtered = allData;

        // ✅ Auto-fix missing level field for backward compatibility
        const fixedInsights = filtered.map(insight => {
            // Map legacy field 'Trò chuyện 7d' -> started_7d for backward compatibility
            if ((insight.started_7d === undefined || insight.started_7d === 0) && (insight as any)['Trò chuyện 7d'] !== undefined) {
                const v = Number((insight as any)['Trò chuyện 7d']);
                insight.started_7d = isNaN(v) ? 0 : Math.round(v);
            }

            if (!insight.level) {
                insight.level = insight.ad_id ? 'ad' : insight.adset_id ? 'adset' : 'campaign';
            }
            return insight;
        });

        return fixedInsights;
    } catch (error) {
        console.error('Error fetching ALL ARCHIVED insights from NocoDB:', error);
        throw error;
    }
};
