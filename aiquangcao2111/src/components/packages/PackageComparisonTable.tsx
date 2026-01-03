import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
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

// Helper function to strip emojis from text
const stripEmojis = (text: string): string => {
    return text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, '').trim();
};

interface PackageComparisonTableProps {
    packages: PaymentPackage[];
    roleFeatures: RoleFeatureFlag[];
    featureNames: Record<string, string>;
    billingPeriod: 'monthly' | 'yearly';
    currentPackageId?: string | null;
    onSelectPackage: (pkg: PaymentPackage) => void;
}

export default function PackageComparisonTable({
    packages,
    roleFeatures,
    featureNames,
    billingPeriod,
    currentPackageId,
    onSelectPackage
}: PackageComparisonTableProps) {
    const { t, language } = useLanguage();

    const calculatePrice = (monthlyPrice: number, period: 'monthly' | 'yearly') => {
        if (period === 'yearly') {
            return Math.round(monthlyPrice * 12 * 0.78);
        }
        return monthlyPrice;
    };

    const isCurrentPackage = (pkg: PaymentPackage) => {
        return currentPackageId === pkg.id || currentPackageId === pkg.name;
    };

    const allFeatureKeys = roleFeatures.map(rf => rf.feature_key);

    // Get clean feature name (no emojis) and translate if English
    const getCleanFeatureName = (featureId: string): string => {
        const rawName = featureNames[featureId] || featureId;
        const cleanName = stripEmojis(rawName);

        if (language === 'en' && featureNameTranslations[cleanName]) {
            return featureNameTranslations[cleanName];
        }

        return cleanName;
    };

    const isFeatureEnabledForTier = (featureKey: string, tierName: string): boolean => {
        const roleFeature = roleFeatures.find(rf => rf.feature_key === featureKey);
        if (!roleFeature) return false;
        return Boolean(roleFeature[tierName as keyof RoleFeatureFlag]);
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr>
                        <th className="text-left p-4 border-b font-semibold min-w-[150px] bg-gray-50/50">{t('Tính năng', 'Features')}</th>
                        {packages.map((pkg) => (
                            <th key={pkg.id} className={cn("p-4 border-b text-center min-w-[140px]", isCurrentPackage(pkg) && "bg-gray-50")}>
                                <div className="font-bold text-base md:text-lg mb-1">
                                    {pkg.name}
                                </div>
                                {isCurrentPackage(pkg) && (
                                    <Badge className="bg-gray-900 hover:bg-black text-white text-[10px] px-2 py-0.5 mb-2 mx-auto w-fit block">{t('Hiện tại', 'Current')}</Badge>
                                )}
                                <div className="text-sm md:text-xl font-bold text-gray-900 my-1">
                                    {new Intl.NumberFormat('vi-VN').format(calculatePrice(pkg.price, billingPeriod) / 1000)}k
                                </div>
                                {(pkg.tokens || 0) > 0 && (
                                    <div className="text-[10px] md:text-xs text-[#e91e63] font-medium bg-[#e91e63]/10 rounded-full px-2 py-0.5 inline-block mb-2">
                                        {new Intl.NumberFormat('vi-VN').format((pkg.tokens || 0) / 1000)}k Tokens
                                    </div>
                                )}
                                <Button
                                    size="sm"
                                    className={cn(
                                        "w-full mt-2 h-8 text-xs font-semibold shadow-sm transition-all",
                                        isCurrentPackage(pkg)
                                            ? "bg-gray-900 hover:bg-black text-white cursor-default"
                                            : "bg-gradient-to-r from-[#e91e63] to-[#ff7043] hover:opacity-90 text-white border-0"
                                    )}
                                    disabled={isCurrentPackage(pkg)}
                                    onClick={() => {
                                        if (!isCurrentPackage(pkg)) {
                                            onSelectPackage(pkg);
                                        }
                                    }}
                                >
                                    {isCurrentPackage(pkg) ? t('Đang sử dụng', 'Active') : t('Chọn gói', 'Select Plan')}
                                </Button>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {allFeatureKeys.length > 0 ? (
                        allFeatureKeys.map((featureKey, idx) => (
                            <tr key={idx} className="border-b hover:bg-muted/50 transition-colors">
                                <td className="p-4 text-sm font-medium text-gray-700 bg-gray-50/30">
                                    {getCleanFeatureName(featureKey)}
                                </td>
                                {packages.map((pkg) => {
                                    const included = isFeatureEnabledForTier(featureKey, pkg.name);
                                    return (
                                        <td key={pkg.id} className={cn("p-4 text-center", isCurrentPackage(pkg) && "bg-gray-50/50")}>
                                            {included ? (
                                                <div className="w-6 h-6 rounded-full bg-[#e91e63]/10 flex items-center justify-center mx-auto">
                                                    <Check className="h-4 w-4 text-[#e91e63]" />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mx-auto">
                                                    <X className="h-3.5 w-3.5 text-gray-900 stroke-[3]" />
                                                </div>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={packages.length + 1} className="p-8 text-center text-muted-foreground">
                                {t('Không có thông tin chi tiết về tính năng', 'No detailed feature information available')}
                            </td>
                        </tr>
                    )}

                    <tr className="border-b bg-gray-50/50">
                        <td className="p-4 font-semibold text-sm">{t('Thời hạn sử dụng', 'Duration')}</td>
                        {packages.map((pkg) => (
                            <td key={pkg.id} className="p-4 text-center text-sm font-medium">
                                {pkg.duration_days} {t('ngày', 'days')}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
