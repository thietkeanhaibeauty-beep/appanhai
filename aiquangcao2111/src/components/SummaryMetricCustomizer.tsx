import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MetricOption {
  key: string;
  label: string;
  group: string;
}

const METRIC_OPTIONS: MetricOption[] = [
  // Marketing - Chi phí
  { key: 'spend', label: 'Chi tiêu', group: 'Marketing - Chi phí' },
  { key: 'costPerResult', label: 'Chi phí/Kết quả', group: 'Marketing - Chi phí' },
  { key: 'budget', label: 'Ngân sách', group: 'Marketing - Chi phí' },
  { key: 'costPerPhone', label: 'Chi phí trên SDT', group: 'Marketing - Chi phí' },
  { key: 'dailyMarketingCost', label: 'Chi phí MKT trên ngày', group: 'Marketing - Chi phí' },
  
  // Marketing - Hiệu suất
  { key: 'results', label: 'Kết quả', group: 'Marketing - Hiệu suất' },
  { key: 'impressions', label: 'Hiển thị', group: 'Marketing - Hiệu suất' },
  { key: 'clicks', label: 'Nhấp chuột', group: 'Marketing - Hiệu suất' },
  
  // Marketing - Chuyển đổi
  { key: 'phones', label: 'SDT', group: 'Marketing - Chuyển đổi' },
  
  // Sale - Chi phí
  { key: 'costPerAppointment', label: 'Chi phí/Đặt lịch', group: 'Sale - Chi phí' },
  { key: 'costPerCustomer', label: 'Chi phí/Khách hàng', group: 'Sale - Chi phí' },
  { key: 'marketingCostPerRevenue', label: 'Chi phí MKT trên DT', group: 'Sale - Chi phí' },
  
  // Sale - Chuyển đổi
  { key: 'appointments', label: 'Số đặt lịch', group: 'Sale - Chuyển đổi' },
  { key: 'customers', label: 'Số khách hàng', group: 'Sale - Chuyển đổi' },
  { key: 'revenue', label: 'Doanh thu', group: 'Sale - Chuyển đổi' },
  { key: 'conversionRate', label: 'Tỷ lệ chuyển đổi', group: 'Sale - Chuyển đổi' },
];

interface SummaryMetricCustomizerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMetrics: string[];
  onMetricsChange: (metrics: string[]) => void;
}

const SummaryMetricCustomizer = ({ 
  open, 
  onOpenChange, 
  selectedMetrics, 
  onMetricsChange 
}: SummaryMetricCustomizerProps) => {
  const [tempSelectedMetrics, setTempSelectedMetrics] = useState<string[]>(selectedMetrics);

  useEffect(() => {
    setTempSelectedMetrics(selectedMetrics);
  }, [selectedMetrics, open]);

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

  const handleSelectAll = (group: string) => {
    const groupMetrics = metricsByGroup[group].map(m => m.key);
    const allSelected = groupMetrics.every(m => tempSelectedMetrics.includes(m));
    
    if (allSelected) {
      setTempSelectedMetrics(prev => prev.filter(m => !groupMetrics.includes(m)));
    } else {
      setTempSelectedMetrics(prev => [...new Set([...prev, ...groupMetrics])]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] bg-background">
        <DialogHeader>
          <DialogTitle>Tùy chỉnh cột - Cấp Tổng thông tin</DialogTitle>
          <DialogDescription>
            Chọn các chỉ số bạn muốn hiển thị trong phần tổng quan.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(metricsByGroup).map(([group, metrics]) => (
              <div key={group} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{group}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => handleSelectAll(group)}
                  >
                    {metrics.every(m => tempSelectedMetrics.includes(m.key)) ? 'Bỏ chọn' : 'Chọn tất cả'}
                  </Button>
                </div>
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

export default SummaryMetricCustomizer;
