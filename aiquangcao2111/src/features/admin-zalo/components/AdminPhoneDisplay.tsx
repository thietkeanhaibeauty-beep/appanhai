/**
 * Admin Phone Display Component
 * Located: src/features/admin-zalo/components/AdminPhoneDisplay.tsx
 */

import { useState } from 'react';
import { Copy, Check, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface AdminPhoneDisplayProps {
    phone: string;
    loading?: boolean;
}

export const AdminPhoneDisplay = ({ phone, loading }: AdminPhoneDisplayProps) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (!phone) return;

        try {
            await navigator.clipboard.writeText(phone);
            setCopied(true);
            toast.success('Đã copy số điện thoại!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Không thể copy');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg animate-pulse">
                <div className="w-4 h-4 bg-gray-300 rounded" />
                <div className="flex-1 h-4 bg-gray-300 rounded" />
            </div>
        );
    }

    if (!phone) {
        return (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                ⚠️ Chưa có tài khoản Zalo Admin. Vui lòng liên hệ hỗ trợ.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
                Thêm số điện thoại này vào nhóm Zalo của bạn:
            </p>
            <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-lg font-mono text-lg">
                    <Phone className="w-4 h-4 text-blue-500" />
                    {phone}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="shrink-0"
                >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Đã copy' : 'Copy'}
                </Button>
            </div>
        </div>
    );
};
