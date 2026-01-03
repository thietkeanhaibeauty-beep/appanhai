import { useFeatures } from './useFeatures';

export interface ReportFeatureStatus {
  enabled: boolean;
  canUse: boolean;
}

export const REPORT_FEATURES = {
  ADS_REPORT: 'report_ads',
  SALE_REPORT: 'report_sale',
  SUMMARY_REPORT: 'report_summary',
} as const;

export const REPORT_FEATURE_NAMES = {
  [REPORT_FEATURES.ADS_REPORT]: '📊 Báo cáo ADS',
  [REPORT_FEATURES.SALE_REPORT]: '💰 Báo cáo Sale',
  [REPORT_FEATURES.SUMMARY_REPORT]: '📈 Báo cáo Tổng',
} as const;

/**
 * Hook to check report feature permissions
 */
export const useReportFeatures = () => {
  const { features, hasFeature, loading, error } = useFeatures();

  const getFeatureStatus = (featureKey: string): ReportFeatureStatus => {
    const enabled = hasFeature(featureKey);
    return {
      enabled,
      canUse: enabled,
    };
  };

  return {
    // Individual feature checks
    canUseAdsReport: hasFeature(REPORT_FEATURES.ADS_REPORT),
    canUseSaleReport: hasFeature(REPORT_FEATURES.SALE_REPORT),
    canUseSummaryReport: hasFeature(REPORT_FEATURES.SUMMARY_REPORT),
    
    // Get status for specific feature
    getFeatureStatus,
    
    // Get all enabled report features
    enabledFeatures: Object.values(REPORT_FEATURES).filter(key => hasFeature(key)),
    
    // Utility
    features,
    loading,
    error,
  };
};
