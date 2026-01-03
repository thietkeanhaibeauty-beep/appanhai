import { Check, X } from "lucide-react";
import { Button } from "./ui/button";

interface CloneConfirmIntentButtonsProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function CloneConfirmIntentButtons({ onConfirm, onCancel }: CloneConfirmIntentButtonsProps) {
  return (
    <div className="space-y-3 w-full max-w-lg">
      <div className="text-sm">
        🔄 Anh muốn <strong>nhân bản</strong> chiến dịch/nhóm quảng cáo/quảng cáo đúng không?
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onConfirm}
          className="flex items-center gap-2"
        >
          <Check className="h-4 w-4" />
          Có
        </Button>
        
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Không
        </Button>
      </div>
    </div>
  );
}
