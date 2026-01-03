import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { AutomationRule, RuleScope, TimeRange, ConditionLogic, RuleCondition, RuleAction, RuleStep, SCOPE_LABELS, TIME_RANGE_LABELS } from "@/types/automationRules";
import { ConditionBuilder } from "./automation/ConditionBuilder";
import { ActionBuilder } from "./automation/ActionBuilder";
import { LabelManagementSection } from "./automation/LabelManagementSection";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Settings, X, Trash2, AlertCircle, Shield, Plus, Layers } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteLabel } from "@/services/nocodb/campaignLabelsService";
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

interface AutomatedRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (rule: Partial<AutomationRule>) => void;
  rule?: AutomationRule;
  availableLabels?: Array<{ Id: number; label_name: string; label_color: string }>;
  onLabelsChange?: () => void;
  userId?: string;
  currency?: string; // ✅ NEW: Currency Prop
}

export const AutomatedRulesDialog = ({
  open,
  onOpenChange,
  onSave,
  rule,
  availableLabels = [],
  onLabelsChange,
  userId,
  currency = 'VND' // Default to VND if not provided
}: AutomatedRulesDialogProps) => {
  const [ruleName, setRuleName] = useState('');
  const [scope, setScope] = useState<RuleScope>('campaign');
  const [timeRange, setTimeRange] = useState<TimeRange>('7_days');

  const [customDays, setCustomDays] = useState<number | string>(7);
  const [useTimeframe, setUseTimeframe] = useState(true);
  const [conditionLogic, setConditionLogic] = useState<ConditionLogic>('all');
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [actions, setActions] = useState<RuleAction[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [targetLabels, setTargetLabels] = useState<string[]>([]);
  const [enableDryRun, setEnableDryRun] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [labelsExpanded, setLabelsExpanded] = useState(false); // NEW: Collapsible labels
  const [targetLabelsExpanded, setTargetLabelsExpanded] = useState(false); // NEW
  const [confirmDeleteLabel, setConfirmDeleteLabel] = useState<{ Id: number; label_name: string; label_color: string } | null>(null);
  const [isDeletingLabel, setIsDeletingLabel] = useState(false);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);

  // Advanced settings
  const [enableAutoSchedule, setEnableAutoSchedule] = useState(false);
  const [checkFrequency, setCheckFrequency] = useState<number | string>(1);
  const [enableSafeGuards, setEnableSafeGuards] = useState(false);
  const [maxBudgetDailySpend, setMaxBudgetDailySpend] = useState(500000);
  const [minRoasThreshold, setMinRoasThreshold] = useState(1.5);
  const [enableExecutionLimits, setEnableExecutionLimits] = useState(true);
  const [maxExecutionsPerObject, setMaxExecutionsPerObject] = useState(1);

  const [cooldownHours, setCooldownHours] = useState(24);
  const [resetDaily, setResetDaily] = useState(false);

  // 🥇 Override conditions (Golden Rules feature)
  const [enableOverride, setEnableOverride] = useState(false);
  const [overrideConditions, setOverrideConditions] = useState<RuleCondition[]>([]);
  const [overrideConditionLogic, setOverrideConditionLogic] = useState<ConditionLogic>('all');

  // 🔗 Multi-step rules
  const [steps, setSteps] = useState<RuleStep[]>([]);

  useEffect(() => {
    if (rule) {
      setRuleName(rule.rule_name);
      setScope(rule.scope);
      setTimeRange(rule.time_range || '7_days'); // ✅ FIX: Load saved time_range
      setUseTimeframe(rule.time_range !== 'lifetime');
      setConditionLogic(rule.condition_logic || 'all');
      setConditions(rule.conditions || []);

      // ✅ FIX: Load actions and determine revertMode if missing
      const parsedActions = rule.actions || [];

      const initializedActions = parsedActions.map((action: RuleAction) => {
        if (action.autoRevert && !action.revertMode) {
          if (action.revertAfterHours && action.revertAfterHours > 0) {
            return { ...action, revertMode: 'after_duration' as const };
          } else {
            return { ...action, revertMode: 'fixed_time' as const };
          }
        }
        return action;
      });
      setActions(initializedActions);
      setSelectedLabels([...new Set((rule.labels || []).map(String))]);
      setTargetLabels([...new Set((rule.target_labels || []).map(String))]);

      const settings = rule.advanced_settings || {};
      if (rule.time_range === 'custom' && settings.customDays) {
        setCustomDays(settings.customDays);
      }
      setEnableAutoSchedule(settings.enableAutoSchedule || false);
      setCheckFrequency(settings.checkFrequency || 1);
      setEnableSafeGuards(settings.enableSafeGuards || false);
      setMaxBudgetDailySpend(settings.maxBudgetDailySpend || 500000);
      setMinRoasThreshold(settings.minRoasThreshold || 1.5);
      setEnableExecutionLimits(settings.enableExecutionLimits !== false); // Default true
      setMaxExecutionsPerObject(settings.maxExecutionsPerObject || 1);

      setCooldownHours(settings.cooldownHours || 24);
      setResetDaily(settings.resetDaily || false);

      // 🥇 Load override conditions (Golden Rules)
      setEnableOverride(settings.enableOverride || false);
      setOverrideConditions(settings.overrideConditions || []);
      setOverrideConditionLogic(settings.overrideConditionLogic || 'all');

      // 🔗 Load multi-step rules
      setSteps(rule.steps || []);
    } else if (!rule && !open) {
      // ✅ Only reset form when dialog is closed (not when availableLabels changes)
      resetForm();
    }
  }, [rule, open]); // ✅ Remove availableLabels from dependency to prevent reset on label creation

  const resetForm = () => {
    setRuleName('');
    setScope('campaign');
    setTimeRange('7_days');
    setCustomDays(7);
    setUseTimeframe(true);
    setConditionLogic('all');
    setConditions([]);
    setActions([]);
    setSelectedLabels([]);
    setTargetLabels([]);
    setEnableDryRun(false);
    setEnableAutoSchedule(false);
    setCheckFrequency(1);
    setEnableSafeGuards(false);
    setMaxBudgetDailySpend(500000);
    setMinRoasThreshold(1.5);
    setEnableExecutionLimits(true);

    setResetDaily(false);
    setAdvancedOpen(false);

    // 🥇 Reset override conditions
    setEnableOverride(false);
    setOverrideConditions([]);
    setOverrideConditionLogic('all');

    // 🔗 Reset steps
    setSteps([]);
  };

  const handleSave = () => {
    // ✅ Validate conditions
    if (conditions.length === 0) {
      sonnerToast.error("Vui lòng thêm ít nhất 1 điều kiện");
      return;
    }

    // ✅ Validate actions
    if (actions.length === 0) {
      sonnerToast.error("Vui lòng thêm ít nhất 1 hành động");
      return;
    }

    // ✅ NEW: Validate auto-revert time
    const actionMissingTime = actions.find(a =>
      a.autoRevert && !a.revertAtTime && !a.revertAfterHours
    );

    if (actionMissingTime) {
      sonnerToast.error("⚠️ Vui lòng chọn giờ bật lại cho hành động 'Tự động bật lại'");
      return;
    }

    // ✅ Validation
    if (availableLabels.length === 0) {
      sonnerToast.error("Vui lòng tạo ít nhất 1 nhãn trước khi lưu quy tắc");
      return;
    }

    if (targetLabels.length === 0) {
      sonnerToast.error("Vui lòng chọn ít nhất 1 nhãn để áp dụng quy tắc");
      return;
    }

    if (!userId) {
      sonnerToast.error('Thiếu userId, vui lòng đăng nhập lại');
      return;
    }

    const ruleData: Partial<AutomationRule> = {
      ...(rule?.id && { id: rule.id }),
      ...(rule?.Id && { Id: rule.Id }),
      rule_name: ruleName,
      scope,
      time_range: useTimeframe ? timeRange : 'lifetime',
      is_active: rule?.is_active ?? true,
      conditions,
      condition_logic: conditionLogic,
      actions,
      labels: [...new Set(selectedLabels)], // Dedupe
      target_labels: [...new Set(targetLabels)], // Dedupe to prevent duplicates
      user_id: rule?.user_id || userId,
      created_at: rule?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      advanced_settings: {
        ...(timeRange === 'custom' && { customDays: Number(customDays) || 7 }),
        enableAutoSchedule,
        checkFrequency: 1, // Enforce 1 minute frequency as per strict requirement
        enableSafeGuards,
        maxBudgetDailySpend,
        minRoasThreshold,
        enableExecutionLimits,
        maxExecutionsPerObject,

        cooldownHours,
        resetDaily,

        // 🥇 Override conditions (Golden Rules)
        enableOverride,
        overrideConditions,
        overrideConditionLogic,
      },
      // 🔗 Multi-step rules
      steps: steps.length > 0 ? steps : undefined,
    };

    onSave(ruleData);
    onOpenChange(false);
    resetForm();
  };

  // ✅ CRITICAL FIX: Require conditions, actions, and target labels
  const canSave = Boolean(ruleName.trim())
    && conditions.length > 0
    && actions.length > 0
    && availableLabels.length > 0
    && targetLabels.length > 0;

  const toggleLabel = (labelId: string, isTarget: boolean = false) => {
    const setter = isTarget ? setTargetLabels : setSelectedLabels;
    const current = isTarget ? targetLabels : selectedLabels;

    if (current.includes(labelId)) {
      setter(current.filter(id => id !== labelId));
    } else {
      setter([...current, labelId]);
    }
  };

  const handleDeleteLabel = async () => {
    if (!confirmDeleteLabel) return;

    setIsDeletingLabel(true);
    setIsLoadingLabels(true);
    try {
      await deleteLabel(confirmDeleteLabel.Id);
      sonnerToast.success(`Đã xóa nhãn "${confirmDeleteLabel.label_name}"`);

      // Remove deleted label from selected labels
      const deletedLabelId = String(confirmDeleteLabel.Id);
      setSelectedLabels(prev => prev.filter(id => id !== deletedLabelId));
      setTargetLabels(prev => prev.filter(id => id !== deletedLabelId));

      await onLabelsChange?.();
    } catch (error: any) {
      console.error('Error deleting label:', error);
      sonnerToast.error(`Lỗi: ${error.message}`);
    } finally {
      setIsDeletingLabel(false);
      setIsLoadingLabels(false);
      setConfirmDeleteLabel(null);
    }
  };

  const handleLabelsChange = async () => {
    setIsLoadingLabels(true);
    try {
      await onLabelsChange?.();
    } finally {
      setIsLoadingLabels(false);
    }
  };

  const getSummary = () => {
    const parts = [];
    if (conditions.length > 0) {
      parts.push(`${conditions.length} điều kiện`);
    }
    if (actions.length > 0) {
      parts.push(`${actions.length} hành động`);
    }
    if (enableAutoSchedule) {
      parts.push(`Tự động mỗi ${checkFrequency}p`);
    }
    if (enableSafeGuards) {
      parts.push(`Ngân sách tối đa ${maxBudgetDailySpend.toLocaleString()}, Hiệu quả tối thiểu (ROAS) ${minRoasThreshold}`);
    }
    return parts.length > 0 ? parts.join(' • ') : 'Chưa đặt tên';
  };

  return (
    <>
      <Dialog open={open && !confirmDeleteLabel} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">
              {rule ? 'Chỉnh sửa quy tắc' : 'Tạo quy tắc mới'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Thiết lập điều kiện và hành động tự động
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Basic Info */}
            <div className="space-y-2">
              <div>
                <Label htmlFor="rule-name" className="text-xs">Tên quy tắc</Label>
                <Input
                  id="rule-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="Ví dụ: Tắt chiến dịch kém hiệu quả"
                  className="mt-1 h-8 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="scope" className="text-xs">Phạm vi</Label>
                  <Select value={scope} onValueChange={(v) => {
                    const newScope = v as RuleScope;
                    if (newScope !== scope && conditions.length > 0) {
                      setConditions([]);
                      sonnerToast.info(`Đã đổi phạm vi`);
                    }
                    setScope(newScope);
                  }}>
                    <SelectTrigger id="scope" className="mt-1 h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="timeRange">Khung thời gian</Label>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!useTimeframe}
                        onCheckedChange={(checked) => {
                          setUseTimeframe(!checked);
                          if (checked) setTimeRange('lifetime');
                        }}
                      />
                      <span className="text-xs text-muted-foreground">Suất đời</span>
                    </div>
                  </div>
                  <Select
                    value={timeRange}
                    onValueChange={(v) => setTimeRange(v as TimeRange)}
                    disabled={!useTimeframe}
                  >
                    <SelectTrigger id="timeRange">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Tùy chỉnh</SelectItem>
                    </SelectContent>
                  </Select>
                  {timeRange === 'custom' && useTimeframe && (
                    <Input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                      placeholder="Số ngày"
                      className="mt-2"
                      min="1"
                    />
                  )}
                </div>

                <div>
                  <Label htmlFor="logic">Điều kiện (Thỏa mãn)</Label>
                  <Select value={conditionLogic} onValueChange={(v) => setConditionLogic(v as ConditionLogic)}>
                    <SelectTrigger id="logic" className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tất cả (AND)</SelectItem>
                      <SelectItem value="any">Bất kỳ (OR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Conditions */}
            <div>
              <Label className="text-sm font-medium mb-2 block">NẾU (Điều kiện)</Label>
              <ConditionBuilder
                conditions={conditions}
                onChange={setConditions}
              />
            </div>

            <Separator />

            {/* Actions */}
            <div>
              <Label className="text-sm font-medium mb-2 block">THÌ (Hành động)</Label>
              <ActionBuilder
                actions={actions}
                onChange={setActions}
                availableLabels={availableLabels}
                currency={currency} // ✅ Pass currency down
              />

              {/* Warning for Campaign scope with budget actions */}
              {scope === 'campaign' && actions.some(a => a.type === 'increase_budget' || a.type === 'decrease_budget') && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>⚠️ Cảnh báo về ngân sách Campaign</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">
                      Nếu campaign đang dùng <strong>Adset Budget</strong> (không phải CBO),
                      rule sẽ <strong>KHÔNG thể chạy</strong> và báo lỗi để tránh tăng ngân sách gấp nhiều lần.
                    </p>
                    <p className="text-sm">
                      💡 <strong>Khuyến nghị:</strong>
                    </p>
                    <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                      <li>Chọn scope <strong>"Ad Set"</strong> và gắn label cho các adset cụ thể</li>
                      <li>Hoặc chuyển campaign sang <strong>Campaign Budget Optimization (CBO)</strong></li>
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* 🔗 Multi-step IF-THEN */}
            {steps.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3 h-3 text-purple-600" />
                    <Label className="text-sm text-purple-700">Bước tiếp theo</Label>
                  </div>

                  {steps.map((step, index) => (
                    <div key={step.id} className="border border-purple-200 rounded p-2 bg-purple-50/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 text-xs h-5 px-1.5">
                            {index + 2}
                          </Badge>
                          <Select
                            value={step.logic}
                            onValueChange={(v) => {
                              setSteps(prev => prev.map(s =>
                                s.id === step.id ? { ...s, logic: v as 'OR' | 'AND' } : s
                              ));
                            }}
                          >
                            <SelectTrigger className="w-20 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OR">HOẶC</SelectItem>
                              <SelectItem value="AND">VÀ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setSteps(prev => prev.filter(s => s.id !== step.id))}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </div>

                      {/* Step Conditions - Compact */}
                      <div className="pl-2 border-l-2 border-green-400">
                        <ConditionBuilder
                          conditions={step.conditions}
                          onChange={(newConds) => {
                            setSteps(prev => prev.map(s =>
                              s.id === step.id ? { ...s, conditions: newConds } : s
                            ));
                          }}
                        />
                      </div>

                      {/* Step Action - Compact */}
                      <div className="pl-2 border-l-2 border-red-400">
                        <ActionBuilder
                          actions={step.action ? [step.action] : []}
                          onChange={(newActions) => {
                            setSteps(prev => prev.map(s =>
                              s.id === step.id ? { ...s, action: newActions[0] || step.action } : s
                            ));
                          }}
                          availableLabels={availableLabels}
                          currency={currency}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Button to add new step */}
            <Button
              variant="outline"
              className="w-full border-dashed border-purple-300 text-purple-600 hover:bg-purple-50"
              onClick={() => {
                setSteps(prev => [...prev, {
                  id: crypto.randomUUID(),
                  order: prev.length + 1,
                  logic: 'OR',
                  conditions: [],
                  condition_logic: 'all',
                  action: { id: crypto.randomUUID(), type: 'turn_off' }
                }]);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              + Thêm bước IF-THEN (quyền cao hơn)
            </Button>

            <Separator />

            {/* Labels */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Nhãn dán (phân loại)</Label>
                  {availableLabels.length > 5 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setLabelsExpanded(!labelsExpanded)}
                    >
                      {labelsExpanded ? 'Thu gọn' : `Xem thêm (${availableLabels.length})`}
                    </button>
                  )}
                </div>
                {availableLabels.length === 0 ? (
                  <p className="text-xs text-muted-foreground mt-1">Chưa có nhãn nào.</p>
                ) : (
                  <div className={cn(
                    "flex flex-wrap gap-1.5 mt-1.5 overflow-hidden transition-all",
                    labelsExpanded ? "max-h-none" : "max-h-8"
                  )}>
                    {availableLabels.map(label => {
                      const isSelected = selectedLabels.includes(String(label.Id));
                      return (
                        <Badge
                          key={label.Id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-all text-xs py-0.5 px-2",
                            isSelected && "ring-1"
                          )}
                          style={isSelected ? { backgroundColor: label.label_color } : {}}
                          onClick={!isSelected ? () => toggleLabel(String(label.Id), false) : undefined}
                        >
                          <span className={isSelected ? "text-white" : ""}>
                            {label.label_name}
                          </span>
                          {isSelected && (
                            <button
                              type="button"
                              className="ml-1 hover:bg-white/20 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLabel(String(label.Id), false);
                              }}
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Áp dụng cho nhãn *</Label>
                  {availableLabels.length > 5 && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => setTargetLabelsExpanded(!targetLabelsExpanded)}
                    >
                      {targetLabelsExpanded ? 'Thu gọn' : `Xem thêm`}
                    </button>
                  )}
                </div>
                {availableLabels.length === 0 ? (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Tạo nhãn trước</p>
                ) : targetLabels.length === 0 ? (
                  <p className="text-xs text-destructive mt-1">⚠️ Phải chọn ít nhất 1 nhãn</p>
                ) : null}
                {availableLabels.length > 0 && (
                  <div className={cn(
                    "flex flex-wrap gap-1.5 mt-1.5 overflow-hidden transition-all",
                    targetLabelsExpanded ? "max-h-none" : "max-h-8"
                  )}>
                    {availableLabels.map(label => {
                      const isSelected = targetLabels.includes(String(label.Id));
                      return (
                        <Badge
                          key={label.Id}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-all text-xs py-0.5 px-2",
                            isSelected && "ring-1"
                          )}
                          style={isSelected ? { backgroundColor: label.label_color } : {}}
                          onClick={!isSelected ? () => toggleLabel(String(label.Id), true) : undefined}
                        >
                          <span className={isSelected ? "text-white" : ""}>
                            {label.label_name}
                          </span>
                          {isSelected && (
                            <button
                              type="button"
                              className="ml-1 hover:bg-white/20 rounded-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLabel(String(label.Id), true);
                              }}
                            >
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          )}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Label Management Section */}
            {onLabelsChange && (
              <>
                <LabelManagementSection
                  availableLabels={availableLabels}
                  onLabelsChange={handleLabelsChange}
                  onDeleteClick={setConfirmDeleteLabel}
                  isLoading={isLoadingLabels}
                  userId={userId}
                />
                <Separator />
              </>
            )}

            {/* Advanced Settings */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Cài đặt nâng cao
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    advancedOpen && "rotate-180"
                  )} />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 pt-4">
                <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Tự động chạy định kỳ</Label>
                      <p className="text-xs text-muted-foreground">
                        Kiểm tra điều kiện và thực thi theo lịch
                      </p>
                    </div>
                    <Switch
                      checked={enableAutoSchedule}
                      onCheckedChange={setEnableAutoSchedule}
                    />
                  </div>

                  {enableAutoSchedule && (
                    <div>
                      {/* Frequency locked to 1 min */}
                      <p className="text-sm text-muted-foreground mt-2 px-1">
                        ⚡ Tần suất kiểm tra: 1 phút (Mặc định)
                      </p>
                    </div>
                  )}

                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Giới hạn an toàn</Label>
                        <p className="text-xs text-muted-foreground">
                          Ngăn thay đổi ngân sách quá mức
                        </p>
                      </div>
                      <Switch
                        checked={enableSafeGuards}
                        onCheckedChange={setEnableSafeGuards}
                      />
                    </div>

                    {enableSafeGuards && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="maxBudget">Ngân sách tối đa (VNĐ/ngày)</Label>
                          <Input
                            id="maxBudget"
                            type="number"
                            value={maxBudgetDailySpend}
                            onChange={(e) => setMaxBudgetDailySpend(parseInt(e.target.value) || 500000)}
                            className="mt-1.5"
                            min="0"
                          />
                        </div>
                        <div>
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <Label htmlFor="minRoas">Hiệu quả tối thiểu (ROAS)</Label>
                              <Switch
                                checked={minRoasThreshold > 0}
                                onCheckedChange={(checked) => setMinRoasThreshold(checked ? 1.5 : 0)}
                              />
                            </div>
                            {minRoasThreshold > 0 && (
                              <Input
                                id="minRoas"
                                type="number"
                                step="0.1"
                                value={minRoasThreshold}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setMinRoasThreshold(isNaN(val) ? 0 : val);
                                }}
                                className="mt-1.5"
                                min="0"
                              />
                            )}
                            {minRoasThreshold === 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Đã tắt kiểm tra ROAS. Quy tắc sẽ chạy dựa trên kết quả/chi phí.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Giới hạn thực thi</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Ngăn rule tăng/giảm ngân sách liên tục trên cùng 1 campaign/adset
                        </p>
                      </div>
                      <Switch
                        checked={enableExecutionLimits}
                        onCheckedChange={setEnableExecutionLimits}
                      />
                    </div>

                    {enableExecutionLimits && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="maxExecutions">Số lần tối đa</Label>
                          <p className="text-xs text-muted-foreground mb-1.5">
                            Số lần rule có thể thực thi trên cùng 1 object (1 = chỉ tăng 1 lần)
                          </p>
                          <Input
                            id="maxExecutions"
                            type="number"
                            value={maxExecutionsPerObject}
                            onChange={(e) => setMaxExecutionsPerObject(Math.max(1, parseInt(e.target.value) || 1))}
                            className="mt-1.5"
                            min="1"
                          />
                        </div>



                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <div>
                              <Label htmlFor="resetDaily">Reset giới hạn mỗi ngày (00:00)</Label>
                              <p className="text-xs text-muted-foreground">
                                Nếu bật: Số lần thực thi sẽ được reset vào đầu ngày mới (giờ VN)
                              </p>
                            </div>
                            <Switch
                              id="resetDaily"
                              checked={resetDaily}
                              onCheckedChange={setResetDaily}
                            />
                          </div>
                        </div>

                        {!resetDaily && (
                          <div>
                            <Label htmlFor="cooldown">Thời gian chờ (giờ)</Label>
                            <p className="text-xs text-muted-foreground mb-1.5">
                              Số giờ phải chờ trước khi rule có thể chạy lại trên cùng object (Trượt 24h)
                            </p>
                            <Input
                              id="cooldown"
                              type="number"
                              value={cooldownHours}
                              onChange={(e) => setCooldownHours(Math.max(1, parseInt(e.target.value) || 24))}
                              className="mt-1.5"
                              min="1"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={!canSave}>
              {rule ? 'Lưu thay đổi' : 'Lưu quy tắc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Label Dialog - Outside main dialog */}
      <AlertDialog open={!!confirmDeleteLabel
      } onOpenChange={(open) => !open && setConfirmDeleteLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Xác nhận xóa nhãn
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Bạn có chắc chắn muốn xóa nhãn{' '}
                  {confirmDeleteLabel && (
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white mx-1"
                      style={{ backgroundColor: confirmDeleteLabel.label_color }}
                    >
                      {confirmDeleteLabel.label_name}
                    </span>
                  )}
                  ? Hành động này không thể hoàn tác.
                </p>
                <p className="mt-2 text-xs">
                  Lưu ý: Nhãn sẽ bị xóa khỏi tất cả quy tắc đang sử dụng.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingLabel}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLabel}
              disabled={isDeletingLabel}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeletingLabel ? 'Đang xóa...' : 'Xóa nhãn'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
