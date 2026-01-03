import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Play,
    Clock,
    AlertCircle,
    CheckCircle2,
    History,
    Bell,
    Zap,
    Loader2,
    Pencil,
    Save,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { NOCODB_CONFIG, getNocoDBHeaders } from '@/services/nocodb/config';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CronJobStatus {
    name: string;
    lastRun?: string;
    status: 'active' | 'inactive' | 'error';
    schedule: string;
    description: string;
    functionName: string;
    jobName: string; // Internal job name for pg_cron
}

const SCHEDULE_PRESETS = [
    { label: 'Mỗi 5 phút', value: '*/5 * * * *' },
    { label: 'Mỗi 10 phút', value: '*/10 * * * *' },
    { label: 'Mỗi 15 phút', value: '*/15 * * * *' },
    { label: 'Mỗi 30 phút', value: '*/30 * * * *' },
    { label: 'Mỗi 1 giờ', value: '0 * * * *' },
    { label: 'Mỗi 2 giờ', value: '0 */2 * * * *' },
    { label: 'Mỗi 6 giờ', value: '0 */6 * * * *' },
    { label: 'Mỗi 12 giờ', value: '0 */12 * * * *' },
    { label: 'Hàng ngày lúc 00:00', value: '0 0 * * *' },
    { label: 'Hàng ngày lúc 09:00', value: '0 9 * * *' },
];

