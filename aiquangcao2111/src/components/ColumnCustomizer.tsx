import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ALL_FIELDS, FieldMetadata } from "@/services/adsFieldsMetadata";

interface ColumnCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

const ColumnCustomizer = ({ open, onOpenChange, selectedFields, onFieldsChange }: ColumnCustomizerProps) => {
  const [tempSelectedFields, setTempSelectedFields] = useState<string[]>(selectedFields);

  useEffect(() => {
    setTempSelectedFields(selectedFields);
  }, [selectedFields, open]);

  // Group fields by category
  const fieldsByGroup = ALL_FIELDS.reduce((acc, field) => {
    if (!acc[field.group]) {
      acc[field.group] = [];
    }
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, FieldMetadata[]>);

  const handleToggle = (fieldName: string) => {
    setTempSelectedFields(prev => 
      prev.includes(fieldName) 
        ? prev.filter(f => f !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleApply = () => {
    onFieldsChange(tempSelectedFields);
    onOpenChange(false);
  };

  const handleSelectAll = (group: string) => {
    const groupFields = fieldsByGroup[group].map(f => f.field);
    const allSelected = groupFields.every(f => tempSelectedFields.includes(f));
    
    if (allSelected) {
      setTempSelectedFields(prev => prev.filter(f => !groupFields.includes(f)));
    } else {
      setTempSelectedFields(prev => [...new Set([...prev, ...groupFields])]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] bg-background">
        <DialogHeader>
          <DialogTitle>Cài đặt hiển thị cột</DialogTitle>
          <DialogDescription>
            Chọn các chỉ số bạn muốn hiển thị trong bảng.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(fieldsByGroup).map(([group, fields]) => (
              <div key={group} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{group}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleSelectAll(group)}
                  >
                    {fields.every(f => tempSelectedFields.includes(f.field)) ? 'Bỏ chọn' : 'Chọn tất cả'}
                  </Button>
                </div>
                <div className="space-y-2">
                  {fields.map((field) => (
                    <div key={field.field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.field}
                        checked={tempSelectedFields.includes(field.field)}
                        onCheckedChange={() => handleToggle(field.field)}
                      />
                      <Label
                        htmlFor={field.field}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {field.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={handleApply}>
            Áp dụng ({tempSelectedFields.length} cột)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnCustomizer;
