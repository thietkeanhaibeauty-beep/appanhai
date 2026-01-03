import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Play, Edit, Trash2, Clock, History, CheckCircle2, XCircle, Loader2, TrendingUp, AlertCircle, Tag, TestTube2, ChevronDown, ChevronUp } from "lucide-react";
import { AutomationRule, SCOPE_LABELS, TIME_RANGE_LABELS, METRIC_LABELS, OPERATOR_LABELS, ACTION_LABELS } from "@/types/automationRules";
import { format } from "date-fns";
import { useState } from "react";
import { ExecutionLogsDialog } from "./ExecutionLogsDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";

interface RuleCardProps {
  rule: AutomationRule;
  labels: Array<{ Id: number; label_name: string; label_color: string; user_id?: string }>;
  onToggleActive: (ruleId: string, currentState: boolean) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (ruleId: string) => void;
  onRun: (ruleId: string) => void;
  onTest?: (ruleId: string) => void; // ✅ New prop
  onAssignLabels?: (ruleId: string) => void;
  isRunning?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  assignmentCount?: number; // ✅ New prop
}

export function RuleCard({ rule, labels, onToggleActive, onEdit, onDelete, onRun, onTest, onAssignLabels, isRunning = false, onConfirm, onCancel, assignmentCount = 0 }: RuleCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [localRunning, setLocalRunning] = useState(false);
  const [localTesting, setLocalTesting] = useState(false); // ✅ New state
  const [localToggling, setLocalToggling] = useState(false); // ✅ New state for toggle switch

  // Check if rule has add_label action
  const hasLabelAction = rule.actions?.some(action => action.type === 'add_label');

  // ✅ Handle toggle with instant feedback (no waiting for API)
  const handleToggle = () => {
    if (localToggling) return; // Prevent double-click
    setLocalToggling(true);

    // Call parent handler - it has optimistic update already
    onToggleActive(rule.id, rule.is_active);

    // Reset toggling state after a short delay (API call runs in background)
    setTimeout(() => setLocalToggling(false), 300);
  };

  // ✅ Enhanced run handler with minimum loading time and toast notifications
  const handleRun = async () => {
    setLocalRunning(true);
    const startTime = Date.now();

    toast.info(`⏳ Đang chạy quy tắc "${rule.rule_name}"...`, {
      duration: 2000,
    });

    try {
      await onRun(rule.id);

      // Ensure minimum 500ms display time for loading state
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
      }

      toast.success(`✅ Quy tắc "${rule.rule_name}" đã chạy xong`, {
        duration: 3000,
      });
    } catch (error) {
      toast.error(`❌ Lỗi khi chạy quy tắc: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 5000,
      });
    } finally {
      setLocalRunning(false);
    }
  };

  // ✅ Handle Test (Dry Run)
  const handleTest = async () => {
    if (!onTest) return;
    setLocalTesting(true);
    const startTime = Date.now();

    toast.info(`🧪 Đang test (Dry Run) quy tắc "${rule.rule_name}"...`, {
      duration: 2000,
    });

    try {
      await onTest(rule.id);

      const elapsed = Date.now() - startTime;
      if (elapsed < 500) {
        await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
      }

      toast.success(`✅ Đã test xong quy tắc "${rule.rule_name}"`, {
        duration: 3000,
      });
    } catch (error) {
      toast.error(`❌ Lỗi khi test quy tắc: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 5000,
      });
    } finally {
      setLocalTesting(false);
    }
  };

  const getExecutionStatusBadge = () => {
    if (!rule.last_execution_status) return null;

    const statusConfig = {
      pending: {
        icon: Loader2,
        label: 'Đang chạy',
        variant: 'secondary' as const,
        className: 'text-blue-600 animate-spin'
      },
      success: {
        icon: CheckCircle2,
        label: 'Thành công',
        variant: 'default' as const,
        className: 'text-green-600'
      },
      partial: {
        icon: AlertCircle,
        label: 'Một phần',
        variant: 'secondary' as const,
        className: 'text-orange-600'
      },
      failed: {
        icon: XCircle,
        label: 'Thất bại',
        variant: 'destructive' as const,
        className: 'text-red-600'
      }
    };

    const config = statusConfig[rule.last_execution_status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5 text-xs">
        <Icon className={`w-3 h-3 ${config.className}`} />
        {config.label}
      </Badge>
    );
  };

  const getExecutionResults = () => {
    if (!rule.last_execution_log) return null;

    try {
      const results = typeof rule.last_execution_log === 'string'
        ? JSON.parse(rule.last_execution_log)
        : rule.last_execution_log;

      if (!results.results || results.results.length === 0) return null;

      return (
        <Collapsible open={showResults} onOpenChange={setShowResults}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-xs">
              <TrendingUp className="w-3 h-3" />
              Xem chi tiết ({results.results.length} hành động)
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {results.results.map((result: any, idx: number) => (
              <div key={idx} className="text-xs p-3 rounded-lg bg-muted/50 flex items-start gap-3 border border-border/50">
                {/* Icon trạng thái */}
                {result.result === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                ) : result.result === 'skipped' ? (
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                )}

                <div className="flex-1 space-y-1.5">
                  {/* Tên + ID chiến dịch */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{result.objectName || result.campaignName}</span>
                    {result.campaignId && (
                      <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">
                        {result.campaignId}
                      </Badge>
                    )}
                    {result.level && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {result.level === 'campaign' ? 'Chiến dịch' : result.level === 'adset' ? 'Nhóm QC' : 'Quảng cáo'}
                      </Badge>
                    )}
                  </div>

                  {/* Hành động */}
                  <div className="text-muted-foreground text-xs">
                    Hành động: <span className="font-medium">{ACTION_LABELS[result.action as any] || result.action}</span>
                  </div>

                  {/* Trạng thái badge */}
                  <div className="flex items-center gap-2">
                    {result.result === 'success' && (
                      <Badge variant="default" className="text-[10px] bg-green-600 hover:bg-green-700">
                        ✓ Hoàn thành
                      </Badge>
                    )}
                    {result.result === 'skipped' && (
                      <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                        ⏸ Bỏ qua
                      </Badge>
                    )}
                    {result.result === 'failed' && (
                      <Badge variant="destructive" className="text-[10px]">
                        ✗ Lỗi
                      </Badge>
                    )}
                    {result.executionCount !== undefined && (
                      <span className="text-[10px] text-muted-foreground">
                        ({result.executionCount} lần)
                      </span>
                    )}
                  </div>

                  {/* Chi tiết hoặc lỗi */}
                  {result.details && (
                    <div className="text-green-700 dark:text-green-400 text-xs mt-1 p-2 bg-green-50 dark:bg-green-900/20 rounded">
                      {result.details}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-red-600 dark:text-red-400 text-xs mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded">
                      <span className="font-medium">Lỗi:</span> {result.error}
                    </div>
                  )}
                  {result.reason && (
                    <div className="text-orange-600 dark:text-orange-400 text-xs mt-1 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
                      <span className="font-medium">Lý do:</span> {result.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    } catch (error) {
      console.error('Error parsing execution results:', error);
      return null;
    }
  };

  const getRuleLabels = () => {
    // Ensure rule.labels is an array of strings for comparison
    const ruleLabels = (Array.isArray(rule.labels) ? rule.labels : []).map((x: any) => String(x));
    return labels.filter(l => ruleLabels.includes(String(l.Id)));
  };

  const formatConditions = () => {
    if (!Array.isArray(rule.conditions) || rule.conditions.length === 0) {
      return <span className="text-sm text-muted-foreground">Chưa có điều kiện</span>;
    }
    const logic = rule.condition_logic === 'all' ? 'VÀ' : 'HOẶC';
    return rule.conditions.map((c, i) => (
      <span key={i} className="text-sm">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="font-medium cursor-help border-b border-dotted border-muted-foreground/50 hover:text-primary transition-colors">
                {METRIC_LABELS[c.metric] || c.metric}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-mono text-xs">Mã hệ thống: {c.metric}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {' '}
        {OPERATOR_LABELS[c.operator]} {c.value.toLocaleString()}
        {i < rule.conditions.length - 1 && <span className="font-bold text-muted-foreground mx-1"> {logic} </span>}
      </span>
    ));
  };

  const formatActions = () => {
    if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
      return <span className="text-sm text-muted-foreground">Chưa có hành động</span>;
    }
    return rule.actions.map((a) => (
      <Badge key={a.id} variant="secondary" className="mr-1">
        {ACTION_LABELS[a.type]}
        {a.value && `: ${a.value}${a.valueType === 'amount' ? ' VNĐ' : '%'}`}
        {a.executeAt && ` lúc ${a.executeAt}`}
      </Badge>
    ));
  };

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-3 hover:border-primary/50 transition-colors">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex flex-col items-center gap-1 mr-2">
            <Switch
              checked={!!rule.is_active}
              onCheckedChange={handleToggle}
              disabled={localToggling}
              id={`switch-${rule.id}`}
              className={`scale-75 origin-top ${localToggling ? 'opacity-50' : ''}`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm truncate cursor-pointer hover:text-primary max-w-[300px]"
                title={rule.rule_name}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {rule.rule_name}
              </h3>

              {/* Toggle Button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-1 flex-wrap">
              {/* ✅ Compact Scope Badge */}
              <Badge
                variant="secondary"
                className={`font-normal px-1.5 py-0 text-[10px] ${rule.scope === 'campaign' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  rule.scope === 'adset' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                  }`}
              >
                {rule.scope === 'campaign' ? 'Chiến dịch' : rule.scope === 'adset' ? 'Nhóm QC' : 'Quảng cáo'}
              </Badge>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{TIME_RANGE_LABELS[rule.time_range]}</span>

              {/* Show Target Scope Details */}
              <span>•</span>
              <span className="flex items-center gap-1">
                {rule.target_labels && rule.target_labels.length > 0 ? (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-blue-600 shrink-0" />
                    {rule.target_labels.length <= 3 ? (
                      <span
                        className="text-blue-600 font-medium truncate max-w-[100px] inline-block align-middle"
                        title={rule.target_labels.map(id => {
                          const l = labels.find(lbl => String(lbl.Id) === String(id));
                          return l ? l.label_name : id;
                        }).join(', ')}
                      >
                        {rule.target_labels.map((id, idx) => {
                          const l = labels.find(lbl => String(lbl.Id) === String(id));
                          return (
                            <span key={id}>
                              {l ? l.label_name : id}
                              {idx < rule.target_labels.length - 1 && ", "}
                            </span>
                          );
                        })}
                      </span>
                    ) : (
                      <span className="text-blue-600 font-medium" title={
                        `Áp dụng cho các nhãn: ${rule.target_labels.map(id => {
                          const l = labels.find(lbl => String(lbl.Id) === String(id));
                          return l ? l.label_name : id;
                        }).join(', ')}`
                      }>
                        {rule.target_labels.length} nhãn {assignmentCount > 0 && <span className="text-muted-foreground font-normal">({assignmentCount} nhóm)</span>}
                      </span>
                    )}
                  </div>
                ) : rule.apply_to === 'specific' ? (
                  <span className="text-blue-600 font-medium" title={`IDs: ${rule.specific_ids?.join(', ')}`}>
                    {rule.specific_ids?.length || 0} {SCOPE_LABELS[rule.scope].toLowerCase()} cụ thể
                  </span>
                ) : (
                  <span>Tất cả {SCOPE_LABELS[rule.scope].toLowerCase()} active</span>
                )}
              </span>

              {rule.enableAutoSchedule && rule.checkFrequency && (
                <span className="flex items-center gap-1 text-orange-600 bg-orange-50 px-1 rounded">
                  <Clock className="h-3 w-3" />
                  {rule.checkFrequency}p
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Compact */}
        <div className="flex items-center gap-0.5">
          {onConfirm && onCancel ? (
            // ✅ Confirmation Mode
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={onConfirm} className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Xác nhận
              </Button>
              <Button size="sm" variant="outline" onClick={onCancel} className="h-7 px-2 text-xs">
                <XCircle className="w-3 h-3 mr-1" />
                Hủy
              </Button>
            </div>
          ) : (
            // Standard Mode
            <>
              {hasLabelAction && onAssignLabels && (
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAssignLabels(rule.id)}>
                  <Tag className="w-3 h-3" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowLogs(true)}>
                <History className="w-3 h-3" />
              </Button>
              {onTest && (
                <Button size="icon" variant="ghost" className="h-6 w-6 text-blue-600" onClick={handleTest} disabled={isRunning || localRunning || localTesting}>
                  {localTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3" />}
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleRun} disabled={isRunning || localRunning || localTesting}>
                {isRunning || localRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onEdit(rule)}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onDelete(rule.id)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-2 pt-2 border-t space-y-1 text-xs animate-in slide-in-from-top-1 duration-200">
          <div>
            <span className="text-muted-foreground font-medium">Điều kiện: </span>
            <div className="inline">{formatConditions()}</div>
          </div>
          <div>
            <span className="text-muted-foreground font-medium">Hành động: </span>
            <div className="inline">{formatActions()}</div>
          </div>
        </div>
      )}

      {getRuleLabels().length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {getRuleLabels().map(label => (
            <Badge
              key={label.Id}
              style={{ backgroundColor: label.label_color }}
              className="text-white text-xs"
            >
              {label.label_name}
            </Badge>
          ))}
        </div>
      )}

      {/* Footer Info - Always visible if exists but very compact */}
      {rule.last_run_at && rule.execution_count && (
        <div className="mt-1 text-[10px] text-muted-foreground flex justify-between items-center opacity-70">
          <span>Chạy lần cuối: {format(new Date(rule.last_run_at), 'dd/MM HH:mm')}</span>
          {rule.last_execution_status && (
            <div className="scale-75 origin-right">{getExecutionStatusBadge()}</div>
          )}
        </div>
      )}

      {/* Execution Results - Collapsible Details */}
      {isExpanded && rule.last_execution_status && rule.last_execution_status !== 'pending' && (
        <div className="mt-2 pt-2 border-t">
          {getExecutionResults()}
        </div>
      )}

      <ExecutionLogsDialog
        open={showLogs}
        onOpenChange={setShowLogs}
        ruleId={rule.id}
        ruleName={rule.rule_name}
      />
    </Card>
  );
}
