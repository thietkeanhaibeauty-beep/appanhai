/**
 * Service to handle Zalo Integration via VPS API
 */

import { toast } from "sonner";
import { zaloApiClient } from "./zaloApiClient";

export const zaloAuthService = {
    /**
     * Get connected accounts
     */
    /**
     * Get connected accounts from NocoDB
     */
    getAccounts: async () => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();
            const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS);

            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list) {
                return {
                    success: true,
                    data: data.list.map((acc: any) => ({
                        ownId: acc.own_id,
                        displayName: acc.display_name || acc.own_id, // Fallback if name is empty
                        phoneNumber: acc.phone_number,
                        avatar: '', // NocoDB might not store avatar yet or it's named differently
                        isActive: acc.is_active
                    }))
                };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('[ZaloAuth] Error fetching accounts:', error);
            return { success: false, error: 'Failed to fetch accounts' };
        }
    },

    /**
     * Get list of groups from connected account
     */
    getGroups: async (ownId: string) => {
        const result = await zaloApiClient.getAllGroupsFromAccount(ownId);
        if (Array.isArray(result)) {
            return { success: true, data: result };
        }
        return result;
    },

    /**
     * Search for a specific group by ID
     */
    searchGroup: async (groupId: string, ownId: string) => {

        const result = await zaloApiClient.getGroupInfo(groupId, ownId);

        // Normalize response
        if (result && result.success && result.data) {
            const groupData = result.data;
            // Extract group info from gridInfoMap if present
            const gridInfoMap = groupData.gridInfoMap || {};
            const groupInfo = gridInfoMap[groupId] || groupData;

            return {
                success: true,
                data: {
                    id: groupInfo.groupId || groupId,
                    name: groupInfo.name || groupInfo.groupName || 'Nhóm không tên',
                    avatar: groupInfo.avt || groupInfo.avatar || '',
                    totalMembers: groupInfo.totalMember || 0,
                    description: groupInfo.desc || ''
                }
            };
        }
        return result;
    },

    /**
     * Find user by phone number
     */
    findUser: async (phone: string, ownId: string) => {
        const result = await zaloApiClient.findUser(phone, ownId);


        // Normalize response - API may return different field names
        if (result && result.success && result.data) {
            const data = result.data;
            // Map various field names to expected format
            return {
                success: true,
                data: {
                    uid: data.uid || data.userId || data.id || data.ownId,
                    display_name: data.display_name || data.displayName || data.name || data.zaloName || data.status || 'Người dùng Zalo',
                    avatar: data.avatar,
                    cover: data.cover
                }
            };
        }
        // If API returns user directly without wrapper
        if (result && (result.uid || result.userId || result.id)) {
            return {
                success: true,
                data: {
                    uid: result.uid || result.userId || result.id,
                    display_name: result.display_name || result.displayName || result.name || result.status || 'Người dùng Zalo',
                    avatar: result.avatar
                }
            };
        }
        return result;
    },

    /**
     * Get saved receivers for user from NocoDB
     */
    getReceivers: async (userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();

            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_RECEIVERS)}?where=(user_id,eq,${userId})&sort=-CreatedAt`;
            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list) {
                return {
                    success: true,
                    data: data.list.map((r: any) => ({
                        id: r.receiver_id,
                        name: r.name,
                        avatar: r.avatar_url || '',
                        phone: r.phone || '',
                        account_id: r.account_id,
                        user_id: r.user_id
                    }))
                };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('[ZaloAuth] Error getting receivers from NocoDB:', error);
            return { success: false, error: 'Failed to get receivers' };
        }
    },
    /**
     * Get personal Zalo connections from ZALO_USER_CONNECTIONS table
     * These are users connected via AdminZaloFriendSection
     */
    getUserConnections: async (userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();

            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_USER_CONNECTIONS)}?where=(user_id,eq,${userId})&sort=-CreatedAt`;
            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list) {
                return {
                    success: true,
                    data: data.list.map((c: any) => ({
                        id: c.zalo_user_id,
                        name: c.zalo_name || 'Người dùng Zalo',
                        displayName: c.zalo_name || 'Người dùng Zalo',
                        avatar: c.zalo_avatar || '',
                        phone: c.zalo_phone || '',
                        isPersonalConnection: true
                    }))
                };
            }
            return { success: true, data: [] };
        } catch (error) {
            return { success: false, error: 'Failed to get user connections' };
        }
    },

    /**
     * Add a receiver
     */
    /**
     * Send friend request (requires userId from findUser first)
     */
    sendFriendRequest: async (userId: string, ownId: string) => {
        return await zaloApiClient.sendFriendRequest(userId, ownId);
    },

    /**
     * Add a receiver to NocoDB linked to the user account
     * Simplified: Always POST new record (NocoDB handles duplicates via unique constraints if any)
     */
    addReceiverV2: async (receiver: { id: string, name: string, avatar: string, phone: string }, ownId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();

            // First get the account ID from ownId
            const accUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS)}?where=(own_id,eq,${ownId})`;
            const accRes = await fetch(accUrl, { headers });
            const accData = await accRes.json();

            if (!accData.list || accData.list.length === 0) {
                return { success: false, error: "Zalo Account not found" };
            }
            const accountId = accData.list[0].Id;
            const userId = accData.list[0].user_id;

            const payload = {
                receiver_id: receiver.id,
                name: receiver.name,
                avatar_url: receiver.avatar || '',
                phone: receiver.phone,
                account_id: accountId,
                user_id: userId
            };

            // Simply POST - if receiver already exists, it will update or create new
            await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_RECEIVERS), {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: 'Failed to add receiver' };
        }
    },

    /**
     * Delete a receiver from NocoDB
     * Uses POST with path/method/data body format for nocodb-proxy
     */
    deleteReceiver: async (receiverId: string, userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const { supabase } = await import('@/integrations/supabase/client');
            const headers = await getNocoDBHeaders();

            const where = `(receiver_id,eq,${receiverId})~and(user_id,eq,${userId})`;
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_RECEIVERS)}?where=${encodeURIComponent(where)}`;
            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list && data.list.length > 0) {
                const tablePath = `/api/v2/tables/${NOCODB_CONFIG.TABLES.ZALO_RECEIVERS}/records`;

                for (const item of data.list) {
                    const { error } = await supabase.functions.invoke('nocodb-proxy', {
                        body: {
                            path: tablePath,
                            method: 'DELETE',
                            data: [{ Id: item.Id }]  // Must be ARRAY for NocoDB bulk delete!
                        }
                    });
                    if (error) {
                        console.error('[ZaloAuth] Delete receiver proxy error:', error);
                    }
                }
            }
            return { success: true };
        } catch (e) {
            console.error('[ZaloAuth] Error deleting receiver:', e);
            return { success: false, error: "Failed to delete" };
        }
    },

    /**
     * Delete a group from NocoDB ZALO_GROUPS table
     * Uses POST with path/method/data body format for nocodb-proxy
     */
    deleteGroup: async (groupId: string, userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const { supabase } = await import('@/integrations/supabase/client');
            const headers = await getNocoDBHeaders();

            const where = `(group_id,eq,${groupId})~and(user_id,eq,${userId})`;
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}?where=${encodeURIComponent(where)}`;
            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list && data.list.length > 0) {
                const tablePath = `/api/v2/tables/${NOCODB_CONFIG.TABLES.ZALO_GROUPS}/records`;

                for (const item of data.list) {
                    const { error } = await supabase.functions.invoke('nocodb-proxy', {
                        body: {
                            path: tablePath,
                            method: 'DELETE',
                            data: [{ Id: item.Id }]  // Must be ARRAY for NocoDB bulk delete!
                        }
                    });
                    if (error) {
                        console.error('[ZaloAuth] Delete group proxy error:', error);
                    }
                }
            }
            return { success: true };
        } catch (e) {
            console.error('[ZaloAuth] Error deleting group:', e);
            return { success: false, error: "Failed to delete group" };
        }
    },

    /**
     * Get saved groups from NocoDB ZALO_GROUPS table
     */
    getSavedGroups: async (userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();

            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}?where=(user_id,eq,${userId})&sort=-CreatedAt`;
            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list) {
                return {
                    success: true,
                    data: data.list.map((g: any) => ({
                        id: g.group_id,
                        groupId: g.group_id,
                        name: g.name || 'Nhóm không tên',
                        avatar: g.avatar_url || '',
                        avatarUrl: g.avatar_url || '',
                        memberCount: g.member_count || 0,
                        account_id: g.account_id,
                        user_id: g.user_id
                    }))
                };
            }
            return { success: true, data: [] };
        } catch (error) {
            console.error('[ZaloAuth] Error getting saved groups from NocoDB:', error);
            return { success: false, error: 'Failed to get saved groups' };
        }
    },

    getZaloAccountsFromNocoDB: async (userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();

            // Fetch accounts ensuring we get necessary fields
            const url = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS)}?where=(user_id,eq,${userId})&sort=-CreatedAt`;
            const res = await fetch(url, { headers });
            const data = await res.json();

            if (data.list) {
                return data.list.map((acc: any) => ({
                    Id: acc.Id,
                    ZaloId: acc.own_id,
                    Name: acc.display_name || acc.own_id,
                    Phone: acc.phone_number,
                    Avatar: '',
                    Status: acc.is_active ? 'Active' : 'Inactive',
                    Id_group: acc.Id_group ? (typeof acc.Id_group === 'string' ? acc.Id_group.split(',') : []) : [],
                    GroupActive: true,
                    // Fields for UI
                    own_id: acc.own_id,
                    user_id: acc.user_id,
                }));
            }
            return [];
        } catch (error) {
            console.error('[ZaloAuth] Error fetching from NocoDB:', error);
            return [];
        }
    },


    /**
     * Update group selection
     */
    updateGroupSelection: async (zaloId: string, groupId: string, groupActive: boolean) => {
        // This was saving to NocoDB
        // For now, we can ignore or implement local storage
        return { success: true };
    },

    /**
     * Update group selection (Save logic)
     * Updated signature to handle multiple groups and receivers
     */
    saveSelectedGroup: async (ownId: string, groupIds: string[], groupNames: string, userId: string, groupInfos: any[] = [], receiverInfos: any[] = []) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');
            const headers = await getNocoDBHeaders();

            // 1. Get Account ID
            const accUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS)}?where=(own_id,eq,${ownId})`;
            const accRes = await fetch(accUrl, { headers });
            const accData = await accRes.json();

            if (!accData.list || accData.list.length === 0) return { success: false, error: "Account not found" };
            const accountId = accData.list[0].Id;

            // Note: Removed backward-compat ZALO_ACCOUNTS.Id_group update
            // Groups are now saved individually to ZALO_GROUPS table below

            // 3. Save Groups to ZALO_GROUPS
            for (const group of groupInfos) {
                const where = `(group_id,eq,${group.groupId})~and(account_id,eq,${accountId})`;
                const listUrl = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}?where=${encodeURIComponent(where)}`;
                const listRes = await fetch(listUrl, { headers });
                const listData = await listRes.json();

                const payload = {
                    group_id: group.groupId,
                    name: group.name,
                    avatar_url: group.avatarUrl,
                    member_count: group.memberCount,
                    account_id: accountId,
                    user_id: userId
                };

                if (listData.list && listData.list.length > 0) {
                    await fetch(`${getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS)}/${listData.list[0].Id}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(payload)
                    });
                } else {
                    await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_GROUPS), {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    });
                }
            }

            // 4. Save Receivers to ZALO_RECEIVERS
            for (const receiver of receiverInfos) {
                const receiverPayload = {
                    receiver_id: receiver.id,
                    name: receiver.name || receiver.displayName || 'Người dùng Zalo',
                    avatar_url: receiver.avatar || '',
                    phone: receiver.phone || '',
                    account_id: accountId,
                    user_id: userId
                };

                // Simply POST - NocoDB will handle duplicates
                await fetch(getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_RECEIVERS), {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(receiverPayload)
                });
            }

            return { success: true };

        } catch (error) {
            console.error('[ZaloAuth] Error saving groups:', error);
            return { success: false, error: 'Failed to save groups' };
        }
    },

    /**
     * Get QR Code for Zalo Login
     */
    getQrCode: async (ownId?: string, userId?: string) => {
        return await zaloApiClient.getQrCode(userId);
    },

    /**
     * Connect to Zalo WebSocket for login events
     */
    connectWebSocket: (onMessage: (data: any) => void): WebSocket => {
        const ws = new WebSocket('wss://zaloapi.hpb.edu.vn');

        ws.onopen = () => {
            console.log('[Zalo WS] Connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('[Zalo WS] Message received:', data);
                onMessage(data);
            } catch (e) {
                console.error('[Zalo WS] Parse error:', e);
            }
        };

        ws.onerror = (error) => {
            console.error('[Zalo WS] Error:', error);
        };

        ws.onclose = () => {
            console.log('[Zalo WS] Disconnected');
        };

        return ws;
    },

    /**
     * Save Zalo account to NocoDB after successful login
     */
    saveZaloAccount: async (accountData: {
        ownId: string;
        name?: string;
        displayName?: string;
        phoneNumber?: string;
        avatar?: string;
    }, userId: string) => {
        try {
            const { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } = await import('./nocodb/config');

            const headers = await getNocoDBHeaders();
            const url = getNocoDBUrl(NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS);




            // Step 1: Fetch account info from /api/accounts (returns phoneNumber, displayName)
            let accountInfo: any = {};
            try {

                const accountsRes = await zaloApiClient.getAccounts();


                // Response format: { success, data: [...], total }
                let accountsList: any[] = [];
                if (accountsRes.success && Array.isArray(accountsRes.data)) {
                    accountsList = accountsRes.data;
                } else if (Array.isArray(accountsRes)) {
                    accountsList = accountsRes;
                }

                // Find the account matching our ownId
                const matchingAccount = accountsList.find((acc: any) => acc.ownId === accountData.ownId);
                if (matchingAccount) {
                    accountInfo = matchingAccount;

                } else {

                }
            } catch (e) {
                console.error('[ZaloAuth] Error fetching /api/accounts:', e);
            }

            // Step 2: If not found in list, try direct account details endpoint
            if (!accountInfo.ownId) {
                try {

                    const detailsRes = await zaloApiClient.getAccountDetails(accountData.ownId);


                    if (detailsRes.success && detailsRes.data) {
                        accountInfo = detailsRes.data;
                    } else if (detailsRes.ownId || detailsRes.phoneNumber) {
                        accountInfo = detailsRes;
                    }
                } catch (e) {
                    console.error('[ZaloAuth] Error fetching account details:', e);
                }
            }

            // Map to correct NocoDB column names
            // accountInfo from /api/accounts has: ownId, phoneNumber, displayName, profile.displayName, profile.avatar
            const profileData = accountInfo.profile || {};
            const payload = {
                own_id: accountData.ownId,
                user_id: userId,
                // Priority: caller's displayName > profileData > accountInfo > fallback
                display_name: accountData.displayName || accountData.name || profileData.displayName || accountInfo.displayName || accountData.ownId,
                phone_number: accountInfo.phoneNumber || accountData.phoneNumber,
                avatar_url: profileData.avatar || accountInfo.avatar || accountData.avatar,
                is_active: true,
                last_login: new Date().toISOString(),
            };



            // Check if account already exists by own_id
            if (payload.own_id) {
                const checkUrl = `${url}?where=(own_id,eq,${payload.own_id})`;
                const checkRes = await fetch(checkUrl, { headers });
                const checkData = await checkRes.json();

                if (checkData.list && checkData.list.length > 0) {
                    // Update existing record
                    const recordId = checkData.list[0].Id;
                    const updateUrl = `${url}/${recordId}`;
                    const res = await fetch(updateUrl, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(payload)
                    });

                    // Handle 404 - record may have been deleted, fallback to POST
                    if (res.status === 404) {
                        const createRes = await fetch(url, {
                            method: 'POST',
                            headers,
                            body: JSON.stringify(payload)
                        });
                        const createResult = await createRes.json();
                        return { success: true, data: createResult };
                    }

                    const result = await res.json();
                    return { success: true, data: result };
                }
            }

            // Create new record
            const res = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            return { success: true, data: result };
        } catch (error) {
            console.error('[ZaloAuth] Error saving account:', error);
            return { success: false, error: 'Failed to save account' };
        }
    },

    /**
     * Delete a Zalo account from NocoDB
     * Uses nocodb-proxy with path/method/data format
     */
    deleteZaloAccount: async (accountId: number) => {
        try {
            const { NOCODB_CONFIG } = await import('./nocodb/config');
            const { supabase } = await import('@/integrations/supabase/client');



            // Use nocodb-proxy with new format: { path, method, data }
            const tablePath = `/api/v2/tables/${NOCODB_CONFIG.TABLES.ZALO_ACCOUNTS}/records`;

            const { data, error } = await supabase.functions.invoke('nocodb-proxy', {
                body: {
                    path: tablePath,
                    method: 'DELETE',
                    data: [{ Id: accountId }]
                }
            });

            if (error) {
                console.error('[ZaloAuth] Delete proxy error:', error);
                return { success: false, error: error.message };
            }


            return { success: true };
        } catch (error) {
            console.error('[ZaloAuth] Error deleting account:', error);
            return { success: false, error: 'Failed to delete account' };
        }
    },

    /**
     * Send message to Zalo Group or User
     * @param message - Message content
     * @param threadId - Group ID or User ID
     * @param isGroup - true for Group, false for User
     * @param ownId - Zalo account ID
     */
    sendMessageToZalo: async (message: string, threadId: string, isGroup: boolean, ownId: string) => {
        try {
            const result = await zaloApiClient.sendMessage(message, threadId, isGroup, ownId);
            if (result && (result.success || result.msgId)) {
                return { success: true, data: result };
            }
            return { success: false, error: result?.error || 'Send failed' };
        } catch (error: any) {
            console.error('[ZaloAuth] Error sending message:', error);
            return { success: false, error: error.message || 'Send failed' };
        }
    }
};
