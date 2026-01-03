import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CampaignMatch } from '../services/campaignControl.service';
import { AlertCircle, CheckCircle2, Power } from 'lucide-react';

interface ConfirmationCardProps {
    campaign: CampaignMatch;
    action: 'PAUSE' | 'ACTIVATE';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmationCard: React.FC<ConfirmationCardProps> = ({
    campaign,
    action,
    onConfirm,
    onCancel
}) => {
    const isPause = action === 'PAUSE';

    return (
        <Card className="w-full max-w-md p-4 space-y-4 bg-background/95 backdrop-blur border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full ${isPause ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                    {isPause ? <Power className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
                <div className="space-y-1">
                    <h4 className="font-medium text-sm">
                        {isPause ? 'Xác nhận tắt chiến dịch?' : 'Xác nhận bật chiến dịch?'}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                        Bạn có chắc muốn {isPause ? 'tắt' : 'bật'} chiến dịch này không?
                    </p>
                </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-md border">
                <div className="font-medium text-sm truncate mb-1">{campaign.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>ID: {campaign.id}</span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {campaign.effective_status === 'ACTIVE' ? 'Đang chạy' : 'Đang tắt'}
                    </Badge>
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs h-8">
                    Hủy bỏ
                </Button>
                <Button
                    variant={isPause ? "destructive" : "default"}
                    size="sm"
                    onClick={onConfirm}
                    className="text-xs h-8"
                >
                    {isPause ? 'Tắt ngay' : 'Bật ngay'}
                </Button>
            </div>
        </Card>
    );
};
