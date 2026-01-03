import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface StatusFilterProps {
  selectedStatuses: string[];
  onChange: (statuses: string[]) => void;
}

// ✅ NEW: Simplified options for UI
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "🟢 Hoạt động", icon: "🟢" },
  { value: "PAUSED", label: "⚪ Tạm dừng", icon: "⚪" },
  { value: "ARCHIVED", label: "📦 Đã lưu trữ", icon: "📦" },
  { value: "DELETED", label: "🗑️ Đã xóa", icon: "🗑️" },
];

// ✅ NEW: Map main statuses to all their variants
const STATUS_VARIANTS: Record<string, string[]> = {
  'ACTIVE': ['ACTIVE', 'IN_PROCESS'],
  'PAUSED': ['PAUSED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED', 'AD_PAUSED', 'WITH_ISSUES', 'PENDING_REVIEW', 'PENDING_BILLING_INFO', 'DISAPPROVED', 'PREAPPROVED', 'ACCOUNT_DISABLED'],
  'ARCHIVED': ['ARCHIVED'],
  'DELETED': ['DELETED']
};

const StatusFilter = ({ selectedStatuses, onChange }: StatusFilterProps) => {
  const [open, setOpen] = useState(false);

  // Helper to check if a main status is considered "selected"
  // It is selected if ANY of its variants are in the selectedStatuses array
  const isSelected = (mainStatus: string) => {
    const variants = STATUS_VARIANTS[mainStatus] || [mainStatus];
    // We consider it selected if the main variant is selected, or if all variants are selected.
    // For simplicity, let's check if the primary variant is there.
    return variants.some(v => selectedStatuses.includes(v));
  };

  const handleToggle = (mainStatus: string) => {
    const variants = STATUS_VARIANTS[mainStatus] || [mainStatus];
    const currentlySelected = isSelected(mainStatus);

    let newSelected: string[];

    if (currentlySelected) {
      // Deselect: Remove ALL variants of this status
      newSelected = selectedStatuses.filter(s => !variants.includes(s));
    } else {
      // Select: Add ALL variants of this status
      // Filter out duplicates just in case
      const toAdd = variants.filter(v => !selectedStatuses.includes(v));
      newSelected = [...selectedStatuses, ...toAdd];
    }

    onChange(newSelected);
  };

  const handleSelectAll = () => {
    const allVariants = Object.values(STATUS_VARIANTS).flat();
    // If all are selected (or close to it), clear all. Otherwise select all.
    // Simple check: if we have most statuses, clear.
    if (selectedStatuses.length >= allVariants.length - 2) {
      onChange([]);
    } else {
      onChange(allVariants);
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-dashed">
          <Filter className="w-3.5 h-3.5 mr-1" />
          Trạng thái
          {selectedStatuses.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-secondary text-secondary-foreground rounded-sm font-medium">
              {selectedStatuses.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium leading-none">Lọc trạng thái</h4>
            {selectedStatuses.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                onClick={handleClear}
              >
                Xóa lọc
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((status) => (
              <div key={status.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status.value}`}
                  checked={isSelected(status.value)}
                  onCheckedChange={() => handleToggle(status.value)}
                />
                <label
                  htmlFor={`status-${status.value}`}
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1 py-1"
                >
                  <span className="flex items-center gap-2">
                    <span>{status.icon}</span>
                    {status.label.replace(status.icon + " ", "")}
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default StatusFilter;
