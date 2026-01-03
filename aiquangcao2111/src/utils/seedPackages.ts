/**
 * seedPackages.ts - Script seed 4 gói đăng ký vào NocoDB
 * 
 * Chạy từ SuperAdmin page hoặc browser console
 */

import { createPaymentPackage, getPaymentPackages } from '@/services/nocodb/paymentPackagesService';
import { TIER_CONFIG, SubscriptionTier } from '@/config/subscriptionConfig';

// 4 gói cần seed - Feature IDs phải khớp với AVAILABLE_FEATURES
const PACKAGES_TO_SEED = [
    {
        name: 'Trial',
        description: 'Dùng thử 3 ngày - Tất cả tính năng',
        price: 0,
        currency: 'VND',
        duration_days: 3,
        tokens: 125000, // 125k tokens
        features: ['all'], // Trial có tất cả
        is_active: true,
    },
    {
        name: 'Starter',
        description: 'Gói cơ bản - 17 tính năng',
        price: 500000,
        currency: 'VND',
        duration_days: 30,
        tokens: 300000, // 300k tokens
        features: [
            // Basic features - khớp với DB Feature_Flags
            'ai_chat',
            'ai_quick_post',
            'ai_creative_campaign',
            'ai_report_analysis',
            'manual_create_ads',
            'manual_create_message',
            'manual_quick_ad',
            'custom_audience_ads',
            'report_ads',
            'report_sale',
            'report_summary',
            'automated_rules',
            'campaign_control',
            'ads_management',
            'labels_management',
            'notification_settings',
            'ad_account_settings',
            'ads_history'
        ],
        is_active: true,
    },
    {
        name: 'Pro',
        description: 'Gói nâng cao - Tất cả tính năng',
        price: 1000000,
        currency: 'VND',
        duration_days: 30,
        tokens: 800000, // 800k tokens
        features: [
            'all',
            // Pro-only features - khớp với DB Feature_Flags
            'manual_audience',
            'ai_audience_creator',
            'manual_target_templates',
            'manual_advanced_ads',
            'ai_clone_tool',
            'golden_rule_set',
            'schedule',
            'export_data',
            'priority_support'
        ],
        is_active: true,
    },
    {
        name: 'Enterprise',
        description: 'Gói doanh nghiệp - API & Multi-workspace',
        price: 2000000,
        currency: 'VND',
        duration_days: 30,
        tokens: 2000000, // 2M tokens
        features: [
            'all',
            'api_access',
            'multi_workspace',
            'white_label',
            'sla_guarantee',
            'priority_support'
        ],
        is_active: true,
    },
];

/**
 * Seed packages vào database
 * @returns Số gói đã tạo
 */
export async function seedPaymentPackages(): Promise<{ created: number; skipped: number; errors: string[] }> {
    const result = { created: 0, skipped: 0, errors: [] as string[] };

    try {
        // Lấy packages hiện có
        const existingPackages = await getPaymentPackages(true);
        const existingNames = existingPackages.map(p => p.name.toLowerCase());

        console.log('📦 Existing packages:', existingNames);

        for (const pkg of PACKAGES_TO_SEED) {
            // Skip nếu đã tồn tại
            if (existingNames.includes(pkg.name.toLowerCase())) {
                console.log(`⏭️ Skipping "${pkg.name}" - already exists`);
                result.skipped++;
                continue;
            }

            try {
                console.log(`➕ Creating package: ${pkg.name}`);
                await createPaymentPackage(pkg);
                console.log(`✅ Created: ${pkg.name}`);
                result.created++;
            } catch (err) {
                const errorMsg = `Failed to create ${pkg.name}: ${err instanceof Error ? err.message : String(err)}`;
                console.error('❌', errorMsg);
                result.errors.push(errorMsg);
            }
        }

        console.log('\n📊 Seed Summary:', result);
        return result;
    } catch (err) {
        console.error('❌ Seed failed:', err);
        result.errors.push(`Seed failed: ${err instanceof Error ? err.message : String(err)}`);
        return result;
    }
}

// Export cho browser console
if (typeof window !== 'undefined') {
    (window as any).seedPaymentPackages = seedPaymentPackages;
}
