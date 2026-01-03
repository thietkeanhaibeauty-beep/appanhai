import { supabase } from '@/integrations/supabase/client';

/**
 * Trigger historical insights sync from Facebook to NocoDB
 * This will fetch insights for a specific date range and upsert them into the historical table
 */
export const triggerHistoricalSync = async (params: {
  userId: string;
  accountId: string;
  since: string;  // YYYY-MM-DD
  until: string;  // YYYY-MM-DD
}): Promise<{
  success: boolean;
  totalSynced: number;
  updated: number;
  inserted: number;
  timestamp: string;
  logs?: any[];
}> => {


  try {
    const { data, error } = await supabase.functions.invoke('sync-historical-insights', {
      body: {
        userId: params.userId,
        accountId: params.accountId,
        since: params.since,
        until: params.until,
      },
    });

    if (error) {
      console.error('❌ Error triggering historical sync:', error);
      throw new Error(error.message || 'Failed to sync historical insights');
    }


    return data;
  } catch (error) {
    console.error('❌ Exception in triggerHistoricalSync:', error);
    throw error;
  }
};
