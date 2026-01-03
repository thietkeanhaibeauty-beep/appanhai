import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface EffectiveItem {
  id: string;
  name: string;
  spend: number;
  cost_per_result: number;
}

interface CloneConfirmCardProps {
  selectedItem: EffectiveItem;
  cloneType: 'campaign' | 'adset' | 'ad';
  suggestedName: string;
  quantities: {
    campaigns?: number;
    adsets?: number;
    ads?: number;
  };
  onChangeQuantities: (quantities: any) => void;
  statusOption: 'PAUSED' | 'ACTIVE';
  onChangeStatus: (status: 'PAUSED' | 'ACTIVE') => void;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CloneConfirmCard = ({
  selectedItem,
  cloneType,
  suggestedName,
  quantities,
  onChangeQuantities,
  statusOption,
  onChangeStatus,
  onConfirm,
  onCancel,
  isLoading
}: CloneConfirmCardProps) => {
  const [newName, setNewName] = useState(suggestedName);

  useEffect(() => {
    setNewName(suggestedName);
  }, [suggestedName]);

  const typeLabel = {
    campaign: 'Chiến dịch',
    adset: 'Nhóm QC',
    ad: 'Quảng cáo'
  }[cloneType];

  const handleQuantityChange = (key: string, value: string) => {
    const num = parseInt(value) || 1;
    onChangeQuantities({ ...quantities, [key]: Math.max(1, num) });
  };

  // Calculate total objects to be created
  const estimatedObjects = (() => {
    if (cloneType === 'campaign') {
      const campaigns = quantities.campaigns || 1;
      const adsets = (quantities.adsets || 1) * campaigns;
      const ads = (quantities.ads || 1) * adsets;
      return { campaigns, adsets, ads };
    } else if (cloneType === 'adset') {
      const adsets = quantities.adsets || 1;
      const ads = (quantities.ads || 1) * adsets;
      return { adsets, ads };
    } else {
      return { ads: quantities.ads || 1 };
    }
  })();

  return (
    <Card className="w-full max-w-xs bg-card/95 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          ✅ Nhân bản {typeLabel}
        </CardTitle>
        <div className="text-xs text-muted-foreground truncate">Từ: {selectedItem.name}</div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {/* New name input - compact */}
        <div className="space-y-1">
          <Label htmlFor="newName" className="text-xs">Tên mới:</Label>
          <Input
            id="newName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nhập tên mới..."
            className="h-8 text-sm"
          />
        </div>

        {/* Quantities - inline layout */}
        <div className="grid grid-cols-2 gap-2">
          {cloneType === 'campaign' && (
            <div className="space-y-1">
              <Label htmlFor="campaignQty" className="text-xs">SL Chiến dịch:</Label>
              <Input
                id="campaignQty"
                type="number"
                min="1"
                value={quantities.campaigns || 1}
                onChange={(e) => handleQuantityChange('campaigns', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          {(cloneType === 'campaign' || cloneType === 'adset') && (
            <div className="space-y-1">
              <Label htmlFor="adsetQty" className="text-xs">SL Nhóm QC:</Label>
              <Input
                id="adsetQty"
                type="number"
                min="1"
                value={quantities.adsets || 1}
                onChange={(e) => handleQuantityChange('adsets', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="adQty" className="text-xs">SL Ads:</Label>
            <Input
              id="adQty"
              type="number"
              min="1"
              value={quantities.ads || 1}
              onChange={(e) => handleQuantityChange('ads', e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        {/* Status option - inline */}
        <div className="flex items-center gap-3">
          <Label className="text-xs">Trạng thái:</Label>
          <RadioGroup
            value={statusOption}
            onValueChange={(v) => onChangeStatus(v as any)}
            className="flex gap-3"
          >
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="PAUSED" id="paused" className="h-3.5 w-3.5" />
              <Label htmlFor="paused" className="text-xs cursor-pointer">PAUSED</Label>
            </div>
            <div className="flex items-center space-x-1">
              <RadioGroupItem value="ACTIVE" id="active" className="h-3.5 w-3.5" />
              <Label htmlFor="active" className="text-xs cursor-pointer">ACTIVE</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Estimated summary - compact */}
        <div className="p-2 bg-primary/5 rounded text-xs">
          <span className="font-medium">Sẽ tạo: </span>
          {estimatedObjects.campaigns !== undefined && (
            <span>{estimatedObjects.campaigns} Camp </span>
          )}
          {estimatedObjects.adsets !== undefined && (
            <span>{estimatedObjects.adsets} AdSet </span>
          )}
          <span>{estimatedObjects.ads} Ad</span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-8 text-xs"
          >
            ❌ Hủy
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm()}
            disabled={isLoading || !newName.trim()}
            className="flex-1 h-8 text-xs"
          >
            {isLoading ? '⏳...' : '✅ Xác nhận'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
