import { useTodayInsights } from './useTodayInsights';
import { useHistoricalInsights } from './useHistoricalInsights';
import { useInsightsMetrics } from './useInsightsMetrics';

export interface UseReportDataOptions {
  includeHistorical?: boolean;
  level?: 'campaign' | 'adset' | 'ad';
}

export const useReportData = (
  userId: string,
  accountId: string,
  dateRange: { start: string; end: string },
  options?: UseReportDataOptions
) => {
  // Today data
  const todayData = useTodayInsights(userId, accountId, options?.level);
  
  // Historical data
  const historicalData = useHistoricalInsights(
    userId,
    accountId,
    dateRange.start,
    dateRange.end,
    { enabled: options?.includeHistorical !== false }
  );
  
  // Metrics calculations
  const todayMetrics = useInsightsMetrics(todayData.insights);
  const historicalMetrics = useInsightsMetrics(historicalData.insights);
  
  // Combined insights and metrics
  const allInsights = [...todayData.insights, ...historicalData.insights];
  const combinedMetrics = useInsightsMetrics(allInsights);
  
  const isLoading = todayData.isLoading || historicalData.isLoading;
  const isSyncing = todayData.isSyncing || historicalData.isSyncing;
  
  return {
    // Today
    todayInsights: todayData.insights,
    todayMetrics,
    todayLoading: todayData.isLoading,
    lastSyncTime: todayData.lastSyncTime,
    
    // Historical
    historicalInsights: historicalData.insights,
    historicalMetrics,
    historicalLoading: historicalData.isLoading,
    
    // Combined
    allInsights,
    combinedMetrics,
    
    // Loading states
    isLoading,
    isSyncing,
    
    // Operations
    triggerTodaySync: todayData.triggerSync,
    triggerHistoricalSync: historicalData.syncHistorical,
    refetchToday: todayData.refetch,
    refetchHistorical: historicalData.refetch,
    
    // Errors
    todayError: todayData.error,
    historicalError: historicalData.error,
    syncError: todayData.syncError || historicalData.syncError,
  };
};
