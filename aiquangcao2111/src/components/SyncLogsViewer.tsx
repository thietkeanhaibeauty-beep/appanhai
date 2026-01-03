import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Terminal, ChevronDown, ChevronRight, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'debug';
  message: string;
  data?: any;
}

interface SyncLogGroup {
  syncId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'success' | 'error';
  logs: LogEntry[];
  summary?: {
    totalFetched: number;
    totalUpdated: number;
    totalInserted: number;
    duplicates?: number;
  };
}

export const SyncLogsViewer = () => {
  const [logs, setLogs] = useState<SyncLogGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Mock data for now - we'll connect to real edge function logs later
  const fetchLogs = async () => {
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const mockLogs: SyncLogGroup[] = [
        {
          syncId: 'sync_' + Date.now(),
          startTime: new Date().toISOString(),
          status: 'success',
          logs: [
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '🔍 ========== WHERE CLAUSE DEBUG ==========',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '📍 Full WHERE (decoded): (user_id,eq,xxx)~and(account_id,eq,xxx)~and(date_start,gte,2025-10-27)',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '📍 Strategy: Fetch ALL records for user + account + date (no IDs filter)',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '📊 ========== EXISTING RECORDS DEBUG ==========',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '📊 Total records fetched: 211',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '🗺️ ========== EXISTING KEYS MAP DEBUG ==========',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '🗺️ Total keys in map: 211',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '📊 ========== UPSERT DECISION ==========',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '📊 Total after dedup: 211',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'warning',
              message: '⚠️ WARNING: 138 records will be INSERTED despite having 211 existing records!',
            },
            {
              timestamp: new Date().toISOString(),
              level: 'info',
              message: '✅ campaign sync complete: 73 updated, 138 inserted',
            },
          ],
          summary: {
            totalFetched: 211,
            totalUpdated: 73,
            totalInserted: 138,
            duplicates: 138,
          },
        },
      ];
      
      setLogs(mockLogs);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const toggleExpand = (syncId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(syncId)) {
      newExpanded.delete(syncId);
    } else {
      newExpanded.add(syncId);
    }
    setExpandedLogs(newExpanded);
  };

  const getLogBadgeVariant = (level: LogEntry['level']) => {
    switch (level) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'debug': return 'outline';
      default: return 'default';
    }
  };

  const getStatusBadge = (status: SyncLogGroup['status']) => {
    switch (status) {
      case 'success': return <Badge className="bg-green-500">Thành công</Badge>;
      case 'error': return <Badge variant="destructive">Lỗi</Badge>;
      case 'running': return <Badge className="bg-blue-500">Đang chạy</Badge>;
    }
  };

  const filterLogs = (logGroup: SyncLogGroup) => {
    if (filterLevel === 'all') return logGroup.logs;
    return logGroup.logs.filter(log => log.level === filterLevel);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Sync Logs Viewer
            </CardTitle>
            <CardDescription>
              Theo dõi chi tiết quá trình đồng bộ dữ liệu từ Facebook
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-primary/10' : ''}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'Tắt tự động' : 'Bật tự động'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] w-full rounded-md border p-4">
          {logs.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Terminal className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Chưa có logs. Nhấn đồng bộ để bắt đầu.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((logGroup) => (
                <Collapsible
                  key={logGroup.syncId}
                  open={expandedLogs.has(logGroup.syncId)}
                  onOpenChange={() => toggleExpand(logGroup.syncId)}
                >
                  <Card className="border-2">
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {expandedLogs.has(logGroup.syncId) ? (
                              <ChevronDown className="h-5 w-5" />
                            ) : (
                              <ChevronRight className="h-5 w-5" />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">
                                  {format(new Date(logGroup.startTime), 'HH:mm:ss dd/MM/yyyy')}
                                </span>
                                {getStatusBadge(logGroup.status)}
                              </div>
                              {logGroup.summary && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  Fetched: {logGroup.summary.totalFetched} | 
                                  Updated: {logGroup.summary.totalUpdated} | 
                                  Inserted: {logGroup.summary.totalInserted}
                                  {logGroup.summary.duplicates && logGroup.summary.duplicates > 0 && (
                                    <span className="text-orange-500 font-medium ml-2">
                                      ⚠️ {logGroup.summary.duplicates} duplicates
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs">
                            {logGroup.syncId}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-1 font-mono text-xs">
                          {filterLogs(logGroup).map((log, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 p-2 rounded hover:bg-muted/30"
                            >
                              <Badge 
                                variant={getLogBadgeVariant(log.level)}
                                className="text-xs shrink-0"
                              >
                                {log.level}
                              </Badge>
                              <span className="text-muted-foreground shrink-0">
                                {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                              </span>
                              <pre className="flex-1 whitespace-pre-wrap break-words">
                                {log.message}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
