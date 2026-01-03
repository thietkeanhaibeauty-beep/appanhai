import { useFeatures } from './useFeatures';

export interface AIFeatureStatus {
  enabled: boolean;
  usedToday?: number;
  limitPerDay?: number;
  canUse: boolean;
}

export const AI_FEATURES = {
  QUICK_POST: 'ai_quick_post',
  CREATIVE_CAMPAIGN: 'ai_creative_campaign',
  AUDIENCE_CREATOR: 'ai_audience_creator',
  CLONE_TOOL: 'ai_clone_tool',
  REPORT_ANALYSIS: 'ai_report_analysis',
} as const;

export const AI_FEATURE_CATEGORIES = {
  [AI_FEATURES.QUICK_POST]: 'ai',
  [AI_FEATURES.CREATIVE_CAMPAIGN]: 'ai',
  [AI_FEATURES.AUDIENCE_CREATOR]: 'ai',
  [AI_FEATURES.CLONE_TOOL]: 'ai',
  [AI_FEATURES.REPORT_ANALYSIS]: 'ai',
} as const;

export const AI_FEATURE_NAMES = {
  [AI_FEATURES.QUICK_POST]: '📱 Quick Post - Tạo QC từ bài viết',
  [AI_FEATURES.CREATIVE_CAMPAIGN]: '🎨 Creative Campaign - Tạo QC với media',
  [AI_FEATURES.AUDIENCE_CREATOR]: '👥 Audience Creator - Tạo đối tượng',
  [AI_FEATURES.CLONE_TOOL]: '📋 Clone Tool - Nhân bản',
  [AI_FEATURES.REPORT_ANALYSIS]: '📊 Report Analysis - Phân tích báo cáo',
} as const;

/**
 * Hook to check AI feature permissions and usage
 */
export const useAIFeatures = () => {
  const { features, hasFeature, loading, error } = useFeatures();

  const getFeatureStatus = (featureKey: string): AIFeatureStatus => {
    const enabled = hasFeature(featureKey);
    return {
      enabled,
      canUse: enabled,
    };
  };

  return {
    // Individual feature checks
    canUseQuickPost: hasFeature(AI_FEATURES.QUICK_POST),
    canUseCreativeCampaign: hasFeature(AI_FEATURES.CREATIVE_CAMPAIGN),
    canUseAudienceCreator: hasFeature(AI_FEATURES.AUDIENCE_CREATOR),
    canUseCloneTool: hasFeature(AI_FEATURES.CLONE_TOOL),
    canUseReportAnalysis: hasFeature(AI_FEATURES.REPORT_ANALYSIS),
    
    // Get status for specific feature
    getFeatureStatus,
    
    // Get all enabled AI features
    enabledFeatures: Object.values(AI_FEATURES).filter(key => hasFeature(key)),
    
    // Utility
    features,
    loading,
    error,
  };
};
