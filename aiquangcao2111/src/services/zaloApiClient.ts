import { supabase } from "@/integrations/supabase/client";

// No longer need BASE_URL here, as we proxy through Supabase
// const BASE_URL = 'https://zaloapi.hpb.edu.vn';

const invokeProxy = async (endpoint: string, method: string = 'GET', body?: any) => {
    // Check if running in development mode
    const isDev = import.meta.env.DEV;

    // In development, try to connect to local Zalo server directly
    if (isDev) {
        try {
            const localUrl = `http://localhost:3000${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

            // API Key for local Zalo server authentication
            const ZALO_API_KEY = "zalo_33752f0e1b1057e2f1cd837d04e704e49ac6693d675e467c657701a0e67e38c5";

            const options: RequestInit = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': ZALO_API_KEY,
                }
            };

            if (body && method !== 'GET') {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(localUrl, options);

            // Handle non-JSON responses or errors based on status
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await response.json();
                return data;
            } else {
                const text = await response.text();
                if (!response.ok) {
                    throw new Error(text || `HTTP error! status: ${response.status}`);
                }
                return { success: true, data: text }; // Fallback for text response
            }
        } catch (error: any) {
            // Fallthrough to Supabase Proxy if local fails (optional, but good for robustness)
        }
    }

    try {
        const { data, error } = await supabase.functions.invoke('zalo-proxy', {
            body: {
                url: endpoint,
                method,
                body
            }
        });

        if (error) {
            return { success: false, error: error.message || 'ErrorMessage', details: error };
        }
        return data;
    } catch (error: any) {
        return { success: false, error: 'Network error or Proxy error', details: error.message };
    }
};

export const zaloApiClient = {
    // Get all logged-in Zalo accounts (persisted in DB)
    // GET /api/accounts
    getAccounts: async () => {
        return await invokeProxy('/api/accounts', 'GET');
    },

    // Get all currently connected Zalo accounts (live in memory)
    // GET /api/zalo-accounts
    getConnectedAccounts: async () => {
        return await invokeProxy('/api/zalo-accounts', 'GET');
    },

    // Get specific account details with profile info
    // GET /api/accounts/:ownId
    getAccountDetails: async (ownId: string) => {
        return await invokeProxy(`/api/accounts/${ownId}`, 'GET');
    },

    getGroups: async () => {
        return await invokeProxy('/groups', 'GET');
    },

    // Get all groups from account using /api/getAllGroups
    getAllGroupsFromAccount: async (ownId: string) => {

        return await invokeProxy('/api/getAllGroups', 'POST', {
            ownId
        });
    },

    // Get all friends from account
    // POST /api/getAllFriendsByAccount
    getAllFriendsByAccount: async (ownId: string) => {
        return await invokeProxy('/api/getAllFriendsByAccount', 'POST', {
            accountSelection: ownId
        });
    },

    // Get specific group info by ID
    // POST /api/getGroupInfo
    getGroupInfo: async (groupId: string, ownId: string) => {

        return await invokeProxy('/api/getGroupInfo', 'POST', {
            groupId,
            ownId
        });
    },

    // Find user by phone number (mapped to ByAccount)
    // POST /api/findUserByAccount
    findUser: async (phone: string, ownId: string) => {
        return await invokeProxy('/api/findUserByAccount', 'POST', {
            phone,
            accountSelection: ownId
        });
    },

    // Get user info
    getUserInfo: async (ownId: string) => {
        return await invokeProxy(`/api/accounts/${ownId}`, 'GET');
    },

    // Accept friend request (mapped to ByAccount)
    // POST /api/acceptFriendRequestByAccount
    // Use when user already sent request to Admin
    acceptFriendRequest: async (userId: string, ownId: string) => {
        return await invokeProxy('/api/acceptFriendRequestByAccount', 'POST', {
            userId,
            accountSelection: ownId
        });
    },

    // Add receiver
    addReceiver: async (receiver: { id: string, name: string, avatar: string }, ownId: string) => {
        return await invokeProxy('/receivers', 'POST', { ...receiver, ownId });
    },

    // Get receivers
    getReceivers: async (userId?: string) => {
        const query = userId ? `?userId=${userId}` : '';
        return await invokeProxy(`/receivers${query}`, 'GET');
    },

    // Delete receiver
    deleteReceiver: async (receiverId: string, userId: string) => {
        return await invokeProxy(`/receivers/${receiverId}?userId=${userId}`, 'DELETE');
    },

    // Get QR Code for Zalo Login
    getQrCode: async (userId?: string) => {
        return await invokeProxy('/zalo-login', 'POST', { userId });
    },

    // Send message to Group or User
    // POST /api/sendmessage (NOT /sendmessage)
    // type: 1 = Group, 0 = User (NUMBER, not string!)
    sendMessage: async (message: string, threadId: string, isGroup: boolean, ownId: string) => {

        return await invokeProxy('/api/sendmessage', 'POST', {
            message,
            threadId,
            type: isGroup ? 1 : 0,
            ownId
        });
    },

    // Send friend request (redirects to ByAccount for Auth support)
    // POST /api/sendFriendRequestByAccount
    sendFriendRequest: async (userId: string, ownId: string) => {
        console.log('[ZaloApi] Calling sendFriendRequest -> sendFriendRequestByAccount', userId);
        return await invokeProxy('/api/sendFriendRequestByAccount', 'POST', {
            userId,
            message: 'Xin chào! Admin AIadsfb gửi lời mời kết bạn để gửi thông báo quảng cáo cho bạn.',
            accountSelection: ownId
        });
    },

    // Join group by link (Admin Zalo feature)
    // POST /api/joinGroupByLink
    joinGroupByLink: async (groupLink: string, ownId: string) => {
        return await invokeProxy('/api/joinGroupByLink', 'POST', {
            groupLink,
            ownId
        });
    },

    // Send message using accountSelection (phone number or ownId)
    // POST /api/sendMessageByAccount
    sendMessageByAccount: async (message: string, threadId: string, type: 'user' | 'group', accountSelection: string) => {
        return await invokeProxy('/api/sendMessageByAccount', 'POST', {
            message,
            threadId,
            type: type === 'group' ? 1 : 0,
            accountSelection
        });
    },

    // Get group info by account
    // POST /api/getGroupInfoByAccount
    getGroupInfoByAccount: async (groupId: string, accountSelection: string) => {
        return await invokeProxy('/api/getGroupInfoByAccount', 'POST', {
            groupId,
            accountSelection
        });
    },

    // Get group members by account (accepts groupUrl directly!)
    // POST /api/getGroupMembersByAccount
    // Returns groupInfo.groupId, name, members, etc.
    getGroupMembersByAccount: async (groupUrl: string, accountSelection: string) => {
        return await invokeProxy('/api/getGroupMembersByAccount', 'POST', {
            groupUrl,
            accountSelection
        });
    },

    // Parse Zalo link to get real info (groupId, etc.)
    // POST /api/parseLinkByAccount
    // Use this to resolve https://zalo.me/g/xxx links to real groupId
    parseLinkByAccount: async (link: string, accountSelection: string) => {
        return await invokeProxy('/api/parseLinkByAccount', 'POST', {
            link,
            accountSelection
        });
    },

    // ===== FRIEND MANAGEMENT APIs =====

    // Find user by phone number
    // POST /api/findUserByAccount
    // Returns: { userId, isFriend, displayName, avatar, ... }
    findUserByAccount: async (phone: string, accountSelection: string) => {
        return await invokeProxy('/api/findUserByAccount', 'POST', {
            phone,
            accountSelection
        });
    },

    // Send friend request to user
    // POST /api/sendFriendRequestByAccount
    sendFriendRequestByAccount: async (userId: string, message: string, accountSelection: string) => {
        return await invokeProxy('/api/sendFriendRequestByAccount', 'POST', {
            userId,
            message,
            accountSelection
        });
    },

    // Send direct message to user (for verification code)
    // POST /api/sendMessageByAccount
    sendMessageToUser: async (message: string, userId: string, accountSelection: string) => {
        return await invokeProxy('/api/sendMessageByAccount', 'POST', {
            message,
            threadId: userId,
            type: 0, // 0 = user, 1 = group
            accountSelection
        });
    }
};
