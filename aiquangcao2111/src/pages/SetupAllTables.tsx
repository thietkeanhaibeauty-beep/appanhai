import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle, XCircle, PlayCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TableResult {
  table: string;
  success: boolean;
  message?: string;
  table_id?: string;
  error?: string;
}

const SetupAllTables = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TableResult[]>([]);
  const { toast } = useToast();

  const handleCreateAllTables = async () => {
    setLoading(true);
    setResults([]);

    const allResults: TableResult[] = [];

    try {
      toast({
        title: "Đang tạo tất cả bảng...",
        description: "Đang gọi 3 edge functions để tạo 5 bảng NocoDB",
      });

      // 1. Create user tables (profiles, user_roles)
      try {
        const { data: userData, error: userError } = await supabase.functions.invoke('create-user-tables');

        if (userError) throw userError;

        if (userData?.results) {
          allResults.push(...userData.results);
        }
      } catch (error: any) {
        console.error('Error creating user tables:', error);
        allResults.push({
          table: 'profiles + user_roles',
          success: false,
          error: error?.message || 'Unknown error',
        });
      }

      // 2. Create payment tables (payment_packages, payment_settings, user_payments)
      try {
        const { data: paymentData, error: paymentError } = await supabase.functions.invoke('create-payment-tables');

        if (paymentError) throw paymentError;

        if (paymentData?.results) {
          allResults.push(...paymentData.results);
        }
      } catch (error: any) {
        console.error('Error creating payment tables:', error);
        allResults.push({
          table: 'payment_packages + payment_settings + user_payments',
          success: false,
          error: error?.message || 'Unknown error',
        });
      }

      setResults(allResults);

      const successCount = allResults.filter(r => r.success).length;
      const failCount = allResults.filter(r => !r.success).length;

      toast({
        title: successCount > 0 ? "✅ Hoàn thành!" : "❌ Lỗi",
        description: `Đã tạo ${successCount} bảng thành công${failCount > 0 ? `, ${failCount} bảng thất bại` : ''}`,
        variant: successCount > 0 ? "default" : "destructive",
      });

    } catch (error: any) {
      console.error('Error creating tables:', error);
      toast({
        title: "Lỗi tạo bảng",
        description: error?.message || "Không thể tạo bảng trong NocoDB",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Database className="w-7 h-7" />
            Tạo Tất Cả Bảng NocoDB
          </CardTitle>
          <CardDescription className="text-base">
            Tự động tạo 5 bảng trong NocoDB một lúc
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <AlertTitle className="text-blue-900 dark:text-blue-100">Danh sách bảng sẽ tạo</AlertTitle>
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <div className="mt-3 space-y-3">
                <div className="font-semibold text-base">👤 User Tables (2 bảng):</div>
                <ul className="list-disc list-inside ml-4 space-y-1.5">
                  <li><strong>profiles</strong> - Thông tin người dùng (user_id, email, full_name, avatar_url, phone)</li>
                  <li><strong>user_roles</strong> - Phân quyền (user_id, role: user/admin/super_admin)</li>
                </ul>

                <div className="font-semibold text-base mt-4">💳 Payment Tables (3 bảng):</div>
                <ul className="list-disc list-inside ml-4 space-y-1.5">
                  <li><strong>payment_packages</strong> - Các gói thanh toán (name, price, duration, features)</li>
                  <li><strong>payment_settings</strong> - Cài đặt thanh toán (setting_key, setting_value)</li>
                  <li><strong>user_payments</strong> - Lịch sử thanh toán (user_id, package_id, amount, status)</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleCreateAllTables}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang tạo 5 bảng...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Tạo Tất Cả 5 Bảng NocoDB
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Database className="w-5 h-5" />
                Kết quả:
              </h3>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <Alert
                    key={index}
                    variant={result.success ? "default" : "destructive"}
                    className={result.success ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
                  >
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5" />
                    )}
                    <AlertTitle className="font-medium">
                      {result.table}
                    </AlertTitle>
                    <AlertDescription className="text-sm">
                      {result.success ? (
                        <>
                          {result.message}
                          <br />
                          <span className="font-mono text-xs text-muted-foreground mt-1 block">
                            Table ID: {result.table_id}
                          </span>
                        </>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{result.error}</span>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && results.some(r => r.success) && (
            <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
              <AlertDescription className="text-sm">
                <strong className="text-yellow-900 dark:text-yellow-100">📝 Lưu ý quan trọng:</strong>
                <ul className="mt-2 space-y-1 text-yellow-800 dark:text-yellow-200">
                  <li>• Cần cập nhật các Table ID vào <code className="bg-yellow-100 dark:bg-yellow-900 px-1 py-0.5 rounded">src/services/nocodb/config.ts</code></li>
                  <li>• Refresh trang NocoDB để thấy các bảng mới</li>
                  <li>• Kiểm tra xem tất cả bảng đã xuất hiện trong dashboard chưa</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open('https://db.hpb.edu.vn/dashboard/#/nc/p0lvt22fuj3opkl', '_blank')}
              className="w-full"
            >
              🔗 Mở NocoDB Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAllTables;
