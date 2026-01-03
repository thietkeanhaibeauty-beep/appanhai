/**
 * Admin Zalo Service - API calls for Admin Zalo feature
 * Located: src/features/admin-zalo/services/adminZaloService.ts
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';
import { zaloApiClient } from '@/services/zaloApiClient';

export interface AdminZaloAccount {
    Id: number;
    own_id: string;
    display_name: string;
    phone_number: string;
    is_admin_account: boolean;
}

/**
 * Get the Admin Zalo account from dedicated admin table
 * Uses ZALO_ACCOUNTS_ADMIN table (mf3urf8zirrc8gu)
 */
export const getAdminZaloAccount = async (): Promise<AdminZaloAccount | null> => {
    try {
        const headers = await getNocoDBHeaders();
        // All accounts in ZALO_ACCOUNTS_ADMIN are admin accounts - no filter needed
        const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS_ADMIN)}?limit=1`;

        const res = await fetch(url, { headers });
        const data = await res.json();

        if (data.list && data.list.length > 0) {
            const acc = data.list[0];
            return {
                Id: acc.Id,
                own_id: acc.own_id,
                display_name: acc.display_name || acc.own_id,
                phone_number: acc.phone_number || '',
                is_admin_account: true,
            };
        }
        return null;
    } catch (error) {
        console.error('[AdminZalo] Error getting admin account:', error);
        return null;
    }
};

/**
 * Set a Zalo account as Admin account
 */
export const setAdminZaloAccount = async (accountId: number): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        // First, unset all other admin accounts
        const allUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS)}?where=${encodeURIComponent(`(is_admin_account,eq,true)`)}`;
        const allRes = await fetch(allUrl, { headers });
        const allData = await allRes.json();

        if (allData.list) {
            for (const acc of allData.list) {
                await fetch(`${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS)}/${acc.Id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ is_admin_account: false }),
                });
            }
        }

        // Set the new admin account
        const res = await fetch(`${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS)}/${accountId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ is_admin_account: true }),
        });

        return res.ok;
    } catch (error) {
        console.error('[AdminZalo] Error setting admin account:', error);
        return false;
    }
};

/**
 * Join a Zalo group by link using Admin account
 */
export const joinGroupByLink = async (groupLink: string, adminOwnId: string): Promise<{ success: boolean; groupId?: string; error?: string }> => {
    try {
        // Call VPS API to join group
        const result = await zaloApiClient.joinGroupByLink(groupLink, adminOwnId);

        if (result && result.success) {
            return { success: true, groupId: result.groupId };
        }
        return { success: false, error: result?.error || 'Join failed' };
    } catch (error: any) {
        console.error('[AdminZalo] Error joining group:', error);
        return { success: false, error: error.message || 'Join failed' };
    }
};

/**
 * Send test message to verify group connection
 */
export const sendTestMessage = async (
    groupId: string,
    userPhone: string,
    adminOwnId: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        const message = `✅ Xác nhận kết nối từ AIadsfb.com\n📱 SĐT đăng ký: ${userPhone}\n\nNếu bạn nhận được tin nhắn này, vui lòng quay lại ứng dụng và nhấn "Đã nhận".`;

        const result = await zaloApiClient.sendMessage(message, groupId, true, adminOwnId);

        if (result && (result.success || result.msgId)) {
            return { success: true };
        }
        return { success: false, error: result?.error || 'Send failed' };
    } catch (error: any) {
        console.error('[AdminZalo] Error sending test message:', error);
        return { success: false, error: error.message || 'Send failed' };
    }
};
