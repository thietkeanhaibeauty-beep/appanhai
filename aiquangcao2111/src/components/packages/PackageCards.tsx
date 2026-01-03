import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentPackage } from '@/services/nocodb/paymentPackagesService';
import { RoleFeatureFlag } from '@/services/nocodb/featureFlagsService';
import { useLanguage } from '@/contexts/LanguageContext';

// Translation map for feature names (Vietnamese -> English)
const featureNameTranslations: Record<string, string> = {
    // AI & Chat
    'Trợ lý AI chat': 'AI Chat Assistant',
    'Phân tích AI nâng cao': 'Advanced AI Analytics',
    'Tạo chiến dịch AI': 'AI Campaign Creation',

    // Ads Creation
    'Tạo quảng cáo cơ bản': 'Create Basic Ads',
    'Tạo QC tin nhắn': 'Create Message Ads',
    'Tạo QC từ bài viết': 'Ads from Posts',
    'Creative Campaign - Tạo QC với media': 'Creative Campaign - Ads with Media',
    'Chạy QC tệp đối tượng': 'Run Custom Audience Ads',

    // Campaign Management
    'Nhân bản chiến dịch': 'Clone Campaigns',
    'Bật/tắt chiến dịch': 'Enable/Disable Campaign',
    'Quản lý chiến dịch': 'Campaign Management',
    'Tạo chiến dịch': 'Create Campaigns',

    // Audiences
    'Tạo đối tượng': 'Create Audiences',
    'Tạo tệp đối tượng': 'Create Custom Audiences',
    'Bảng nhắm mục tiêu': 'Targeting Table',

    // Reports & Analytics
    'Báo cáo ADS': 'Ads Report',
    'Báo cáo Sale': 'Sales Report',
    'Báo cáo Tổng': 'Summary Report',
    'Báo cáo tự động': 'Automated Reports',
    'Phân tích hiệu suất': 'Performance Analytics',
    'Phân tích báo cáo': 'Report Analytics',
    'Thống kê chi tiết': 'Detailed Statistics',
    'Xuất báo cáo': 'Export Reports',
    'Lịch sử quảng cáo': 'Ads History',

    // Settings & Management
    'Quản lý quảng cáo': 'Ad Management',
    'Quản lý nhãn': 'Label Management',
    'Quản lý tài khoản quảng cáo': 'Ad Account Management',
    'Quản lý nhiều tài khoản': 'Multi-account Management',
    'Cài đặt thông báo': 'Notification Settings',
    'Cài đặt tài khoản quảng cáo': 'Ad Account Settings',

    // Automation
    'Quy tắc tự động': 'Automation Rules',
    'Automation Rules': 'Automation Rules',
    'Bộ quy tắc vàng': 'Golden Rules',
    'Đồng bộ ads tự động': 'Auto Sync Ads',

    // Other
    'Bài viết sẵn nhanh': 'Quick Post Templates',
    'Hỗ trợ ưu tiên': 'Priority Support',
    'API truy cập': 'API Access',
    'Tích hợp Zalo': 'Zalo Integration',
    'Webhook & Notifications': 'Webhook & Notifications',
    'Xem lịch hẹn/SĐT': 'View Appointments/Phone',
};

const packageDescriptionTranslations: Record<string, string> = {
    'Dùng thử 3 ngày - Tất cả tính năng': '3-day trial - All features',
    'Gói cơ bản - 17 tính năng': 'Basic plan - 17 features',
    'Gói nâng cao - Tất cả tính năng': 'Advanced plan - All features',
    'Gói theo team': 'Team plan',
    'Gói doanh nghiệp - API & tích hợp': 'Enterprise plan - API & integrations',
    'Dùng thử 3 ngày': '3-day trial',
    'Gói cơ bản': 'Basic plan',
    'Gói nâng cao': 'Advanced plan',
    'Gói doanh nghiệp': 'Enterprise plan',
};

// Helper function to strip emojis from text
const stripEmojis = (text: string): string => {
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
};

interface PackageCardsProps {
    packages: PaymentPackage[];
    roleFeatures: RoleFeatureFlag[];
    featureNames: Record<string, string>;
    billingPeriod: 'monthly' | 'yearly';
    currentPackageId?: string | null;
    onSelectPackage: (pkg: PaymentPackage) => void;
    onShowFullComparison: () => void;
}

