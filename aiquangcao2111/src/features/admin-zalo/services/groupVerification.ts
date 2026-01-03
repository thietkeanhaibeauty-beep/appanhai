/**
 * Group Verification Service
 * Located: src/features/admin-zalo/services/groupVerification.ts
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';

export interface UserAdminGroup {
    Id?: number;
    user_id: string;
    group_id: string;
    group_name: string;
    verified: boolean;
    admin_own_id: string;
    created_at?: string;
}

/**
 * Save user's admin group connection
 */
export const saveUserAdminGroup = async (data: Omit<UserAdminGroup, 'Id' | 'created_at'>): Promise<UserAdminGroup | null> => {
    try {
        const headers = await getNocoDBHeaders();

        // Check if already exists
        const where = encodeURIComponent(`(user_id,eq,${data.user_id})~and(group_id,eq,${data.group_id})`);
        const checkUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}?where=${where}&limit=1`;
        const checkRes = await fetch(checkUrl, { headers });
        const checkData = await checkRes.json();

        const payload = {
            user_id: data.user_id,
            group_id: data.group_id,
            name: data.group_name,
            verified: data.verified,
            admin_own_id: data.admin_own_id,
            use_admin_zalo: true, // Flag to indicate this uses admin zalo
        };

        if (checkData.list && checkData.list.length > 0) {
            // Update existing
            const recordId = checkData.list[0].Id;
            const res = await fetch(`${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}/${recordId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                return { Id: recordId, ...data };
            }
        } else {
            // Create new
            const res = await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS), {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const result = await res.json();
                return { Id: result.Id, ...data };
            }
        }

        return null;
    } catch (error) {
        console.error('[GroupVerification] Error saving group:', error);
        return null;
    }
};

/**
 * Get user's admin groups
 */
export const getUserAdminGroups = async (userId: string): Promise<UserAdminGroup[]> => {
    try {
        const headers = await getNocoDBHeaders();
        const where = encodeURIComponent(`(user_id,eq,${userId})~and(use_admin_zalo,eq,true)`);
        const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}?where=${where}&sort=-CreatedAt`;

        const res = await fetch(url, { headers });
        const data = await res.json();

        if (data.list) {
            return data.list.map((g: any) => ({
                Id: g.Id,
                user_id: g.user_id,
                group_id: g.group_id,
                group_name: g.name || 'Nhóm không tên',
                verified: g.verified || false,
                admin_own_id: g.admin_own_id,
            }));
        }
        return [];
    } catch (error) {
        console.error('[GroupVerification] Error getting groups:', error);
        return [];
    }
};

/**
 * Mark group as verified
 */
export const verifyGroup = async (groupId: string, userId: string): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        const where = encodeURIComponent(`(user_id,eq,${userId})~and(group_id,eq,${groupId})`);
        const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}?where=${where}&limit=1`;

        const res = await fetch(url, { headers });
        const data = await res.json();

        if (data.list && data.list.length > 0) {
            const recordId = data.list[0].Id;
            const updateRes = await fetch(`${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}/${recordId}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ verified: true }),
            });
            return updateRes.ok;
        }
        return false;
    } catch (error) {
        console.error('[GroupVerification] Error verifying group:', error);
        return false;
    }
};
