/**
 * AdsHistory.tsx - Lịch sử quảng cáo (Standalone Page)
 * Extracted from AdsReportAuto.tsx ngày 14/12/2024
 */

import { useState, useEffect, useMemo, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { getHistoricalInsightsByUserAndDate } from "@/services/nocodb/facebookInsightsHistoryService";
import { triggerHistoricalSync } from "@/services/nocodb/historicalInsightsSyncService";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays } from "date-fns";
import { DateRange } from "react-day-picker";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Settings, ArrowUpDown, X, History } from "lucide-react";
import DateRangePicker from "@/components/DateRangePicker";
import AdsTableColumnsCustomizer from "@/components/AdsTableColumnsCustomizer";

// Types
type SortDirection = 'asc' | 'desc' | null;

interface BreadcrumbItem {
    level: 'campaign' | 'adset' | 'ad' | 'ad-daily';
    parentId: string | null;
    name: string;
}

// Helper function
const formatVND = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(num) + ' ₫';
};

const formatNumber = (value: number | string, decimals = 0) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '—';
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: decimals }).format(num);
};

const formatValue = (field: string, value: any, insight: any = {}): React.ReactNode => {
    if (value === null || value === undefined) return '—';

    switch (field) {
        case 'spend':
        case 'budget':
        case 'cost_per_result':
        case 'cost_per_phone':
        case 'cpc':
            return formatVND(value);
        case 'cpm':
            return formatVND(parseFloat(value) / 1000);
        case 'impressions':
        case 'clicks':
        case 'reach':
        case 'results':
        case 'phones':
            return formatNumber(value);
        case 'ctr':
        case 'frequency':
            return formatNumber(value, 2) + '%';
        case 'effective_status':
            const statusMap: Record<string, { label: string; color: string }> = {
                'ACTIVE': { label: 'Đang chạy', color: 'text-green-600' },
                'PAUSED': { label: 'Tạm dừng', color: 'text-yellow-600' },
                'DELETED': { label: 'Đã xóa', color: 'text-red-600' },
                'ARCHIVED': { label: 'Lưu trữ', color: 'text-gray-500' },
                'CAMPAIGN_PAUSED': { label: 'Camp. dừng', color: 'text-orange-500' },
                'ADSET_PAUSED': { label: 'Nhóm dừng', color: 'text-orange-500' },
            };
            const status = statusMap[value] || { label: value, color: 'text-gray-500' };
            return <span className={status.color}>{status.label}</span>;
        default:
            return String(value);
    }
};

