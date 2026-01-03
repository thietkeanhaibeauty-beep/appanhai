import { Megaphone, Target, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { CloneType } from "@/hooks/useCloneFlow";

interface CloneTypeSelectorProps {
  onSelect: (type: CloneType) => void;
  onCancel: () => void;
}

export function CloneTypeSelector({ onSelect, onCancel }: CloneTypeSelectorProps) {
  return (
    <div className="space-y-2 w-full max-w-sm">
      <div className="text-sm font-medium">🎯 Chọn loại nhân bản:</div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 flex items-center gap-1.5 py-2"
          onClick={() => onSelect('campaign')}
        >
          <Megaphone className="h-4 w-4" />
          <span>Chiến dịch</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 flex items-center gap-1.5 py-2"
          onClick={() => onSelect('adset')}
        >
          <Target className="h-4 w-4" />
          <span>Nhóm QC</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex-1 flex items-center gap-1.5 py-2"
          onClick={() => onSelect('ad')}
        >
          <Zap className="h-4 w-4" />
          <span>Quảng cáo</span>
        </Button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="w-full text-xs h-7"
      >
        Hủy
      </Button>
    </div>
  );
}
