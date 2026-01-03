import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const CreateNocoDBInsightsTable = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleCreateTable = async () => {
    setLoading(true);
    setResult(null);

    try {
      toast({
        title: "Đang tạo bảng...",
        description: "Đang gọi API NocoDB để tạo bảng facebook_insights_v2",
      });

      const { data, error } = await supabase.functions.invoke('create-nocodb-insights-table', {
        body: {}
      });

      if (error) {
        throw error;
      }

      setResult(data);

      if (data.success) {
        toast({
          title: "✅ Tạo bảng thành công!",
          description: `Bảng facebook_insights_v2 đã được tạo với ID: ${data.table_id}`,
        });
      } else {
        toast({
          title: "❌ Lỗi",
          description: data.error || "Không thể tạo bảng",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Lỗi tạo bảng",
        description: error?.message || "Không thể tạo bảng trong NocoDB",
        variant: "destructive",
      });
      setResult({ success: false, error: error?.message });
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
            Tạo bảng Facebook Insights trong NocoDB
          </CardTitle>
          <CardDescription>
            Tạo bảng facebook_insights_v2 với đầy đủ các cột cần thiết để lưu dữ liệu insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Thông tin</AlertTitle>
            <AlertDescription>
              Hệ thống sẽ tạo bảng <strong>facebook_insights_v2</strong> trong NocoDB với các cột:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Identifiers: user_id, account_id, campaign_id, adset_id, ad_id</li>
                <li><strong className="text-primary">level</strong>: campaign/adset/ad (QUAN TRỌNG)</li>
                <li>Metrics: spend, impressions, clicks, ctr, cpc, cpm, reach, frequency</li>
                <li>Results: results, cost_per_result, result_label</li>
                <li>Status: status, effective_status, budget, objective</li>
                <li>Video metrics: video_p25/50/75/100_watched_actions</li>
                <li>JSON fields: actions, action_values, cost_per_action_type</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleCreateTable}
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
                Tạo bảng facebook_insights_v2
              </>
            )}
          </Button>

          {result && (
            <Alert
              variant={result.success ? "default" : "destructive"}
              className={result.success ? "border-green-500 bg-green-50" : ""}
            >
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle className="text-sm font-medium">
                {result.success ? "Thành công" : "Lỗi"}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {result.success ? (
                  <>
                    {result.message}
                    <br />
                    <span className="font-mono text-xs text-muted-foreground">
                      Table ID: {result.table_id}
                    </span>
                    <br />
                    <span className="text-sm mt-2 block text-green-700">
                      ✅ Bước tiếp theo: Cập nhật config để sử dụng table ID này
                    </span>
                  </>
                ) : (
                  <span className="text-red-600">{result.error}</span>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription className="text-xs">
              <strong>Lưu ý:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Nếu bảng đã tồn tại, sẽ có lỗi</li>
                <li>Sau khi tạo, cần cập nhật Table ID vào config</li>
                <li>Bảng cũ (facebook_insights) có thể giữ lại hoặc xóa</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateNocoDBInsightsTable;
