import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';
import { FacebookInsight } from './facebookInsightsService';

/**
 * Historical Facebook Insights Service (Read-Only)
 * Provides access to historical insights data stored in facebook_insights_history table
 * This service only supports read operations - no insert, update, or delete
 */

/**
 * Fetch historical Facebook Insights for a user and date range
 * 
 * SECURITY: Always filter by BOTH user_id AND account_id to prevent data contamination
 * 
 * @param userId - Unique user identifier
 * @param accountId - Facebook Ad Account ID
 * @param startDate - Start date in 'YYYY-MM-DD' format
 * @param endDate - End date in 'YYYY-MM-DD' format
 * @returns Array of historical FacebookInsight objects
 */
export const getHistoricalInsightsByUserAndDate = async (
  userId: string,
  accountId: string,
  startDate: string,
  endDate: string
): Promise<FacebookInsight[]> => {
  if (!userId || !accountId) {
    console.warn('⚠️ getHistoricalInsightsByUserAndDate: Missing userId or accountId');
    return [];
  }

  const tableId = NOCODB_CONFIG.TABLES.FACEBOOK_INSIGHTS_HISTORY;
  const url = getNocoDBUrl(tableId);

  try {


    // Build filter: ONLY user_id AND account_id (NO date filtering in URL)
    const whereClause = `(user_id,eq,${userId})~and(account_id,eq,${accountId})`;

    // Fetch with pagination to handle large datasets
    const limit = 10000;
    let offset = 0;
    let allRecords: any[] = [];
    let hasMore = true;

    while (hasMore) {
      const fullUrl = `${url}?where=${encodeURIComponent(whereClause)}&limit=${limit}&offset=${offset}`;


      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: await getNocoDBHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch historical insights:', response.status, errorText);
        throw new Error(`Failed to fetch historical insights: ${response.status}`);
      }

      const data = await response.json();
      const pageRecords = data.list || [];

      allRecords = allRecords.concat(pageRecords);


      // Check if there are more pages
      hasMore = pageRecords.length === limit;
      offset += limit;
    }

    const records = allRecords;



    // Client-side filtering by date range with standardized date format
    let filteredRecords = records;
    if (startDate || endDate) {
      filteredRecords = records.filter((record: any) => {
        // Standardize ISO date to YYYY-MM-DD for comparison
        const recordDate = record.date_start?.split('T')[0];
        if (!recordDate) return false;

        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });


    }

    // Auto-fix missing level field and normalize numeric fields
    const processedRecords = filteredRecords.map((record: any) => {
      // ✅ Normalize field names: Map amount_spent/total_spend -> spend
      if (!record.spend && record.amount_spent !== undefined) {
        record.spend = record.amount_spent;
      }
      if (!record.spend && record.total_spend !== undefined) {
        record.spend = record.total_spend;
      }

      if (!record.level) {
        if (record.adId && record.adId !== 'null') {
          record.level = 'ad';
        } else if (record.adsetId && record.adsetId !== 'null') {
          record.level = 'adset';
        } else if (record.campaignId && record.campaignId !== 'null') {
          record.level = 'campaign';
        } else {
          record.level = 'account';
        }
      }

      // Map legacy field 'Trò chuyện 7d' -> started_7d for backward compatibility
      if ((record.started_7d === undefined || record.started_7d === 0) && record['Trò chuyện 7d'] !== undefined) {
        const v = Number(record['Trò chuyện 7d']);
        record.started_7d = isNaN(v) ? 0 : Math.round(v);
      }

      // 🔥 Normalize numeric fields - remove .0 and ensure proper types
      // Integer fields (no decimals allowed)
      const integerFields = [
        'impressions', 'reach', 'clicks', 'results', 'phones',
        'unique_clicks', 'inline_link_clicks', 'outbound_clicks',
        'results_messaging_replied_7d', 'messaging_connections', 'started_7d'
      ];

      // Currency fields (round to integer VND)
      const currencyFields = [
        'spend', 'budget', 'cost_per_result', 'cpc', 'cpm', 'cpp',
        'cost_per_unique_click', 'cost_per_phone', 'cost_per_messaging_replied_7d',
        'cost_per_thruplay', 'cost_per_started_7d', 'cost_per_total_messaging_connection'
      ];

      // Percentage/decimal fields (keep 2 decimal places)
      const decimalFields = ['ctr', 'frequency', 'purchase_roas'];

      // Process integer fields - force Math.round()
      integerFields.forEach(field => {
        if (record[field] !== null && record[field] !== undefined) {
          const num = Number(record[field]);
          record[field] = isNaN(num) ? 0 : Math.round(num);
        } else {
          record[field] = 0;
        }
      });

      // Process currency fields - force Math.round()
      currencyFields.forEach(field => {
        if (record[field] !== null && record[field] !== undefined) {
          const num = Number(record[field]);
          record[field] = isNaN(num) ? 0 : Math.round(num);
        } else {
          record[field] = 0;
        }
      });

      // Process decimal fields - keep 2 decimal places
      decimalFields.forEach(field => {
        if (record[field] !== null && record[field] !== undefined) {
          const num = Number(record[field]);
          if (!isNaN(num)) {
            record[field] = Math.round(num * 100) / 100;
          } else {
            record[field] = 0;
          }
        } else {
          record[field] = 0;
        }
      });

      return record;
    });

    return processedRecords;
  } catch (error) {
    console.error('❌ Error fetching historical insights:', error);
    throw error;
  }
};
