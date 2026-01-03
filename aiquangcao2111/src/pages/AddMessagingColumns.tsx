import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Database, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AddMessagingColumns = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleAddColumns = async () => {
    setLoading(true);
    setResult(null);

    try {
      toast({
        title: "Đang thêm cột...",
        description: "Đang gọi API NocoDB để thêm 2 cột messaging vào facebook_insights",
      });

      const { data, error } = await supabase.functions.invoke('add-messaging-columns', {
        body: {}
      });

      if (error) {
        throw error;
      }


      setResult(data);

      if (data.success) {
        toast({
          title: "✅ Thêm cột thành công!",
          description: "2 cột mới đã được thêm vào bảng facebook_insights",
        });
      } else {
        toast({
          title: "❌ Lỗi",
          description: data.error || "Không thể thêm cột",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error adding columns:', error);
      toast({
        title: "Lỗi thêm cột",
        description: error?.message || "Không thể thêm cột vào NocoDB",
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
            Thêm cột Messaging vào Facebook Insights
          </CardTitle>
          <CardDescription>
            Thêm 2 cột mới để lưu riêng chỉ số "Trả lời cuộc trò chuyện (7d)"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertTitle>Thông tin</AlertTitle>
            <AlertDescription>
              Hệ thống sẽ thêm <strong>2 cột mới</strong> vào bảng <strong>facebook_insights</strong>:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong className="text-primary">results_messaging_replied_7d</strong> (Integer): Số lượng "Trả lời cuộc trò chuyện (7d)" từ action_type = onsite_conversion.messaging_conversation_replied_7d</li>
                <li><strong className="text-primary">cost_per_messaging_replied_7d</strong> (Decimal 10,2): Chi phí/kết quả cho messaging_conversation_replied_7d</li>
              </ul>
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                <strong>Lý do cần thiết:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Cột <code>results</code> hiện tại có thể lấy từ nhiều action_type khác nhau tùy theo objective</li>
                  <li>Khi aggregate nhiều ngày, không phân biệt được "Mess" thuần túy</li>
                  <li>2 cột riêng giúp tính tổng chính xác theo ngày mà không phụ thuộc vào objective</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleAddColumns}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang thêm cột...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Thêm 2 cột Messaging
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
                    <span className="text-sm mt-2 block text-green-700">
                      ✅ Bước tiếp theo: Sync lại data để populate 2 cột mới
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
                <li>Nếu cột đã tồn tại, sẽ có lỗi</li>
                <li>Data cũ sẽ có giá trị mặc định = 0</li>
                <li>Cần sync lại data để populate giá trị cho 2 cột mới</li>
                <li>Code đã được cập nhật để tự động điền 2 cột này khi sync</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddMessagingColumns;
