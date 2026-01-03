/**
 * subscriptionConfig.ts - Config cho hệ thống gói đăng ký
 */

export type SubscriptionTier = 'trial' | 'starter' | 'pro' | 'enterprise';

export interface TierConfig {
    name: string;
    price: number;
    duration_days: number;
    tokens: number;
    features: string[];
}

// Config 4 gói
export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
    trial: {
        name: 'Trial',
        price: 0,
        duration_days: 3,
        tokens: 125000,
        features: ['all'] // Trial có tất cả features
    },
    starter: {
        name: 'Starter',
        price: 500000,
        duration_days: 30,
        tokens: 300000,
        features: ['basic'] // Starter chỉ có features cơ bản
    },
    pro: {
        name: 'Pro',
        price: 1000000,
        duration_days: 30,
        tokens: 800000,
        features: ['all'] // Pro có tất cả features
    },
    enterprise: {
        name: 'Enterprise',
        price: 2000000,
        duration_days: 30,
        tokens: 2000000,
        features: ['all', 'api', 'multi_workspace'] // Enterprise có thêm API và multi-workspace
    }
};

// Tính năng chỉ dành cho Pro+ (khớp với DB Feature_Flags keys)
export const PRO_ONLY_FEATURES = [
    'schedule',              // Xem lịch hẹn/SĐT
    'manual_audience',       // Tạo tệp đối tượng mới
    'ai_audience_creator',   // Audience Creator - Tạo đối tượng AI
    'manual_target_templates', // Tạo mẫu nhắm mục tiêu
    'golden_rule_set',       // Bộ quy tắc vàng
    'manual_advanced_ads',   // Nhân bản chiến dịch
    'ai_clone_tool',         // Clone Tool - Nhân bản AI
    'export_data'            // Export báo cáo
];

// Tính năng chỉ dành cho Enterprise
export const ENTERPRISE_ONLY_FEATURES = [
    'api_access',
    'multi_workspace',
    'white_label',
    'sla_guarantee'
];

/**
 * Check xem user có quyền truy cập feature không
 */
export function canAccessFeature(tier: SubscriptionTier, feature: string): boolean {
    // Trial và Pro/Enterprise có tất cả features (trừ Enterprise-only)
    if (tier === 'trial' || tier === 'pro') {
        return !ENTERPRISE_ONLY_FEATURES.includes(feature);
    }

    // Enterprise có tất cả
    if (tier === 'enterprise') {
        return true;
    }

    // Starter: không có Pro-only features
    if (tier === 'starter') {
        return !PRO_ONLY_FEATURES.includes(feature) && !ENTERPRISE_ONLY_FEATURES.includes(feature);
    }

    return false;
}

/**
 * Lấy tier từ package name
 */
export function getTierFromPackageName(name: string): SubscriptionTier {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('trial')) return 'trial';
    if (lowerName.includes('starter')) return 'starter';
    if (lowerName.includes('pro')) return 'pro';
    if (lowerName.includes('enterprise')) return 'enterprise';
    return 'trial'; // Default
}
