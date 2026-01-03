import { supabase } from '@/integrations/supabase/client';

export interface CleanupResult {
  success: boolean;
  deletedCount: number;
  message: string;
}

export interface OrphanedRecords {
  user_roles: number;
}

/**
 * Cleanup data older than specified days (Super Admin only)
 */
export const cleanupOldData = async (
  daysOld: number,
  tableName: string
): Promise<CleanupResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('bulk-cleanup-data', {
      body: {
        daysOld,
        tableName,
      },
    });

    if (error) {
      console.error('❌ Error cleaning up data:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('❌ Error in cleanupOldData:', error);
    throw error;
  }
};

/**
 * Export user data (GDPR compliance)
 */
export const exportUserData = async (userId: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('export-user-data', {
      body: {
        userId,
      },
    });

    if (error) {
      console.error('❌ Error exporting user data:', error);
      throw error;
    }

    return data.data;
  } catch (error) {
    console.error('❌ Error in exportUserData:', error);
    throw error;
  }
};

/**
 * Get orphaned records count
 */
export const getOrphanedRecords = async (): Promise<OrphanedRecords> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-orphaned-records');

    if (error) {
      console.error('❌ Error getting orphaned records:', error);
      throw error;
    }

    return data.details;
  } catch (error) {
    console.error('❌ Error in getOrphanedRecords:', error);
    throw error;
  }
};

/**
 * Download data as JSON file
 */
export const downloadAsJson = (data: any, filename: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
