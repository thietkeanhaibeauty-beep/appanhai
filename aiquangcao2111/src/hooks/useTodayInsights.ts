import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTodayInsights, getTodayInsightsByCampaign, triggerTodaySync, getLastSyncTime, TodayInsight } from '@/services/nocodb/todayInsightsService';

export const useTodayInsights = (userId: string, accountId?: string, level?: 'campaign' | 'adset' | 'ad') => {
  const queryClient = useQueryClient();
  
  // Query to fetch today insights
  const query = useQuery({
    queryKey: ['today-insights', userId, accountId, level],
    queryFn: () => getTodayInsights(userId, accountId, level),
    enabled: !!userId,
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 5 * 60 * 1000, // Auto refetch every 5 minutes
  });
  
  // Mutation to trigger sync
  const syncMutation = useMutation({
    mutationFn: triggerTodaySync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today-insights'] });
      queryClient.invalidateQueries({ queryKey: ['last-sync-time'] });
    },
  });
  
  // Query to get last sync time
  const lastSyncQuery = useQuery({
    queryKey: ['last-sync-time', userId],
    queryFn: () => getLastSyncTime(userId),
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  return {
    insights: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    
    // Sync operations
    triggerSync: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    syncError: syncMutation.error,
    
    // Last sync info
    lastSyncTime: lastSyncQuery.data,
    isLoadingLastSync: lastSyncQuery.isLoading,
  };
};

export const useTodayInsightsByCampaign = (userId: string, campaignId: string) => {
  const query = useQuery({
    queryKey: ['today-insights-campaign', userId, campaignId],
    queryFn: () => getTodayInsightsByCampaign(userId, campaignId),
    enabled: !!userId && !!campaignId,
    staleTime: 3 * 60 * 1000,
  });
  
  return {
    insights: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
