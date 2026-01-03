/**
 * Group Link Input Component
 * Located: src/features/admin-zalo/components/GroupLinkInput.tsx
 */

import { useState } from 'react';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GroupLinkInputProps {
    onSubmit: (link: string) => Promise<boolean>;
    loading?: boolean;
    disabled?: boolean;
}

export const GroupLinkInput = ({ onSubmit, loading, disabled }: GroupLinkInputProps) => {
    const [groupLink, setGroupLink] = useState('');
    const [error, setError] = useState<string | null>(null);

    const validateLink = (link: string): boolean => {
        // Accept zalo.me/g/ links or chat.zalo.me links
        const validPatterns = [
            /^https?:\/\/(www\.)?zalo\.me\/g\//i,
            /^https?:\/\/chat\.zalo\.me\//i,
        ];
        return validPatterns.some(pattern => pattern.test(link));
    };

    const handleSubmit = async () => {
        if (!groupLink.trim()) {
            setError('Vui lòng nhập link nhóm');
            return;
        }

        if (!validateLink(groupLink)) {
            setError('Link nhóm không hợp lệ. Ví dụ: https://zalo.me/g/...');
            return;
        }

        setError(null);
        const success = await onSubmit(groupLink.trim());
        if (success) {
            setGroupLink('');
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>—— hoặc ——</span>
            </div>

            <div className="space-y-2">
                <Label htmlFor="group-link" className="text-sm font-medium">
                    Dán link nhóm Zalo của bạn:
                </Label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            id="group-link"
                            placeholder="https://zalo.me/g/..."
                            value={groupLink}
                            onChange={(e) => {
                                setGroupLink(e.target.value);
                                setError(null);
                            }}
                            className="pl-9"
                            disabled={loading || disabled}
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading || disabled || !groupLink.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            'Xác nhận & Join'
                        )}
                    </Button>
                </div>
                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}
            </div>
        </div>
    );
};
