import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle, Copy, AlertCircle } from 'lucide-react';

export default function NocoDBMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [migrationLog, setMigrationLog] = useState<string[]>([]);
  const [tableIds, setTableIds] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setMigrationLog([]);
    setTableIds(null);
    setError(null);

    try {
      toast.info('Bắt đầu migration...', { duration: 2000 });

      const { data, error: functionError } = await supabase.functions.invoke(
        'nocodb-migration',
        {
          body: {}
        }
      );

      if (functionError) throw functionError;

      if (data.success) {
        setMigrationLog(data.log || []);
        setTableIds(data.tableIds || {});
        toast.success('Migration hoàn tất!', { duration: 3000 });
      } else {
        throw new Error(data.error || 'Migration failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      toast.error(`Migration lỗi: ${errorMsg}`);
      console.error('Migration error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const copyTableIds = () => {
    if (!tableIds) return;

    const configText = `// Paste vào src/services/nocodb/config.ts
TABLES: {
  // ... existing tables
  PROFILES: '${tableIds.profiles || 'FAILED'}',
  USER_SUBSCRIPTIONS: '${tableIds.user_subscriptions || 'FAILED'}',
  PAYMENT_TRANSACTIONS: '${tableIds.payment_transactions || 'FAILED'}',
  SALES_REPORTS: '${tableIds.sales_reports || 'FAILED'}',
}`;

    navigator.clipboard.writeText(configText);
    toast.success('Đã copy Table IDs! Paste vào config.ts');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Database className="h-8 w-8" />
          NocoDB Migration
        </h1>
        <p className="text-muted-foreground">
          Tạo tables mới trên NocoDB và migrate data từ Lovable Cloud
        </p>
      </div>

      {/* Instructions */}
      <Card className="p-6 mb-6 bg-primary/5">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Hướng dẫn
        </h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          <li>Nhấn nút "Run Migration" bên dưới</li>
          <li>Đợi quá trình hoàn tất (khoảng 1-2 phút)</li>
          <li>Copy Table IDs hiển thị sau khi xong</li>
          <li>Paste vào file <code className="bg-secondary px-2 py-1 rounded">src/services/nocodb/config.ts</code></li>
          <li>Kiểm tra app hoạt động bình thường</li>
        </ol>
      </Card>

      {/* Run Migration Button */}
      <div className="mb-6">
        <Button
          onClick={runMigration}
          disabled={isRunning}
          size="lg"
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Đang chạy migration...
            </>
          ) : (
            <>
              <Database className="mr-2 h-5 w-5" />
              Run Migration
            </>
          )}
        </Button>
      </div>

      {/* Migration Log */}
      {migrationLog.length > 0 && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Migration Log
          </h2>
          <div className="bg-secondary p-4 rounded-lg font-mono text-sm overflow-auto max-h-96">
            {migrationLog.map((line, index) => (
              <div key={index} className="mb-1">
                {line}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Table IDs Result */}
      {tableIds && (
        <Card className="p-6 mb-6 border-green-500 border-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Table IDs
            </h2>
            <Button
              onClick={copyTableIds}
              variant="outline"
              size="sm"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Config
            </Button>
          </div>

          <div className="space-y-2">
            {Object.entries(tableIds).map(([table, id]) => (
              <div
                key={table}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
              >
                <span className="font-medium">{table}</span>
                <code className="text-sm bg-background px-3 py-1 rounded">
                  {id || '❌ FAILED'}
                </code>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm font-medium mb-2">⚠️ Bước tiếp theo:</p>
            <ol className="text-sm space-y-1 list-decimal list-inside">
              <li>Nhấn "Copy Config" ở trên</li>
              <li>Mở file <code className="bg-background px-2 py-1 rounded">src/services/nocodb/config.ts</code></li>
              <li>Tìm phần <code className="bg-background px-2 py-1 rounded">TABLES: &#123;</code></li>
              <li>Paste các Table IDs vào</li>
              <li>Save file</li>
            </ol>
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-red-500 border-2">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-red-500">
            <AlertCircle className="h-5 w-5" />
            Lỗi
          </h2>
          <div className="bg-red-500/10 p-4 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </Card>
      )}

      {/* Additional Info */}
      <Card className="p-6 bg-muted/30">
        <h3 className="font-semibold mb-3">📝 Tables sẽ được tạo:</h3>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>profiles</strong> - Thông tin user (tên, email, avatar)</li>
          <li>✅ <strong>user_subscriptions</strong> - Gói đăng ký (active/expired/trial)</li>
          <li>✅ <strong>payment_transactions</strong> - Lịch sử thanh toán</li>
          <li>✅ <strong>sales_reports</strong> - Báo cáo doanh thu</li>
        </ul>

        <h3 className="font-semibold mb-3 mt-6">📦 Data sẽ được migrate:</h3>
        <ul className="space-y-2 text-sm">
          <li>✅ <strong>feature_flags</strong> → NocoDB</li>
          <li>✅ <strong>role_feature_flags</strong> → NocoDB</li>
          <li>✅ <strong>user_feature_overrides</strong> → NocoDB</li>
        </ul>
      </Card>
    </div>
  );
}
