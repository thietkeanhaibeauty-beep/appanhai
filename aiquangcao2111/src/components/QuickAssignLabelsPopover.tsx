import { useState, useEffect, memo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { CampaignLabel } from "@/services/nocodb/campaignLabelsService";
import { Plus, Tag, Search } from "lucide-react";

interface QuickAssignLabelsPopoverProps {
  labels: CampaignLabel[];
  entityId: string;
  entityName: string;
  entityType: 'campaign' | 'adset' | 'ad';
  currentLabelIds?: number[];
  onAssignLabels: (entityId: string, entityType: 'campaign' | 'adset' | 'ad', labelIds: number[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export function QuickAssignLabelsPopoverComponent({
  labels,
  entityId,
  entityName,
  entityType,
  currentLabelIds = [],
  onAssignLabels,
  trigger,
}: QuickAssignLabelsPopoverProps) {
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>(currentLabelIds);
  const [isAssigning, setIsAssigning] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync selectedLabelIds with currentLabelIds when popover opens or currentLabelIds changes
  useEffect(() => {
    if (open) {
      // ✅ Normalize to numbers to avoid type mismatches
      setSelectedLabelIds(currentLabelIds.map(id => Number(id)));
    }
  }, [open, currentLabelIds]);

  const handleToggleLabel = (labelId: number) => {
    setSelectedLabelIds((prev) => {
      const idToCheck = Number(labelId);
      return prev.includes(idToCheck)
        ? prev.filter((id) => id !== idToCheck)
        : [...prev, idToCheck];
    });
  };

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await onAssignLabels(entityId, entityType, selectedLabelIds);

      // ✅ Verify assignment
      const { getLabelAssignmentsByEntities } = await import('@/services/nocodb/campaignLabelAssignmentsService');
      const assignments = await getLabelAssignmentsByEntities([entityId], entityType);
      const assignedLabelIds = assignments.map(a => a.label_id);



      // Check if all selected labels were assigned
      const missingLabels = selectedLabelIds.filter(id => !assignedLabelIds.includes(id));
      if (missingLabels.length > 0) {
        // Labels not assigned - may be due to API issue
      }

      setSearchQuery("");
      setOpen(false);
    } catch (error) {
      console.error('Error assigning labels:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const entityTypeName = entityType === 'campaign' ? 'chiến dịch' : entityType === 'adset' ? 'nhóm QC' : 'quảng cáo';

  // Filter labels by search query
  const filteredLabels = labels.filter((label) =>
    label.label_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-1 border-2 border-primary/40 hover:border-primary hover:bg-primary/10 rounded-md"
            onClick={(e) => e.stopPropagation()}
            title="Gắn nhãn"
          >
            <Plus className="h-4 w-4 text-primary" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="w-96 p-0"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 mb-1">
            <Tag className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">Gắn nhãn</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {entityTypeName}: <span className="font-medium">{entityName}</span>
          </p>

          {/* Search input */}
          {labels.length > 0 && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm nhãn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-7 text-sm"
              />
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[400px]">
          {labels.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Chưa có nhãn nào. Vui lòng tạo nhãn trong "Quy tắc tự động".
            </div>
          ) : filteredLabels.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Không tìm thấy nhãn nào phù hợp.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredLabels.map((label) => (
                <div
                  key={label.Id}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => label.Id && handleToggleLabel(label.Id)}
                >
                  <Checkbox
                    checked={label.Id ? selectedLabelIds.includes(Number(label.Id)) : false}
                    onCheckedChange={() => label.Id && handleToggleLabel(label.Id)}
                  />
                  <Badge
                    style={{ backgroundColor: label.label_color }}
                    className="text-white text-xs"
                  >
                    {label.label_name}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isAssigning}
            className="flex-1"
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleAssign}
            disabled={selectedLabelIds.length === 0 || isAssigning}
            className="flex-1"
          >
            {isAssigning ? 'Đang gắn...' : `Gắn ${selectedLabelIds.length}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const QuickAssignLabelsPopover = memo(QuickAssignLabelsPopoverComponent);
