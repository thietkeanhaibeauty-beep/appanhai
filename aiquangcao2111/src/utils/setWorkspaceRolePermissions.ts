/**
 * Auto-Tick Workspace Role Permissions Script
 * Chạy script này để tự động tick quyền cho từng feature theo role
 * 
 * Cách chạy: Import và gọi hàm setWorkspaceRolePermissions() từ console
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';

const TABLE_ID = NOCODB_CONFIG.TABLES.ROLE_FEATURE_FLAGS;

/**
 * Định nghĩa quyền cho từng feature
 * true = role được phép truy cập feature này
 */
const FEATURE_PERMISSIONS: Record<string, {
    ws_owner: boolean;
    ws_admin: boolean;
    ws_marketing: boolean;
    ws_sales: boolean;
}> = {
    // AI Features - Tất cả đều có quyền
    'ai_chat': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: true },
    'ai_quick_post': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'ai_creative_campaign': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'ai_audience_creator': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'ai_clone_tool': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'ai_report_analysis': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: true },

    // Manual Ads Features - Marketing có quyền, Sales không
    'manual_create_ads': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'manual_advanced_ads': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'manual_create_message': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'manual_audience': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'manual_quick_ad': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'manual_target_templates': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'custom_audience_ads': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },

    // Report Features
    'report_ads': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'report_sale': { ws_owner: true, ws_admin: true, ws_marketing: false, ws_sales: true }, // Sales only
    'report_summary': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: true },

    // Automation & Rules - Marketing có quyền
    'automated_rules': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'campaign_control': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'golden_rule_set': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },

    // Management Features
    'ads_management': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'labels_management': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },
    'notification_settings': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: true },
    'ad_account_settings': { ws_owner: true, ws_admin: true, ws_marketing: false, ws_sales: false },
    'ads_history': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: false },

    // Sales-specific Features
    'schedule': { ws_owner: true, ws_admin: true, ws_marketing: false, ws_sales: true },

    // Export & Data
    'export_data': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: true },

    // Premium/Enterprise Features - Owner & Admin only
    'priority_support': { ws_owner: true, ws_admin: true, ws_marketing: false, ws_sales: false },
    'api_access': { ws_owner: true, ws_admin: false, ws_marketing: false, ws_sales: false },
    'multi_workspace': { ws_owner: true, ws_admin: false, ws_marketing: false, ws_sales: false },
    'white_label': { ws_owner: true, ws_admin: false, ws_marketing: false, ws_sales: false },
    'sla_guarantee': { ws_owner: true, ws_admin: false, ws_marketing: false, ws_sales: false },
    'notification_zalo_personal': { ws_owner: true, ws_admin: true, ws_marketing: true, ws_sales: true },
};

/**
 * Set workspace role permissions cho tất cả features
 */
export async function setWorkspaceRolePermissions() {
    console.log('🚀 Starting to set workspace role permissions...');

    const headers = await getNocoDBHeaders();

    // Get all feature records
    const response = await fetch(`${getNocoDBUrl(TABLE_ID)}?limit=1000`, { headers });
    const data = await response.json();
    const records = data.list || [];

    console.log(`📋 Found ${records.length} feature records`);

    let updated = 0;
    let skipped = 0;

    for (const record of records) {
        const featureKey = record.feature_key;
        const permissions = FEATURE_PERMISSIONS[featureKey];

        if (!permissions) {
            // Default: owner & admin có tất cả, marketing & sales không có
            console.log(`⚠️ No permissions defined for ${featureKey}, using defaults`);
            const defaultPerms = {
                ws_owner: true,
                ws_admin: true,
                ws_marketing: false,
                ws_sales: false,
            };

            await updateRecord(record.Id, defaultPerms, headers);
            skipped++;
            continue;
        }

        await updateRecord(record.Id, permissions, headers);
        console.log(`✅ Updated ${featureKey}`);
        updated++;
    }

    console.log(`\n🎉 Done! Updated: ${updated}, Used defaults: ${skipped}`);
}

/**
 * Update single record
 */
async function updateRecord(
    recordId: number,
    permissions: { ws_owner: boolean; ws_admin: boolean; ws_marketing: boolean; ws_sales: boolean },
    headers: HeadersInit
) {
    const response = await fetch(getNocoDBUrl(TABLE_ID), {
        method: 'PATCH',
        headers,
        body: JSON.stringify([{
            Id: recordId,
            ws_owner: permissions.ws_owner,
            ws_admin: permissions.ws_admin,
            ws_marketing: permissions.ws_marketing,
            ws_sales: permissions.ws_sales,
        }]),
    });

    if (!response.ok) {
        console.error(`❌ Failed to update record ${recordId}:`, await response.text());
    }
}

// Export để có thể gọi từ console
if (typeof window !== 'undefined') {
    (window as any).setWorkspaceRolePermissions = setWorkspaceRolePermissions;
}

export default setWorkspaceRolePermissions;
