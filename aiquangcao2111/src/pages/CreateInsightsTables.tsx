import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CreateInsightsTables = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const createTables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-insights-tables', {
        body: {}
      });

      if (error) throw error;

      setResults(data);
      toast({
        title: "✅ Thành công!",
        description: "Đã tạo 4 bảng insights trong NocoDB",
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "❌ Lỗi",
        description: error.message || 'Không thể tạo bảng',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Tạo Bảng Insights trong NocoDB</CardTitle>
          <CardDescription>
            Tạo 4 bảng: automation_rule_object_executions, today_insights, weekly_insights, monthly_insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={createTables} disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo 4 Bảng'}
          </Button>

          {results && (
            <div className="mt-4 space-y-2">
              <h3 className="font-semibold">Kết quả:</h3>
              <pre className="bg-muted p-4 rounded text-sm overflow-auto">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateInsightsTables;
