import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { RuleCondition, MetricType, OperatorType, METRIC_LABELS, OPERATOR_LABELS, METRIC_CATEGORIES } from "@/types/automationRules";
import { cn } from "@/lib/utils";

interface ConditionBuilderProps {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
}

export function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: crypto.randomUUID(),
      metric: 'spend',
      operator: 'greater_than',
      value: 0
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (id: string, field: keyof RuleCondition, value: any) => {
    onChange(conditions.map(c =>
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const removeCondition = (id: string) => {
    onChange(conditions.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className={cn("grid gap-2", conditions.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {conditions.map((condition) => (
          <div key={condition.id} className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
            <Select
              value={condition.metric}
              onValueChange={(value) => updateCondition(condition.id, 'metric', value as MetricType)}
            >
              <SelectTrigger className="flex-1 h-8 text-xs min-w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {/* Operator metrics */}
                <SelectGroup>
                  <SelectLabel>📊 Chỉ số Operator</SelectLabel>
                  {METRIC_CATEGORIES.operator.map(metric => (
                    <SelectItem key={metric} value={metric}>
                      {METRIC_LABELS[metric]}
                    </SelectItem>
                  ))}
                </SelectGroup>

                {/* Manager metrics */}
                <SelectGroup>
                  <SelectLabel>📈 Chỉ số Manager</SelectLabel>
                  {METRIC_CATEGORIES.manager.map(metric => (
                    <SelectItem key={metric} value={metric}>
                      {METRIC_LABELS[metric]}
                    </SelectItem>
                  ))}
                </SelectGroup>

                {/* Director metrics */}
                <SelectGroup>
                  <SelectLabel>💼 Chỉ số Director</SelectLabel>
                  {METRIC_CATEGORIES.director.map(metric => (
                    <SelectItem key={metric} value={metric}>
                      {METRIC_LABELS[metric]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={condition.operator}
              onValueChange={(value) => updateCondition(condition.id, 'operator', value as OperatorType)}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="text"
              value={condition.value.toLocaleString('vi-VN')}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[.,]/g, '');
                const numValue = parseFloat(rawValue) || 0;
                updateCondition(condition.id, 'value', numValue);
              }}
              className="flex-1 h-8 text-xs min-w-[60px]"
              placeholder="Giá trị"
            />

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => removeCondition(condition.id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {conditions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Chưa có điều kiện nào. Nhấn "Thêm điều kiện" để bắt đầu.
        </div>
      )}

      <Button onClick={addCondition} variant="outline" className="w-full">
        + Thêm điều kiện
      </Button>
    </div>
  );
}
