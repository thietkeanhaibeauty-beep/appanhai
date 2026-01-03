import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface TableResult {
  name: string;
  table_id: string | null;
  status: 'pending' | 'loading' | 'success' | 'error';
  error?: string;
}

export default function CreateNocoDBInsightsTables() {
  const { toast } = useToast();
  const [results, setResults] = useState<TableResult[]>([
    { name: 'today_insights', table_id: null, status: 'pending' },
    { name: 'weekly_insights', table_id: null, status: 'pending' },
    { name: 'monthly_insights', table_id: null, status: 'pending' },
  ]);

  const createTable = async (tableName: string, functionName: string, index: number) => {
    setResults(prev => prev.map((r, i) => 
      i === index ? { ...r, status: 'loading' } : r
    ));

    try {
      const { data, error } = await supabase.functions.invoke(functionName);

      if (error) throw error;

      if (data?.success && data?.table_id) {
        setResults(prev => prev.map((r, i) => 
          i === index ? { ...r, status: 'success', table_id: data.table_id } : r
        ));
        
        toast({
          title: '✅ Tạo bảng thành công',
          description: `Table ID: ${data.table_id}`,
        });
      } else {
        throw new Error('No table ID returned');
      }
    } catch (error: any) {
      console.error(`Error creating ${tableName}:`, error);
      setResults(prev => prev.map((r, i) => 
        i === index ? { ...r, status: 'error', error: error.message } : r
      ));
      
      toast({
        title: '❌ Lỗi tạo bảng',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const createAllTables = async () => {
    await createTable('today_insights', 'create-today-insights-table', 0);
    await createTable('weekly_insights', 'create-weekly-insights-table', 1);
    await createTable('monthly_insights', 'create-monthly-insights-table', 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: '📋 Đã copy',
      description: 'Table ID đã được copy vào clipboard',
    });
  };

  const allSuccess = results.every(r => r.status === 'success');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏗️ Tạo Bảng NocoDB Insights</h1>
        <p className="text-muted-foreground">
          Tạo các bảng tổng hợp insights trong NocoDB và lấy Table IDs
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Bước 1: Tạo Bảng</CardTitle>
          <CardDescription>
            Click nút bên dưới để tạo 3 bảng trong NocoDB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createAllTables}
            disabled={results.some(r => r.status === 'loading')}
            size="lg"
            className="w-full"
          >
            {results.some(r => r.status === 'loading') ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang tạo bảng...
              </>
            ) : (
              '🚀 Tạo Tất Cả Bảng'
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4 mb-6">
        {results.map((result, index) => (
          <Card key={result.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{result.name}</CardTitle>
                {result.status === 'loading' && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                {result.status === 'success' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {result.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
              </div>
            </CardHeader>
            <CardContent>
              {result.status === 'success' && result.table_id && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm">
                      {result.table_id}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.table_id!)}
                    >
                      📋 Copy
                    </Button>
                  </div>
                </div>
              )}
              {result.status === 'error' && (
                <p className="text-sm text-destructive">{result.error}</p>
              )}
              {result.status === 'pending' && (
                <p className="text-sm text-muted-foreground">Chờ tạo...</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {allSuccess && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-green-600">✅ Bước 2: Cập Nhật Config</CardTitle>
            <CardDescription>
              Copy đoạn code sau vào <code>src/services/nocodb/config.ts</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
{`// Aggregated Insights (NocoDB-based)
TODAY_INSIGHTS: '${results[0].table_id}',
WEEKLY_INSIGHTS: '${results[1].table_id}',
MONTHLY_INSIGHTS: '${results[2].table_id}',`}
            </pre>
            <Button
              className="mt-4 w-full"
              onClick={() => copyToClipboard(`TODAY_INSIGHTS: '${results[0].table_id}',\nWEEKLY_INSIGHTS: '${results[1].table_id}',\nMONTHLY_INSIGHTS: '${results[2].table_id}',`)}
            >
              📋 Copy Config Code
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
