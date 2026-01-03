import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExecutionResult {
  objectId: string;
  objectName: string;
  action: string;
  result: "success" | "failed";
  details?: any;
  error?: string;
}

interface ExecutionResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isExecuting: boolean;
  results?: {
    success: boolean;
    matchedCount: number;
    executedCount: number;
    results: ExecutionResult[];
  };
}

export function ExecutionResultsDialog({
  open,
  onOpenChange,
  isExecuting,
  results,
}: ExecutionResultsDialogProps) {
  const getStatusIcon = (result: "success" | "failed") => {
    return result === "success" ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isExecuting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Đang thực thi quy tắc...
              </>
            ) : (
              <>
                {results?.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
                Kết quả thực thi
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isExecuting
              ? "Vui lòng đợi trong khi quy tắc đang được xử lý..."
              : `Đã kiểm tra ${results?.matchedCount || 0} đối tượng và thực thi ${results?.executedCount || 0} hành động`}
          </DialogDescription>
        </DialogHeader>

        {!isExecuting && results && (
          <ScrollArea className="max-h-[60vh] pr-4">
            {results.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Không có đối tượng nào khớp với điều kiện</p>
              </div>
            ) : (
              <div className="space-y-3">
                {results.results.map((result, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getStatusIcon(result.result)}
                          <span className="font-medium text-sm">
                            {result.objectName || result.objectId}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {result.objectId}
                        </div>
                      </div>
                      <Badge
                        variant={
                          result.result === "success"
                            ? "default"
                            : "destructive"
                        }
                        className="text-xs"
                      >
                        {result.action}
                      </Badge>
                    </div>

                    {result.error && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                        <span className="font-medium">Lỗi:</span> {result.error}
                      </div>
                    )}

                    {result.details && !result.error && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <details className="cursor-pointer">
                          <summary className="font-medium">Chi tiết</summary>
                          <pre className="mt-2 text-xs overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {isExecuting && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Đang xử lý quy tắc...
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
