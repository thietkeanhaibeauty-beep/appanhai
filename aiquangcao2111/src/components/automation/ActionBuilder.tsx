import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, AlertCircle } from "lucide-react";
import { RuleAction, ActionType, ACTION_LABELS } from "@/types/automationRules";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ActionBuilderProps {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
  availableLabels?: Array<{ Id: number; label_name: string; label_color: string }>;
  currency?: string; // Dynamic currency prop
}

export function ActionBuilder({ actions, onChange, availableLabels = [], currency = 'VND' }: ActionBuilderProps) {
  const addAction = () => {
    const newAction: RuleAction = {
      id: crypto.randomUUID(),
      type: 'turn_off'
    };
    onChange([...actions, newAction]);
  };

  const updateAction = (id: string, field: keyof RuleAction, value: any) => {
    onChange(actions.map(a =>
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  const removeAction = (id: string) => {
    onChange(actions.filter(a => a.id !== id));
  };

  const needsValue = (type: ActionType) => {
    return type === 'increase_budget' || type === 'decrease_budget';
  };

  const needsLabel = (type: ActionType) => {
    return type === 'add_label';
  };

  return (
    <div className="space-y-3">
      {actions.map((action) => (
        <div key={action.id} className="p-3 border rounded-lg bg-muted/30 space-y-3">
          <div className="flex items-center gap-2">
            <Select
              value={action.type}
              onValueChange={(value) => {
                const newType = value as ActionType;
                const updates: Partial<RuleAction> = {
                  type: newType,
                  value: undefined
                };

                // Set default budgetMode for budget changes
                if (newType === 'increase_budget' || newType === 'decrease_budget') {
                  updates.budgetMode = 'percentage';
                } else {
                  updates.budgetMode = undefined;
                }

                // Single update call to avoid race conditions
                onChange(actions.map(a =>
                  a.id === action.id ? { ...a, ...updates } : a
                ));
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Chọn hành động">
                  {action.type && ACTION_LABELS[action.type]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ACTION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {needsValue(action.type) && (
              <div className="flex items-center gap-2 flex-1">
                <Select
                  value={action.budgetMode || 'percentage'}
                  onValueChange={(value) => updateAction(action.id, 'budgetMode', value)}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">%</SelectItem>
                    <SelectItem value="absolute">{currency}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="text"
                  value={((action.value as number) || 0).toLocaleString('vi-VN')}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[.,]/g, '');
                    const numValue = parseFloat(rawValue) || 0;
                    updateAction(action.id, 'value', numValue);
                  }}
                  placeholder="Nhập giá trị"
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {action.budgetMode === 'percentage' ? '%' : currency}
                </span>
              </div>
            )}

            {needsLabel(action.type) && (
              <Select
                value={action.value as string || ''}
                onValueChange={(value) => updateAction(action.id, 'value', value)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Chọn nhãn">
                    {action.value && availableLabels.find(l => String(l.Id) === action.value) && (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: availableLabels.find(l => String(l.Id) === action.value)?.label_color }}
                        />
                        {availableLabels.find(l => String(l.Id) === action.value)?.label_name}
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {availableLabels.map((label) => (
                    <SelectItem key={label.Id} value={String(label.Id)}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: label.label_color }}
                        />
                        {label.label_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeAction(action.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Schedule Time Section */}
          <div className="flex items-center gap-3 pl-2">
            <Switch
              id={`schedule-${action.id}`}
              checked={!!action.executeAt}
              onCheckedChange={(checked) => {
                updateAction(action.id, 'executeAt', checked ? '09:00' : undefined);
              }}
            />
            <Label htmlFor={`schedule-${action.id}`} className="text-sm cursor-pointer">
              Sử dụng thời gian
            </Label>
            {action.executeAt && (
              <Input
                type="time"
                value={action.executeAt}
                onChange={(e) => updateAction(action.id, 'executeAt', e.target.value)}
                className="w-32"
              />
            )}
          </div>

          {/* Auto-Revert Section - Only for turn_off */}
          {action.type === 'turn_off' && (
            <div className="ml-2 mt-2 p-3 bg-muted/50 rounded-lg border border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  id={`auto-revert-${action.id}`}
                  checked={action.autoRevert || false}
                  onCheckedChange={(checked) => {
                    onChange(actions.map(a =>
                      a.id === action.id ? {
                        ...a,
                        autoRevert: checked,
                        revertAtTime: undefined, // NO DEFAULT - user must select
                        revertAction: checked ? 'turn_on' : undefined
                      } : a
                    ));
                  }}
                />
                <Label htmlFor={`auto-revert-${action.id}`} className="text-sm cursor-pointer font-medium">
                  🔄 Tự động bật lại sau khi tắt
                </Label>
              </div>

              {action.autoRevert && (
                <>
                  <div className="flex items-center gap-4 ml-6 mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`revert-mode-time-${action.id}`}
                        name={`revert-mode-${action.id}`}
                        checked={action.revertMode === 'fixed_time' || (!action.revertMode && !action.revertAfterHours)}
                        onChange={() => {
                          onChange(actions.map(a =>
                            a.id === action.id ? { ...a, revertMode: 'fixed_time' as const, revertAfterHours: undefined, revertAtTime: action.revertAtTime || '09:00', revertAction: 'turn_on' } : a
                          ));
                        }}
                        className="cursor-pointer"
                      />
                      <Label htmlFor={`revert-mode-time-${action.id}`} className="cursor-pointer">Theo giờ cố định</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id={`revert-mode-duration-${action.id}`}
                        name={`revert-mode-${action.id}`}
                        checked={action.revertMode === 'after_duration'}
                        onChange={() => {
                          onChange(actions.map(a =>
                            a.id === action.id ? { ...a, revertMode: 'after_duration' as const, revertAtTime: undefined, revertAfterHours: action.revertAfterHours || 1, revertAction: 'turn_on' } : a
                          ));
                        }}
                        className="cursor-pointer"
                      />
                      <Label htmlFor={`revert-mode-duration-${action.id}`} className="cursor-pointer">Sau khoảng thời gian</Label>
                    </div>
                  </div>

                  {/* Option 1: Revert at Time */}
                  {(action.revertMode === 'fixed_time' || (!action.revertMode && !action.revertAfterHours)) && (
                    <div className="flex items-center gap-2 ml-6">
                      <Label className="text-sm text-muted-foreground mr-2">Bật lại vào lúc:</Label>

                      {/* Hour Select */}
                      <Select
                        value={action.revertAtTime ? action.revertAtTime.split(':')[0] : '09'}
                        onValueChange={(newHour) => {
                          const currentMinute = action.revertAtTime ? action.revertAtTime.split(':')[1] : '00';
                          onChange(actions.map(a =>
                            a.id === action.id ? { ...a, revertAtTime: `${newHour}:${currentMinute}` } : a
                          ));
                        }}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue placeholder="Giờ" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 24 }).map((_, i) => (
                            <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-xl font-bold text-muted-foreground">:</span>

                      {/* Minute Select */}
                      <Select
                        value={action.revertAtTime ? action.revertAtTime.split(':')[1] : '00'}
                        onValueChange={(newMinute) => {
                          const currentHour = action.revertAtTime ? action.revertAtTime.split(':')[0] : '09';
                          onChange(actions.map(a =>
                            a.id === action.id ? { ...a, revertAtTime: `${currentHour}:${newMinute}` } : a
                          ));
                        }}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue placeholder="Phút" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <SelectItem key={i * 5} value={(i * 5).toString().padStart(2, '0')}>
                              {(i * 5).toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <span className="text-xs text-muted-foreground ml-2">
                        (Giờ : Phút)
                      </span>
                    </div>
                  )}

                  {/* Option 2: Revert after Duration - Input in MINUTES */}
                  {action.revertMode === 'after_duration' && (
                    <div className="flex items-center gap-2 ml-6">
                      <Label className="text-sm text-muted-foreground">Bật lại sau:</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={action.revertAfterHours >= 0.01 ? Math.round(action.revertAfterHours * 60) : ''}
                        placeholder="5"
                        onChange={(e) => {
                          const inputVal = e.target.value;
                          if (inputVal === '' || inputVal === '0') {
                            // Keep a tiny value to maintain "duration mode" selection
                            onChange(actions.map(a =>
                              a.id === action.id ? { ...a, revertAfterHours: 0.001 } : a
                            ));
                          } else {
                            const minutes = parseInt(inputVal) || 0;
                            const hours = minutes / 60;
                            onChange(actions.map(a =>
                              a.id === action.id ? { ...a, revertAfterHours: hours } : a
                            ));
                          }
                        }}
                        className="w-20"
                      />
                      <span className="text-sm text-muted-foreground font-medium">phút</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Ví dụ: 5 = 5 phút, 60 = 1 giờ)
                      </span>
                    </div>
                  )}

                  {/* Warning nếu chưa chọn */}
                  {!action.revertAtTime && !action.revertAfterHours && (
                    <div className="ml-6 mt-2 text-xs text-destructive bg-destructive/10 p-2 rounded border border-destructive/30 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Bắt buộc phải chọn thời gian bật lại!</span>
                    </div>
                  )}

                  {/* Example khi đã chọn */}
                  {(action.revertAtTime || action.revertAfterHours) && (
                    <div className="ml-6 mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 p-2 rounded border border-blue-200 dark:border-blue-800">
                      💡 <strong>Ví dụ:</strong>
                      {(() => {
                        const now = new Date();
                        let revertDate = new Date();

                        if (action.revertAtTime) {
                          const [hours, minutes] = action.revertAtTime.split(':').map(Number);
                          revertDate.setHours(hours, minutes, 0, 0);
                          if (revertDate <= now) revertDate.setDate(revertDate.getDate() + 1);
                          return ` Tắt lúc ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')} → Bật lại vào ${action.revertAtTime} ${revertDate.getDate() === now.getDate() ? 'hôm nay' : 'ngày mai'}`;
                        } else if (action.revertAfterHours) {
                          const msToAdd = action.revertAfterHours * 60 * 60 * 1000;
                          revertDate = new Date(now.getTime() + msToAdd);
                          const minutes = Math.round(action.revertAfterHours * 60);
                          return ` Tắt ngay bây giờ → Bật lại lúc ${revertDate.getHours().toString().padStart(2, '0')}:${revertDate.getMinutes().toString().padStart(2, '0')} (Sau ${minutes} phút)`;
                        }
                        return '';
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {actions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Chưa có hành động nào. Nhấn "Thêm hành động" để bắt đầu.
        </div>
      )}

      <Button onClick={addAction} variant="outline" className="w-full">
        + Thêm hành động
      </Button>
    </div>
  );
}
