import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Tag, Search, Settings2, Sparkles, TestTube2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AutomatedRulesDialog } from "@/components/AutomatedRulesDialog";
import { LabelsManagerDialog } from "@/components/LabelsManagerDialog";
import { RuleCard } from "@/components/automation/RuleCard";
import { ExecutionResultsDialog } from "@/components/automation/ExecutionResultsDialog";
import { MultiAccountWarning } from "@/components/MultiAccountWarning";
import { supabase } from "@/integrations/supabase/client";
import { getRulesByUserId, getAllRules, createRule, updateRule, deleteRule, toggleRuleActive } from "@/services/nocodb/automatedRulesService";
import { getLabelsByUserId } from "@/services/nocodb/campaignLabelsService";
import { getAssignmentCountsByLabelIds } from "@/services/nocodb/campaignLabelAssignmentsService";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getTodayInsights } from "@/services/nocodb/todayInsightsService";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { AutomationRule } from "@/types/automationRules";
import { toast } from "sonner";
import { trackUsage } from "@/services/usageTrackingService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { createSampleRules } from "@/utils/sampleRules";
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

const AutomatedRules = () => {
  const { user } = useAuth();
  const { settings } = useSettings(); // Get settings including currency
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [showLabelsManager, setShowLabelsManager] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [labels, setLabels] = useState<Array<{ Id: number; label_name: string; label_color: string; user_id: string }>>([]);
  const [editingRule, setEditingRule] = useState<AutomationRule | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [hasMultipleAccounts, setHasMultipleAccounts] = useState(false);
  const [showWarning, setShowWarning] = useState(true);
  const [runningRules, setRunningRules] = useState<Set<string>>(new Set());
  const [creatingSamples, setCreatingSamples] = useState(false);
  const [assignmentCounts, setAssignmentCounts] = useState<Record<number, number>>({});
  const [adAccounts, setAdAccounts] = useState<any[]>([]); // ✅ State for accounts
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<AutomationRule | null>(null);

  useEffect(() => {
    loadData();
    checkMultipleAccounts();
  }, [user?.id]);

  const checkMultipleAccounts = async () => {
    try {
      if (!user?.id) return;
      const accounts = await getActiveAdAccounts(user.id);
      setAdAccounts(accounts); // ✅ Store accounts
      setHasMultipleAccounts(accounts.length > 1);
    } catch (error) {
      console.error('Error checking accounts:', error);
    }
  };

  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      // ✅ ALWAYS use authenticated user.id
      if (!user?.id) {
        if (showLoading) setIsLoading(false);
        return;
      }

      // Load rules from NocoDB with authenticated user ID
      let rulesData = await getRulesByUserId(user.id);

      // Transform to AutomationRule type and ensure id field exists
      const transformedRules: AutomationRule[] = rulesData.map(rule => ({
        id: rule.id || crypto.randomUUID(), // Ensure UUID exists
        user_id: rule.user_id,
        rule_name: rule.rule_name,
        scope: rule.scope as 'campaign' | 'adset' | 'ad',
        time_range: rule.time_range as 'today' | 'yesterday' | '7_days' | '14_days' | '30_days' | 'lifetime',
        is_active: rule.is_active,
        conditions: (rule.conditions as any) || [],
        condition_logic: rule.condition_logic || 'all' as const,
        actions: (rule.actions as any) || [],
        advanced_settings: (rule.advanced_settings as any) || {},
        labels: rule.labels || [],
        target_labels: rule.target_labels || [],
        steps: (rule.steps as any) || [], // ✅ ADD: Load multi-step rules
        created_at: rule.created_at,
        updated_at: rule.updated_at,
        Id: rule.Id
      }));

      setRules(transformedRules);

      // Load labels from NocoDB (use authenticated user.id)
      const labelsData = await getLabelsByUserId(user.id);
      setLabels(labelsData.map(label => ({
        Id: label.Id || 0,
        label_name: label.label_name,
        label_color: label.label_color,
        user_id: label.user_id // ✅ Include user_id
      })));

      // 🚀 NEW: Fetch assignment counts for all target labels
      const allTargetLabelIds = new Set<number>();
      transformedRules.forEach(rule => {
        if (Array.isArray(rule.target_labels)) {
          rule.target_labels.forEach(id => allTargetLabelIds.add(Number(id)));
        }
      });

      if (allTargetLabelIds.size > 0) {
        const counts = await getAssignmentCountsByLabelIds(Array.from(allTargetLabelIds));
        setAssignmentCounts(counts);
      } else {
        setAssignmentCounts({});
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // 🔥 Migrate old rules to current user
  const migrateOldRules = async (oldRules: AutomationRule[], oldUserId: string, newUserId: string) => {
    try {
      toast.info(`Đang di chuyển ${oldRules.length} quy tắc...`);

      for (const rule of oldRules) {
        if (rule.Id) {
          await updateRule(rule.Id, { user_id: newUserId });
        }
      }

      toast.success('Đã di chuyển tất cả quy tắc sang tài khoản hiện tại');
      await loadData(); // Reload with new user_id
    } catch (error) {
      console.error('Error migrating rules:', error);
      toast.error('Lỗi khi di chuyển quy tắc');
    }
  };

  const handleSaveRule = async (ruleData: Partial<AutomationRule>) => {
    try {
      // ✅ Convert target_labels from string[] to number[] before saving
      const targetLabels = Array.isArray(ruleData.target_labels) ? ruleData.target_labels : [];
      const targetLabelsAsNumbers = targetLabels.map(id => {
        const num = typeof id === 'string' ? parseInt(id, 10) : id;
        return num;
      });

      // Transform data to match database schema - stringify JSON fields
      const dbData: any = {
        rule_name: ruleData.rule_name,
        scope: ruleData.scope,
        time_range: ruleData.time_range,
        condition_logic: ruleData.condition_logic,
        conditions: ruleData.conditions || [],
        actions: ruleData.actions || [],
        advanced_settings: ruleData.advanced_settings || {},
        labels: ruleData.labels || [],
        target_labels: targetLabelsAsNumbers, // ✅ Use converted numbers
        steps: ruleData.steps || [], // ✅ ADD: Multi-step rules support
      };

      if (editingRule?.Id) {
        // Update existing rule
        await updateRule(editingRule.Id, {
          ...dbData,
          updated_at: new Date().toISOString()
        });
        toast.success('Đã cập nhật quy tắc');
      } else {
        // Create new rule - ✅ ALWAYS use authenticated user.id
        if (!user?.id) {
          toast.error('Bạn cần đăng nhập để tạo quy tắc');
          return;
        }
        const newRule = await createRule({
          ...dbData,
          user_id: user.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        // Track usage
        await trackUsage('automation_rule_created', 'automation_rule', newRule?.Id?.toString());

        toast.success('Đã tạo quy tắc mới');
      }

      await loadData();
      setEditingRule(undefined);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error('Lỗi khi lưu quy tắc');
    }
  };

  const handleToggleActive = async (ruleId: string, currentState: boolean) => {
    // Find the rule's internal ID
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || !rule.Id) {
      toast.error('Rule not found');
      return;
    }

    try {
      // Optimistic update
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: !currentState } : r));

      const updatedRule = await toggleRuleActive(rule.Id, !currentState);

      // ✅ Update with actual server response (in case of side effects or overrides)
      // If server returns partial object (no is_active), fallback to intended state
      const finalState = updatedRule.is_active !== undefined
        ? updatedRule.is_active
        : !currentState;

      setRules(prev => prev.map(r => r.id === ruleId ? {
        ...r,
        is_active: finalState
      } : r));

      toast.success(!currentState ? 'Đã bật quy tắc' : 'Đã tắt quy tắc');
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Lỗi khi thay đổi trạng thái');

      // ❌ Revert optimistic update on error
      setRules(prev => prev.map(r => r.id === ruleId ? { ...r, is_active: currentState } : r));
    }
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowDialog(true);
  };

  const handleDelete = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    setRuleToDelete(rule);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!ruleToDelete) return;

    try {
      if (!ruleToDelete.Id) throw new Error('Rule not found');

      // Optimistic update
      setRules(prev => prev.filter(r => r.id !== ruleToDelete.id));

      await deleteRule(ruleToDelete.Id);
      toast.success('Đã xóa quy tắc thành công');

      // Silent reload to sync labels and ensure consistency
      await loadData(false);
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Lỗi khi xóa quy tắc');
    } finally {
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    }
  };

  const handleCreateSampleRules = async () => {
    if (!user?.id) return;

    setCreatingSamples(true);
    const toastId = toast.loading('Đang tạo 5 quy tắc mẫu...');

    try {
      // Get campaign IDs from today insights
      const insights = await getTodayInsights(user.id);
      const campaignIds = [...new Set(insights.map(i => i.campaign_id).filter(Boolean))] as string[];

      if (campaignIds.length === 0) {
        toast.error('Không tìm thấy campaign nào. Vui lòng đồng bộ dữ liệu trước.', { id: toastId });
        return;
      }



      const result = await createSampleRules(user.id, campaignIds);

      toast.success(
        `Tạo thành công ${result.success}/5 quy tắc mẫu! ${result.failed > 0 ? `(${result.failed} lỗi)` : ''}`,
        { id: toastId }
      );

      if (result.errors.length > 0) {
        console.error('Sample rule creation errors:', result.errors);
      }

      // Reload rules
      await loadData();
    } catch (error) {
      console.error('Failed to create sample rules:', error);
      toast.error('Lỗi tạo quy tắc mẫu: ' + (error instanceof Error ? error.message : 'Unknown error'), {
        id: toastId,
      });
    } finally {
      setCreatingSamples(false);
    }
  };

  const handleRun = async (ruleId: string) => {


    // Find the rule to get its integer Id
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || !rule.Id) {
      toast.error('Không tìm thấy quy tắc');
      return;
    }

    // ✅ FIX: Add to running set immediately
    setRunningRules(prev => new Set(prev).add(ruleId));
    toast.info('Đang thực thi quy tắc...');

    // Set pending status immediately
    try {
      const { updateExecutionStatus } = await import('@/services/nocodb/automatedRulesService');
      await updateExecutionStatus(rule.Id, 'pending');

      // Reload to show pending status
      await loadData(false);
    } catch (error) {
      console.error('Error setting pending status:', error);
    }

    // Run in background
    try {
      // ✅ ALWAYS use authenticated user.id
      if (!user?.id) {
        toast.error('Bạn cần đăng nhập để chạy quy tắc');
        return;
      }


      const { data, error } = await supabase.functions.invoke('execute-automation-rule', {
        body: {
          ruleId: rule.Id,
          userId: user.id,
          manualRun: true
        }
      });



      if (error) throw error;

      // ✅ NEW: Handle 200 OK but success: false (from manual run errors)
      if (data && data.success === false) {
        throw new Error(data.error || 'Lỗi không xác định từ hệ thống');
      }

      toast.success(
        `Đã chạy xong! Đã xử lý ${data.matchedCount || 0} đối tượng`
      );

      // Reload to show final status
      await loadData(false);
    } catch (error: any) {
      console.error('Error running rule:', error);
      toast.error('Lỗi khi chạy quy tắc');

      // Set failed status
      try {
        const { updateExecutionStatus } = await import('@/services/nocodb/automatedRulesService');
        await updateExecutionStatus(rule.Id, 'failed', { error: error.message });
        await loadData(false);
      } catch (updateError) {
        console.error('Error updating failed status:', updateError);
      }
    } finally {
      // ✅ FIX: Remove from running set when done
      setRunningRules(prev => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  const handleTest = async (ruleId: string) => {
    // Find the rule to get its integer Id
    const rule = rules.find(r => r.id === ruleId);
    if (!rule || !rule.Id) {
      toast.error('Không tìm thấy quy tắc');
      return;
    }

    setRunningRules(prev => new Set(prev).add(ruleId));
    toast.info('Đang chạy thử nghiệm (Dry Run)...');

    try {
      if (!user?.id) {
        toast.error('Bạn cần đăng nhập để chạy quy tắc');
        return;
      }

      const { data, error } = await supabase.functions.invoke('execute-automation-rule', {
        body: {
          ruleId: rule.Id,
          userId: user.id,
          manualRun: true,
          dryRun: true // ✅ Enable Dry Run mode
        }
      });

      if (error) throw error;

      if (data && data.success === false) {
        throw new Error(data.error || 'Lỗi không xác định từ hệ thống');
      }

      toast.success(
        `Đã chạy thử xong! Tìm thấy ${data.matchedCount || 0} đối tượng phù hợp`
      );

      // Reload to show logs
      await loadData(false);
    } catch (error: any) {
      console.error('Error testing rule:', error);
      toast.error('Lỗi khi chạy thử quy tắc');
    } finally {
      setRunningRules(prev => {
        const next = new Set(prev);
        next.delete(ruleId);
        return next;
      });
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingRule(undefined);
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="border-none shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl">Quy tắc tự động hóa</CardTitle>
                </div>
                <CardDescription className="mt-1">
                  Tự động hóa quản lý chiến dịch quảng cáo dựa trên hiệu suất
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLabelsManager(true)}
                className="gap-2"
              >
                <Tag className="w-4 h-4" />
                Quản lý nhãn
              </Button>
              <Button
                onClick={() => setShowDialog(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo quy tắc mới
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Multi-Account Warning */}
      {hasMultipleAccounts && showWarning && (
        <MultiAccountWarning
          variant="automation"
          show={true}
          onDismiss={() => setShowWarning(false)}
        />
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Đang tải...
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Chưa có quy tắc nào. Bắt đầu tự động hóa bằng cách tạo quy tắc đầu tiên!
            </p>
            <Button onClick={() => setShowDialog(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Tạo quy tắc đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              labels={labels}
              onToggleActive={handleToggleActive}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRun={handleRun}
              onTest={handleTest}
              isRunning={runningRules.has(rule.id)}
              assignmentCount={
                // Calculate total assignments for this rule's target labels
                (rule.target_labels || []).reduce((sum: number, labelId) => {
                  return sum + (assignmentCounts[Number(labelId)] || 0);
                }, 0) as number
              }
            />
          ))}
        </div>
      )}

      <AutomatedRulesDialog
        open={showDialog}
        onOpenChange={handleCloseDialog}
        onSave={handleSaveRule}
        rule={editingRule}
        availableLabels={labels}
        onLabelsChange={loadData}
        userId={user?.id}
        currency={settings?.currency || 'VND'} // Use currency from active account in settings
      />

      <LabelsManagerDialog
        open={showLabelsManager}
        onOpenChange={setShowLabelsManager}
        labels={labels}
        onLabelsChange={loadData}
        userId={user?.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa quy tắc?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa quy tắc "{ruleToDelete?.rule_name}"?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default AutomatedRules;
