import { useState, useMemo } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";

interface CampaignSelectorProps {
  campaigns: any[];
  onSelect: (campaign: any, index: number) => void;
  onCancel: () => void;
}

export function CampaignSelector({ campaigns, onSelect, onCancel }: CampaignSelectorProps) {
  const [isOpen, setIsOpen] = useState(false); // Collapsed by default
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCampaigns = useMemo(() => {
    return campaigns
      .map((c, i) => ({ ...c, originalIndex: i }))
      .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [campaigns, searchQuery]);

  const handleSelect = (campaign: any, originalIndex: number) => {
    setSelectedIndex(originalIndex);
    setIsOpen(false);
    onSelect(campaign, originalIndex);
  };

  return (
    <div className="w-full space-y-3">
      <div className="text-sm font-medium">
        📋 Danh sách chiến dịch ({campaigns.length} chiến dịch)
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-background border rounded-lg hover:bg-accent transition-colors"
        >
          <span className="text-sm">
            {selectedIndex !== null
              ? `${selectedIndex + 1}. ${campaigns[selectedIndex].name}`
              : "Chọn chiến dịch..."}
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg">
            <div className="p-2 border-b sticky top-0 bg-popover z-10">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm chiến dịch..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9"
                  autoFocus
                />
              </div>
            </div>
            <ScrollArea className="max-h-[200px]"> {/* Limited to ~5 items */}
              <div className="p-2 space-y-1">
                {filteredCampaigns.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Không tìm thấy kết quả
                  </div>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <button
                      key={campaign.id || campaign.originalIndex}
                      onClick={() => handleSelect(campaign, campaign.originalIndex)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-popover-foreground",
                        selectedIndex === campaign.originalIndex && "bg-accent"
                      )}
                    >
                      <span className="text-left truncate">
                        {campaign.originalIndex + 1}. {campaign.name}
                      </span>
                      {selectedIndex === campaign.originalIndex && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          Hủy
        </Button>
      </div>
    </div>
  );
}
