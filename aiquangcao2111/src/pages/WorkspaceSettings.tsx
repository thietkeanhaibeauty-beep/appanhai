/**
 * WorkspaceSettings Page
 * Quản lý workspace và members
 */

import React, { useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuth } from '@/contexts/AuthContext';
import { MemberInviteDialog } from '@/components/workspace/MemberInviteDialog';
import { MembersList } from '@/components/workspace/MembersList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UserPlus, Building2, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateWorkspace } from '@/services/nocodb/workspacesService';
import { resendInviteEmail, getInviteLink, WorkspaceMember } from '@/services/nocodb/workspaceMembersService';

const WorkspaceSettings: React.FC = () => {
    const { user } = useAuth();
    const {
        workspace,
        members,
        loading,
        isOwner,
        isAdmin,
        inviteMemberAction,
        updateMemberRoleAction,
        removeMemberAction,
        loadWorkspace,
    } = useWorkspace();

    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [workspaceName, setWorkspaceName] = useState(workspace?.name || '');
    const [saving, setSaving] = useState(false);

    // Sync workspace name khi load
    React.useEffect(() => {
        if (workspace?.name) {
            setWorkspaceName(workspace.name);
        }
    }, [workspace?.name]);

    const handleSaveWorkspaceName = async () => {
        if (!workspace?.Id || !workspaceName.trim()) return;

        setSaving(true);
        try {
            const success = await updateWorkspace(workspace.Id, { name: workspaceName.trim() });
            if (success) {
                toast.success('Đã cập nhật tên nhóm làm việc');
                loadWorkspace();
            } else {
                toast.error('Không thể cập nhật');
            }
        } catch (error: any) {
            toast.error('Lỗi: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveMember = async (memberId: number) => {
        if (!confirm('Bạn có chắc muốn xóa thành viên này?')) return false;

        const success = await removeMemberAction(memberId);
        if (success) {
            toast.success('Đã xóa thành viên');
        } else {
            toast.error('Không thể xóa thành viên');
        }
        return success;
    };

    const handleResendInvite = async (member: WorkspaceMember): Promise<boolean> => {
        const result = await resendInviteEmail(
            member.Id!,
            member.email,
            workspace?.name,
            user?.email,
            member.role
        );
        if (result.success) {
            loadWorkspace(); // Refresh lại list để cập nhật email_sent_at
        }
        return result.success;
    };

    const handleCopyInviteLink = (email: string) => {
        const link = getInviteLink(email);
        navigator.clipboard.writeText(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // Chỉ Owner mới được truy cập settings
    if (!isOwner) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">🔒</div>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Chỉ chủ tài khoản mới có thể quản lý Nhóm làm việc
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Liên hệ chủ tài khoản nếu bạn cần thay đổi cài đặt
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-4 space-y-4 max-w-4xl">
            <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                    <h1 className="text-lg font-bold">Cài đặt Nhóm làm việc</h1>
                    <p className="text-muted-foreground text-xs">Quản lý nhóm và thành viên</p>
                </div>
            </div>

            {/* Workspace Info */}
            <Card>
                <CardHeader className="py-3 px-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Building2 className="h-4 w-4" />
                        Thông tin Nhóm
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Cài đặt cơ bản của nhóm
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 py-3 px-4">
                    <div className="grid gap-1">
                        <Label htmlFor="workspace-name" className="text-xs">Tên nhóm</Label>
                        <div className="flex gap-2">
                            <Input
                                id="workspace-name"
                                value={workspaceName}
                                onChange={(e) => setWorkspaceName(e.target.value)}
                                placeholder="Nhập tên nhóm làm việc"
                                className="h-8 text-sm"
                            />
                            <Button
                                onClick={handleSaveWorkspaceName}
                                disabled={saving || workspaceName === workspace?.name}
                                size="sm"
                            >
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Lưu'}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-1">
                        <Label className="text-xs">Chủ sở hữu</Label>
                        <Input value={user?.email || ''} disabled className="h-8 text-sm" />
                    </div>
                </CardContent>
            </Card>

            {/* Members Management */}
            <Card>
                <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-sm">
                                <Users className="h-4 w-4" />
                                Thành viên ({members.length})
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Quản lý thành viên trong nhóm
                            </CardDescription>
                        </div>
                        <Button onClick={() => setInviteDialogOpen(true)} size="sm">
                            <UserPlus className="h-3 w-3 mr-1" />
                            Mời thành viên
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                    <MembersList
                        members={members}
                        currentUserId={user?.id || ''}
                        isOwner={isOwner}
                        isAdmin={isAdmin}
                        onUpdateRole={updateMemberRoleAction}
                        onRemove={handleRemoveMember}
                        onResendInvite={handleResendInvite}
                        onCopyInviteLink={handleCopyInviteLink}
                    />
                </CardContent>
            </Card>

            {/* Invite Dialog */}
            <MemberInviteDialog
                open={inviteDialogOpen}
                onOpenChange={setInviteDialogOpen}
                onInvite={inviteMemberAction}
                currentUserEmail={user?.email}
            />
        </div>
    );
};

export default WorkspaceSettings;
