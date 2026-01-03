/**
 * MemberInviteDialog - Dialog để invite member mới vào workspace
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { MemberRole } from '@/services/nocodb/workspaceMembersService';
import { toast } from 'sonner';

interface MemberInviteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onInvite: (email: string, role: MemberRole) => Promise<boolean>;
    currentUserEmail?: string; // Email của user hiện tại để check không cho mời chính mình
}

export const MemberInviteDialog: React.FC<MemberInviteDialogProps> = ({
    open,
    onOpenChange,
    onInvite,
    currentUserEmail,
}) => {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<MemberRole>('marketing');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Vui lòng nhập email');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast.error('Email không hợp lệ');
            return;
        }

        // Check không cho mời chính mình
        if (currentUserEmail && email.trim().toLowerCase() === currentUserEmail.toLowerCase()) {
            toast.error('Không thể mời chính bạn vào nhóm');
            return;
        }

        setLoading(true);
        try {
            const success = await onInvite(email.trim(), role);
            if (success) {
                toast.success('Đã gửi lời mời thành công', {
                    description: `Lời mời đã được gửi đến ${email}`,
                });
                setEmail('');
                setRole('marketing');
                onOpenChange(false);
            } else {
                toast.error('Không thể gửi lời mời', {
                    description: 'Vui lòng thử lại sau',
                });
            }
        } catch (error: any) {
            toast.error('Lỗi: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Mời thành viên mới</DialogTitle>
                    <DialogDescription>
                        Gửi lời mời đến email của nhân viên để họ tham gia workspace.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nhanvien@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="role">Vai trò</Label>
                            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn vai trò" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="marketing">
                                        <div className="flex items-center gap-2">
                                            <span>📊</span>
                                            <span>Marketing</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="sales">
                                        <div className="flex items-center gap-2">
                                            <span>💰</span>
                                            <span>Sales</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                        <div className="flex items-center gap-2">
                                            <span>⚙️</span>
                                            <span>Admin</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {role === 'marketing' && 'Có thể truy cập: Báo cáo QC, Chiến dịch, Quy tắc tự động'}
                                {role === 'sales' && 'Có thể truy cập: Báo cáo bán hàng, CRM, Leads'}
                                {role === 'admin' && 'Có thể truy cập: Tất cả tính năng (trừ quản lý workspace)'}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Đang gửi...' : 'Gửi lời mời'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
