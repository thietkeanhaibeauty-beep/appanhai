import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function CreateLabelAssignmentsTable() {
  const [isCreating, setIsCreating] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string; tableId?: string } | null>(null);
  const { toast } = useToast();

  const createTable = async () => {
    setIsCreating(true);
    setResult(null);

    try {

      const { data, error } = await supabase.functions.invoke('create-label-assignments-table', {
        method: 'POST',
      });

      if (error) throw error;



      setResult({
        success: true,
        message: data.message || '✅ Đã tạo thành công bảng campaign_label_assignments',
        tableId: data.table_id,
      });

      toast({
        title: 'Thành công!',
        description: 'Đã tạo bảng campaign_label_assignments trong NocoDB',
      });
    } catch (error) {
      console.error('❌ Error creating table:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setResult({
        success: false,
        message: `❌ Lỗi: ${errorMessage}`,
      });

      toast({
        title: 'Lỗi',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
      setAutoRun(false);
    }
  };

  // Auto-run once on mount
  useEffect(() => {
    if (autoRun && !isCreating && !result) {
      createTable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, isCreating, result]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            Tạo bảng Campaign Label Assignments
          </CardTitle>
          <CardDescription>
            Bảng này bị thiếu trong NocoDB, đây là nguyên nhân nút + không hiển thị và gắn nhãn bị lỗi.
            <br />
            <br />
            <strong>Bảng sẽ tạo:</strong> campaign_label_assignments
            <br />
            <strong>Các cột:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Id (Primary Key, Auto Increment)</li>
              <li>campaign_id (Text, nullable) - Gắn nhãn cho chiến dịch</li>
              <li>adset_id (Text, nullable) - Gắn nhãn cho nhóm QC</li>
              <li>ad_id (Text, nullable) - Gắn nhãn cho quảng cáo</li>
              <li>label_id (Number, required) - ID của nhãn</li>
              <li>CreatedAt, UpdatedAt (DateTime)</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCreating && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-lg">Đang tạo bảng tự động...</span>
            </div>
          )}

          {result && (
            <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'}`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-2 flex-1">
                  <p className="text-sm whitespace-pre-wrap">{result.message}</p>
                  {result.success && result.tableId && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-xs space-y-1">
                      <p className="font-semibold">⚠️ CẦN CẬP NHẬT CONFIG:</p>
                      <p className="font-mono bg-yellow-100 dark:bg-yellow-900 p-2 rounded">
                        CAMPAIGN_LABEL_ASSIGNMENTS: '{result.tableId}'
                      </p>
                      <p className="text-muted-foreground">
                        Copy Table ID này và cập nhật vào <code>src/services/nocodb/config.ts</code>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!isCreating && (
            <Button
              onClick={createTable}
              disabled={isCreating}
              className="w-full"
              size="lg"
              variant={result?.success ? "outline" : "default"}
            >
              {result?.success ? 'Chạy lại (nếu cần)' : 'Tạo bảng campaign_label_assignments'}
            </Button>
          )}

          <div className="text-sm text-muted-foreground space-y-2 mt-4 pt-4 border-t">
            <p><strong>Lưu ý:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Trang này sẽ tự động chạy khi mở</li>
              <li>Sau khi tạo thành công, cần cập nhật Table ID vào config.ts</li>
              <li>Nếu bảng đã tồn tại, sẽ báo lỗi (bình thường)</li>
            </ul>
          </div>

          <div className="pt-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              ← Quay lại trang chính
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
