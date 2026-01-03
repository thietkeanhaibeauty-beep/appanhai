import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface ClonePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceType: 'campaign' | 'adset' | 'ad';
  sourceName: string;
  targetName: string;
  campaignQuantity: number;
  adsetQuantity: number;
  adQuantity: number;
  estimatedObjects: {
    campaigns: number;
    adsets: number;
    ads: number;
  };
  targetStatus: 'ACTIVE' | 'PAUSED';
  onConfirm: () => void;
}

export function ClonePreviewDialog({
  open,
  onOpenChange,
  sourceType,
  sourceName,
  targetName,
  campaignQuantity,
  adsetQuantity,
  adQuantity,
  estimatedObjects,
  targetStatus,
  onConfirm
}: ClonePreviewDialogProps) {
  const typeLabels = {
    campaign: 'Chiến dịch',
    adset: 'Nhóm quảng cáo',
    ad: 'Quảng cáo'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>📋 Xác nhận nhân bản</DialogTitle>
          <DialogDescription>
            Kiểm tra thông tin trước khi thực hiện nhân bản
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Từ:</span>
              <span className="font-medium">{sourceName}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Tên mới:</span>
              <span className="font-medium text-primary">{targetName}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trạng thái:</span>
            <Badge variant={targetStatus === 'ACTIVE' ? 'default' : 'secondary'}>
              {targetStatus === 'ACTIVE' ? '🟢 ACTIVE' : '⚪ PAUSED'}
            </Badge>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onConfirm} className="bg-primary">
            ✅ Xác nhận nhân bản
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
