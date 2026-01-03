import { useFeatures } from './useFeatures';

export interface ManualToolStatus {
  enabled: boolean;
  canUse: boolean;
}

export const MANUAL_TOOLS = {
  CREATE_ADS: 'manual_create_ads',
  CREATE_MESSAGE: 'manual_create_message',
  AUDIENCE: 'manual_audience',
  ADVANCED_ADS: 'manual_advanced_ads',
  QUICK_AD: 'manual_quick_ad',
} as const;

export const MANUAL_TOOL_NAMES = {
  [MANUAL_TOOLS.CREATE_ADS]: '🎨 Tạo quảng cáo thủ công',
  [MANUAL_TOOLS.CREATE_MESSAGE]: '💬 Tạo QC tin nhắn',
  [MANUAL_TOOLS.AUDIENCE]: '👥 Tạo đối tượng',
  [MANUAL_TOOLS.ADVANCED_ADS]: '⚡ Nhân bản chiến dịch',
  [MANUAL_TOOLS.QUICK_AD]: '⚡ Bài viết sẵn nhanh',
} as const;

/**
 * Hook to check manual tool permissions
 */
export const useManualTools = () => {
  const { features, hasFeature, loading, error } = useFeatures();

  const getToolStatus = (toolKey: string): ManualToolStatus => {
    const enabled = hasFeature(toolKey);
    return {
      enabled,
      canUse: enabled,
    };
  };

  return {
    // Individual tool checks
    canUseCreateAds: hasFeature(MANUAL_TOOLS.CREATE_ADS),
    canUseCreateMessage: hasFeature(MANUAL_TOOLS.CREATE_MESSAGE),
    canUseAudience: hasFeature(MANUAL_TOOLS.AUDIENCE),
    canUseAdvancedAds: hasFeature(MANUAL_TOOLS.ADVANCED_ADS),
    canUseQuickAd: hasFeature(MANUAL_TOOLS.QUICK_AD),

    // Get status for specific tool
    getToolStatus,

    // Get all enabled manual tools
    enabledTools: Object.values(MANUAL_TOOLS).filter(key => hasFeature(key)),

    // Utility
    features,
    loading,
    error,
  };
};