/**
 * Verification Status Component
 * Located: src/features/admin-zalo/components/VerificationStatus.tsx
 */

import { CheckCircle, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VerificationStatusProps {
    testMessageSent: boolean;
    onConfirm: () => Promise<boolean>;
    verifying?: boolean;
    onCancel?: () => void;
}

export const VerificationStatus = ({
    testMessageSent,
    onConfirm,
    verifying,
    onCancel,
}: VerificationStatusProps) => {
    if (!testMessageSent) {
        return null;
    }

    return (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
            <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="flex-1">
                    <p className="font-medium text-blue-700">
                        Đã gửi tin nhắn xác nhận!
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                        Vui lòng kiểm tra nhóm Zalo của bạn. Khi thấy tin nhắn từ AIadsfb, nhấn nút bên dưới.
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <Button
                    onClick={onConfirm}
                    disabled={verifying}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                >
                    {verifying ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Đang xác nhận...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Tôi đã nhận được tin nhắn
                        </>
                    )}
                </Button>
                {onCancel && (
                    <Button variant="outline" onClick={onCancel} disabled={verifying}>
                        Hủy
                    </Button>
                )}
            </div>
        </div>
    );
};
