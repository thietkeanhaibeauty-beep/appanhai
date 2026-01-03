import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function AddInsightKeyColumn() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddColumn = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {


      const { data, error: invokeError } = await supabase.functions.invoke('add-insight-key-column');

      if (invokeError) {
        throw invokeError;
      }


      setResult(data);
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="outline"
        onClick={() => navigate('/home')}
        className="mb-6"
      >
        ← Quay về Dashboard
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Database className="h-8 w-8 text-primary" />
            <div>
              <CardTitle>Thêm Cột insight_key</CardTitle>
              <CardDescription>
                Tạo cột insight_key với UNIQUE constraint và populate data cho records cũ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Instructions */}
          <Alert>
            <AlertDescription className="space-y-2">
              <p><strong>Chức năng:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Thêm cột <code className="bg-muted px-1 py-0.5 rounded">insight_key</code> vào bảng insights</li>
                <li>Set UNIQUE constraint để phòng duplicate records</li>
                <li>Populate insight_key cho tất cả records cũ</li>
              </ul>
              <p className="mt-3"><strong>Format insight_key:</strong></p>
              <p className="ml-4 font-mono text-sm">user_id|account_id|campaign_id|adset_id|ad_id|YYYY-MM-DD</p>
            </AlertDescription>
          </Alert>

          {/* Action Button */}
          <div className="flex gap-4 items-center">
            <Button
              onClick={handleAddColumn}
              disabled={isLoading}
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-5 w-5" />
                  Thêm Cột & Populate Data
                </>
              )}
            </Button>
          </div>

          {/* Success Result */}
          {result && result.success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="ml-2">
                <p className="font-semibold text-green-800 dark:text-green-200">
                  ✅ Thành công!
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <p><strong>Hành động:</strong> {result.action === 'created' ? 'Đã tạo cột mới' : 'Cột đã tồn tại'}</p>
                  {result.recordsUpdated !== undefined && (
                    <p><strong>Số records đã populate:</strong> {result.recordsUpdated}</p>
                  )}
                  <p><strong>Message:</strong> {result.message}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Error Result */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="ml-2">
                <p className="font-semibold">❌ Lỗi!</p>
                <p className="mt-1 text-sm">{error}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Next Steps */}
          {result && result.success && result.action === 'created' && (
            <Alert>
              <AlertDescription className="space-y-2">
                <p><strong>📋 Bước tiếp theo:</strong></p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Quay về NocoDB → Chỉnh sửa cột <code className="bg-muted px-1 py-0.5 rounded">insight_key</code></li>
                  <li>Bật checkbox <strong>NN (Not Null)</strong></li>
                  <li>Lưu lại để enforce required constraint</li>
                  <li>Test sync 2 lần để verify không tạo duplicate records</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
