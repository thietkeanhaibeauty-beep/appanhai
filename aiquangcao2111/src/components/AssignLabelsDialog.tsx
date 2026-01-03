import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { CampaignLabel } from "@/services/nocodb/campaignLabelsService";
import { Tag, Search } from "lucide-react";

interface AssignLabelsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  labels: CampaignLabel[];
  selectedCampaigns: Array<{ id: string; name: string; labels?: number[] }>;
  onAssignLabels: (labelIds: number[]) => Promise<void>;
}

export function AssignLabelsDialog({
  open,
  onOpenChange,
  labels,
  selectedCampaigns,
  onAssignLabels,
}: AssignLabelsDialogProps) {
  const [selectedLabelIds, setSelectedLabelIds] = useState<number[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleLabel = (labelId: number) => {
    setSelectedLabelIds((prev) =>
      prev.includes(labelId)
        ? prev.filter((id) => id !== labelId)
        : [...prev, labelId]
    );
  };

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await onAssignLabels(selectedLabelIds);

      // ✅ Verify assignment for first campaign only (as a sanity check)
      if (selectedCampaigns.length > 0) {
        const { getLabelAssignmentsByEntities } = await import('@/services/nocodb/campaignLabelAssignmentsService');
        const firstCampaign = selectedCampaigns[0];
        const assignments = await getLabelAssignmentsByEntities([firstCampaign.id], 'campaign');
        const assignedLabelIds = assignments.map(a => a.label_id);



        // Check if all selected labels were assigned
        const missingLabels = selectedLabelIds.filter(id => !assignedLabelIds.includes(id));
        if (missingLabels.length > 0) {
          console.warn(`⚠️ [AssignLabelsDialog] Labels not assigned:`, missingLabels);
        }
      }

      setSelectedLabelIds([]);
      setSearchQuery("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning labels:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  // Filter labels by search query
  const filteredLabels = labels.filter((label) =>
    label.label_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Gắn nhãn cho chiến dịch
          </DialogTitle>
          <DialogDescription>
            Chọn nhãn để gắn vào {selectedCampaigns.length} chiến dịch đã chọn
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected campaigns */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <div className="text-sm font-medium mb-2">
              Chiến dịch đã chọn ({selectedCampaigns.length}):
            </div>
            <ScrollArea className="max-h-[120px]">
              <div className="space-y-1">
                {selectedCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="text-xs px-2 py-1 bg-background rounded"
                  >
                    {campaign.name}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Available labels */}
          <div>
            <div className="text-sm font-medium mb-2">Chọn nhãn:</div>

            {/* Search input */}
            {labels.length > 0 && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Tìm kiếm nhãn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}

            {labels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Chưa có nhãn nào. Vui lòng tạo nhãn trong phần "Quy tắc tự động".
              </div>
            ) : filteredLabels.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Không tìm thấy nhãn nào phù hợp.
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {filteredLabels.map((label) => (
                    <div
                      key={label.Id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => label.Id && handleToggleLabel(label.Id)}
                    >
                      <Checkbox
                        checked={label.Id ? selectedLabelIds.includes(label.Id) : false}
                        onCheckedChange={() => label.Id && handleToggleLabel(label.Id)}
                      />
                      <Badge
                        style={{ backgroundColor: label.label_color }}
                        className="text-white"
                      >
                        {label.label_name}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        ID: {label.Id}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedLabelIds([]);
              onOpenChange(false);
            }}
            disabled={isAssigning}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedLabelIds.length === 0 || isAssigning}
          >
            {isAssigning ? 'Đang gắn...' : `Gắn ${selectedLabelIds.length} nhãn`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
