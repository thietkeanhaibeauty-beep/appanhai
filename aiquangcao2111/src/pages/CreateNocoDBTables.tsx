import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CreateNocoDBTables = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleCreateTables = async () => {
    setLoading(true);
    setResults([]);

    try {
      toast({
        title: "Đang tạo bảng...",
        description: "Đang gọi API NocoDB để tạo 3 bảng mới",
      });

      const { data, error } = await supabase.functions.invoke('create-nocodb-tables', {
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
            Tạo bảng NocoDB tự động
          </CardTitle>
          <CardDescription>
            Tự động tạo 3 bảng trong NocoDB: facebook_campaigns, facebook_adsets, facebook_ads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Thông tin</AlertTitle>
            <AlertDescription>
              Hệ thống sẽ tạo 3 bảng sau trong NocoDB (Base ID: p0lvt22fuj3opkl):
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>facebook_campaigns</strong> - Lưu cấu trúc chiến dịch</li>
                <li><strong>facebook_adsets</strong> - Lưu cấu trúc nhóm quảng cáo</li>
                <li><strong>facebook_ads</strong> - Lưu cấu trúc quảng cáo</li>
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
                Tạo 3 bảng NocoDB
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
              <strong>Lưu ý:</strong> Nếu bảng đã tồn tại, sẽ có lỗi. Bạn có thể xóa bảng cũ trong NocoDB dashboard trước khi tạo lại.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateNocoDBTables;
