import { getInsightsByUserAndDate, FacebookInsight } from './nocodb/facebookInsightsService';

export interface EffectiveItem {
  id: string;
  name: string;
  level: 'campaign' | 'adset';
  campaignId?: string; // for adsets
  campaignName?: string; // for adsets

  // Metrics
  spend: number;
  results: number;
  cost_per_result: number;
  result_label: string;
  impressions: number;
  clicks: number;
  ctr: number;

  // Performance score (optional)
  score?: number;
}

export interface EffectiveListParams {
  userId: string;
  accountId: string;
  level: 'campaign' | 'adset';
  dateRange: {
    from: string; // YYYY-MM-DD
    to: string;
  };
  minResults?: number; // default: 5
  sortBy?: 'cost_per_result' | 'results' | 'spend';
  limit?: number; // default: 20
}

/**
 * Get list of effective campaigns or adsets based on performance metrics
 */
export const getEffectiveCampaigns = async (params: EffectiveListParams): Promise<EffectiveItem[]> => {
  const {
    userId,
    accountId,
    level,
    dateRange,
    minResults = 3,
    sortBy = 'cost_per_result',
    limit = 20
  } = params;



  // 1. Get insights from NocoDB
  const insights = await getInsightsByUserAndDate(
    userId,
    dateRange.from,
    dateRange.to,
    accountId
  );



  if (insights.length === 0) {
    return [];
  }

  // 2. Filter by level and aggregate
  const aggregatedMap = new Map<string, {
    id: string;
    name: string;
    campaignId?: string;
    campaignName?: string;
    spend: number;
    results: number;
    result_label: string;
    impressions: number;
    clicks: number;
  }>();

  for (const insight of insights) {
    // Skip if wrong level
    if (insight.level !== level) continue;

    const itemId = level === 'campaign' ? insight.campaign_id : insight.adset_id;
    const itemName = level === 'campaign' ? insight.campaign_name : insight.adset_name;

    if (!itemId || !itemName) continue;

    // Get or create aggregated item
    const existing = aggregatedMap.get(itemId);

    if (existing) {
      // Accumulate metrics
      existing.spend += insight.spend || 0;
      existing.results += insight.results || 0;
      existing.impressions += insight.impressions || 0;
      existing.clicks += insight.clicks || 0;
    } else {
      // Create new entry
      aggregatedMap.set(itemId, {
        id: itemId,
        name: itemName,
        campaignId: level === 'adset' ? insight.campaign_id : undefined,
        campaignName: level === 'adset' ? insight.campaign_name : undefined,
        spend: insight.spend || 0,
        results: insight.results || 0,
        result_label: insight.result_label || 'Kết quả',
        impressions: insight.impressions || 0,
        clicks: insight.clicks || 0
      });
    }
  }



  // 3. Calculate derived metrics and filter
  const effectiveItems: EffectiveItem[] = [];

  for (const [, item] of aggregatedMap) {
    // Filter: must have minimum results
    if (item.results < minResults) {

      continue;
    }

    // Calculate cost per result
    const cost_per_result = item.results > 0 ? item.spend / item.results : 0;

    // Calculate CTR
    const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;

    effectiveItems.push({
      id: item.id,
      name: item.name,
      level,
      campaignId: item.campaignId,
      campaignName: item.campaignName,
      spend: item.spend,
      results: item.results,
      cost_per_result,
      result_label: item.result_label,
      impressions: item.impressions,
      clicks: item.clicks,
      ctr
    });
  }



  // 4. Sort by specified field
  effectiveItems.sort((a, b) => {
    if (sortBy === 'cost_per_result') {
      return a.cost_per_result - b.cost_per_result; // ascending = cheaper = better
    } else if (sortBy === 'results') {
      return b.results - a.results; // descending = more = better
    } else if (sortBy === 'spend') {
      return b.spend - a.spend; // descending
    }
    return 0;
  });

  // 5. Limit to top N
  const topItems = effectiveItems.slice(0, limit);



  return topItems;
};
