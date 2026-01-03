import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MultiAccountWarningProps {
  show: boolean;
  onDismiss?: () => void;
  variant?: "automation" | "labels" | "general";
}

export function MultiAccountWarning({ 
  show, 
  onDismiss,
  variant = "general" 
}: MultiAccountWarningProps) {
  if (!show) return null;

  const messages = {
    automation: {
      title: "⚠️ Automation Rules - Chưa hỗ trợ Multi-Account",
      description: "Quy tắc tự động hiện chưa phân biệt tài khoản quảng cáo. Nếu bạn có nhiều tài khoản, vui lòng KHÔNG sử dụng tính năng này để tránh tắt nhầm chiến dịch.",
      severity: "destructive" as const,
    },
    labels: {
      title: "ℹ️ Nhãn dán - Shared giữa các Accounts",
      description: "Nhãn dán được chia sẻ giữa tất cả tài khoản quảng cáo của bạn. Khi chuyển account, nhãn vẫn hiển thị nhưng có thể không liên quan.",
      severity: "default" as const,
    },
    general: {
      title: "🔄 Multi-Account Mode (Beta)",
      description: "Bạn đang sử dụng nhiều tài khoản quảng cáo. Dữ liệu báo cáo đã được phân tách theo account, nhưng một số tính năng như Automation Rules chưa hỗ trợ đầy đủ.",
      severity: "default" as const,
    },
  };

  const config = messages[variant];

  return (
    <Alert variant={config.severity} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription className="mt-2">
        {config.description}
        {variant === "automation" && (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-semibold">⚡ Rủi ro:</p>
            <ul className="text-sm list-disc list-inside space-y-1">
              <li>Rules có thể chạy trên <strong>NHẦM</strong> tài khoản</li>
              <li>Có thể <strong>TẮT NHẦM</strong> chiến dịch đang chạy tốt</li>
              <li>Gây <strong>THIỆT HẠI TÀI CHÍNH</strong></li>
            </ul>
            <p className="text-sm mt-3">
              💡 <strong>Khuyến nghị:</strong> Chỉ tạo rules khi bạn có 1 tài khoản duy nhất hoặc chờ update hỗ trợ multi-account.
            </p>
          </div>
        )}
      </AlertDescription>
      {onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="mt-2"
        >
          Đã hiểu
        </Button>
      )}
    </Alert>
  );
}