const AdsHistory = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Historical insights states
    const [historicalInsights, setHistoricalInsights] = useState<any[]>([]);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [historicalSyncing, setHistoricalSyncing] = useState(false);
    const [historicalError, setHistoricalError] = useState<string | null>(null);
    const [historicalBreadcrumbs, setHistoricalBreadcrumbs] = useState<BreadcrumbItem[]>([
        { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
    ]);
    const [sortField, setSortField] = useState<string | null>('spend');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [customizerOpen, setCustomizerOpen] = useState(false);

    // Date range
    const [dateRangeStr, setDateRangeStr] = useLocalStorage<{ from?: string; to?: string } | undefined>(
        'ads-history-date-range',
        {
            from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
            to: format(subDays(new Date(), 1), 'yyyy-MM-dd')
        }
    );

    const dateRange: DateRange | undefined = useMemo(() => {
        if (!dateRangeStr) return undefined;
        return {
            from: dateRangeStr.from ? new Date(dateRangeStr.from) : undefined,
            to: dateRangeStr.to ? new Date(dateRangeStr.to) : undefined,
        };
    }, [dateRangeStr?.from, dateRangeStr?.to]);

    const setDateRange = (range: DateRange | undefined) => {
        if (range?.from || range?.to) {
            setDateRangeStr({
                from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
                to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
            });
        } else {
            setDateRangeStr(undefined);
        }
    };

    // Column configuration
    const defaultFields = [
        'campaign_name',
        'spend',
        'results',
        'cost_per_result',
        'impressions',
        'clicks',
        'ctr',
        'started_7d'
    ];

    const [selectedFields, setSelectedFields] = useLocalStorage<string[]>(
        'ads-history-columns-v2',  // Changed key to reset with new defaults
        defaultFields
    );

    // Layout presets
    const [savedLayouts, setSavedLayouts] = useLocalStorage<Array<{
        name: string;
        columnOrder: string[];
    }>>('ads-history-layouts', []);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const [layoutName, setLayoutName] = useState('');
    const [selectedLayout, setSelectedLayout] = useState<string>('');

    // Column widths
    const [columnWidths, setColumnWidths] = useLocalStorage<Record<string, number>>(
        'ads-history-column-widths',
        {}
    );

    // Fetch historical insights
    const fetchHistoricalInsights = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            return;
        }

        setHistoricalLoading(true);
        setHistoricalError(null);

        try {
            if (!user?.id) {
                setHistoricalInsights([]);
                setHistoricalLoading(false);
                return;
            }

            const adAccounts = await getActiveAdAccounts(user.id);
            const accountData = adAccounts.find(acc => acc.is_active);

            if (!accountData) {
                setHistoricalInsights([]);
                setHistoricalLoading(false);
                return;
            }

            const startDate = format(dateRange.from, 'yyyy-MM-dd');
            const endDate = format(dateRange.to, 'yyyy-MM-dd');

            const data = await getHistoricalInsightsByUserAndDate(
                user.id,
                accountData.account_id,
                startDate,
                endDate
            );

            setHistoricalInsights(data);
        } catch (err: any) {
            console.error('❌ Error fetching historical insights:', err);
            setHistoricalError(err.message || 'Không thể tải dữ liệu lịch sử');
        } finally {
            setHistoricalLoading(false);
        }
    };

    // Sync historical from Facebook
    const handleHistoricalSync = async () => {
        if (!dateRange?.from || !dateRange?.to) {
            toast({
                title: "Lỗi",
                description: "Vui lòng chọn khoảng thời gian trước khi đồng bộ",
                variant: "destructive",
            });
            return;
        }

        setHistoricalSyncing(true);

        try {
            if (!user?.id) {
                setHistoricalError('Vui lòng đăng nhập để tiếp tục');
                return;
            }

            const adAccounts = await getActiveAdAccounts(user.id);
            const accountData = adAccounts.find(acc => acc.is_active);

            if (!accountData) {
                toast({
                    title: "Lỗi",
                    description: 'Không tìm thấy tài khoản quảng cáo đang hoạt động',
                    variant: "destructive",
                });
                return;
            }

            const since = format(dateRange.from, 'yyyy-MM-dd');
            const until = format(dateRange.to, 'yyyy-MM-dd');

            const result = await triggerHistoricalSync({
                userId: user.id,
                accountId: accountData.account_id,
                since,
                until,
            });

            toast({
                title: "Đồng bộ thành công",
                description: `Đã đồng bộ ${result.totalSynced} insights (${result.inserted} mới, ${result.updated} cập nhật)`,
            });

            await fetchHistoricalInsights();
        } catch (err: any) {
            console.error('Error syncing historical:', err);
            toast({
                title: "Lỗi đồng bộ",
                description: err.message || 'Không thể đồng bộ dữ liệu lịch sử',
                variant: "destructive",
            });
        } finally {
            setHistoricalSyncing(false);
        }
    };

    // Load data on date range change
    useEffect(() => {
        if (dateRange?.from && dateRange?.to && user?.id) {
            fetchHistoricalInsights();
        }
    }, [dateRange?.from, dateRange?.to, user?.id]);

    // Get current view level
    const currentView = historicalBreadcrumbs[historicalBreadcrumbs.length - 1];
    const viewLevel = currentView.level;

    // Process and filter insights
    const processedInsights = useMemo(() => {
        let groupedData = [...historicalInsights];

        // Filter by level and parent
        if (viewLevel === 'campaign') {
            const levelData = groupedData.filter(i => i.level === 'campaign');
            const campaignMap = new Map<string, any>();

            levelData.forEach(insight => {
                if (!insight.campaign_id) return;
                const key = insight.campaign_id;

                if (!campaignMap.has(key)) {
                    campaignMap.set(key, {
                        ...insight,
                        level: 'campaign',
                        impressions: 0,
                        clicks: 0,
                        spend: 0,
                        reach: 0,
                        results: 0,
                    });
                }

                const aggregated = campaignMap.get(key);
                aggregated.impressions += insight.impressions || 0;
                aggregated.clicks += insight.clicks || 0;
                aggregated.spend += insight.spend || 0;
                aggregated.reach = Math.max(aggregated.reach, insight.reach || 0);
                aggregated.results += insight.results || 0;
            });

            groupedData = Array.from(campaignMap.values());
        } else if (viewLevel === 'adset' && currentView.parentId) {
            const levelData = groupedData.filter(i =>
                i.level === 'adset' && i.campaign_id === currentView.parentId
            );
            const adsetMap = new Map<string, any>();

            levelData.forEach(insight => {
                if (!insight.adset_id) return;
                const key = insight.adset_id;

                if (!adsetMap.has(key)) {
                    adsetMap.set(key, {
                        ...insight,
                        level: 'adset',
                        impressions: 0,
                        clicks: 0,
                        spend: 0,
                        reach: 0,
                        results: 0,
                    });
                }

                const aggregated = adsetMap.get(key);
                aggregated.impressions += insight.impressions || 0;
                aggregated.clicks += insight.clicks || 0;
                aggregated.spend += insight.spend || 0;
                aggregated.reach = Math.max(aggregated.reach, insight.reach || 0);
                aggregated.results += insight.results || 0;
            });

            groupedData = Array.from(adsetMap.values());
        } else if (viewLevel === 'ad' && currentView.parentId) {
            const levelData = groupedData.filter(i =>
                i.level === 'ad' && i.adset_id === currentView.parentId
            );
            const adMap = new Map<string, any>();

            levelData.forEach(insight => {
                if (!insight.ad_id) return;
                const key = insight.ad_id;

                if (!adMap.has(key)) {
                    adMap.set(key, {
                        ...insight,
                        level: 'ad',
                        impressions: 0,
                        clicks: 0,
                        spend: 0,
                        reach: 0,
                        results: 0,
                    });
                }

                const aggregated = adMap.get(key);
                aggregated.impressions += insight.impressions || 0;
                aggregated.clicks += insight.clicks || 0;
                aggregated.spend += insight.spend || 0;
                aggregated.reach = Math.max(aggregated.reach, insight.reach || 0);
                aggregated.results += insight.results || 0;
            });

            groupedData = Array.from(adMap.values());
        } else {
            groupedData = [];
        }

        // Calculate derived metrics
        groupedData = groupedData.map(row => ({
            ...row,
            ctr: row.impressions > 0 ? (row.clicks / row.impressions) * 100 : 0,
            cpc: row.clicks > 0 ? row.spend / row.clicks : 0,
            cpm: row.impressions > 0 ? (row.spend / row.impressions) * 1000 : 0,
            cost_per_result: row.results > 0 ? row.spend / row.results : 0,
        }));

        // Sort
        if (sortField && sortDirection) {
            groupedData.sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];
                const aNum = parseFloat(aVal);
                const bNum = parseFloat(bVal);

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
                }

                const aStr = String(aVal || '');
                const bStr = String(bVal || '');
                return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
            });
        }

        return groupedData;
    }, [historicalInsights, viewLevel, currentView.parentId, sortField, sortDirection]);

    // Get display fields based on view level
    const displayFields = useMemo(() => {
        return selectedFields.map(field => ({ field, label: field })).filter(f => {
            if (viewLevel === 'campaign') {
                return f.field !== 'adset_name' && f.field !== 'ad_name';
            } else if (viewLevel === 'adset') {
                return f.field !== 'campaign_name' && f.field !== 'ad_name';
            } else if (viewLevel === 'ad') {
                return f.field !== 'campaign_name';
            }
            return true;
        });
    }, [selectedFields, viewLevel]);

    // Name field mapping
    const nameFieldMap: Record<string, string> = {
        'campaign': 'campaign_name',
        'adset': 'adset_name',
        'ad': 'ad_name',
        'ad-daily': 'ad_name'
    };

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc');
            if (sortDirection === 'desc') setSortField(null);
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleSaveLayout = () => {
        if (!layoutName.trim()) return;

        const newLayout = {
            name: layoutName.trim(),
            columnOrder: selectedFields,
        };

        setSavedLayouts([...savedLayouts.filter(l => l.name !== layoutName.trim()), newLayout]);
        setShowSaveDialog(false);
        setLayoutName('');
        toast({ title: "Đã lưu định dạng", description: layoutName });
    };

    const handleLoadLayout = (name: string) => {
        const layout = savedLayouts.find(l => l.name === name);
        if (layout) {
            setSelectedFields(layout.columnOrder);
            setSelectedLayout(name);
        }
    };

    const handleDeleteLayout = (name: string) => {
        setSavedLayouts(savedLayouts.filter(l => l.name !== name));
        if (selectedLayout === name) setSelectedLayout('');
    };

    // Calculate totals for summary card
    const totalSpend = useMemo(() => {
        return processedInsights.reduce((sum, i) => sum + (i.spend || 0), 0);
    }, [processedInsights]);

    const totalResults = useMemo(() => {
        return processedInsights.reduce((sum, i) => sum + (i.results || 0), 0);
    }, [processedInsights]);

    const totalImpressions = useMemo(() => {
        return processedInsights.reduce((sum, i) => sum + (i.impressions || 0), 0);
    }, [processedInsights]);

    const totalClicks = useMemo(() => {
        return processedInsights.reduce((sum, i) => sum + (i.clicks || 0), 0);
    }, [processedInsights]);

    // Detect mobile
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

    return (
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
            {/* Compact Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Lịch sử quảng cáo
                    </h1>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleHistoricalSync}
                            disabled={historicalSyncing}
                            className="h-7 px-2 text-xs"
                        >
                            <RefreshCw className={`w-3 h-3 ${historicalSyncing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCustomizerOpen(true)}
                            className="h-7 px-2 text-xs"
                        >
                            <Settings className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* Level Tabs - Compact */}
                <Tabs value={viewLevel} onValueChange={(v) => {
                    if (v === 'campaign') {
                        setHistoricalBreadcrumbs([{
                            level: 'campaign' as const,
                            parentId: null,
                            name: 'Tất cả chiến dịch'
                        }]);
                    }
                }}>
                    <TabsList className="h-8 w-full sm:w-auto">
                        <TabsTrigger value="campaign" className="text-xs h-6 px-3">Chiến dịch</TabsTrigger>
                        <TabsTrigger value="adset" className="text-xs h-6 px-3">Nhóm QC</TabsTrigger>
                        <TabsTrigger value="ad" className="text-xs h-6 px-3">Quảng cáo</TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Date picker and controls */}
                <div className="flex items-center gap-2 flex-wrap">
                    <DateRangePicker value={dateRange} onChange={setDateRange} />
                    {savedLayouts.length > 0 && (
                        <Select value={selectedLayout} onValueChange={handleLoadLayout}>
                            <SelectTrigger className="w-[120px] h-7 text-xs">
                                <SelectValue placeholder="Định dạng..." />
                            </SelectTrigger>
                            <SelectContent>
                                {savedLayouts.map((layout) => (
                                    <SelectItem key={layout.name} value={layout.name} className="text-xs">
                                        {layout.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>
            </div>

            {/* Summary Card - Blue gradient */}
            {processedInsights.length > 0 && (
                <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs opacity-80">Tổng chi tiêu</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleHistoricalSync}
                                disabled={historicalSyncing}
                                className="h-7 px-2 text-white/80 hover:text-white hover:bg-white/20 text-xs"
                            >
                                <RefreshCw className={`w-3 h-3 mr-1 ${historicalSyncing ? 'animate-spin' : ''}`} />
                                Đồng bộ
                            </Button>
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold mb-3">
                            {formatVND(totalSpend)}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                                <div className="text-xs opacity-70">Kết quả</div>
                                <div className="text-sm font-semibold">{formatNumber(totalResults)}</div>
                            </div>
                            <div>
                                <div className="text-xs opacity-70">Hiển thị</div>
                                <div className="text-sm font-semibold">{formatNumber(totalImpressions / 1000, 1)}k</div>
                            </div>
                            <div>
                                <div className="text-xs opacity-70">Lượt click</div>
                                <div className="text-sm font-semibold">{formatNumber(totalClicks)}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Breadcrumbs */}
            {historicalBreadcrumbs.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
                    {historicalBreadcrumbs.map((crumb, idx) => (
                        <div key={idx} className="flex items-center gap-1 whitespace-nowrap">
                            {idx > 0 && <span>/</span>}
                            <button
                                onClick={() => setHistoricalBreadcrumbs(historicalBreadcrumbs.slice(0, idx + 1))}
                                className="hover:text-foreground hover:underline"
                            >
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            {historicalError ? (
                <Alert variant="destructive">
                    <AlertTitle>Lỗi</AlertTitle>
                    <AlertDescription>{historicalError}</AlertDescription>
                </Alert>
            ) : historicalLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Đang tải...
                </div>
            ) : processedInsights.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                    Chưa có dữ liệu. Bấm đồng bộ để tải.
                </div>
            ) : (
                <>
                    {/* Campaign/AdSet/Ad Cards for Mobile */}
                    <div className="sm:hidden space-y-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                            <span>DANH SÁCH {viewLevel === 'campaign' ? 'CHIẾN DỊCH' : viewLevel === 'adset' ? 'NHÓM QC' : 'QUẢNG CÁO'}</span>
                            <span>{processedInsights.length} items</span>
                        </div>
                        {processedInsights.map((insight, idx) => {
                            const name = insight[nameFieldMap[viewLevel]] || 'N/A';
                            const ctr = insight.impressions > 0 ? ((insight.clicks / insight.impressions) * 100).toFixed(2) : '0';
                            const cpr = insight.results > 0 ? Math.round(insight.spend / insight.results) : 0;

                            return (
                                <Card key={idx} className="bg-card">
                                    <CardContent className="p-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1 min-w-0">
                                                {viewLevel !== 'ad' ? (
                                                    <button
                                                        onClick={() => {
                                                            if (viewLevel === 'campaign') {
                                                                setHistoricalBreadcrumbs([
                                                                    ...historicalBreadcrumbs,
                                                                    { level: 'adset', parentId: insight.campaign_id, name: name }
                                                                ]);
                                                            } else if (viewLevel === 'adset') {
                                                                setHistoricalBreadcrumbs([
                                                                    ...historicalBreadcrumbs,
                                                                    { level: 'ad', parentId: insight.adset_id, name: name }
                                                                ]);
                                                            }
                                                        }}
                                                        className="text-sm font-medium text-left text-primary hover:underline truncate block w-full"
                                                    >
                                                        • {name}
                                                    </button>
                                                ) : (
                                                    <div className="text-sm font-medium truncate">• {name}</div>
                                                )}
                                            </div>
                                            <div className="text-sm font-bold text-right whitespace-nowrap ml-2">
                                                {formatVND(insight.spend)}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                                            <div>
                                                <div className="text-[10px]">Chi phí/KQ</div>
                                                <div className="font-medium text-foreground">{formatNumber(cpr / 1000, 0)}k</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px]">Kết quả</div>
                                                <div className="font-medium text-primary">{formatNumber(insight.results)}</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px]">Hiển thị</div>
                                                <div className="font-medium text-foreground">{formatNumber(insight.impressions / 1000, 1)}k</div>
                                            </div>
                                            <div>
                                                <div className="text-[10px]">Tỷ lệ click</div>
                                                <div className="font-medium text-foreground">{ctr}%</div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Table for Desktop */}
                    <div className="hidden sm:block">
                        <ScrollArea className="h-[500px]">
                            <div className="border rounded-lg">
                                <Table className="min-w-[800px] table-fixed w-full">
                                    <TableHeader className="sticky top-0 bg-muted z-20 shadow-sm">
                                        <TableRow>
                                            {displayFields.map((field) => {
                                                const width = columnWidths[field.field] || 120;
                                                return (
                                                    <TableHead
                                                        key={field.field}
                                                        className="whitespace-nowrap px-3 py-2 border-r cursor-pointer hover:bg-accent text-xs"
                                                        style={{ width, minWidth: '80px', maxWidth: width }}
                                                        onClick={() => handleSort(field.field)}
                                                    >
                                                        <div className="flex items-center gap-1">
                                                            <span className="truncate">{field.field}</span>
                                                            {sortField === field.field && (
                                                                <ArrowUpDown className={`w-3 h-3 ${sortDirection === 'asc' ? 'rotate-180' : ''}`} />
                                                            )}
                                                        </div>
                                                    </TableHead>
                                                );
                                            })}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {processedInsights.map((insight, rowIdx) => (
                                            <TableRow key={rowIdx} className="border-b">
                                                {displayFields.map((field) => {
                                                    const width = columnWidths[field.field] || 120;
                                                    const isNameField = field.field === nameFieldMap[viewLevel];
                                                    const cellValue = formatValue(field.field, insight[field.field], insight);

                                                    if (isNameField && viewLevel !== 'ad') {
                                                        return (
                                                            <TableCell
                                                                key={field.field}
                                                                className="whitespace-nowrap overflow-hidden text-ellipsis text-xs px-3 py-2 border-r"
                                                                style={{ width, minWidth: '80px', maxWidth: width }}
                                                            >
                                                                <button
                                                                    onClick={() => {
                                                                        if (viewLevel === 'campaign') {
                                                                            setHistoricalBreadcrumbs([
                                                                                ...historicalBreadcrumbs,
                                                                                { level: 'adset', parentId: insight.campaign_id, name: insight.campaign_name || 'Unknown' }
                                                                            ]);
                                                                        } else if (viewLevel === 'adset') {
                                                                            setHistoricalBreadcrumbs([
                                                                                ...historicalBreadcrumbs,
                                                                                { level: 'ad', parentId: insight.adset_id, name: insight.adset_name || 'Unknown' }
                                                                            ]);
                                                                        }
                                                                    }}
                                                                    className="text-left text-primary hover:underline truncate w-full"
                                                                >
                                                                    {insight[field.field] || 'N/A'}
                                                                </button>
                                                            </TableCell>
                                                        );
                                                    }

                                                    return (
                                                        <TableCell
                                                            key={field.field}
                                                            className="whitespace-nowrap overflow-hidden text-ellipsis text-xs px-3 py-2 border-r"
                                                            style={{ width, minWidth: '80px', maxWidth: width }}
                                                        >
                                                            {cellValue}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </div>
                </>
            )}

            {/* Column Customizer Dialog */}
            <AdsTableColumnsCustomizer
                open={customizerOpen}
                onOpenChange={setCustomizerOpen}
                selectedFields={selectedFields}
                onFieldsChange={setSelectedFields}
            />

            {/* Save Layout Dialog */}
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Lưu định dạng Lịch sử</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Tên định dạng</Label>
                            <Input
                                value={layoutName}
                                onChange={(e) => setLayoutName(e.target.value)}
                                placeholder="VD: Báo cáo hàng tuần"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Hủy</Button>
                        <Button onClick={handleSaveLayout} disabled={!layoutName.trim()}>Lưu</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdsHistory;
