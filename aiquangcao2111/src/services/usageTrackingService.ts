import { supabase } from '@/integrations/supabase/client';
import * as nocodbUsageService from './nocodb/usageLogsService';

export type UsageActionType = nocodbUsageService.UsageActionType;
export type UsageLog = nocodbUsageService.UsageLog;

/**
 * Track user action for usage analytics (NocoDB)
 */
export const trackUsage = async (
  actionType: UsageActionType,
  resourceType?: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('⚠️ No user found for usage tracking');
      return;
    }

    await nocodbUsageService.trackUsage(
      user.id,
      actionType,
      resourceType,
      resourceId,
      metadata
    );
  } catch (error) {
    console.error('❌ Error in trackUsage:', error);
  }
};

/**
 * Get usage count for specific action type (NocoDB)
 */
export const getUsageCount = async (
  actionType: UsageActionType,
  daysBack: number = 30
): Promise<number> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return 0;

    return await nocodbUsageService.getUsageCount(user.id, actionType, daysBack);
  } catch (error) {
    console.error('❌ Error in getUsageCount:', error);
    return 0;
  }
};

/**
 * Get all usage logs for current user (NocoDB)
 */
export const getUserUsageLogs = async (
  limit: number = 100,
  daysBack: number = 30
): Promise<UsageLog[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];

    return await nocodbUsageService.getUserUsageLogs(user.id, limit, daysBack);
  } catch (error) {
    console.error('❌ Error in getUserUsageLogs:', error);
    return [];
  }
};

/**
 * Get usage summary grouped by action type (NocoDB)
 */
export const getUsageSummary = async (
  daysBack: number = 30
): Promise<Record<string, number>> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return {};

    return await nocodbUsageService.getUsageSummary(user.id, daysBack);
  } catch (error) {
    console.error('❌ Error in getUsageSummary:', error);
    return {};
  }
};
