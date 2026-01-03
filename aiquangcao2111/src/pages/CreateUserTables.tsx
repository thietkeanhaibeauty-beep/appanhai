import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CreateUserTables = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleCreateTables = async () => {
    setLoading(true);
    setResults([]);

    try {
      toast({
        title: "Đang tạo bảng...",
        description: "Đang gọi API NocoDB để tạo profiles và user_roles",
      });

      const { data, error } = await supabase.functions.invoke('create-user-tables', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setResults(data.results || []);

      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;

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
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            Tạo bảng User trong NocoDB
          </CardTitle>
          <CardDescription>
            Tự động tạo 2 bảng: profiles và user_roles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Thông tin</AlertTitle>
            <AlertDescription>
              Hệ thống sẽ tạo 2 bảng sau trong NocoDB:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>profiles</strong> - Thông tin người dùng (user_id, email, full_name, avatar_url, phone)</li>
                <li><strong>user_roles</strong> - Phân quyền người dùng (user_id, role: user/admin/super_admin)</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleCreateTables}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo bảng...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Tạo 2 bảng NocoDB
              </>
            )}
          </Button>

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Kết quả:</h3>
              {results.map((result, index) => (
                <Alert
                  key={index}
                  variant={result.success ? "default" : "destructive"}
                  className={result.success ? "border-green-500 bg-green-50" : ""}
                >
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle className="text-sm font-medium">
                    {result.table}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {result.success ? (
                      <>
                        {result.message}
                        <br />
                        <span className="font-mono text-xs text-muted-foreground">
                          Table ID: {result.table_id}
                        </span>
                      </>
                    ) : (
                      <span className="text-red-600">{result.error}</span>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-xs">
              <strong>Lưu ý:</strong> Sau khi tạo thành công, cần cập nhật Table ID vào src/services/nocodb/config.ts
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateUserTables;
