import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";
import { ALL_FIELDS, FieldMetadata } from "@/services/adsFieldsMetadata";
import { useToast } from "@/hooks/use-toast";

interface AdsTableColumnsCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
}

interface SavedPreset {
  name: string;
  fields: string[];
}

const STORAGE_KEY = "column_customizer_presets";

const AdsTableColumnsCustomizer = ({ open, onOpenChange, selectedFields, onFieldsChange }: AdsTableColumnsCustomizerProps) => {
  const { toast } = useToast();
  const [tempSelectedFields, setTempSelectedFields] = useState<string[]>(selectedFields);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  useEffect(() => {
    setTempSelectedFields(selectedFields);
    loadPresets();
  }, [selectedFields, open]);

  const loadPresets = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedPresets(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading presets:", error);
    }
  };

  const savePreset = () => {
    if (!presetName.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên định dạng",
        variant: "destructive",
      });
      return;
    }

    // Deduplicate fields before saving
    const uniqueFields = Array.from(new Set(tempSelectedFields));

    const newPreset: SavedPreset = {
      name: presetName.trim(),
      fields: uniqueFields,
    };

    const updatedPresets = [...savedPresets.filter(p => p.name !== newPreset.name), newPreset];
    setSavedPresets(updatedPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
    
    toast({
      title: "Đã lưu",
      description: `Định dạng "${newPreset.name}" đã được lưu`,
    });
    
    setPresetName("");
  };

  const loadPresetFields = (presetName: string) => {
    const preset = savedPresets.find(p => p.name === presetName);
    if (preset) {
      // Deduplicate fields when loading preset
      const uniqueFields = Array.from(new Set(preset.fields));
      setTempSelectedFields(uniqueFields);
      setSelectedPreset(presetName);
    }
  };

  const deletePreset = (presetName: string) => {
    const updatedPresets = savedPresets.filter(p => p.name !== presetName);
    setSavedPresets(updatedPresets);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPresets));
    
    if (selectedPreset === presetName) {
      setSelectedPreset("");
    }
    
    toast({
      title: "Đã xóa",
      description: `Định dạng "${presetName}" đã được xóa`,
    });
  };

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
    // Deduplicate fields before applying
    const uniqueFields = Array.from(new Set(tempSelectedFields));
    onFieldsChange(uniqueFields);
    onOpenChange(false);
  };

  const handleSelectAllInGroup = (group: string, fields: FieldMetadata[]) => {
    const groupFieldNames = fields.map(f => f.field);
    const allSelected = groupFieldNames.every(f => tempSelectedFields.includes(f));
    
    if (allSelected) {
      // Deselect all in group
      setTempSelectedFields(prev => prev.filter(f => !groupFieldNames.includes(f)));
    } else {
      // Select all in group
      setTempSelectedFields(prev => {
        const newFields = [...prev];
        groupFieldNames.forEach(f => {
          if (!newFields.includes(f)) {
            newFields.push(f);
          }
        });
        return newFields;
      });
    }
  };

  const isGroupFullySelected = (fields: FieldMetadata[]) => {
    return fields.every(f => tempSelectedFields.includes(f.field));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] bg-background">
        <DialogHeader>
          <DialogTitle>Tùy chỉnh cột - Cấp chi tiết quảng cáo</DialogTitle>
          <DialogDescription>
            Chọn các chỉ số bạn muốn hiển thị trong phần tổng quan.
          </DialogDescription>
        </DialogHeader>

        {/* Preset Management */}
        <div className="space-y-3 pb-4 border-b">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Nhập tên định dạng..."
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
            <Button onClick={savePreset} size="sm" className="gap-2">
              <Save className="h-4 w-4" />
              Lưu định dạng
            </Button>
          </div>

          {savedPresets.length > 0 && (
            <div className="flex gap-2 items-center">
              <Label className="text-sm whitespace-nowrap">Định dạng đã lưu:</Label>
              <Select value={selectedPreset} onValueChange={loadPresetFields}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Chọn định dạng..." />
                </SelectTrigger>
                <SelectContent>
                  {savedPresets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name} ({preset.fields.length} cột)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPreset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deletePreset(selectedPreset)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-6">
            {Object.entries(fieldsByGroup).map(([group, fields]) => (
              <div key={group} className="space-y-2">
                <div className="flex items-center justify-between sticky top-0 bg-background pb-1 border-b">
                  <h3 className="font-semibold text-sm">{group}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs px-2"
                    onClick={() => handleSelectAllInGroup(group, fields)}
                  >
                    {isGroupFullySelected(fields) ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {fields.map((field) => (
                    <div key={field.field} className="flex items-center space-x-2">
                      <Checkbox
                        id={field.field}
                        checked={tempSelectedFields.includes(field.field)}
                        onCheckedChange={() => handleToggle(field.field)}
                      />
                      <Label
                        htmlFor={field.field}
                        className="text-xs font-normal cursor-pointer leading-tight"
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

export default AdsTableColumnsCustomizer;
