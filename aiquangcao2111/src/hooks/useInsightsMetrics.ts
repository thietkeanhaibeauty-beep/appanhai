import { useMemo } from 'react';

export interface InsightsMetrics {
  totalSpend: number;
  totalResults: number;
  avgCostPerResult: number;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  totalReach: number;
  avgFrequency: number;
  campaignCount: number;
  activeCampaigns: number;
  pausedCampaigns: number;
  adsetCount: number;
  adCount: number;
}

interface BaseInsight {
  spend?: number;
  results?: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
  frequency?: number;
  level?: string;
  effective_status?: string;
  status?: string;
}

export const useInsightsMetrics = (insights: BaseInsight[]): InsightsMetrics => {
  const metrics = useMemo(() => {
    if (!insights || insights.length === 0) {
      return {
        totalSpend: 0,
        totalResults: 0,
        avgCostPerResult: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: 0,
        avgCPC: 0,
        avgCPM: 0,
        totalReach: 0,
        avgFrequency: 0,
        campaignCount: 0,
        activeCampaigns: 0,
        pausedCampaigns: 0,
        adsetCount: 0,
        adCount: 0,
      };
    }
    
    const totalSpend = insights.reduce((sum, i) => sum + (i.spend || 0), 0);
    const totalResults = insights.reduce((sum, i) => sum + (i.results || 0), 0);
    const totalImpressions = insights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    const totalClicks = insights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    const totalReach = insights.reduce((sum, i) => sum + (i.reach || 0), 0);
    const totalFrequency = insights.reduce((sum, i) => sum + (i.frequency || 0), 0);
    
    const campaignInsights = insights.filter(i => i.level === 'campaign');
    const adsetInsights = insights.filter(i => i.level === 'adset');
    const adInsights = insights.filter(i => i.level === 'ad');
    
    return {
      totalSpend,
      totalResults,
      avgCostPerResult: totalResults > 0 ? totalSpend / totalResults : 0,
      totalImpressions,
      totalClicks,
      avgCTR: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCPC: totalClicks > 0 ? totalSpend / totalClicks : 0,
      avgCPM: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
      totalReach,
      avgFrequency: insights.length > 0 ? totalFrequency / insights.length : 0,
      campaignCount: campaignInsights.length,
      activeCampaigns: campaignInsights.filter(i => 
        i.effective_status === 'ACTIVE' || i.status === 'ACTIVE'
      ).length,
      pausedCampaigns: campaignInsights.filter(i => 
        i.effective_status === 'PAUSED' || i.status === 'PAUSED'
      ).length,
      adsetCount: adsetInsights.length,
      adCount: adInsights.length,
    };
  }, [insights]);
  
  return metrics;
};
