import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Search, TrendingUp, DollarSign, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

interface EffectiveItem {
  id: string;
  name: string;
  spend: number;
  results: number;
  cost_per_result: number;
  ctr?: number;
}

interface CloneItemSelectorCardProps {
  items: EffectiveItem[];
  selectedType: 'campaign' | 'adset' | 'ad';
  onSelect: (item: EffectiveItem) => void;
  onCancel: () => void;
}

export const CloneItemSelectorCard = ({
  items,
  selectedType,
  onSelect,
  onCancel
}: CloneItemSelectorCardProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const typeLabel = {
    campaign: 'Chiến dịch',
    adset: 'Nhóm QC',
    ad: 'Quảng cáo'
  }[selectedType];

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [items, searchQuery]);

  const handleSelect = (item: EffectiveItem) => {
    setSelectedId(item.id);
    setTimeout(() => onSelect(item), 150);
  };

  return (
    <Card className="w-full max-w-lg bg-card/95 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          📋 Chọn {typeLabel} để nhân bản
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Tìm kiếm ${typeLabel.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Items list */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {filteredItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Không tìm thấy kết quả" : "Không có dữ liệu"}
            </div>
          ) : (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  "hover:border-primary hover:bg-primary/5",
                  selectedId === item.id && "border-primary bg-primary/10 scale-[0.98]"
                )}
              >
                <div className="font-medium line-clamp-1">{item.name}</div>
              </button>
            ))
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="flex-1"
          >
            ❌ Hủy
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
