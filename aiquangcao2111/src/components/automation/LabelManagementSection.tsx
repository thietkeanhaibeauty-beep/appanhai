import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Trash2, Tag } from "lucide-react";
import { createLabel, deleteLabel } from "@/services/nocodb/campaignLabelsService";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LabelManagementSectionProps {
  availableLabels: Array<{ Id: number; label_name: string; label_color: string }>;
  onLabelsChange: () => void | Promise<void>;
  onDeleteClick?: (label: { Id: number; label_name: string; label_color: string }) => void;
  isLoading?: boolean;
  userId?: string;
}

const predefinedColors = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // orange
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // dark orange
  '#14b8a6', // teal
  '#a855f7', // violet
  '#06b6d4', // sky
  '#22c55e', // emerald
  '#eab308', // yellow
  '#f43f5e', // rose
  '#6366f1', // indigo
];

export function LabelManagementSection({ availableLabels, onLabelsChange, onDeleteClick, isLoading = false, userId }: LabelManagementSectionProps) {
  // ✅ Step 2: Remove default value and throw error if userId is missing
  if (!userId) {
    console.error('🏷️ [CRITICAL] userId is missing!');
    throw new Error('userId is required for LabelManagementSection');
  }

  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false); // NEW: Collapsible create form
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      sonnerToast.error("Vui lòng nhập tên nhãn");
      return;
    }

    setIsCreatingLabel(true);
    try {
      const result = await createLabel({
        label_name: newLabelName.trim(),
        label_color: newLabelColor,
        user_id: userId
      });

      sonnerToast.success(`Đã tạo nhãn "${newLabelName}"`);
      setNewLabelName('');
      setNewLabelColor('#3b82f6');
      setIsCreateOpen(false); // Close after create

      await onLabelsChange();
    } catch (error) {
      console.error('🏷️ [ERROR] Error creating label:', error);
      sonnerToast.error(`Không thể tạo nhãn. Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreatingLabel(false);
    }
  };

  return (
    <div className="space-y-2 relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Header Row - Compact */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          {isCreateOpen ? 'Ẩn form' : 'Tạo nhãn mới'}
        </button>

        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
              <Tag className="w-3 h-3 mr-1" />
              Quản lý
              <ChevronDown className={cn(
                "w-3 h-3 ml-1 transition-transform",
                isOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="absolute right-0 mt-1 z-50">
            <div className="border rounded-md p-2 bg-background shadow-lg w-[280px] max-h-[200px] overflow-y-auto">
              {availableLabels.length > 0 ? (
                <div className="space-y-1">
                  {availableLabels.map((label) => (
                    <div
                      key={label.Id}
                      className="flex items-center justify-between p-1 rounded hover:bg-muted/50 text-xs"
                    >
                      <Badge
                        style={{ backgroundColor: label.label_color }}
                        className="text-white text-xs py-0"
                      >
                        {label.label_name}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteClick?.(label)}
                        className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">Chưa có nhãn</p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Collapsible Create Form - Compact */}
      {isCreateOpen && (
        <div className="border rounded-md p-2 space-y-2 bg-muted/20">
          <div>
            <Label htmlFor="label-name" className="text-xs">Tên nhãn</Label>
            <Input
              id="label-name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder="VD: Chiến dịch VIP"
              className="mt-1 h-7 text-xs"
              disabled={isCreatingLabel}
            />
          </div>

          <div>
            <Label className="text-xs">Màu</Label>
            <div className="flex gap-1 mt-1 flex-wrap">
              {predefinedColors.slice(0, 8).map((color, index) => (
                <button
                  key={`${color}-${index}`}
                  type="button"
                  onClick={() => setNewLabelColor(color)}
                  className={cn(
                    "w-5 h-5 rounded-full border transition-all hover:scale-110",
                    newLabelColor === color ? "ring-2 ring-offset-1 ring-foreground" : "border-muted"
                  )}
                  style={{ backgroundColor: color }}
                  disabled={isCreatingLabel}
                />
              ))}
              <input
                type="color"
                value={newLabelColor}
                onChange={(e) => setNewLabelColor(e.target.value)}
                className="w-5 h-5 rounded-full cursor-pointer border border-muted"
                disabled={isCreatingLabel}
              />
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleCreateLabel}
            disabled={isCreatingLabel || !newLabelName.trim()}
            className="w-full h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            {isCreatingLabel ? 'Đang tạo...' : 'Tạo'}
          </Button>
        </div>
      )}
    </div>
  );
}
