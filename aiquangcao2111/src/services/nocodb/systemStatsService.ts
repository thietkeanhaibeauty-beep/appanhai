import { supabase } from '@/integrations/supabase/client';

export interface SystemStats {
  users: {
    total: number;
    growth: { date: string; count: number }[];
  };
  roles: {
    total: number;
    byType: { role: string; count: number }[];
  };
  tables: {
    profiles: number;
    user_roles: number;
  };
}

/**
 * Get system statistics (Super Admin only)
 */
export const getSystemStats = async (): Promise<SystemStats> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-system-stats');

    if (error) {
      console.error('❌ Error getting system stats:', error);
      throw error;
    }

    return data.stats;
  } catch (error) {
    console.error('❌ Error in getSystemStats:', error);
    throw error;
  }
};
