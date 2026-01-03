import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MetricOption {
  key: string;
  label: string;
  group: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  // Cấp Quảng Cáo
  { key: 'weeklyBudget', label: 'Ngân sách tuần', group: 'Cấp Quảng Cáo' },
  { key: 'monthlyBudget', label: 'Ngân sách tháng', group: 'Cấp Quảng Cáo' },
  { key: 'quarterlyBudget', label: 'Ngân sách quý', group: 'Cấp Quảng Cáo' },
  { key: 'yearlyBudget', label: 'Ngân sách năm', group: 'Cấp Quảng Cáo' },
  { key: 'costPerPhone', label: 'Chi phí/SĐT', group: 'Cấp Quảng Cáo' },
  { key: 'dailyMarketingCost', label: 'Chi phí MKT trên ngày', group: 'Cấp Quảng Cáo' },
  { key: 'costPerActionType', label: 'Chi phí/loại hành động', group: 'Cấp Quảng Cáo' },

  // Marketing - Chi phí
  { key: 'spend', label: 'Chi tiêu', group: 'Marketing - Chi phí' },
  { key: 'costPerResult', label: 'Chi phí/Kết quả', group: 'Marketing - Chi phí' },
  { key: 'budget', label: 'Ngân sách', group: 'Marketing - Chi phí' },
  { key: 'adsetBudget', label: 'Ngân sách nhóm QC', group: 'Marketing - Chi phí' },

  // Marketing - Hiệu suất
  { key: 'results', label: 'Kết quả', group: 'Marketing - Hiệu suất' },
  { key: 'impressions', label: 'Hiển thị', group: 'Marketing - Hiệu suất' },
  { key: 'clicks', label: 'Nhấp chuột', group: 'Marketing - Hiệu suất' },

  // Marketing - Chuyển đổi
  { key: 'phones', label: 'SDT', group: 'Marketing - Chuyển đổi' },
];

interface OverviewMetricsCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
}

interface SavedPreset {
  name: string;
  metrics: string[];
}

const STORAGE_KEY = "summary_metric_presets";

const OverviewMetricsCustomizer = ({
  open,
  onOpenChange,
  selectedMetrics,
  onMetricsChange
}: OverviewMetricsCustomizerProps) => {
  const { toast } = useToast();
  const [tempSelectedMetrics, setTempSelectedMetrics] = useState<string[]>(selectedMetrics);
  const [presetName, setPresetName] = useState("");
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  useEffect(() => {
    setTempSelectedMetrics(selectedMetrics);
    loadPresets();
  }, [selectedMetrics, open]);

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

    const newPreset: SavedPreset = {
      name: presetName.trim(),
      metrics: tempSelectedMetrics,
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

  const loadPresetMetrics = (presetName: string) => {
    const preset = savedPresets.find(p => p.name === presetName);
    if (preset) {
      setTempSelectedMetrics(preset.metrics);
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

  // Group metrics by category
  const metricsByGroup = METRIC_OPTIONS.reduce((acc, metric) => {
    if (!acc[metric.group]) {
      acc[metric.group] = [];
    }
    acc[metric.group].push(metric);
    return acc;
  }, {} as Record<string, MetricOption[]>);

  const handleToggle = (metricKey: string) => {
    setTempSelectedMetrics(prev =>
      prev.includes(metricKey)
        ? prev.filter(m => m !== metricKey)
        : [...prev, metricKey]
    );
  };

  const handleApply = () => {
    onMetricsChange(tempSelectedMetrics);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
        <DialogHeader>
          <DialogTitle>Tùy chỉnh chỉ số tổng quan</DialogTitle>
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
              <Select value={selectedPreset} onValueChange={loadPresetMetrics}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Chọn định dạng..." />
                </SelectTrigger>
                <SelectContent>
                  {savedPresets.map((preset) => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name} ({preset.metrics.length} cột)
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

        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(metricsByGroup).map(([group, metrics]) => (
              <div key={group} className="space-y-3">
                <h3 className="font-semibold text-sm">{group}</h3>
                <div className="space-y-2">
                  {metrics.map((metric) => (
                    <div key={metric.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.key}
                        checked={tempSelectedMetrics.includes(metric.key)}
                        onCheckedChange={() => handleToggle(metric.key)}
                      />
                      <Label
                        htmlFor={metric.key}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {metric.label}
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
            Áp dụng ({tempSelectedMetrics.length} cột)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OverviewMetricsCustomizer;
