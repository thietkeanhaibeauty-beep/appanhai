import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, RefreshCw, Play, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const TestCronJobs = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cronStatus, setCronStatus] = useState<any>(null);
  const [lastAutoRun, setLastAutoRun] = useState<any>(null);
  const [lastRevertRun, setLastRevertRun] = useState<any>(null);

  const checkCronStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-cron-status');

      if (error) throw error;

      setCronStatus(data);
      sonnerToast.success('Đã kiểm tra trạng thái cron jobs');
    } catch (error: any) {
      console.error('Error checking cron status:', error);
      sonnerToast.error('Lỗi khi kiểm tra cron jobs');
    } finally {
      setLoading(false);
    }
  };

  const testAutoRules = async () => {
    setLoading(true);
    try {
      sonnerToast.info('Đang test auto-automation-rules-cron...');

      const { data, error } = await supabase.functions.invoke('auto-automation-rules-cron');

      if (error) throw error;

      setLastAutoRun(data);
      sonnerToast.success(`✅ Test thành công! Đã quét ${data.totalRules || 0} quy tắc, thực thi ${data.executedRules || 0} quy tắc`);
    } catch (error: any) {
      console.error('Error testing auto rules:', error);
      sonnerToast.error('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const testPendingReverts = async () => {
    setLoading(true);
    try {
      sonnerToast.info('Đang test process-pending-reverts...');

      const { data, error } = await supabase.functions.invoke('process-pending-reverts');

      if (error) throw error;

      setLastRevertRun(data);
      sonnerToast.success(`✅ Test thành công! Đã xử lý ${data.processed || 0} reverts`);
    } catch (error: any) {
      console.error('Error testing reverts:', error);
      sonnerToast.error('Lỗi: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-6 h-6" />
            Kiểm tra Cron Jobs
          </CardTitle>
          <CardDescription>
            Verify cron jobs đang hoạt động và test thủ công
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Test Connection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Test Network Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Kiểm tra kết nối từ Supabase Cloud đến NocoDB Server (IP: 180.93.3.41)
                </p>
              </div>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    sonnerToast.info('Đang kiểm tra kết nối...');
                    const { data, error } = await supabase.functions.invoke('test-connection');

                    if (error) throw error;

                    if (data.success) {
                      sonnerToast.success(`✅ Kết nối thành công! Status: ${data.status}, Time: ${data.duration}ms`);
                    } else {
                      sonnerToast.error(`❌ Kết nối thất bại: ${data.error}`);
                    }
                  } catch (error: any) {
                    console.error('Error testing connection:', error);
                    sonnerToast.error('Lỗi: ' + error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Test Connection
              </Button>
            </div>
          </div>

          {/* Check Cron Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Trạng thái Cron Jobs</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={checkCronStatus}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Kiểm tra
              </Button>
            </div>

            {cronStatus && (
              <div className="grid gap-3">
                <Card className="border-2">
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Active Cron Jobs ({cronStatus.cronJobs?.length || 0})</CardTitle>
                      <Badge variant={cronStatus.exists ? "default" : "destructive"}>
                        {cronStatus.exists ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {cronStatus.exists ? 'Active' : 'No Jobs Found'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 space-y-2">
                    {cronStatus.cronJobs?.map((job: any, idx: number) => (
                      <div key={idx} className="p-2 border rounded bg-muted/50 text-xs text-muted-foreground">
                        <div className="font-semibold text-foreground">{job.jobname}</div>
                        <div>ID: {job.jobid}</div>
                        <div>Schedule: {job.schedule}</div>
                        <div>Active: {job.active ? 'Yes' : 'No'}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Test Auto Rules */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Test Auto Rules Execution</h3>
                <p className="text-sm text-muted-foreground">
                  Chạy thủ công auto-automation-rules-cron
                </p>
              </div>
              <Button
                onClick={testAutoRules}
                disabled={loading}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Chạy Test
              </Button>
            </div>

            {lastAutoRun && (
              <Card className="bg-muted/50">
                <CardContent className="py-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tổng quy tắc:</span>
                    <Badge variant="outline">{lastAutoRun.totalRules || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Đã thực thi:</span>
                    <Badge>{lastAutoRun.executedRules || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Bỏ qua:</span>
                    <Badge variant="secondary">{lastAutoRun.skippedRules || 0}</Badge>
                  </div>
                  {lastAutoRun.errors && lastAutoRun.errors.length > 0 && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-destructive mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Errors:</span>
                      </div>
                      {lastAutoRun.errors.map((err: any, idx: number) => (
                        <div key={idx} className="text-xs text-destructive/80">
                          Rule {err.ruleId}: {err.error}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Test Pending Reverts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Test Pending Reverts</h3>
                <p className="text-sm text-muted-foreground">
                  Chạy thủ công process-pending-reverts
                </p>
              </div>
              <Button
                onClick={testPendingReverts}
                disabled={loading}
                variant="outline"
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Chạy Test
              </Button>
            </div>

            {lastRevertRun && (
              <Card className="bg-muted/50">
                <CardContent className="py-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Đã xử lý:</span>
                    <Badge>{lastRevertRun.processed || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Thành công:</span>
                    <Badge variant="default">{lastRevertRun.successful || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Thất bại:</span>
                    <Badge variant="destructive">{lastRevertRun.failed || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Test Scheduled Reports */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Test Scheduled Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Chạy thủ công process-scheduled-reports (Gửi báo cáo)
                </p>
              </div>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    sonnerToast.info('Đang test process-scheduled-reports...');
                    const { data, error } = await supabase.functions.invoke('process-scheduled-reports');
                    if (error) throw error;
                    sonnerToast.success(`✅ Test thành công! Kết quả: ${JSON.stringify(data.results)}`);
                  } catch (error: any) {
                    console.error('Error testing reports:', error);
                    sonnerToast.error('Lỗi: ' + error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Chạy Test
              </Button>
            </div>
          </div>

          {/* Test Sync Ads Cron */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Test Sync Ads Cron</h3>
                <p className="text-sm text-muted-foreground">
                  Chạy thủ công sync-ads-cron (Cập nhật báo cáo Ads)
                </p>
              </div>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    sonnerToast.info('Đang test sync-ads-cron...');
                    const { data, error } = await supabase.functions.invoke('sync-ads-cron', {
                      body: { limit: 100 } // Limit for test
                    });

                    if (error) throw error;

                    console.log('Sync Ads Result:', data);
                    sonnerToast.success(`✅ Test thành công! Đã xử lý ${data.processed || 0} records`);
                  } catch (error: any) {
                    console.error('Error testing sync ads:', error);
                    sonnerToast.error('Lỗi: ' + error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="gap-2"
              >
                <Play className="w-4 h-4" />
                Chạy Test
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Hướng dẫn kiểm tra
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3 space-y-2 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Để test cron job tự động:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Tạo 1 rule với "Tự động chạy theo lịch" ENABLED</li>
                  <li>Set "Tần suất kiểm tra" (ví dụ: Mỗi 5 phút)</li>
                  <li>Đợi 5 phút cho cron job chạy tự động</li>
                  <li>Kiểm tra logs của rule để xem kết quả</li>
                </ol>
              </div>
              <div className="space-y-1 pt-2 border-t">
                <p className="font-medium">Test thủ công nhanh:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Click "Chạy Test" ở trên để chạy ngay lập tức</li>
                  <li>Kiểm tra kết quả hiển thị</li>
                  <li>Verify trong NocoDB execution logs</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestCronJobs;
