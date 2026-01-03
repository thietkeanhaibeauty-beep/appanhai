import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIFeatures, AI_FEATURE_NAMES } from '@/hooks/useAIFeatures';
import { CheckCircle2, XCircle } from 'lucide-react';

export const AIFeaturesInfo = () => {
  const { 
    canUseQuickPost, 
    canUseCreativeCampaign, 
    canUseAudienceCreator, 
    canUseCloneTool,
    canUseReportAnalysis,
    loading 
  } = useAIFeatures();

  if (loading) {
    return null;
  }

  const features = [
    { name: AI_FEATURE_NAMES.ai_quick_post, enabled: canUseQuickPost },
    { name: AI_FEATURE_NAMES.ai_creative_campaign, enabled: canUseCreativeCampaign },
    { name: AI_FEATURE_NAMES.ai_audience_creator, enabled: canUseAudienceCreator },
    { name: AI_FEATURE_NAMES.ai_clone_tool, enabled: canUseCloneTool },
    { name: AI_FEATURE_NAMES.ai_report_analysis, enabled: canUseReportAnalysis },
  ];

  const enabledCount = features.filter(f => f.enabled).length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">✨ Tính năng AI có sẵn</CardTitle>
        <CardDescription className="text-xs">
          {enabledCount}/{features.length} tính năng đang hoạt động
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-2 text-sm">
            {feature.enabled ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className={feature.enabled ? 'text-foreground' : 'text-muted-foreground'}>
              {feature.name}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
