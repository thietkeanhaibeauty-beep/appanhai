import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getPaymentPackages, type PaymentPackage } from '@/services/nocodb/paymentPackagesService';
import { getFeatureFlags, getAllRoleFeatureFlags, type RoleFeatureFlag } from '@/services/nocodb/featureFlagsService';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { getTokenPackages, TokenPackage } from '@/services/nocodb/tokenPackagesService';
import PackageCards from '@/components/packages/PackageCards';
import PackageComparisonTable from '@/components/packages/PackageComparisonTable';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Packages() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { subscription, tier, hasActiveSubscription, daysRemaining } = useSubscription();
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [featureNames, setFeatureNames] = useState<Record<string, string>>({});
  const [roleFeatures, setRoleFeatures] = useState<RoleFeatureFlag[]>([]);
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, TokenPackage | null>>({});

  // Kiểm tra xem gói có phải gói hiện tại không
  const isCurrentPackage = (pkg: PaymentPackage): boolean => {
    if (!subscription || !hasActiveSubscription) return false;
    const pkgName = pkg.name.toLowerCase();
    const subPkgId = subscription.package_id?.toLowerCase() || '';
    return pkgName === subPkgId || tier === pkgName;
  };

  // Lấy tên feature từ FEATURE_FLAGS
  const getFeatureName = (featureId: string): string => {
    return featureNames[featureId] || featureId;
  };

  // Kiểm tra feature có bật cho tier không (từ ROLE_FEATURE_FLAGS)
  const isFeatureEnabledForTier = (featureKey: string, tierName: string): boolean => {
    const roleFeature = roleFeatures.find(rf => rf.feature_key === featureKey);
    if (!roleFeature) return false;
    return Boolean(roleFeature[tierName as keyof RoleFeatureFlag]);
  };

  // Lấy danh sách features bật cho một package
  const getEnabledFeaturesForPackage = (pkg: PaymentPackage): string[] => {
    const tierName = pkg.name; // Package name = Tier name (Trial, Starter, Pro, Enterprise, Team)
    return roleFeatures
      .filter(rf => Boolean(rf[tierName as keyof RoleFeatureFlag]))
      .map(rf => rf.feature_key);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [packagesData, flagsData, roleFeaturesData, tokenPkgs] = await Promise.all([
        getPaymentPackages(false),
        getFeatureFlags(),
        getAllRoleFeatureFlags(),
        getTokenPackages()
      ]);

      // Sort packages by tier order
      const order = ['Trial', 'Starter', 'Pro', 'Team', 'Enterprise'];
      packagesData.sort((a, b) => {
        const aIndex = order.indexOf(a.name);
        const bIndex = order.indexOf(b.name);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

      setPackages(packagesData);
      setRoleFeatures(roleFeaturesData);

      // Convert feature flags array to name map (key -> name)
      const namesMap: Record<string, string> = {};
      flagsData.forEach(flag => {
        namesMap[flag.key] = flag.name;
      });
      setFeatureNames(namesMap);
      setTokenPackages(tokenPkgs);

      // Initialize tier selection for each package
      if (tokenPkgs.length > 0 && packagesData.length > 0) {
        const initialTiers: Record<string, TokenPackage | null> = {};
        packagesData.forEach(pkg => {
          initialTiers[pkg.id] = tokenPkgs[0];
        });
        setSelectedTiers(initialTiers);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
      sonnerToast.error(t('Không thể tải danh sách gói', 'Cannot load packages'));
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = (monthlyPrice: number, period: 'monthly' | 'yearly') => {
    if (period === 'yearly') {
      return Math.round(monthlyPrice * 12 * 0.78);
    }
    return monthlyPrice;
  };

  const calculateSavings = (monthlyPrice: number) => {
    const fullYearPrice = monthlyPrice * 12;
    const discountedYearPrice = Math.round(monthlyPrice * 12 * 0.78);
    return fullYearPrice - discountedYearPrice;
  };

  const handleSelectPackage = (pkg: PaymentPackage) => {
    const price = calculatePrice(pkg.price, billingPeriod);
    navigate(`/dashboard/payment?package=${pkg.id}&period=${billingPeriod}&price=${price}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get all unique feature keys from ROLE_FEATURE_FLAGS
  const allFeatureKeys = roleFeatures.map(rf => rf.feature_key);

  return (
    <div className="container mx-auto p-3 max-w-6xl">
      <div className="text-center mb-3">
        <h1 className="text-lg font-bold mb-1">{t('Chọn gói phù hợp với bạn', 'Choose the right plan for you')}</h1>

        <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as any)} className="inline-flex">
          <TabsList>
            <TabsTrigger value="monthly">{t('Thanh toán hàng tháng', 'Monthly Billing')}</TabsTrigger>
            <TabsTrigger value="yearly">
              {t('Thanh toán hàng năm', 'Yearly Billing')}
              <span className="ml-2 text-xs text-primary">{t('(tiết kiệm đến 22%)', '(save up to 22%)')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {packages.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">{t('Chưa có gói nào khả dụng', 'No packages available')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="mb-6">
            <PackageCards
              packages={packages}
              roleFeatures={roleFeatures}
              featureNames={featureNames}
              billingPeriod={billingPeriod}
              currentPackageId={subscription?.package_id || tier}
              onSelectPackage={handleSelectPackage}
              onShowFullComparison={() => setShowFullComparison(true)}
            />
          </div>

          <Dialog open={showFullComparison} onOpenChange={setShowFullComparison}>
            <DialogContent className="max-w-[95vw] md:max-w-6xl max-h-[85vh] p-3 md:p-6">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-base md:text-xl text-center">{t('So sánh chi tiết các gói', 'Detailed Package Comparison')}</DialogTitle>
              </DialogHeader>

              <ScrollArea className="h-[65vh] md:h-[70vh]">
                <PackageComparisonTable
                  packages={packages}
                  roleFeatures={roleFeatures}
                  featureNames={featureNames}
                  billingPeriod={billingPeriod}
                  currentPackageId={subscription?.package_id || tier}
                  onSelectPackage={(pkg) => {
                    handleSelectPackage(pkg);
                    setShowFullComparison(false);
                  }}
                />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
