import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, X, Loader2, Sparkles, AlertTriangle, CheckCircle2, TrendingUp, Calendar, Crown, Coins, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { getPaymentPackages, PaymentPackage } from '@/services/nocodb/paymentPackagesService';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { getTokenPackages, TokenPackage } from '@/services/nocodb/tokenPackagesService';
import { getFeatureFlags, getAllRoleFeatureFlags, type RoleFeatureFlag } from '@/services/nocodb/featureFlagsService';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureLimits } from '@/hooks/useFeatureLimits';
import { getUsageSummary } from '@/services/usageTrackingService';
import { toast as sonnerToast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Subscription() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, tier, daysRemaining, loading: subscriptionLoading, hasActiveSubscription, isTrial, isExpiringSoon } = useSubscription();
  const { balance: userBalance, loading: balanceLoading } = useTokenBalance();
  const { features, getUsagePercentage, isApproachingLimit } = useFeatureLimits();
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [usageSummary, setUsageSummary] = useState<Record<string, number>>({});
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [selectedTokenPackage, setSelectedTokenPackage] = useState<TokenPackage | null>(null);
  const [showTopupDialog, setShowTopupDialog] = useState(false);
  const [roleFeatures, setRoleFeatures] = useState<RoleFeatureFlag[]>([]);
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesData, summary, tokenPkgs, roleFeaturesData, flagsData] = await Promise.all([
        getPaymentPackages(false),
        getUsageSummary(30),
        getTokenPackages(),
        getAllRoleFeatureFlags(),
        getFeatureFlags()
      ]);
      setPackages(packagesData);
      setUsageSummary(summary);
      setTokenPackages(tokenPkgs);
      setRoleFeatures(roleFeaturesData);

      // Build feature names map
      const namesMap: Record<string, string> = {};
      flagsData.forEach(flag => {
        namesMap[flag.key] = flag.name;
      });
      setFeatureNames(namesMap);

      if (tokenPkgs.length > 0) setSelectedTokenPackage(tokenPkgs[0]);
    } catch (error) {
      console.error('Error loading data:', error);
      sonnerToast.error(t('Không thể tải dữ liệu', 'Cannot load data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (packageId: string) => {
    navigate(`/dashboard/payment?package=${packageId}`);
  };

  // Get feature name from FEATURE_FLAGS
  const getFeatureName = (featureKey: string): string => {
    return featureNames[featureKey] || featureKey;
  };

  // Check if feature is enabled for a tier (from ROLE_FEATURE_FLAGS)
  const isFeatureEnabledForTier = (featureKey: string, tierName: string): boolean => {
    const roleFeature = roleFeatures.find(rf => rf.feature_key === featureKey);
    if (!roleFeature) return false;
    return Boolean(roleFeature[tierName as keyof RoleFeatureFlag]);
  };

  const getUsageData = () => [
    {
      label: t('Chiến dịch', 'Campaigns'),
      count: usageSummary['campaign_created'] || 0,
      limit: features?.max_campaigns || 0,
      percentage: getUsagePercentage('campaigns'),
      approaching: isApproachingLimit('campaigns'),
    },
    {
      label: t('Tài khoản QC', 'Ad Accounts'),
      count: usageSummary['ad_account_connected'] || 0,
      limit: features?.max_ad_accounts || 0,
      percentage: getUsagePercentage('adAccounts'),
      approaching: isApproachingLimit('adAccounts'),
    },
    {
      label: t('Điểm AI', 'AI Credits'),
      count: (usageSummary['ai_chat_message'] || 0) +
        (usageSummary['ai_campaign_generated'] || 0) +
        (usageSummary['ai_creative_generated'] || 0),
      limit: features?.ai_credits || 0,
      percentage: getUsagePercentage('aiCreditsUsed'),
      approaching: isApproachingLimit('aiCreditsUsed'),
    },
  ];

  if (loading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredPackages = packages.filter(pkg => {
    const isMonthly = pkg.duration_days === 30;
    return billingCycle === 'monthly' ? isMonthly : !isMonthly;
  });

  // Get all unique feature keys from ROLE_FEATURE_FLAGS
  const allFeatureKeys = roleFeatures.map(rf => rf.feature_key);

  const usageData = getUsageData();

  return (
    <div className="w-full max-w-6xl mx-auto p-3 md:p-4 space-y-4">
      {/* Current Subscription Info */}
      {hasActiveSubscription && subscription && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">{t('Gói hiện tại của bạn', 'Your Current Plan')}</h1>
                <p className="text-muted-foreground text-sm">
                  {t('Theo dõi sử dụng và giới hạn gói', 'Track your usage and plan limits')}
                </p>
              </div>
              <Badge className="text-sm px-3 py-1" variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status === 'trial' ? t('Dùng thử', 'Trial') : subscription.status === 'active' ? t('Đang hoạt động', 'Active') : t('Hết hạn', 'Expired')}
              </Badge>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">{t('Tên gói', 'Plan Name')}</CardTitle>
                <Sparkles className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-lg font-bold">{subscription.package_id}</div>
                <p className="text-[10px] text-muted-foreground">{t('Gói đăng ký của bạn', 'Your subscription package')}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">{t('Ngày hết hạn', 'Expiry Date')}</CardTitle>
                <Calendar className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-lg font-bold">
                  {subscription.end_date ? new Date(subscription.end_date).toLocaleDateString('vi-VN') : 'N/A'}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {daysRemaining > 0 ? `${t('Còn', 'Remaining')} ${daysRemaining} ${t('ngày', 'days')}` : t('Đã hết hạn', 'Expired')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium">{t('Token còn lại', 'Remaining Tokens')}</CardTitle>
                <Coins className="h-3 w-3 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-lg font-bold">
                  {new Intl.NumberFormat('vi-VN').format(userBalance || 0)}
                </div>
                <p className="text-[10px] text-muted-foreground">{t('Số dư hiện tại', 'Current Balance')}</p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Stats */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">{t('Sử dụng trong 30 ngày qua', 'Usage in last 30 days')}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid gap-4 md:grid-cols-3">
                {usageData.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>{item.label}</span>
                      <span className={item.approaching ? 'text-yellow-600' : ''}>
                        {item.count} / {item.limit === 0 ? '∞' : item.limit}
                      </span>
                    </div>
                    <Progress
                      value={item.limit === 0 ? 0 : Math.min(item.percentage, 100)}
                      className={`h-1.5 ${item.approaching ? '[&>div]:bg-yellow-500' : ''}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expiring Warning */}
          {isExpiringSoon && (
            <Card className="border-yellow-500 bg-yellow-50">
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">{t('Gói sắp hết hạn!', 'Package expiring soon!')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('Gói của bạn sẽ hết hạn trong', 'Your package will expire in')} {daysRemaining} {t('ngày. Gia hạn ngay để không bị gián đoạn.', 'days. Renew now to avoid interruption.')}
                  </p>
                </div>
                <Button size="sm" className="ml-auto" onClick={() => navigate('/dashboard/packages')}>
                  {t('Gia hạn ngay', 'Renew Now')}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upgrade Section */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h2 className="text-lg font-bold">{t('Nâng cấp gói', 'Upgrade Plan')}</h2>
              <p className="text-sm text-muted-foreground">{t('Mở khóa thêm tính năng và giới hạn', 'Unlock more features and limits')}</p>
            </div>
            <Button onClick={() => navigate('/dashboard/packages')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('Xem tất cả gói', 'View all packages')}
            </Button>
          </div>
        </>
      )}

      {/* No Subscription */}
      {!hasActiveSubscription && (
        <div className="text-center py-8">
          <Crown className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">{t('Bạn chưa có gói nào', 'No Active Subscription')}</h2>
          <p className="text-muted-foreground mb-4">{t('Chọn một gói để bắt đầu sử dụng đầy đủ tính năng', 'Select a plan to start using all features')}</p>
          <Button size="lg" onClick={() => navigate('/dashboard/packages')}>
            <Crown className="mr-2 h-5 w-5" />
            {t('Xem các gói', 'View Packages')}
          </Button>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center pt-4">
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as any)}>
          <TabsList>
            <TabsTrigger value="monthly">{t('Hàng tháng', 'Monthly')}</TabsTrigger>
            <TabsTrigger value="yearly">
              {t('Hàng năm', 'Yearly')} <Badge variant="secondary" className="ml-1">-22%</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Comparison section removed - outdated */}

    </div>
  );
}
