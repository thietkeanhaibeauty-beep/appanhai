/**
 * SHARED CONFIG CHO TẤT CẢ SCRIPTS
 * Tất cả scripts import từ đây thay vì khai báo riêng
 */

export const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
export const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

export const TABLES = {
    // Core tables
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    EXECUTION_LOGS: 'mq7r0pxsfb0cz7h',
    SYNC_LOGS: 'ms8l3iuwjamzqv2',
    PENDING_REVERTS: 'mwfp1d1542ab4ok',

    // Insights
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz',
    FACEBOOK_INSIGHTS_ARCHIVE: 'mso84k5fpiwtph1',

    // Sync & Notifications  
    NOTIFICATION_CONFIGS: 'm4kdxt87npriw50',
    ZALO_GROUPS: 'm1phabv72htychf',
    ZALO_RECEIVERS: 'mdpxvhr2qy1gp5y',
};

// Helper function
export async function fetchNocoDB(tableId: string, params?: string) {
    const url = `${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records${params ? `?${params}` : ''}`;
    const res = await fetch(url, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    return res.json();
}
