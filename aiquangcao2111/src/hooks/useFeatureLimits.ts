import { useState, useEffect } from 'react';
import { useSubscription } from './useSubscription';
import { supabase } from '@/integrations/supabase/client';

export interface PackageFeatures {
  max_campaigns?: number;
  max_ad_accounts?: number;
  ai_credits?: number;
  advanced_features?: boolean;
  max_ads?: number;
  automation_rules?: boolean;
  priority_support?: boolean;
}

interface UsageStats {
  campaigns: number;
  adAccounts: number;
  aiCreditsUsed: number;
  ads: number;
}

/**
 * Hook to check feature limits based on subscription package
 */
export const useFeatureLimits = () => {
  const { subscription, hasActiveSubscription } = useSubscription();
  const [features, setFeatures] = useState<PackageFeatures | null>(null);
  const [usage, setUsage] = useState<UsageStats>({
    campaigns: 0,
    adAccounts: 0,
    aiCreditsUsed: 0,
    ads: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFeatures = async () => {
      if (!subscription) {
        setFeatures(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch package features from payment_packages (NocoDB)
        // For now, use default features based on package_id
        const defaultFeatures = getDefaultFeatures(subscription.package_id);
        setFeatures(defaultFeatures);
      } catch (error) {
        console.error('Error loading features:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeatures();
  }, [subscription]);

  const getDefaultFeatures = (packageId: string): PackageFeatures => {
    // Default trial features
    if (packageId === 'trial') {
      return {
        max_campaigns: 10,
        max_ad_accounts: 1,
        ai_credits: 50,
        advanced_features: false,
        max_ads: 50,
        automation_rules: false,
      };
    }

    // Basic/Pro features (can be customized)
    if (packageId.toLowerCase().includes('basic')) {
      return {
        max_campaigns: 20,
        max_ad_accounts: 2,
        ai_credits: 100,
        advanced_features: false,
        max_ads: 100,
        automation_rules: false,
      };
    }

    if (packageId.toLowerCase().includes('pro') || packageId.toLowerCase().includes('premium')) {
      return {
        max_campaigns: 50,
        max_ad_accounts: 5,
        ai_credits: 200,
        advanced_features: true,
        max_ads: 200,
        automation_rules: true,
      };
    }

    // Enterprise/Unlimited
    return {
      max_campaigns: -1, // -1 = unlimited
      max_ad_accounts: -1,
      ai_credits: -1,
      advanced_features: true,
      max_ads: -1,
      automation_rules: true,
      priority_support: true,
    };
  };

  /**
   * Check if user can access a feature
   */
  const canAccessFeature = (featureName: keyof PackageFeatures): boolean => {
    if (!hasActiveSubscription) return false;
    if (!features) return false;

    const value = features[featureName];
    if (typeof value === 'boolean') return value;
    return true;
  };

  /**
   * Check if user has reached limit for a resource
   */
  const hasReachedLimit = (
    resourceType: 'campaigns' | 'adAccounts' | 'ads' | 'aiCredits',
    currentCount?: number
  ): boolean => {
    if (!hasActiveSubscription) return true;
    if (!features) return true;

    // Map resourceType to usage key
    const usageKey = resourceType === 'aiCredits' ? 'aiCreditsUsed' : resourceType;
    const count = currentCount ?? (usage[usageKey as keyof UsageStats] || 0);
    let limit: number;

    switch (resourceType) {
      case 'campaigns':
        limit = features.max_campaigns ?? 0;
        break;
      case 'adAccounts':
        limit = features.max_ad_accounts ?? 0;
        break;
      case 'ads':
        limit = features.max_ads ?? 0;
        break;
      case 'aiCredits':
        limit = features.ai_credits ?? 0;
        break;
      default:
        return false;
    }

    // -1 means unlimited
    if (limit === -1) return false;
    
    return count >= limit;
  };

  /**
   * Get usage percentage for a resource
   */
  const getUsagePercentage = (resourceType: keyof UsageStats): number => {
    if (!features) return 0;

    const count = usage[resourceType];
    let limit: number;

    switch (resourceType) {
      case 'campaigns':
        limit = features.max_campaigns ?? 0;
        break;
      case 'adAccounts':
        limit = features.max_ad_accounts ?? 0;
        break;
      case 'ads':
        limit = features.max_ads ?? 0;
        break;
      case 'aiCreditsUsed':
        limit = features.ai_credits ?? 0;
        break;
      default:
        return 0;
    }

    if (limit === -1) return 0; // Unlimited
    if (limit === 0) return 100;
    
    return Math.min((count / limit) * 100, 100);
  };

  /**
   * Check if approaching limit (>80%)
   */
  const isApproachingLimit = (resourceType: keyof UsageStats): boolean => {
    return getUsagePercentage(resourceType) >= 80;
  };

  return {
    features,
    usage,
    loading,
    canAccessFeature,
    hasReachedLimit,
    getUsagePercentage,
    isApproachingLimit,
  };
};
