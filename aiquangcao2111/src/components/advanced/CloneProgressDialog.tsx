import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";

interface CloneProgressDialogProps {
  open: boolean;
  progress: number;
  currentStep: string;
  error?: string | null;
  successInfo?: {
    name: string;
    id: string;
    type: string;
  } | null;
}

export function CloneProgressDialog({ open, progress, currentStep, error, successInfo }: CloneProgressDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {error ? (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span>Lỗi nhân bản</span>
              </>
            ) : progress === 100 ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span>Hoàn thành</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-primary animate-pulse" />
                <span>Đang nhân bản...</span>
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {error ? "Quá trình nhân bản gặp lỗi" : 
             progress === 100 ? "Nhân bản thành công" : 
             "Vui lòng chờ trong giây lát"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <>
              <Progress value={progress} className="h-2" />
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {progress >= 33 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={progress >= 33 ? "text-green-600" : "text-muted-foreground"}>
                    Khởi tạo nhân bản
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {progress >= 66 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : progress >= 33 ? (
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={progress >= 66 ? "text-green-600" : progress >= 33 ? "text-foreground" : "text-muted-foreground"}>
                    {currentStep || "Đang xử lý..."}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {progress === 100 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={progress === 100 ? "text-green-600" : "text-muted-foreground"}>
                    Hoàn tất
                  </span>
                </div>
              </div>
              
              {progress === 100 && successInfo && (
                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-3 mt-2">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200 mb-2">
                    {successInfo.type === 'campaign' ? '📁 Chiến dịch mới' : 
                     successInfo.type === 'adset' ? '🔹 Nhóm quảng cáo mới' : 
                     '• Quảng cáo mới'}
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-300">
                    📝 Tên: <span className="font-medium">{successInfo.name}</span>
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                    🆔 ID: <span className="font-mono">{successInfo.id}</span>
                  </p>
                </div>
              )}
              
              {progress < 100 && (
                <p className="text-xs text-muted-foreground text-center">
                  Thời gian ước tính: ~30-60 giây
                </p>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
