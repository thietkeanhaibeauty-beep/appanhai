import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function AddLabelEntityColumns() {
  const [isAdding, setIsAdding] = useState(false);
  const [autoRun, setAutoRun] = useState(true);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const addColumns = async () => {
    setIsAdding(true);
    setResult(null);

    try {


      const { data, error } = await supabase.functions.invoke('add-label-entity-columns', {
        method: 'POST',
      });

      if (error) throw error;



      setResult({
        success: true,
        message: '✅ Đã thêm thành công 2 cột: adset_id và ad_id vào bảng campaign_label_assignments',
      });

      toast({
        title: 'Thành công!',
        description: 'Đã thêm 2 cột adset_id và ad_id vào NocoDB',
      });
    } catch (error) {
      console.error('❌ Error adding columns:', error);
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
      setIsAdding(false);
      setAutoRun(false);
    }
  };

  // Auto-run once on mount
  useEffect(() => {
    if (autoRun && !isAdding && !result) {
      addColumns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, isAdding, result]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Thêm cột Entity vào Campaign Label Assignments</CardTitle>
          <CardDescription>
            Trang admin để thêm các cột adset_id và ad_id vào bảng campaign_label_assignments trong NocoDB.
            <br />
            <br />
            <strong>Bảng:</strong> campaign_label_assignments (ID: m4lohjtes32lbau)
            <br />
            <strong>Các cột sẽ thêm:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>adset_id (Text, nullable) - Để gắn nhãn cho nhóm quảng cáo</li>
              <li>ad_id (Text, nullable) - Để gắn nhãn cho quảng cáo</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdding && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3 text-lg">Đang thêm cột tự động...</span>
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
                <p className="text-sm whitespace-pre-wrap">{result.message}</p>
              </div>
            </div>
          )}

          {!isAdding && (
            <Button
              onClick={addColumns}
              disabled={isAdding}
              className="w-full"
              size="lg"
              variant={result?.success ? "outline" : "default"}
            >
              {result?.success ? 'Chạy lại (nếu cần)' : 'Thêm 2 cột vào NocoDB'}
            </Button>
          )}

          <div className="text-sm text-muted-foreground space-y-2 mt-4 pt-4 border-t">
            <p><strong>Lưu ý:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Trang này sẽ tự động chạy khi mở</li>
              <li>Nếu cột đã tồn tại, sẽ báo lỗi (bình thường)</li>
              <li>Sau khi thêm thành công, có thể gắn nhãn cho cả campaign, adset, và ad</li>
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
