/**
 * Workspace Members Service - NocoDB
 * Quản lý Members trong Workspace
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.WORKSPACE_MEMBERS;

export type MemberRole = 'owner' | 'admin' | 'marketing' | 'sales';
export type MemberStatus = 'pending' | 'active' | 'disabled';

export interface WorkspaceMember {
    Id?: number;
    workspace_id: number;
    user_id: string;
    email: string;
    role: MemberRole;
    status: MemberStatus;
    invited_at?: string;
    joined_at?: string;
    email_sent_at?: string; // Thời gian gửi email mời gần nhất
}

/**
 * Invite member vào workspace
 */
export const inviteMember = async (
    workspaceId: number,
    email: string,
    role: MemberRole,
    workspaceName?: string,
    inviterEmail?: string
): Promise<WorkspaceMember | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
                user_id: '', // Sẽ cập nhật khi member accept invite
                email,
                role,
                status: 'pending',
                invited_at: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            console.error('Failed to invite member:', await response.text());
            return null;
        }

        const memberRecord = await response.json();
        const emailSentAt = new Date().toISOString();

        // Send invite email via Edge Function
        try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtaekxrkubhwtqgodvtx.supabase.co';
            const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': headers['Authorization'] || '',
                },
                body: JSON.stringify({
                    email,
                    workspaceName: workspaceName || 'Workspace',
                    inviterName: inviterEmail || 'Admin',
                    role,
                }),
            });

            if (emailResponse.ok) {
                // Cập nhật email_sent_at trong record - NocoDB v2: Id in body
                await fetch(getNocoDBUrl(TABLE_ID), {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ Id: memberRecord.Id, email_sent_at: emailSentAt }),
                });
                memberRecord.email_sent_at = emailSentAt;
            } else {
                console.warn(`⚠️ Failed to send invite email:`, await emailResponse.text());
            }
        } catch (emailError) {
            console.warn('⚠️ Error sending invite email (non-critical):', emailError);
        }

        return memberRecord;
    } catch (error) {
        console.error('Error inviting member:', error);
        return null;
    }
};

/**
 * Gửi lại email mời cho member pending
 */
export const resendInviteEmail = async (
    memberId: number,
    email: string,
    workspaceName?: string,
    inviterEmail?: string,
    role?: MemberRole
): Promise<{ success: boolean; emailSentAt?: string }> => {
    try {
        const headers = await getNocoDBHeaders();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jtaekxrkubhwtqgodvtx.supabase.co';

        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-invite-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': headers['Authorization'] || '',
            },
            body: JSON.stringify({
                email,
                workspaceName: workspaceName || 'Workspace',
                inviterName: inviterEmail || 'Admin',
                role: role || 'marketing',
                forceResend: true,
            }),
        });

        if (emailResponse.ok) {
            const emailSentAt = new Date().toISOString();
            // Cập nhật email_sent_at trong record
            // NocoDB v2: PATCH with Id in body
            await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: memberId, email_sent_at: emailSentAt }),
            });
            return { success: true, emailSentAt };
        }
        return { success: false };
    } catch (error) {
        console.error('Error resending invite email:', error);
        return { success: false };
    }
};

/**
 * Tạo invite link cho member pending
 */
export const getInviteLink = (email: string): string => {
    const appUrl = window.location.origin;
    return `${appUrl}/auth/login?invite=true&email=${encodeURIComponent(email)}`;
};


/**
 * Lấy tất cả members của workspace
 */
export const getMembersByWorkspaceId = async (workspaceId: number): Promise<WorkspaceMember[]> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(workspace_id,eq,${workspaceId})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&sort=invited_at`,
            { headers }
        );

        if (!response.ok) {
            console.error('Failed to get members:', await response.text());
            return [];
        }

        const data = await response.json();
        return data.list || [];
    } catch (error) {
        console.error('Error getting members:', error);
        return [];
    }
};

/**
 * Lấy membership của user (user đang là member của workspace nào)
 */
export const getMembershipByUserId = async (userId: string): Promise<WorkspaceMember | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})~and(status,eq,active)`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) {
            console.error('Failed to get membership:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.list?.[0] || null;
    } catch (error) {
        console.error('Error getting membership:', error);
        return null;
    }
};

/**
 * Lấy pending invite bằng email
 */
export const getPendingInviteByEmail = async (email: string): Promise<WorkspaceMember | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(email,eq,${email})~and(status,eq,pending)`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.list?.[0] || null;
    } catch (error) {
        console.error('Error getting pending invite:', error);
        return null;
    }
};

/**
 * Accept invite - cập nhật user_id và status
 */
export const acceptInvite = async (memberId: number, userId: string): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        // NocoDB v2: PATCH to base URL with Id in body
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                Id: memberId,
                user_id: userId,
                status: 'active',
                joined_at: new Date().toISOString(),
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error accepting invite:', error);
        return false;
    }
};

/**
 * Cập nhật role của member
 */
export const updateMemberRole = async (memberId: number, role: MemberRole): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        // NocoDB v2: PATCH with Id in body
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ Id: memberId, role }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error updating member role:', error);
        return false;
    }
};

/**
 * Disable member (soft delete)
 */
export const disableMember = async (memberId: number): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        // NocoDB v2: PATCH with Id in body
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ Id: memberId, status: 'disabled' }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error disabling member:', error);
        return false;
    }
};

/**
 * Xóa member (hard delete)
 */
export const removeMember = async (memberId: number): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(TABLE_ID);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${TABLE_ID}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                path: path,
                method: 'DELETE',
                data: [{ Id: memberId }]
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error removing member:', error);
        return false;
    }
};

/**
 * Tạo owner member record khi tạo workspace
 */
export const createOwnerMember = async (
    workspaceId: number,
    userId: string,
    email: string
): Promise<WorkspaceMember | null> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                workspace_id: workspaceId,
                user_id: userId,
                email,
                role: 'owner',
                status: 'active',
                invited_at: new Date().toISOString(),
                joined_at: new Date().toISOString(),
            }),
        });

        if (!response.ok) {
            console.error('Failed to create owner member:', await response.text());
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error creating owner member:', error);
        return null;
    }
};
