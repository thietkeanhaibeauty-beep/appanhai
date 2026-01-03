/**
 * GoldenRuleSetDialog - Tạo/Chỉnh sửa Bộ Quy tắc Vàng
 */

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast as sonnerToast } from "sonner";
import { cn } from "@/lib/utils";
import {
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Shield,
    Zap,
    X,
    AlertTriangle,
} from "lucide-react";

import {
    GoldenRuleSet,
    BasicRule,
    AdvancedOverride,
    RuleCondition,
    RuleAction,
    RuleScope,
    TimeRange,
    ActionType,
    ConditionLogic,
    SCOPE_LABELS,
    TIME_RANGE_LABELS,
    METRIC_LABELS,
    METRIC_CATEGORIES,
    OPERATOR_LABELS,
    ACTION_LABELS,
    MetricType,
    OperatorType,
} from "@/types/automationRules";

interface GoldenRuleSetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (ruleSet: Partial<GoldenRuleSet>) => void;
    ruleSet?: GoldenRuleSet;
    availableLabels?: Array<{ Id: number; label_name: string; label_color: string }>;
    userId?: string;
}

export function GoldenRuleSetDialog({
    open,
    onOpenChange,
    onSave,
    ruleSet,
    availableLabels = [],
    userId,
}: GoldenRuleSetDialogProps) {
    // Basic Info
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [scope, setScope] = useState<RuleScope>("adset");
    const [timeRange, setTimeRange] = useState<TimeRange>("today");
    const [targetLabels, setTargetLabels] = useState<string[]>([]);

    // Rules
    const [basicRules, setBasicRules] = useState<BasicRule[]>([]);
    const [advancedOverrides, setAdvancedOverrides] = useState<AdvancedOverride[]>([]);

    // UI State
    const [expandedBasicRules, setExpandedBasicRules] = useState<Set<string>>(new Set());
    const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());

    // Load existing rule set
    useEffect(() => {
        if (ruleSet) {
            setName(ruleSet.name);
            setDescription(ruleSet.description || "");
            setScope(ruleSet.scope);
            setTimeRange(ruleSet.time_range);
            setTargetLabels(ruleSet.target_labels.map(String));
            setBasicRules(ruleSet.basic_rules || []);
            setAdvancedOverrides(ruleSet.advanced_overrides || []);
        } else {
            resetForm();
        }
    }, [ruleSet, open]);

    const resetForm = () => {
        setName("");
        setDescription("");
        setScope("adset");
        setTimeRange("today");
        setTargetLabels([]);
        setBasicRules([]);
        setAdvancedOverrides([]);
        setExpandedBasicRules(new Set());
        setExpandedOverrides(new Set());
    };

    // ==========================================================================
    // BASIC RULES HANDLERS
    // ==========================================================================

    const addBasicRule = () => {
        const newRule: BasicRule = {
            id: crypto.randomUUID(),
            name: `Quy tắc ${basicRules.length + 1}`,
            conditions: [
                {
                    id: crypto.randomUUID(),
                    metric: "spend",
                    operator: "greater_than_or_equal",
                    value: 100000,
                },
            ],
            condition_logic: "all",
            action: {
                id: crypto.randomUUID(),
                type: "turn_off",
            },
        };
        setBasicRules([...basicRules, newRule]);
        setExpandedBasicRules(new Set([...expandedBasicRules, newRule.id]));
    };

    const updateBasicRule = (ruleId: string, updates: Partial<BasicRule>) => {
        setBasicRules(
            basicRules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r))
        );
    };

    const removeBasicRule = (ruleId: string) => {
        setBasicRules(basicRules.filter((r) => r.id !== ruleId));
    };

    const addConditionToBasicRule = (ruleId: string) => {
        setBasicRules(
            basicRules.map((r) =>
                r.id === ruleId
                    ? {
                        ...r,
                        conditions: [
                            ...r.conditions,
                            {
                                id: crypto.randomUUID(),
                                metric: "results" as MetricType,
                                operator: "equals" as OperatorType,
                                value: 0,
                            },
                        ],
                    }
                    : r
            )
        );
    };

    const removeConditionFromBasicRule = (ruleId: string, conditionId: string) => {
        setBasicRules(
            basicRules.map((r) =>
                r.id === ruleId
                    ? { ...r, conditions: r.conditions.filter((c) => c.id !== conditionId) }
                    : r
            )
        );
    };

    const updateConditionInBasicRule = (
        ruleId: string,
        conditionId: string,
        updates: Partial<RuleCondition>
    ) => {
        setBasicRules(
            basicRules.map((r) =>
                r.id === ruleId
                    ? {
                        ...r,
                        conditions: r.conditions.map((c) =>
                            c.id === conditionId ? { ...c, ...updates } : c
                        ),
                    }
                    : r
            )
        );
    };

    // ==========================================================================
    // ADVANCED OVERRIDES HANDLERS
    // ==========================================================================

    const addAdvancedOverride = () => {
        const newOverride: AdvancedOverride = {
            id: crypto.randomUUID(),
            name: `Override ${advancedOverrides.length + 1}`,
            conditions: [
                {
                    id: crypto.randomUUID(),
                    metric: "sdt_rate",
                    operator: "greater_than_or_equal",
                    value: 50,
                },
            ],
            condition_logic: "all",
            blocks_actions: ["turn_off"],
            reason: "",
        };
        setAdvancedOverrides([...advancedOverrides, newOverride]);
        setExpandedOverrides(new Set([...expandedOverrides, newOverride.id]));
    };

    const updateAdvancedOverride = (
        overrideId: string,
        updates: Partial<AdvancedOverride>
    ) => {
        setAdvancedOverrides(
            advancedOverrides.map((o) =>
                o.id === overrideId ? { ...o, ...updates } : o
            )
        );
    };

    const removeAdvancedOverride = (overrideId: string) => {
        setAdvancedOverrides(advancedOverrides.filter((o) => o.id !== overrideId));
    };

    const toggleBlockAction = (overrideId: string, action: ActionType) => {
        setAdvancedOverrides(
            advancedOverrides.map((o) => {
                if (o.id !== overrideId) return o;
                const newBlocks = o.blocks_actions.includes(action)
                    ? o.blocks_actions.filter((a) => a !== action)
                    : [...o.blocks_actions, action];
                return { ...o, blocks_actions: newBlocks };
            })
        );
    };

    // ==========================================================================
    // SAVE HANDLER
    // ==========================================================================

    const handleSave = () => {
        if (!name.trim()) {
            sonnerToast.error("Vui lòng nhập tên bộ quy tắc");
            return;
        }
        if (targetLabels.length === 0) {
            sonnerToast.error("Vui lòng chọn ít nhất 1 nhãn áp dụng");
            return;
        }
        if (basicRules.length === 0) {
            sonnerToast.error("Vui lòng thêm ít nhất 1 quy tắc cơ bản");
            return;
        }

        const data: Partial<GoldenRuleSet> = {
            ...(ruleSet?.id && { id: ruleSet.id }),
            ...(ruleSet?.Id && { Id: ruleSet.Id }),
            user_id: ruleSet?.user_id || userId,
            name,
            description,
            scope,
            time_range: timeRange,
            target_labels: targetLabels,
            basic_rules: basicRules,
            advanced_overrides: advancedOverrides,
            is_active: ruleSet?.is_active ?? true,
            created_at: ruleSet?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        onSave(data);
        onOpenChange(false);
        resetForm();
    };

    const toggleLabel = (labelId: string) => {
        setTargetLabels((prev) =>
            prev.includes(labelId)
                ? prev.filter((id) => id !== labelId)
                : [...prev, labelId]
        );
    };

    const toggleExpanded = (id: string, isOverride: boolean) => {
        if (isOverride) {
            setExpandedOverrides((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                return newSet;
            });
        } else {
            setExpandedBasicRules((prev) => {
                const newSet = new Set(prev);
                if (newSet.has(id)) newSet.delete(id);
                else newSet.add(id);
                return newSet;
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        🥇 {ruleSet ? "Chỉnh sửa" : "Tạo"} Bộ Quy tắc Vàng
                    </DialogTitle>
                    <DialogDescription>
                        Gộp nhiều quy tắc cơ bản + quy tắc nâng cao (override) vào 1 bộ
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <Label>Tên Bộ Quy tắc *</Label>
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="VD: Quy tắc Vàng - Spa Hà Nội"
                                className="mt-1.5"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Phạm vi</Label>
                                <Select value={scope} onValueChange={(v) => setScope(v as RuleScope)}>
                                    <SelectTrigger className="mt-1.5">
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
                                <Label>Khung thời gian</Label>
                                <Select
                                    value={timeRange}
                                    onValueChange={(v) => setTimeRange(v as TimeRange)}
                                >
                                    <SelectTrigger className="mt-1.5">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(TIME_RANGE_LABELS).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Áp dụng cho nhãn *</Label>
                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {availableLabels.length === 0 ? (
                                        <span className="text-sm text-muted-foreground">
                                            Chưa có nhãn
                                        </span>
                                    ) : (
                                        availableLabels.map((label) => {
                                            const isSelected = targetLabels.includes(String(label.Id));
                                            return (
                                                <Badge
                                                    key={label.Id}
                                                    variant={isSelected ? "default" : "outline"}
                                                    className={cn(
                                                        "cursor-pointer transition-all",
                                                        isSelected && "ring-2"
                                                    )}
                                                    style={isSelected ? { backgroundColor: label.label_color } : {}}
                                                    onClick={() => toggleLabel(String(label.Id))}
                                                >
                                                    {label.label_name}
                                                    {isSelected && <X className="w-3 h-3 ml-1" />}
                                                </Badge>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <Label>Mô tả (tùy chọn)</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Mô tả ngắn về bộ quy tắc này..."
                                className="mt-1.5"
                                rows={2}
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* ADVANCED OVERRIDES SECTION - ƯU TIÊN CAO */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-purple-600" />
                                <Label className="text-base font-semibold text-purple-700">
                                    QUY TẮC NÂNG CAO (Override)
                                </Label>
                                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                    ⬆️ Ưu tiên cao - Chạy trước
                                </Badge>
                            </div>
                            <Button variant="outline" size="sm" onClick={addAdvancedOverride}>
                                <Plus className="w-4 h-4 mr-1" />
                                Thêm Override
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Dựa trên metrics Sale (Tỉ lệ SĐT, Đặt lịch, ROAS...). Nếu match →
                            CHẶN các action từ quy tắc cơ bản.
                        </p>

                        {advancedOverrides.length === 0 ? (
                            <div className="text-center py-6 border-2 border-dashed rounded-lg">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                                <p className="text-sm text-muted-foreground">
                                    Chưa có override. Thêm để bảo vệ các ads tiềm năng khỏi bị tắt nhầm.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {advancedOverrides.map((override) => (
                                    <div
                                        key={override.id}
                                        className="border-2 border-purple-200 rounded-lg overflow-hidden bg-purple-50/50"
                                    >
                                        <div
                                            className="flex items-center justify-between p-3 bg-purple-100/50 cursor-pointer"
                                            onClick={() => toggleExpanded(override.id, true)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {expandedOverrides.has(override.id) ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                                <Input
                                                    value={override.name}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        updateAdvancedOverride(override.id, { name: e.target.value });
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-8 w-60 bg-white"
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeAdvancedOverride(override.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </Button>
                                        </div>

                                        {expandedOverrides.has(override.id) && (
                                            <div className="p-4 space-y-4">
                                                {/* Conditions */}
                                                <div className="space-y-2">
                                                    <Label className="text-purple-700">NẾU (Điều kiện)</Label>
                                                    {override.conditions.map((cond, idx) => (
                                                        <div key={cond.id} className="flex items-center gap-2">
                                                            {idx > 0 && (
                                                                <Badge variant="outline" className="shrink-0">
                                                                    {override.condition_logic === "all" ? "VÀ" : "HOẶC"}
                                                                </Badge>
                                                            )}
                                                            <Select
                                                                value={cond.metric}
                                                                onValueChange={(v) =>
                                                                    updateAdvancedOverride(override.id, {
                                                                        conditions: override.conditions.map((c) =>
                                                                            c.id === cond.id ? { ...c, metric: v as MetricType } : c
                                                                        ),
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-48">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {METRIC_CATEGORIES.manager.map((m) => (
                                                                        <SelectItem key={m} value={m}>
                                                                            {METRIC_LABELS[m]}
                                                                        </SelectItem>
                                                                    ))}
                                                                    {METRIC_CATEGORIES.director.map((m) => (
                                                                        <SelectItem key={m} value={m}>
                                                                            {METRIC_LABELS[m]}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Select
                                                                value={cond.operator}
                                                                onValueChange={(v) =>
                                                                    updateAdvancedOverride(override.id, {
                                                                        conditions: override.conditions.map((c) =>
                                                                            c.id === cond.id ? { ...c, operator: v as OperatorType } : c
                                                                        ),
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-32">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.entries(OPERATOR_LABELS).map(([v, l]) => (
                                                                        <SelectItem key={v} value={v}>
                                                                            {l}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                type="number"
                                                                value={cond.value}
                                                                onChange={(e) =>
                                                                    updateAdvancedOverride(override.id, {
                                                                        conditions: override.conditions.map((c) =>
                                                                            c.id === cond.id
                                                                                ? { ...c, value: parseFloat(e.target.value) || 0 }
                                                                                : c
                                                                        ),
                                                                    })
                                                                }
                                                                className="w-24"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Blocked Actions */}
                                                <div className="space-y-2">
                                                    <Label className="text-red-600">THÌ CHẶN Actions:</Label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(["turn_off", "decrease_budget"] as ActionType[]).map((action) => (
                                                            <Badge
                                                                key={action}
                                                                variant={
                                                                    override.blocks_actions.includes(action)
                                                                        ? "destructive"
                                                                        : "outline"
                                                                }
                                                                className="cursor-pointer"
                                                                onClick={() => toggleBlockAction(override.id, action)}
                                                            >
                                                                🚫 {ACTION_LABELS[action]}
                                                                {override.blocks_actions.includes(action) && (
                                                                    <X className="w-3 h-3 ml-1" />
                                                                )}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Reason */}
                                                <div>
                                                    <Label>Lý do (hiển thị trong log)</Label>
                                                    <Input
                                                        value={override.reason || ""}
                                                        onChange={(e) =>
                                                            updateAdvancedOverride(override.id, { reason: e.target.value })
                                                        }
                                                        placeholder="VD: Không tắt vì tỉ lệ SĐT cao"
                                                        className="mt-1"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* BASIC RULES SECTION - ƯU TIÊN THẤP */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-600" />
                                <Label className="text-base font-semibold text-blue-700">
                                    QUY TẮC CƠ BẢN
                                </Label>
                                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                    ⬇️ Ưu tiên thấp - Chạy sau
                                </Badge>
                            </div>
                            <Button variant="outline" size="sm" onClick={addBasicRule}>
                                <Plus className="w-4 h-4 mr-1" />
                                Thêm Quy tắc
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Dựa trên metrics Facebook (Chi tiêu, Kết quả, CPR...). Actions có thể bị
                            chặn bởi Override nâng cao.
                        </p>

                        {basicRules.length === 0 ? (
                            <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                <p className="text-muted-foreground">
                                    Chưa có quy tắc. Nhấn "Thêm Quy tắc" để bắt đầu.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {basicRules.map((rule) => (
                                    <div
                                        key={rule.id}
                                        className="border-2 border-blue-200 rounded-lg overflow-hidden bg-blue-50/30"
                                    >
                                        <div
                                            className="flex items-center justify-between p-3 bg-blue-100/50 cursor-pointer"
                                            onClick={() => toggleExpanded(rule.id, false)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {expandedBasicRules.has(rule.id) ? (
                                                    <ChevronUp className="w-4 h-4" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4" />
                                                )}
                                                <Input
                                                    value={rule.name}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        updateBasicRule(rule.id, { name: e.target.value });
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-8 w-60 bg-white"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">
                                                    {ACTION_LABELS[rule.action.type]}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        removeBasicRule(rule.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </div>

                                        {expandedBasicRules.has(rule.id) && (
                                            <div className="p-4 space-y-4">
                                                {/* Conditions */}
                                                <div className="space-y-2 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                                                    <Label className="text-green-700">NẾU (Điều kiện)</Label>
                                                    {rule.conditions.map((cond, idx) => (
                                                        <div key={cond.id} className="flex items-center gap-2">
                                                            {idx > 0 && (
                                                                <Select
                                                                    value={rule.condition_logic}
                                                                    onValueChange={(v) =>
                                                                        updateBasicRule(rule.id, {
                                                                            condition_logic: v as ConditionLogic,
                                                                        })
                                                                    }
                                                                >
                                                                    <SelectTrigger className="w-20 h-7">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="all">VÀ</SelectItem>
                                                                        <SelectItem value="any">HOẶC</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                            <Select
                                                                value={cond.metric}
                                                                onValueChange={(v) =>
                                                                    updateConditionInBasicRule(rule.id, cond.id, {
                                                                        metric: v as MetricType,
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-40">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {METRIC_CATEGORIES.operator.map((m) => (
                                                                        <SelectItem key={m} value={m}>
                                                                            {METRIC_LABELS[m]}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Select
                                                                value={cond.operator}
                                                                onValueChange={(v) =>
                                                                    updateConditionInBasicRule(rule.id, cond.id, {
                                                                        operator: v as OperatorType,
                                                                    })
                                                                }
                                                            >
                                                                <SelectTrigger className="w-32">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {Object.entries(OPERATOR_LABELS).map(([v, l]) => (
                                                                        <SelectItem key={v} value={v}>
                                                                            {l}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                type="text"
                                                                value={cond.value.toLocaleString("vi-VN")}
                                                                onChange={(e) => {
                                                                    const raw = e.target.value.replace(/[.,]/g, "");
                                                                    updateConditionInBasicRule(rule.id, cond.id, {
                                                                        value: parseFloat(raw) || 0,
                                                                    });
                                                                }}
                                                                className="w-28"
                                                            />
                                                            {rule.conditions.length > 1 && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        removeConditionFromBasicRule(rule.id, cond.id)
                                                                    }
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addConditionToBasicRule(rule.id)}
                                                        className="mt-2"
                                                    >
                                                        <Plus className="w-3 h-3 mr-1" />
                                                        Thêm điều kiện
                                                    </Button>
                                                </div>

                                                {/* Action */}
                                                <div className="space-y-2 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                                                    <Label className="text-red-700">THÌ (Hành động)</Label>
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={rule.action.type}
                                                            onValueChange={(v) =>
                                                                updateBasicRule(rule.id, {
                                                                    action: { ...rule.action, type: v as ActionType },
                                                                })
                                                            }
                                                        >
                                                            <SelectTrigger className="w-48">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                                                                    <SelectItem key={v} value={v}>
                                                                        {l}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        {(rule.action.type === "increase_budget" ||
                                                            rule.action.type === "decrease_budget") && (
                                                                <>
                                                                    <Input
                                                                        type="number"
                                                                        value={rule.action.value || 0}
                                                                        onChange={(e) =>
                                                                            updateBasicRule(rule.id, {
                                                                                action: {
                                                                                    ...rule.action,
                                                                                    value: parseFloat(e.target.value) || 0,
                                                                                },
                                                                            })
                                                                        }
                                                                        className="w-24"
                                                                    />
                                                                    <span className="text-sm text-muted-foreground">%</span>
                                                                </>
                                                            )}
                                                    </div>

                                                    {/* Auto-revert for turn_off */}
                                                    {rule.action.type === "turn_off" && (
                                                        <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded border">
                                                            <Switch
                                                                checked={rule.action.autoRevert || false}
                                                                onCheckedChange={(checked) =>
                                                                    updateBasicRule(rule.id, {
                                                                        action: {
                                                                            ...rule.action,
                                                                            autoRevert: checked,
                                                                            revertAtTime: checked ? "07:00" : undefined,
                                                                        },
                                                                    })
                                                                }
                                                            />
                                                            <span className="text-sm">Tự động bật lại lúc</span>
                                                            {rule.action.autoRevert && (
                                                                <Input
                                                                    type="time"
                                                                    value={rule.action.revertAtTime || "07:00"}
                                                                    onChange={(e) =>
                                                                        updateBasicRule(rule.id, {
                                                                            action: {
                                                                                ...rule.action,
                                                                                revertAtTime: e.target.value,
                                                                            },
                                                                        })
                                                                    }
                                                                    className="w-28"
                                                                />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Warning about override */}
                                                {advancedOverrides.some((o) =>
                                                    o.blocks_actions.includes(rule.action.type)
                                                ) && (
                                                        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                                                            ⚠️ Action "{ACTION_LABELS[rule.action.type]}" có thể bị chặn
                                                            bởi Override nâng cao
                                                        </div>
                                                    )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!name.trim() || targetLabels.length === 0 || basicRules.length === 0}
                    >
                        {ruleSet ? "Lưu thay đổi" : "Tạo Bộ Quy tắc"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
