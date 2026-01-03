import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AutomationRule } from "@/types/automationRules";
import { Tag, Loader2 } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface ManualLabelAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: AutomationRule | null;
  labels: Array<{ Id: number; label_name: string; label_color: string }>;
  onAssignLabels: (entityIds: string[], entityType: 'campaign' | 'adset' | 'ad', labelIds: number[]) => Promise<void>;
}

interface MatchedEntity {
  id: string;
  name: string;
  spend: number;
  results: number;
}

export function ManualLabelAssignDialog({
  open,
  onOpenChange,
  rule,
  labels,
  onAssignLabels,
}: ManualLabelAssignDialogProps) {
  const [matchedEntities, setMatchedEntities] = useState<MatchedEntity[]>([]);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (open && rule) {
      loadMatchedEntities();
    } else {
      setMatchedEntities([]);
      setSelectedEntityIds([]);
    }
  }, [open, rule]);

  const loadMatchedEntities = async () => {
    if (!rule) return;

    setIsLoading(true);
    try {
      // Get user's active ad account
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { getActiveAdAccounts } = await import('@/services/nocodb/facebookAdAccountsService');
      const accounts = await getActiveAdAccounts(user.id);
      const activeAccount = accounts.find(acc => acc.is_active);
      if (!activeAccount) {
        sonnerToast.error('Không tìm thấy tài khoản Facebook Ads đang hoạt động');
        return;
      }

      // Fetch entities based on rule scope
      const { getCampaigns, getAdSets, getAds } = await import('@/services/facebookInsightsService');

      let entities: any[] = [];
      if (rule.scope === 'campaign') {
        entities = await getCampaigns(activeAccount.access_token, activeAccount.account_id);
      } else if (rule.scope === 'adset') {
        entities = await getAdSets(activeAccount.access_token, activeAccount.account_id);
      } else {
        entities = await getAds(activeAccount.access_token, activeAccount.account_id);
      }

      // Filter entities that match rule conditions
      const matched = entities.filter(entity => {
        const metrics = entity.insights?.data?.[0] || {};
        const spend = parseFloat(metrics.spend || '0');
        const results = parseInt(metrics.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || '0', 10);

        // Check all conditions based on rule logic
        const conditionResults = rule.conditions.map(condition => {
          let value = 0;
          if (condition.metric === 'spend') value = spend;
          if (condition.metric === 'results') value = results;

          switch (condition.operator) {
            case 'greater_than':
              return value > condition.value;
            case 'less_than':
              return value < condition.value;
            case 'equals':
              return value === condition.value;
            case 'greater_than_or_equal':
              return value >= condition.value;
            case 'less_than_or_equal':
              return value <= condition.value;
            case 'not_equals':
              return value !== condition.value;
            default:
              return false;
          }
        });

        // Apply condition logic (all = AND, any = OR)
        const matches = rule.condition_logic === 'all'
          ? conditionResults.every(r => r)
          : conditionResults.some(r => r);

        return matches;
      }).map(entity => ({
        id: entity.id,
        name: entity.name,
        spend: parseFloat(entity.insights?.data?.[0]?.spend || '0'),
        results: parseInt(entity.insights?.data?.[0]?.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || '0', 10),
      }));

      setMatchedEntities(matched);

      if (matched.length === 0) {
        sonnerToast.info('Không có chiến dịch nào thỏa mãn điều kiện');
      }
    } catch (error) {
      console.error('Error loading matched entities:', error);
      sonnerToast.error('Lỗi khi tải danh sách');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEntity = (entityId: string) => {
    setSelectedEntityIds(prev =>
      prev.includes(entityId)
        ? prev.filter(id => id !== entityId)
        : [...prev, entityId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEntityIds.length === matchedEntities.length) {
      setSelectedEntityIds([]);
    } else {
      setSelectedEntityIds(matchedEntities.map(e => e.id));
    }
  };

  const handleAssign = async () => {
    if (!rule || selectedEntityIds.length === 0) return;

    setIsAssigning(true);
    try {
      // Get target label IDs from rule
      const targetLabelIds = rule.target_labels
        .map(id => parseInt(String(id), 10))
        .filter(id => !isNaN(id));

      if (targetLabelIds.length === 0) {
        sonnerToast.error('Quy tắc chưa có nhãn mục tiêu');
        return;
      }

      await onAssignLabels(selectedEntityIds, rule.scope, targetLabelIds);

      sonnerToast.success(`Đã gắn nhãn cho ${selectedEntityIds.length} ${rule.scope === 'campaign' ? 'chiến dịch' : rule.scope === 'adset' ? 'nhóm QC' : 'quảng cáo'}`);
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning labels:', error);
      sonnerToast.error('Lỗi khi gắn nhãn');
    } finally {
      setIsAssigning(false);
    }
  };

  const getTargetLabels = () => {
    if (!rule || !rule.target_labels) return [];
    const targetIds = rule.target_labels.map(id => parseInt(String(id), 10));
    return labels.filter(l => l.Id && targetIds.includes(l.Id));
  };

  const entityTypeName = rule?.scope === 'campaign' ? 'chiến dịch' : rule?.scope === 'adset' ? 'nhóm QC' : 'quảng cáo';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Gắn nhãn {entityTypeName}
          </DialogTitle>
          <DialogDescription>
            Quy tắc: <span className="font-semibold">{rule?.rule_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target labels */}
          <div>
            <p className="text-sm font-medium mb-2">Nhãn sẽ gắn:</p>
            <div className="flex flex-wrap gap-2">
              {getTargetLabels().length > 0 ? (
                getTargetLabels().map(label => (
                  <Badge
                    key={label.Id}
                    style={{ backgroundColor: label.label_color }}
                    className="text-white"
                  >
                    {label.label_name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">Chưa có nhãn mục tiêu</span>
              )}
            </div>
          </div>

          {/* Matched entities list */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedEntityIds.length === matchedEntities.length && matchedEntities.length > 0}
                  onCheckedChange={handleSelectAll}
                  disabled={isLoading || matchedEntities.length === 0}
                />
                <span className="text-sm font-medium">
                  {matchedEntities.length} {entityTypeName} thỏa mãn điều kiện
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                Đã chọn: {selectedEntityIds.length}
              </span>
            </div>

            <ScrollArea className="max-h-[300px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : matchedEntities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Không có {entityTypeName} nào thỏa mãn điều kiện
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {matchedEntities.map(entity => (
                    <div
                      key={entity.id}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleToggleEntity(entity.id)}
                    >
                      <Checkbox
                        checked={selectedEntityIds.includes(entity.id)}
                        onCheckedChange={() => handleToggleEntity(entity.id)}
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{entity.name}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                          <span>Chi tiêu: {entity.spend.toLocaleString()} ₫</span>
                          <span>Kết quả: {entity.results}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            Hủy
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedEntityIds.length === 0 || isAssigning || getTargetLabels().length === 0}
          >
            {isAssigning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang gắn...
              </>
            ) : (
              `Gắn nhãn (${selectedEntityIds.length})`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
