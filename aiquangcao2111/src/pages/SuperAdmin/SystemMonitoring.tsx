import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EdgeFunctionLog {
  id: string;
  timestamp: number;
  event_message: string;
  metadata?: {
    level?: string;
    status?: number;
    execution_time_ms?: number;
  };
}

export default function SystemMonitoring() {
  const [logs, setLogs] = useState<EdgeFunctionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Use mock data for logs display
      // In a real implementation, you would query Supabase analytics or logs table
      setLogs(generateMockLogs());
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs(generateMockLogs());
    } finally {
      setLoading(false);
    }
  };

  const generateMockLogs = (): EdgeFunctionLog[] => {
    const now = Date.now();
    return [
      {
        id: '1',
        timestamp: now - 300000,
        event_message: '✅ User role assigned successfully',
        metadata: { level: 'info', status: 200, execution_time_ms: 245 },
      },
      {
        id: '2',
        timestamp: now - 600000,
        event_message: '✅ System stats retrieved',
        metadata: { level: 'info', status: 200, execution_time_ms: 189 },
      },
      {
        id: '3',
        timestamp: now - 900000,
        event_message: '⚠️ Slow query detected in get-all-users',
        metadata: { level: 'warning', status: 200, execution_time_ms: 2450 },
      },
      {
        id: '4',
        timestamp: now - 1200000,
        event_message: '❌ Authentication failed',
        metadata: { level: 'error', status: 401, execution_time_ms: 50 },
      },
      {
        id: '5',
        timestamp: now - 1500000,
        event_message: '✅ User deleted successfully',
        metadata: { level: 'info', status: 200, execution_time_ms: 567 },
      },
    ];
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.event_message
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesLevel =
      levelFilter === 'all' ||
      (log.metadata?.level || 'info') === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const getLevelBadge = (level?: string) => {
    switch (level) {
      case 'info':
        return <Badge variant="outline">Thông tin</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Cảnh báo</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge variant="outline">Thông tin</Badge>;
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  const formatExecutionTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Giám sát hệ thống</h2>
        <p className="text-muted-foreground">
          Giám sát nhật ký hệ thống và hiệu suất edge function
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng yêu cầu</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Nhật ký gần đây</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ thành công</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
...
            <p className="text-xs text-muted-foreground">Phản hồi không có lỗi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lỗi</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter((l) => l.metadata?.level === 'error').length}
            </div>
            <p className="text-xs text-muted-foreground">Phản hồi lỗi</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nhật ký Edge Function</CardTitle>
          <CardDescription>
            Các sự kiện và thực thi edge function gần đây
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <Input
              placeholder="Tìm kiếm nhật ký..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Lọc theo cấp độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả cấp độ</SelectItem>
                <SelectItem value="info">Thông tin</SelectItem>
                <SelectItem value="warning">Cảnh báo</SelectItem>
                <SelectItem value="error">Lỗi</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchLogs} variant="outline">
              <Clock className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Không tìm thấy nhật ký phù hợp với tiêu chí
            </div>
          ) : (
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getLevelBadge(log.metadata?.level)}
                      {log.metadata?.status && (
                        <Badge variant="outline">
                          Trạng thái: {log.metadata.status}
                        </Badge>
                      )}
                      {log.metadata?.execution_time_ms && (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          {formatExecutionTime(log.metadata.execution_time_ms)}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-mono">{log.event_message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatTime(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
