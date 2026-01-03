/**
 * MembersList - Hiển thị danh sách members trong workspace
 */

import React, { useState } from 'react';
import { WorkspaceMember, MemberRole } from '@/services/nocodb/workspaceMembersService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Trash2, Clock, CheckCircle, RefreshCw, Copy, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

interface MembersListProps {
    members: WorkspaceMember[];
    currentUserId: string;
    isOwner: boolean;
    isAdmin: boolean;
    onUpdateRole: (memberId: number, role: MemberRole) => Promise<boolean>;
    onRemove: (memberId: number) => Promise<boolean>;
    onResendInvite?: (member: WorkspaceMember) => Promise<boolean>;
    onCopyInviteLink?: (email: string) => void;
}

const ROLE_LABELS: Record<MemberRole, { label: string; icon: string; color: string }> = {
    owner: { label: 'Chủ sở hữu', icon: '👑', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    admin: { label: 'Admin', icon: '⚙️', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    marketing: { label: 'Marketing', icon: '📊', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    sales: { label: 'Sales', icon: '💰', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
};

export const MembersList: React.FC<MembersListProps> = ({
    members,
    currentUserId,
    isOwner,
    isAdmin,
    onUpdateRole,
    onRemove,
    onResendInvite,
    onCopyInviteLink,
}) => {
    const canManageMembers = isOwner || isAdmin;
    const [resendingId, setResendingId] = useState<number | null>(null);

    if (members.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                Chưa có thành viên nào
            </div>
        );
    }

    return (
        <div className="border rounded-lg overflow-x-auto">
            <Table className="text-xs md:text-sm min-w-[500px]">
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[100px]">Email</TableHead>
                        <TableHead className="min-w-[70px]">Vai trò</TableHead>
                        <TableHead className="min-w-[70px]">Trạng thái</TableHead>
                        <TableHead className="min-w-[50px]">Ngày</TableHead>
                        {canManageMembers && <TableHead className="text-right min-w-[50px]">Thao tác</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {members.map((member) => {
                        const roleInfo = ROLE_LABELS[member.role];
                        const isCurrentUser = member.user_id === currentUserId;
                        const canEdit = canManageMembers && !isCurrentUser && member.role !== 'owner';

                        return (
                            <TableRow key={member.Id}>
                                <TableCell className="font-medium">
                                    {member.email}
                                    {isCurrentUser && (
                                        <Badge variant="secondary" className="ml-2">Bạn</Badge>
                                    )}
                                </TableCell>

                                <TableCell>
                                    {canEdit ? (
                                        <Select
                                            value={member.role}
                                            onValueChange={(v) => onUpdateRole(member.Id!, v as MemberRole)}
                                        >
                                            <SelectTrigger className="w-[140px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="marketing">📊 Marketing</SelectItem>
                                                <SelectItem value="sales">💰 Sales</SelectItem>
                                                <SelectItem value="admin">⚙️ Admin</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge className={roleInfo.color}>
                                            {roleInfo.icon} {roleInfo.label}
                                        </Badge>
                                    )}
                                </TableCell>

                                <TableCell>
                                    {member.status === 'active' ? (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="h-4 w-4" />
                                            <span>Hoạt động</span>
                                        </div>
                                    ) : member.status === 'pending' ? (
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1 text-orange-600">
                                                <Clock className="h-4 w-4" />
                                                <span>Chờ xác nhận</span>
                                            </div>
                                            {member.email_sent_at && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    <span>Đã gửi {new Date(member.email_sent_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Badge variant="destructive">Đã vô hiệu</Badge>
                                    )}
                                </TableCell>

                                <TableCell className="text-muted-foreground text-[10px]">
                                    {member.joined_at
                                        ? new Date(member.joined_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
                                        : '-'}
                                </TableCell>

                                {canManageMembers && (
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Resend & Copy Link for pending members */}
                                            {member.status === 'pending' && (
                                                <>
                                                    {onResendInvite && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                                            onClick={async () => {
                                                                setResendingId(member.Id!);
                                                                const success = await onResendInvite(member);
                                                                setResendingId(null);
                                                                if (success) {
                                                                    toast.success('Đã gửi lại email mời');
                                                                } else {
                                                                    toast.error('Không thể gửi email');
                                                                }
                                                            }}
                                                            disabled={resendingId === member.Id}
                                                            title="Gửi lại email"
                                                        >
                                                            {resendingId === member.Id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <RefreshCw className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    )}
                                                    {onCopyInviteLink && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-gray-600 hover:text-gray-700"
                                                            onClick={() => {
                                                                onCopyInviteLink(member.email);
                                                                toast.success('Đã copy link mời');
                                                            }}
                                                            title="Copy link mời"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                            {/* Delete button */}
                                            {canEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => onRemove(member.Id!)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};
