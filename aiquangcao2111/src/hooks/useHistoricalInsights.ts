import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHistoricalInsightsByUserAndDate } from '@/services/nocodb/facebookInsightsHistoryService';
import { triggerHistoricalSync } from '@/services/nocodb/historicalInsightsSyncService';

export interface UseHistoricalInsightsOptions {
  enabled?: boolean;
}

export const useHistoricalInsights = (
  userId: string,
  accountId: string,
  startDate: string,
  endDate: string,
  options?: UseHistoricalInsightsOptions
) => {
  const queryClient = useQueryClient();
  
  // Query to fetch historical data
  const query = useQuery({
    queryKey: ['historical-insights', userId, accountId, startDate, endDate],
    queryFn: () => getHistoricalInsightsByUserAndDate(userId, accountId, startDate, endDate),
    enabled: options?.enabled !== false && !!userId && !!accountId && !!startDate && !!endDate,
    staleTime: 10 * 60 * 1000, // 10 minutes (historical data changes less frequently)
  });
  
  // Mutation to sync historical data from Facebook
  const syncMutation = useMutation({
    mutationFn: (params: { since: string; until: string }) => 
      triggerHistoricalSync({
        userId,
        accountId,
        since: params.since,
        until: params.until,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['historical-insights'] });
    },
  });
  
  return {
    insights: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Sync operations
    syncHistorical: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncResult: syncMutation.data,
    syncError: syncMutation.error,
  };
};
