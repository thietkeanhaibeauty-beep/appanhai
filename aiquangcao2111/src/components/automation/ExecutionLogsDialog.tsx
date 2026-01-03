import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Clock, MinusCircle } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { NOCODB_CONFIG, getNocoDBHeaders } from "@/services/nocodb/config";
import { cn } from "@/lib/utils";

interface ExecutionLog {
  Id: number;
  rule_id: string;
  executed_at: string;
  status: "success" | "partial" | "failed" | "pending" | "waiting" | "skipped";
  matched_objects_count: number;
  executed_actions_count: number;
  details: any;
}

interface ExecutionLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleId: string;
  ruleName: string;
}

export function ExecutionLogsDialog({
  open,
  onOpenChange,
  ruleId,
  ruleName,
}: ExecutionLogsDialogProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadLogs();
    }
  }, [open, ruleId]);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const whereClause = encodeURIComponent(`(rule_id,eq,${ruleId})`);
      const response = await fetch(
        `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records?where=${whereClause}&sort=-executed_at&limit=50`,
        {
          headers: await getNocoDBHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLogs(data.list || []);
      }
    } catch (error) {
      console.error("Error loading execution logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "partial":
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "pending":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "waiting":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "skipped":
        return <MinusCircle className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default" as const,
      partial: "secondary" as const,
      failed: "destructive" as const,
      pending: "outline" as const,
      waiting: "secondary" as const,
      skipped: "secondary" as const,
    };
    const labels = {
      success: "Thành công",
      partial: "Một phần",
      failed: "Thất bại",
      pending: "Đang chạy...",
      waiting: "Đang chờ",
      skipped: "Đã bỏ qua",
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getMetricLabel = (metric: string) => {
    const labels: Record<string, string> = {
      spend: "Chi tiêu",
      results: "Kết quả",
      roi: "ROI",
      roas: "ROAS",
      ctr: "CTR",
      cpc: "CPC",
      cpm: "CPM",
      cpp: "CPP",
      cost_per_result: "Chi phí/Kết quả",
    };
    return labels[metric] || metric;
  };

  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      greater_than: ">",
      less_than: "<",
      equals: "=",
      greater_than_or_equal: "≥",
      less_than_or_equal: "≤",
    };
    return labels[operator] || operator;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Lịch sử thực thi</DialogTitle>
          <DialogDescription>
            Xem các lần thực thi quy tắc: <strong>{ruleName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Đang tải lịch sử...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p>Chưa có lịch sử thực thi nào</p>
            <p className="text-xs mt-2">
              Quy tắc sẽ xuất hiện ở đây sau khi được chạy
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.Id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <div>
                        <div className="font-medium text-sm">
                          {format(new Date(log.executed_at), "dd/MM/yyyy HH:mm:ss", {
                            locale: vi,
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.matched_objects_count} đối tượng khớp •{" "}
                          {log.executed_actions_count} hành động thực thi
                        </div>
                      </div>
                    </div>
                    {getStatusBadge(log.status)}
                  </div>

                  {log.details && Array.isArray(log.details) && log.status !== "pending" && (
                    <details className="cursor-pointer" open={log.matched_objects_count > 0}>
                      <summary className="text-sm font-medium text-muted-foreground hover:text-foreground">
                        {log.matched_objects_count > 0
                          ? `Xem chi tiết (${log.details.length} chiến dịch)`
                          : "Không có đối tượng nào thỏa mãn điều kiện"}
                      </summary>
                      {log.matched_objects_count > 0 && (
                        <div className="mt-2 space-y-3">
                          {log.details.map((detail: any, idx: number) => (
                            <div
                              key={idx}
                              className="text-xs p-3 bg-muted/50 rounded-lg border"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-semibold text-sm">
                                  {detail.campaignName || detail.objectName || detail.objectId}
                                </div>
                                <Badge
                                  variant={
                                    detail.result === "success"
                                      ? "default"
                                      : detail.result === "condition_failed"
                                        ? "outline" // Use outline for condition failures
                                        : detail.result === "skipped"
                                          ? "secondary"
                                          : "destructive"
                                  }
                                  className={cn(
                                    "text-xs",
                                    detail.result === "condition_failed" && "text-muted-foreground border-muted-foreground/30 bg-muted/20"
                                  )}
                                >
                                  {detail.result === "condition_failed" ? "Chưa đạt" : detail.action}
                                </Badge>
                              </div>

                              {/* ✅ NEW: Show matched conditions with context-aware styling */}
                              {detail.matchedConditions && Array.isArray(detail.matchedConditions) && (
                                <div className={cn(
                                  "mt-2 space-y-1 p-2 rounded border",
                                  detail.result === "condition_failed"
                                    ? "bg-muted/30 border-muted"
                                    : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                )}>
                                  <div className={cn(
                                    "font-medium mb-1 flex items-center gap-1",
                                    detail.result === "condition_failed"
                                      ? "text-muted-foreground"
                                      : "text-green-700 dark:text-green-400"
                                  )}>
                                    {detail.result === "condition_failed" ? "🔍 Kiểm tra điều kiện:" : "✅ Đạt điều kiện:"}
                                  </div>
                                  {detail.matchedConditions.map((cond: any, i: number) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                      <span className={cond.met ? "text-green-600" : "text-red-500 font-bold"}>
                                        {cond.met ? "✓" : "✗"}
                                      </span>
                                      <span className={cn("font-mono", !cond.met && "text-muted-foreground")}>
                                        {getMetricLabel(cond.metric)}: <strong>{cond.actualValue?.toLocaleString()}</strong>{" "}
                                        {getOperatorLabel(cond.operator)} {cond.threshold}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* ✅ NEW: Show actual metrics */}
                              {detail.metrics && (
                                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                  {detail.metrics.spend !== undefined && (
                                    <div>Chi tiêu: <strong>{detail.metrics.spend?.toLocaleString()}₫</strong></div>
                                  )}
                                  {detail.metrics.results !== undefined && (
                                    <div>Kết quả: <strong>{detail.metrics.results}</strong></div>
                                  )}
                                  {detail.metrics.roi !== undefined && (
                                    <div>ROI: <strong>{detail.metrics.roi?.toFixed(2)}%</strong></div>
                                  )}
                                  {detail.metrics.roas !== undefined && (
                                    <div>ROAS: <strong>{detail.metrics.roas?.toFixed(2)}</strong></div>
                                  )}
                                </div>
                              )}

                              {detail.error && (
                                <div className="text-destructive mt-2 p-2 bg-destructive/10 rounded">
                                  <strong>Lỗi:</strong> {detail.error}
                                </div>
                              )}
                              {detail.reason && (
                                <div className="text-muted-foreground mt-2 p-2 bg-muted rounded">
                                  <strong>Lý do:</strong> {detail.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </details>
                  )}

                  {/* Show pending message */}
                  {log.status === "pending" && (
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Đang xử lý...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
