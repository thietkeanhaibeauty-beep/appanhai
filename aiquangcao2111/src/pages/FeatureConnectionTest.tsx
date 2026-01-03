import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useManualTools, MANUAL_TOOLS, MANUAL_TOOL_NAMES } from '@/hooks/useManualTools';
import { useAIFeatures, AI_FEATURES, AI_FEATURE_NAMES } from '@/hooks/useAIFeatures';
import { useReportFeatures, REPORT_FEATURES, REPORT_FEATURE_NAMES } from '@/hooks/useReportFeatures';

export default function FeatureConnectionTest() {
  const manualTools = useManualTools();
  const aiFeatures = useAIFeatures();
  const reportFeatures = useReportFeatures();

  const renderFeatureStatus = (
    key: string,
    name: string,
    enabled: boolean,
    category: string
  ) => {
    const categoryColors = {
      manual: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30',
      ai: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
      report: 'bg-green-100 text-green-800 dark:bg-green-900/30',
    };

    return (
      <div
        key={key}
        className="flex items-center justify-between p-4 border rounded-lg"
      >
        <div className="flex items-center gap-3">
          {enabled ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-xs text-muted-foreground font-mono">{key}</div>
          </div>
        </div>
        <Badge className={categoryColors[category as keyof typeof categoryColors]}>
          {enabled ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Feature Connection Test</h1>
        <p className="text-muted-foreground mt-2">
          Kiểm tra kết nối giữa Frontend hooks và Backend feature flags
        </p>
      </div>

      <div className="grid gap-6">
        {/* Manual Tools */}
        <Card>
          <CardHeader>
            <CardTitle>🛠️ Manual Tools (5 features)</CardTitle>
            <CardDescription>
              Enabled: {manualTools.enabledTools.length}/5
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {renderFeatureStatus(
              MANUAL_TOOLS.CREATE_ADS,
              MANUAL_TOOL_NAMES[MANUAL_TOOLS.CREATE_ADS],
              manualTools.canUseCreateAds,
              'manual'
            )}
            {renderFeatureStatus(
              MANUAL_TOOLS.CREATE_MESSAGE,
              MANUAL_TOOL_NAMES[MANUAL_TOOLS.CREATE_MESSAGE],
              manualTools.canUseCreateMessage,
              'manual'
            )}
            {renderFeatureStatus(
              MANUAL_TOOLS.AUDIENCE,
              MANUAL_TOOL_NAMES[MANUAL_TOOLS.AUDIENCE],
              manualTools.canUseAudience,
              'manual'
            )}
            {renderFeatureStatus(
              MANUAL_TOOLS.ADVANCED_ADS,
              MANUAL_TOOL_NAMES[MANUAL_TOOLS.ADVANCED_ADS],
              manualTools.canUseAdvancedAds,
              'manual'
            )}
            {renderFeatureStatus(
              MANUAL_TOOLS.QUICK_AD,
              MANUAL_TOOL_NAMES[MANUAL_TOOLS.QUICK_AD],
              manualTools.canUseQuickAd,
              'manual'
            )}
          </CardContent>
        </Card>

        {/* AI Features */}
        <Card>
          <CardHeader>
            <CardTitle>🤖 AI Features (5 features)</CardTitle>
            <CardDescription>
              Enabled: {aiFeatures.enabledFeatures.length}/5
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {renderFeatureStatus(
              AI_FEATURES.QUICK_POST,
              AI_FEATURE_NAMES[AI_FEATURES.QUICK_POST],
              aiFeatures.canUseQuickPost,
              'ai'
            )}
            {renderFeatureStatus(
              AI_FEATURES.CREATIVE_CAMPAIGN,
              AI_FEATURE_NAMES[AI_FEATURES.CREATIVE_CAMPAIGN],
              aiFeatures.canUseCreativeCampaign,
              'ai'
            )}
            {renderFeatureStatus(
              AI_FEATURES.AUDIENCE_CREATOR,
              AI_FEATURE_NAMES[AI_FEATURES.AUDIENCE_CREATOR],
              aiFeatures.canUseAudienceCreator,
              'ai'
            )}
            {renderFeatureStatus(
              AI_FEATURES.CLONE_TOOL,
              AI_FEATURE_NAMES[AI_FEATURES.CLONE_TOOL],
              aiFeatures.canUseCloneTool,
              'ai'
            )}
            {renderFeatureStatus(
              AI_FEATURES.REPORT_ANALYSIS,
              AI_FEATURE_NAMES[AI_FEATURES.REPORT_ANALYSIS],
              aiFeatures.canUseReportAnalysis,
              'ai'
            )}
          </CardContent>
        </Card>

        {/* Report Features */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Report Features (3 features)</CardTitle>
            <CardDescription>
              Enabled: {reportFeatures.enabledFeatures.length}/3
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {renderFeatureStatus(
              REPORT_FEATURES.ADS_REPORT,
              REPORT_FEATURE_NAMES[REPORT_FEATURES.ADS_REPORT],
              reportFeatures.canUseAdsReport,
              'report'
            )}
            {renderFeatureStatus(
              REPORT_FEATURES.SALE_REPORT,
              REPORT_FEATURE_NAMES[REPORT_FEATURES.SALE_REPORT],
              reportFeatures.canUseSaleReport,
              'report'
            )}
            {renderFeatureStatus(
              REPORT_FEATURES.SUMMARY_REPORT,
              REPORT_FEATURE_NAMES[REPORT_FEATURES.SUMMARY_REPORT],
              reportFeatures.canUseSummaryReport,
              'report'
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>📈 Tổng kết</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-gray-600">
                  {manualTools.enabledTools.length}
                </div>
                <div className="text-sm text-muted-foreground">Manual Tools</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {aiFeatures.enabledFeatures.length}
                </div>
                <div className="text-sm text-muted-foreground">AI Features</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {reportFeatures.enabledFeatures.length}
                </div>
                <div className="text-sm text-muted-foreground">Reports</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t text-center">
              <div className="text-4xl font-bold">
                {manualTools.enabledTools.length +
                  aiFeatures.enabledFeatures.length +
                  reportFeatures.enabledFeatures.length}
                /13
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Total Features Enabled
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
