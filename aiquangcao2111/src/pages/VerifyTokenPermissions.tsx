import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PermissionCheck {
  permission: string;
  granted: boolean;
  description: string;
}

interface VerifyResult {
  tokenValid: boolean;
  appId: string;
  userId: string;
  expiresAt: number;
  allPermissions: string[];
  permissionCheck: PermissionCheck[];
  allRequiredGranted: boolean;
  canReplacePageToken: boolean;
}

const VerifyTokenPermissions = () => {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const handleVerify = async () => {
    if (!token.trim()) {
      toast.error("Vui lòng nhập Ads Token");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-token-permissions', {
        body: { token: token.trim() }
      });

      if (error) throw error;

      if (data.success) {
        setResult(data.data);
        
        if (data.data.canReplacePageToken) {
          toast.success("🎉 Token có đủ quyền để thay thế Page Token!");
        } else {
          toast.error("❌ Token thiếu một số quyền cần thiết");
        }
      } else {
        throw new Error(data.error || "Verification failed");
      }
    } catch (error: any) {
      console.error("Verify error:", error);
      toast.error(error.message || "Có lỗi xảy ra khi verify token");
    } finally {
      setLoading(false);
    }
  };

  const formatExpiry = (timestamp: number) => {
    if (timestamp === 0) return "Không hết hạn";
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Phase 1: Verify Token Permissions</CardTitle>
          <CardDescription>
            Kiểm tra xem Ads Token có đủ quyền để thay thế Page Token không
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Facebook Ads Token
              </label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Nhập Ads Token của bạn..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button onClick={handleVerify} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Đang kiểm tra...
                    </>
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-4">
              {/* Overall Status */}
              <Card className={result.canReplacePageToken ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-red-500 bg-red-50 dark:bg-red-950"}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    {result.canReplacePageToken ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-600" />
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {result.canReplacePageToken 
                          ? "✅ Token có thể thay thế Page Token"
                          : "❌ Token thiếu quyền cần thiết"
                        }
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {result.canReplacePageToken
                          ? "Ads Token này có đủ quyền để quản lý pages và tạo campaigns"
                          : "Ads Token cần có thêm quyền pages để thay thế Page Token"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Token Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin Token</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <Badge variant={result.tokenValid ? "default" : "destructive"}>
                      {result.tokenValid ? "Hợp lệ" : "Không hợp lệ"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">App ID:</span>
                    <span className="font-mono">{result.appId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User ID:</span>
                    <span className="font-mono">{result.userId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hết hạn:</span>
                    <span>{formatExpiry(result.expiresAt)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Permission Checks */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kiểm tra quyền bắt buộc</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.permissionCheck.map((check) => (
                    <div
                      key={check.permission}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        {check.granted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{check.permission}</p>
                          <p className="text-xs text-muted-foreground">
                            {check.description}
                          </p>
                        </div>
                      </div>
                      <Badge variant={check.granted ? "default" : "destructive"}>
                        {check.granted ? "✓" : "✗"}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* All Permissions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tất cả quyền ({result.allPermissions.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.allPermissions.map((perm) => (
                      <Badge key={perm} variant="secondary" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendation */}
              <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      <h3 className="font-semibold">Khuyến nghị tiếp theo:</h3>
                      {result.canReplacePageToken ? (
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          <li>✅ Phase 1 hoàn thành: Token có đủ quyền</li>
                          <li>➡️ Tiếp tục Phase 2: Test Creative Creation</li>
                          <li>➡️ Sau đó Phase 3: Test Full Campaign Flow</li>
                          <li>➡️ Nếu pass hết → Update UI chỉ dùng 1 token</li>
                        </ul>
                      ) : (
                        <ul className="text-sm space-y-1 list-disc list-inside">
                          <li>❌ Token thiếu quyền pages</li>
                          <li>📝 Cần request lại token với đầy đủ quyền</li>
                          <li>🔑 Hoặc tiếp tục dùng 2 tokens riêng biệt</li>
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyTokenPermissions;
