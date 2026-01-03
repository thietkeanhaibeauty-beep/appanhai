/**
 * useWorkspace Hook
 * Quản lý workspace và membership state cho user hiện tại
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    Workspace,
    getWorkspaceByOwnerId,
    getOrCreateWorkspace
} from '@/services/nocodb/workspacesService';
import {
    WorkspaceMember,
    MemberRole,
    getMembershipByUserId,
    getMembersByWorkspaceId,
    inviteMember,
    updateMemberRole,
    disableMember,
    removeMember,
    createOwnerMember,
    getPendingInviteByEmail,
    acceptInvite,
} from '@/services/nocodb/workspaceMembersService';

interface UseWorkspaceReturn {
    // State
    workspace: Workspace | null;
    membership: WorkspaceMember | null;
    members: WorkspaceMember[];
    loading: boolean;
    error: string | null;

    // Computed
    isOwner: boolean;
    isAdmin: boolean;
    role: MemberRole | null;
    hasPermission: (requiredRoles: MemberRole[]) => boolean;

    // Actions
    loadWorkspace: () => Promise<void>;
    loadMembers: () => Promise<void>;
    inviteMemberAction: (email: string, role: MemberRole) => Promise<boolean>;
    updateMemberRoleAction: (memberId: number, role: MemberRole) => Promise<boolean>;
    removeMemberAction: (memberId: number) => Promise<boolean>;
    checkAndAcceptInvite: () => Promise<boolean>;
}

export const useWorkspace = (): UseWorkspaceReturn => {
    const { user } = useAuth();

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [membership, setMembership] = useState<WorkspaceMember | null>(null);
    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load workspace cho user hiện tại
    const loadWorkspace = useCallback(async () => {
        if (!user?.id || !user?.email) return;

        setLoading(true);
        setError(null);

        try {
            // =====================================================
            // 0. Auto-accept pending invite if exists
            // =====================================================
            const pendingInvite = await getPendingInviteByEmail(user.email);
            if (pendingInvite?.Id && pendingInvite.status === 'pending') {
                console.log('✅ Found pending invite for', user.email, ', auto-accepting...');
                const accepted = await acceptInvite(pendingInvite.Id, user.id);
                if (accepted) {
                    // Show toast notification
                    const { toast } = await import('sonner');
                    toast.success(`🎉 Chào mừng bạn đến với workspace!`, {
                        description: `Vai trò của bạn: ${pendingInvite.role}`,
                        duration: 6000,
                    });
                }
            }

            // 1. Kiểm tra xem user có membership không (là member của workspace ai đó)
            let membershipData = await getMembershipByUserId(user.id);


            if (membershipData) {
                // User là member của workspace khác
                setMembership(membershipData);

                // Load workspace từ workspace_id
                const { getWorkspaceById } = await import('@/services/nocodb/workspacesService');
                const ws = await getWorkspaceById(membershipData.workspace_id);
                setWorkspace(ws);
            } else {
                // User chưa có membership -> kiểm tra xem có phải owner không
                let ws = await getWorkspaceByOwnerId(user.id);

                if (!ws) {
                    // Tạo workspace mới cho user
                    ws = await getOrCreateWorkspace(user.id, `${user.email}'s Workspace`);

                    // Tạo owner member record
                    if (ws?.Id) {
                        await createOwnerMember(ws.Id, user.id, user.email);
                    }
                }

                setWorkspace(ws);

                // Load lại membership
                membershipData = await getMembershipByUserId(user.id);
                setMembership(membershipData);
            }
        } catch (err: any) {
            console.error('Error loading workspace:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id, user?.email]);

    // Load danh sách members
    const loadMembers = useCallback(async () => {
        if (!workspace?.Id) return;

        const membersList = await getMembersByWorkspaceId(workspace.Id);
        setMembers(membersList);
    }, [workspace?.Id]);

    // Invite member
    const inviteMemberAction = useCallback(async (email: string, role: MemberRole): Promise<boolean> => {
        if (!workspace?.Id) return false;

        const result = await inviteMember(
            workspace.Id,
            email,
            role,
            workspace.name || 'Workspace',  // workspace name for email
            user?.email || 'Admin'           // inviter email
        );
        if (result) {
            await loadMembers();
            return true;
        }
        return false;
    }, [workspace?.Id, workspace?.name, user?.email, loadMembers]);


    // Update member role
    const updateMemberRoleAction = useCallback(async (memberId: number, role: MemberRole): Promise<boolean> => {
        const success = await updateMemberRole(memberId, role);
        if (success) {
            await loadMembers();
        }
        return success;
    }, [loadMembers]);

    // Remove member
    const removeMemberAction = useCallback(async (memberId: number): Promise<boolean> => {
        const success = await removeMember(memberId);
        if (success) {
            await loadMembers();
        }
        return success;
    }, [loadMembers]);

    // Check pending invite và accept
    const checkAndAcceptInvite = useCallback(async (): Promise<boolean> => {
        if (!user?.id || !user?.email) return false;

        const pendingInvite = await getPendingInviteByEmail(user.email);
        if (pendingInvite?.Id) {
            const success = await acceptInvite(pendingInvite.Id, user.id);
            if (success) {
                await loadWorkspace();
                return true;
            }
        }
        return false;
    }, [user?.id, user?.email, loadWorkspace]);

    // Ref to track if initial load has been done - prevent any auto-reload
    const initialLoadedRef = useRef<boolean>(false);

    // Only load workspace ONCE on initial mount
    useEffect(() => {
        if (user?.id && !initialLoadedRef.current) {
            initialLoadedRef.current = true;
            loadWorkspace();
        }
    }, [user?.id]);

    // Auto-load members khi workspace thay đổi
    useEffect(() => {
        if (workspace?.Id) {
            loadMembers();
        }
    }, [workspace?.Id, loadMembers]);

    // Computed values
    const role = membership?.role || null;
    const isOwner = role === 'owner';
    const isAdmin = role === 'admin' || isOwner;

    const hasPermission = useCallback((requiredRoles: MemberRole[]): boolean => {
        if (!role) return false;
        // Owner có tất cả quyền
        if (role === 'owner') return true;
        // Admin có hầu hết quyền (trừ owner-only)
        if (role === 'admin' && !requiredRoles.includes('owner')) return true;
        // Kiểm tra role cụ thể
        return requiredRoles.includes(role);
    }, [role]);

    return {
        // State
        workspace,
        membership,
        members,
        loading,
        error,

        // Computed
        isOwner,
        isAdmin,
        role,
        hasPermission,

        // Actions
        loadWorkspace,
        loadMembers,
        inviteMemberAction,
        updateMemberRoleAction,
        removeMemberAction,
        checkAndAcceptInvite,
    };
};