export default function CronManagement() {
    const [logsOpen, setLogsOpen] = useState(false);
    const [viewingLogsJob, setViewingLogsJob] = useState<CronJobStatus | null>(null);
    const [logs, setLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Restore missing states
    const [loading, setLoading] = useState<string | null>(null);
    const [editingJob, setEditingJob] = useState<CronJobStatus | null>(null);
    const [newSchedule, setNewSchedule] = useState('');
    const [customSchedule, setCustomSchedule] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [saving, setSaving] = useState(false);

    const [jobs, setJobs] = useState<CronJobStatus[]>([
        {
            name: 'Automation Rules',
            status: 'active',
            schedule: '*/15 * * * *',
            description: 'Tự động kiểm tra và thực thi các quy tắc quảng cáo (Tắt/Bật/Tăng ngân sách...)',
            functionName: 'auto-automation-rules-cron',
            jobName: 'auto-automation-rules-cron'
        },
        {
            name: 'Sync Ads Database',
            status: 'active',
            schedule: '0 */4 * * *',
            description: 'Đồng bộ dữ liệu quảng cáo từ Facebook về Database để báo cáo.',
            functionName: 'sync-ads-cron',
            jobName: 'sync-ads-cron'
        },
        {
            name: 'Scheduled Reports & Notifications',
            status: 'active',
            schedule: '0 * * * *',
            description: 'Gửi báo cáo định kỳ và thông báo hệ thống cho người dùng.',
            functionName: 'process-scheduled-reports',
            jobName: 'process-scheduled-reports'
        }
    ]);

    // ✅ Fetch actual schedules from pg_cron on mount
    useEffect(() => {
        const fetchSchedules = async () => {
            try {
                const { data, error } = await supabase.rpc('get_cron_schedules');

                if (error) {
                    console.error('Error fetching cron schedules:', error);
                    return;
                }

                if (data && Array.isArray(data)) {
                    setJobs(prevJobs => prevJobs.map(job => {
                        const cronJob = data.find((cj: any) =>
                            cj.jobname === job.jobName ||
                            cj.jobname?.includes(job.functionName)
                        );
                        if (cronJob && cronJob.schedule) {
                            return { ...job, schedule: cronJob.schedule };
                        }
                        return job;
                    }));
                }
            } catch (err) {
                console.error('Failed to fetch cron schedules:', err);
            }
        };

        fetchSchedules();
    }, []);



    const handleViewLogs = async (job: CronJobStatus) => {
        setViewingLogsJob(job);
        setLogsOpen(true);
        setLoadingLogs(true);
        setLogs([]);

        try {
            let tableId = '';
            // Map function to log table
            if (job.functionName === 'auto-automation-rules-cron') {
                tableId = NOCODB_CONFIG.TABLES.SYNC_LOGS; // ✅ Use SYNC_LOGS for summary
            } else if (job.functionName === 'sync-ads-cron') {
                tableId = NOCODB_CONFIG.TABLES.SYNC_LOGS;
            } else {
                // Default or other logs
                tableId = NOCODB_CONFIG.TABLES.SYNC_LOGS; // Fallback
            }

            if (!tableId || tableId === 'PLACEHOLDER') {
                toast.error('Chưa cấu hình bảng log cho tác vụ này');
                setLoadingLogs(false);
                return;
            }

            const response = await fetch(
                `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records?limit=10&sort=-Id`,
                {
                    headers: await getNocoDBHeaders(),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Proxy Error Details:', JSON.stringify(errorData, null, 2));
                throw new Error(`Failed to fetch logs: ${response.status} - ${errorData.error || response.statusText}`);
            }
            const data = await response.json();
            setLogs(data.list || []);

        } catch (error) {
            console.error('Error fetching logs:', error);
            toast.error('Không thể tải nhật ký hoạt động');
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleTrigger = async (job: CronJobStatus) => {
        setLoading(job.functionName);
        try {
            const body = job.functionName === 'sync-ads-cron'
                ? { limit: 2000, manualRun: true }
                : { manualRun: true };

            const { data, error } = await supabase.functions.invoke(job.functionName, {
                body: body
            });

            if (error) throw error;

            if (data?.success) {
                const stats = data.totalRules !== undefined
                    ? ` (Found: ${data.totalRules}, Ready: ${data.readyRules || 0}, Success: ${data.successCount || 0})`
                    : '';
                toast.success(`Đã kích hoạt ${job.name} thành công!${stats}`);
            } else {
                toast.warning(`Cron chạy nhưng có vấn đề: ${data?.message || 'Unknown'}`);
            }

            console.log('Cron trigger result:', data);
        } catch (error: any) {
            console.error('Error triggering cron:', error);
            toast.error(`Lỗi khi kích hoạt ${job.name}: ${error.message} `);
        } finally {
            setLoading(null);
        }
    };

    const handleEditClick = (job: CronJobStatus) => {
        setEditingJob(job);
        const isPreset = SCHEDULE_PRESETS.some(p => p.value === job.schedule);
        if (isPreset) {
            setNewSchedule(job.schedule);
            setIsCustom(false);
            setCustomSchedule('');
        } else {
            setNewSchedule('custom');
            setIsCustom(true);
            setCustomSchedule(job.schedule);
        }
    };

    const handleSaveSchedule = async () => {
        if (!editingJob) return;

        const finalSchedule = isCustom ? customSchedule : newSchedule;
        if (!finalSchedule) {
            toast.error('Vui lòng nhập lịch chạy hợp lệ');
            return;
        }

        setSaving(true);
        try {
            const { data, error } = await supabase.rpc('update_cron_schedule', {
                job_name: editingJob.jobName,
                new_schedule: finalSchedule
            });

            if (error) throw error;

            if (data && data.success) {
                toast.success(`Đã cập nhật lịch chạy cho ${editingJob.name} `);

                // Update local state
                setJobs(jobs.map(j =>
                    j.jobName === editingJob.jobName
                        ? { ...j, schedule: finalSchedule }
                        : j
                ));
                setEditingJob(null);
            } else {
                throw new Error(data?.error || 'Unknown error');
            }
        } catch (error: any) {
            console.error('Error updating schedule:', error);
            toast.error(`Lỗi cập nhật: ${error.message} `);
        } finally {
            setSaving(false);
        }
    };

    const getScheduleLabel = (schedule: string) => {
        const preset = SCHEDULE_PRESETS.find(p => p.value === schedule);
        return preset ? preset.label : schedule;
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Quản lý Cron & Thông báo</h2>
                <p className="text-muted-foreground">
                    Kiểm soát các tác vụ chạy ngầm của hệ thống.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {jobs.map((job) => (
                    <Card key={job.name} className="flex flex-col">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2">
                                        {job.functionName === 'auto-automation-rules-cron' ? (
                                            <Zap className="h-5 w-5 text-yellow-500" />
                                        ) : job.functionName === 'sync-ads-cron' ? (
                                            <History className="h-5 w-5 text-green-500" />
                                        ) : (
                                            <Bell className="h-5 w-5 text-blue-500" />
                                        )}
                                        {job.name}
                                    </CardTitle>
                                    <CardDescription>{job.description}</CardDescription>
                                </div>
                                <Badge variant={job.status === 'active' ? 'default' : 'destructive'}>
                                    {job.status === 'active' ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">{getScheduleLabel(job.schedule)}</span>
                                    <span className="text-xs text-muted-foreground font-mono">({job.schedule})</span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleEditClick(job)}
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>

                            {job.lastRun && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <History className="h-3 w-3" />
                                    Last run: {job.lastRun}
                                </div>
                            )}

                            <div className="flex gap-2 mt-auto pt-4">
                                <Button
                                    className="flex-1"
                                    onClick={() => handleTrigger(job)}
                                    disabled={loading === job.functionName}
                                >
                                    {loading === job.functionName ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Đang chạy...
                                        </>
                                    ) : (
                                        <>
                                            <Play className="mr-2 h-4 w-4" />
                                            Chạy ngay
                                        </>
                                    )}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleViewLogs(job)}
                                >
                                    <History className="mr-2 h-4 w-4" />
                                    Xem Log
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Edit Schedule Dialog */}
            <Dialog open={!!editingJob} onOpenChange={(open) => !open && setEditingJob(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Chỉnh sửa lịch chạy</DialogTitle>
                        <DialogDescription>
                            Thay đổi tần suất chạy cho tác vụ: <strong>{editingJob?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tần suất</Label>
                            <Select
                                value={isCustom ? 'custom' : newSchedule}
                                onValueChange={(val) => {
                                    if (val === 'custom') {
                                        setIsCustom(true);
                                        setNewSchedule('custom');
                                    } else {
                                        setIsCustom(false);
                                        setNewSchedule(val);
                                        setCustomSchedule('');
                                    }
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn tần suất" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SCHEDULE_PRESETS.map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value}>
                                            {preset.label} ({preset.value})
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">Tùy chỉnh (Cron Expression)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {isCustom && (
                            <div className="space-y-2">
                                <Label>Cron Expression</Label>
                                <Input
                                    value={customSchedule}
                                    onChange={(e) => setCustomSchedule(e.target.value)}
                                    placeholder="*/15 * * * *"
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ví dụ: <code>*/5 * * * *</code> (Mỗi 5 phút), <code>0 9 * * *</code> (9h sáng hàng ngày)
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingJob(null)}>Hủy</Button>
                        <Button onClick={handleSaveSchedule} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Lưu thay đổi
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ✅ Viewer Log Dialog */}
            <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Nhật ký hoạt động: {viewingLogsJob?.name}</DialogTitle>
                        <DialogDescription>
                            25 bản ghi gần nhất từ hệ thống.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-auto border rounded-md min-h-[300px]">
                        {loadingLogs ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Đang tải nhật ký...</p>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                                <History className="h-8 w-8 opacity-20" />
                                <p>Chưa có dữ liệu nhật ký</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium">Thời gian</th>
                                        <th className="px-4 py-2 text-left font-medium">Trạng thái</th>
                                        <th className="px-4 py-2 text-left font-medium">Chi tiết</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logs.map((log: any, index: number) => {
                                        const logId = log.Id || log.id || index;
                                        // 1. Date Handling
                                        const rawDate = log.created_at || log.CreatedAt || log.executed_at || log.UpdatedAt;
                                        let displayDate = 'N/A';
                                        if (rawDate) {
                                            try { displayDate = new Date(rawDate).toLocaleString('vi-VN'); } catch (e) { }
                                        }

                                        // 2. Status Handling
                                        const status = (log.status || log.execution_status || '').toLowerCase();
                                        const isSuccess = status === 'success' || status === 'active' || status === 'completed';

                                        // 3. Details Parsing
                                        let details = log.details || log.message || log.error || '';
                                        if (typeof details === 'string' && (details.startsWith('{') || details.startsWith('['))) {
                                            try {
                                                const parsed = JSON.parse(details);
                                                // Extract meaningful message if possible
                                                if (Array.isArray(parsed) && parsed[0]?.message) details = parsed.map((p: any) => p.message).join(', ');
                                                else if (parsed.message) details = parsed.message;
                                                else details = JSON.stringify(parsed);
                                            } catch (e) { }
                                        }

                                        return (
                                            <tr key={logId} className="hover:bg-muted/50">
                                                <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">{displayDate}</td>
                                                <td className="px-4 py-2">
                                                    {isSuccess ? (
                                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Success</Badge>
                                                    ) : (
                                                        <Badge variant="destructive">{status || 'Failed'}</Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 max-w-lg truncate" title={typeof details === 'string' ? details : JSON.stringify(details)}>
                                                    {typeof details === 'object' ? JSON.stringify(details) : details}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setLogsOpen(false)}>Đóng</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                <CardHeader>
                    <CardTitle>Hướng dẫn cài đặt</CardTitle>
                    <CardDescription>
                        Để hệ thống tự động chạy, bạn cần cài đặt Cron Job trong Supabase SQL Editor.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-muted p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs font-mono">
                            {`-- Automation Rules (Every 15 mins)
select cron.schedule(
  'auto-automation-rules-cron',
  '*/15 * * * *',
  $$ select net.http_post(url:='https://YOUR_PROJECT.supabase.co/functions/v1/auto-automation-rules-cron', headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb) as request_id; $$
);

-- Scheduled Reports (Every hour)
select cron.schedule(
  'process-scheduled-reports',
  '0 * * * *',
  $$ select net.http_post(url:='https://YOUR_PROJECT.supabase.co/functions/v1/process-scheduled-reports', headers:='{"Content-Type": "application/json", "Authorization": "Bearer SERVICE_KEY"}'::jsonb) as request_id; $$
);

-- Enable Schedule Editing (Run this once)
create or replace function update_cron_schedule(job_name text, new_schedule text)
returns jsonb language plpgsql security definer as $$
declare existing_command text;
begin
  select command into existing_command from cron.job where jobname = job_name;
  if existing_command is null then return jsonb_build_object('success', false, 'error', 'Job not found'); end if;
  perform cron.schedule(job_name, new_schedule, existing_command);
  return jsonb_build_object('success', true);
exception when others then return jsonb_build_object('success', false, 'error', SQLERRM);
end;
$$;`}
                        </pre>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
