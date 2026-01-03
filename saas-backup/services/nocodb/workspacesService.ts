/**
 * Workspace Service - NocoDB
 * Quản lý Workspace cho multi-user SaaS
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.WORKSPACES;

export interface Workspace {
    Id?: number;
    owner_user_id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
}

/**
 * Tạo workspace mới cho owner
 */
export const createWorkspace = async (ownerId: string, name: string): Promise<Workspace | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                owner_user_id: ownerId,
                name,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            console.error('Failed to create workspace:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating workspace:', error);
        return null;
    }
};

/**
 * Lấy workspace của owner
 */
export const getWorkspaceByOwnerId = async (ownerId: string): Promise<Workspace | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(owner_user_id,eq,${ownerId})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) {
            console.error('Failed to get workspace:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.list?.[0] || null;
    } catch (error) {
        console.error('Error getting workspace:', error);
        return null;
    }
};

/**
 * Lấy workspace theo ID
 */
export const getWorkspaceById = async (workspaceId: number): Promise<Workspace | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID, String(workspaceId)), { headers });

        if (!response.ok) {
            console.error('Failed to get workspace by ID:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting workspace by ID:', error);
        return null;
    }
};

/**
 * Cập nhật workspace
 */
export const updateWorkspace = async (workspaceId: number, updates: Partial<Workspace>): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID, String(workspaceId)), {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                ...updates,
                updated_at: new Date().toISOString(),
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error updating workspace:', error);
        return false;
    }
};

/**
 * Lấy hoặc tạo workspace cho user
 * Dùng khi user login lần đầu
 */
export const getOrCreateWorkspace = async (userId: string, defaultName: string = 'My Workspace'): Promise<Workspace | null> => {
    // Tìm workspace đã có
    let workspace = await getWorkspaceByOwnerId(userId);

    // Nếu chưa có, tạo mới
    if (!workspace) {
        workspace = await createWorkspace(userId, defaultName);
    }

    return workspace;
};