export default function PackageCards({
    packages,
    roleFeatures,
    featureNames,
    billingPeriod,
    currentPackageId,
    onSelectPackage,
    onShowFullComparison
}: PackageCardsProps) {
    const { t, language } = useLanguage();

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

    const isCurrentPackage = (pkg: PaymentPackage) => {
        return currentPackageId === pkg.id || currentPackageId === pkg.name;
    };

    // Get clean feature name (no emojis) and translate if English
    const getCleanFeatureName = (featureId: string): string => {
        const rawName = featureNames[featureId] || featureId;
        const cleanName = stripEmojis(rawName);

        if (language === 'en' && featureNameTranslations[cleanName]) {
            return featureNameTranslations[cleanName];
        }

        return cleanName;
    };

    // Get clean description (no emojis) and translate if English
    const getCleanDescription = (description: string | undefined): string => {
        if (!description) return '';
        const cleanDesc = stripEmojis(description);

        if (language === 'en') {
            if (packageDescriptionTranslations[cleanDesc]) {
                return packageDescriptionTranslations[cleanDesc];
            }
            for (const [vi, en] of Object.entries(packageDescriptionTranslations)) {
                if (cleanDesc.includes(vi) || vi.includes(cleanDesc.split(' - ')[0])) {
                    return en;
                }
            }
        }

        return cleanDesc;
    };

    const getEnabledFeaturesForPackage = (pkg: PaymentPackage): string[] => {
        const tierName = pkg.name;
        return roleFeatures
            .filter(rf => Boolean(rf[tierName as keyof RoleFeatureFlag]))
            .map(rf => rf.feature_key);
    };

    return (
        <>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
                {packages.map((pkg, index) => {
                    const isCurrent = isCurrentPackage(pkg);
                    const enabledFeatures = getEnabledFeaturesForPackage(pkg);

                    return (
                        <Card
                            key={pkg.id}
                            className={cn(
                                "relative overflow-hidden transition-shadow hover:shadow-lg",
                                index === 1 && "border-primary shadow-md",
                                isCurrent && "border-green-500 border-2 bg-green-50/30"
                            )}
                        >
                            {isCurrent && (
                                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CheckCircle className="w-2 h-2" />
                                    {t('Gói hiện tại', 'Current Plan')}
                                </div>
                            )}

                            {index === 1 && !isCurrent && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                                    {t('Phổ biến', 'Popular')}
                                </div>
                            )}

                            <CardHeader className="text-center pb-3 pt-6">
                                <CardTitle className="text-lg mb-1">{pkg.name}</CardTitle>
                                {pkg.description && (
                                    <CardDescription className="text-xs line-clamp-1">
                                        {getCleanDescription(pkg.description)}
                                    </CardDescription>
                                )}

                                <div className="mt-3">
                                    {billingPeriod === 'yearly' && (
                                        <div className="text-xs text-muted-foreground line-through">
                                            {new Intl.NumberFormat('vi-VN').format(pkg.price * 12)}đ
                                        </div>
                                    )}

                                    <span className="text-xl font-bold">
                                        {new Intl.NumberFormat('vi-VN').format(calculatePrice(pkg.price, billingPeriod))}
                                    </span>
                                    <span className="text-xs text-muted-foreground ml-1">
                                        đ/{billingPeriod === 'monthly' ? t('tháng', 'mo') : t('năm', 'yr')}
                                    </span>

                                    {billingPeriod === 'yearly' && (
                                        <p className="text-[10px] text-green-600 font-semibold mt-1">
                                            {t('Tiết kiệm', 'Save')} {new Intl.NumberFormat('vi-VN').format(calculateSavings(pkg.price))}đ
                                        </p>
                                    )}
                                </div>

                                <div className="mt-2 space-y-1">
                                    <p className="text-[10px] text-muted-foreground">
                                        {billingPeriod === 'yearly' ? '365' : pkg.duration_days || 30} {t('ngày', 'days')}
                                    </p>
                                    {(pkg.tokens || 0) > 0 && (
                                        <p className="text-[11px] font-semibold text-[#e91e63] bg-[#e91e63]/10 px-2 py-0.5 rounded-full inline-block">
                                            {new Intl.NumberFormat('vi-VN').format(pkg.tokens || 0)} Tokens
                                        </p>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-2 pt-0">
                                <Button
                                    className={cn(
                                        "w-full transition-all duration-300",
                                        isCurrent
                                            ? "bg-gray-900 hover:bg-black text-white cursor-default"
                                            : "bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white border-0 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                    )}
                                    variant={isCurrent ? "default" : "default"}
                                    size="sm"
                                    onClick={() => !isCurrent && onSelectPackage(pkg)}
                                    disabled={isCurrent}
                                >
                                    {isCurrent ? (
                                        <>
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            {t('Gói hiện tại', 'Current Plan')}
                                        </>
                                    ) : (
                                        <>
                                            <Crown className="mr-1 h-3 w-3" />
                                            {t('Chọn gói', 'Select Plan')}
                                        </>
                                    )}
                                </Button>

                                <div className="space-y-1 pt-2">
                                    <p className="font-semibold text-xs">{t('Tính năng', 'Features')} ({enabledFeatures.length}):</p>
                                    {enabledFeatures.length > 0 ? (
                                        <ul className="space-y-0.5">
                                            {enabledFeatures.slice(0, 3).map((featureKey, idx) => (
                                                <li key={idx} className="flex items-start gap-1 text-[11px]">
                                                    <Check className="h-3 w-3 text-primary shrink-0" />
                                                    <span className="line-clamp-1">{getCleanFeatureName(featureKey)}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-[11px] text-muted-foreground">{t('Chưa có tính năng nào', 'No features listed')}</p>
                                    )}

                                    {enabledFeatures.length > 3 && (
                                        <p className="text-[10px] text-muted-foreground">
                                            +{enabledFeatures.length - 3} {t('khác', 'more')}
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="text-center">
                <Button
                    variant="outline"
                    onClick={onShowFullComparison}
                    className="gap-2"
                >
                    {t('Xem so sánh đầy đủ', 'View Full Comparison')}
                </Button>
            </div>
        </>
    );
}
