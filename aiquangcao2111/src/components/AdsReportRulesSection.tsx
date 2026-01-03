import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Sparkles, TestTube2, Tag, Plus, Crown } from "lucide-react";
import { RuleCard } from "@/components/automation/RuleCard";
import { AutomationRule } from "@/types/automationRules";
import { MultiAccountWarning } from "@/components/MultiAccountWarning";

interface AdsReportRulesSectionProps {
    rules: AutomationRule[];
    labels: Array<{ Id: number; label_name: string; label_color: string; user_id: string }>;
    isLoading: boolean;
    hasMultipleAccounts: boolean;
    showWarning: boolean;
    onDismissWarning: () => void;
    onCreateSampleRules: () => void;
    creatingSamples: boolean;
    onNavigateTestCron: () => void;
    onManageLabels: () => void;
    onCreateRule: () => void;
    onToggleActive: (ruleId: string, currentState: boolean) => void;
    onEdit: (rule: AutomationRule) => void;
    onDelete: (ruleId: string) => void;
    onRun: (ruleId: string) => void;
    onTestRule: (ruleId: string) => void;
    onAssignLabels: (ruleId: string) => void;
    runningRules: Set<string>;
    onCreateGoldenRuleSet?: () => void; // NEW
}

export const AdsReportRulesSection = ({
    rules,
    labels,
    isLoading,
    hasMultipleAccounts,
    showWarning,
    onDismissWarning,
    onCreateSampleRules,
    creatingSamples,
    onNavigateTestCron,
    onManageLabels,
    onCreateRule,
    onToggleActive,
    onEdit,
    onDelete,
    onRun,
    onTestRule,
    onAssignLabels,
    runningRules,
    onCreateGoldenRuleSet // NEW
}: AdsReportRulesSectionProps) => {
    return (
        <Card className="mt-4 border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-primary/10">
                            <Zap className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-xl sm:text-2xl">Quy tắc tự động hóa</CardTitle>
                            <CardDescription className="mt-1">
                                Tự động hóa quản lý chiến dịch quảng cáo dựa trên hiệu suất
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* NEW: Golden Rule Set Button */}
                        {onCreateGoldenRuleSet && (
                            <Button
                                variant="outline"
                                onClick={onCreateGoldenRuleSet}
                                className="gap-2 text-xs sm:text-sm border-amber-400 text-amber-600 hover:bg-amber-50"
                                size="sm"
                            >
                                <Crown className="w-4 h-4" />
                                Bộ Quy tắc Vàng
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={onManageLabels}
                            className="gap-2 text-xs sm:text-sm"
                            size="sm"
                        >
                            <Tag className="w-4 h-4" />
                            Quản lý nhãn
                        </Button>
                        <Button
                            onClick={onCreateRule}
                            className="gap-2 text-xs sm:text-sm"
                            size="sm"
                        >
                            <Plus className="w-4 h-4" />
                            Tạo quy tắc mới
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                {/* Multi-Account Warning */}
                {hasMultipleAccounts && showWarning && (
                    <div className="mb-4">
                        <MultiAccountWarning
                            variant="automation"
                            show={true}
                            onDismiss={onDismissWarning}
                        />
                    </div>
                )}

                {isLoading ? (
                    <div className="text-center py-12 text-muted-foreground">
                        Đang tải...
                    </div>
                ) : rules.length === 0 ? (
                    <Card className="bg-background/50">
                        <CardContent className="text-center py-12">
                            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-muted-foreground mb-4">
                                Chưa có quy tắc nào. Bắt đầu tự động hóa bằng cách tạo quy tắc đầu tiên!
                            </p>
                            <Button onClick={onCreateRule} variant="outline">
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo quy tắc đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[35vh] overflow-y-auto pr-2 custom-scrollbar">
                        {rules.map((rule) => (
                            <RuleCard
                                key={rule.id}
                                rule={rule}
                                labels={labels}
                                onToggleActive={onToggleActive}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onRun={onRun}
                                onTest={onTestRule}
                                onAssignLabels={onAssignLabels}
                                isRunning={runningRules.has(rule.id)}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
