import { useState, useEffect, useMemo, useRef, useCallback, Fragment } from "react";
import { useAdsLayoutPresets } from '@/hooks/useAdsLayoutPresets';
import { supabase } from "@/integrations/supabase/client";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import { useAuth } from "@/contexts/AuthContext";
import { getInsightsByUserAndDate, bulkInsertInsights } from "@/services/nocodb/facebookInsightsAutoService";
import { getSalesReports } from "@/services/nocodb/salesReportsService"; // ✨ NEW: For phones merge
import { getHistoricalInsightsByUserAndDate } from "@/services/nocodb/facebookInsightsHistoryService";
import { triggerHistoricalSync } from "@/services/nocodb/historicalInsightsSyncService";
import { ALL_FIELDS, FieldMetadata } from "@/services/adsFieldsMetadata";
import { extractActionValues, extractCostPerActionValues } from "@/services/facebookInsightsService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Download, Settings, ArrowUpDown, ArrowUp, ArrowDown, ChevronUp, ChevronDown, Info, Plus, X, Zap, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import AdsTableColumnsCustomizer from "@/components/AdsTableColumnsCustomizer";
import OverviewMetricsCustomizer from "@/components/OverviewMetricsCustomizer";
import DateRangePicker from "@/components/DateRangePicker";
import StatusFilter from "@/components/StatusFilter";
import { useLocalStorage } from "@/hooks/useLocalStorage";

import { DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, format, addMonths, differenceInMonths, differenceInDays, startOfMonth, endOfMonth, min, startOfDay, endOfDay, subDays } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MetricsChart } from "@/components/MetricsChart";
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, PieChart as PieChartIcon, Grid3x3, Tag, RotateCcw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { AssignLabelsDialog } from "@/components/AssignLabelsDialog";
import { QuickAssignLabelsPopover } from "@/components/QuickAssignLabelsPopover";
import { getLabelsByUserId, CampaignLabel } from "@/services/nocodb/campaignLabelsService";
import { getLabelAssignmentsByEntities, bulkAssignLabels, assignLabel, removeLabel, CampaignLabelAssignment } from "@/services/nocodb/campaignLabelAssignmentsService";
import { LabelsManagerDialog } from "@/components/LabelsManagerDialog";
import { useSupabaseSettings } from "@/hooks/useSupabaseSettings";
import { toast as sonnerToast } from "sonner";


// Helper to sanitize status for NocoDB (which only accepts specific values)
const sanitizeNocoDBStatus = (status: string | null | undefined): string => {
  if (!status) return 'ACTIVE';
  const s = status.toUpperCase();
  // List of statuses likely supported by NocoDB
  if (['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'].includes(s)) {
    return s;
  }
  // Map known invalid statuses
  if (s === 'WITH_ISSUES') return 'PAUSED'; // Treat issues as paused/stopped
  if (s === 'PENDING_BILLING_INFO') return 'PAUSED';
  if (s === 'CAMPAIGN_PAUSED') return 'PAUSED';
  if (s === 'ADSET_PAUSED') return 'PAUSED';
  if (s === 'AD_PAUSED') return 'PAUSED';
  if (s === 'IN_PROCESS') return 'ACTIVE';
  if (s === 'PENDING_REVIEW') return 'PAUSED';

  return 'PAUSED'; // Safe fallback
};


type SortDirection = 'asc' | 'desc' | null;

type BreadcrumbItem = {
  level: 'campaign' | 'adset' | 'ad' | 'ad-daily';
  parentId: string | null;
  name: string;
};

// Map objective to preferred action_types (priority từ trái sang phải)
const OBJECTIVE_ACTION_MAP: Record<string, string[]> = {
  MESSAGES: [
    'onsite_conversion.messaging_conversation_started_7d',
    // 'onsite_conversion.messaging_first_reply', // REMOVED: User wants strictly started_7d
    // 'onsite_conversion.total_messaging_connection', // REMOVED: User wants strictly started_7d
  ],
  OUTCOME_ENGAGEMENT: [
    'onsite_conversion.messaging_conversation_started_7d', // ADDED: Priority 1
    'onsite_conversion.total_messaging_connection',
    'onsite_conversion.messaging_first_reply',
    'post_engagement',
    'page_engagement',
  ],
  OUTCOME_LEADS: ['lead', 'onsite_conversion.lead_grouped'],
  LEAD_GENERATION: ['lead', 'onsite_conversion.lead_grouped'],
  OUTCOME_SALES: ['purchase', 'omni_purchase'],
  CONVERSIONS: ['purchase', 'omni_purchase'],
  VIDEO_VIEWS: ['video_view', 'thruplay'],
  OUTCOME_TRAFFIC: ['landing_page_view', 'link_click'],
  TRAFFIC: ['landing_page_view', 'link_click'],
  OUTCOME_AWARENESS: ['reach'],
  AWARENESS: ['reach'],
  REACH: ['reach'],
};

// Map action_type to Vietnamese labels
const ACTION_LABELS: Record<string, string> = {
  'onsite_conversion.messaging_first_reply': 'Tin nhắn đầu tiên',
  'onsite_conversion.total_messaging_connection': 'Cuộc trò chuyện',
  'messaging_conversation_started_7d': 'Cuộc trò chuyện (7d)',
  'onsite_conversion.messaging_conversation_started_7d': 'Cuộc trò chuyện (7d)',
  'onsite_conversion.messaging_conversation_replied_7d': 'Trả lời cuộc trò chuyện (7d)',
  'post_engagement': 'Tương tác bài viết',
  'page_engagement': 'Tương tác trang',
  'lead': 'Khách hàng tiềm năng',
  'onsite_conversion.lead_grouped': 'Khách hàng tiềm năng',
  'purchase': 'Mua hàng',
  'omni_purchase': 'Mua hàng',
  'video_view': 'Lượt xem video',
  'thruplay': 'ThruPlay',
  'landing_page_view': 'Xem trang đích',
  'link_click': 'Nhấp liên kết',
  'reach': 'Tiếp cận',
};

interface ActionItem {
  action_type: string;
  value: string | number;
}

interface ProcessedMetrics {
  results: number;
  cost_per_result: number;
  result_label: string;
  action_type_used: string;
}

function calculateResultsAndCost(
  objective: string,
  actions: ActionItem[] | null,
  cost_per_action_type: ActionItem[] | null,
  spend: string | number,
  reach?: string | number,
): ProcessedMetrics {
  const safeNum = (val: any): number => {
    if (val == null) return 0;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? 0 : num;
  };

  const spendNum = safeNum(spend);
  const preferredActions = OBJECTIVE_ACTION_MAP[objective] || [];

  let actionTypeUsed = '';
  let results = 0;
  let costPerResult = 0;

  // Special case cho REACH/AWARENESS objectives
  if (objective === 'REACH' || objective === 'OUTCOME_AWARENESS' || objective === 'AWARENESS') {
    results = safeNum(reach);
    actionTypeUsed = 'reach';
    if (results > 0) {
      costPerResult = spendNum / results;
    }
  } else {
    // Tìm action đầu tiên matching với priority list
    for (const preferredAction of preferredActions) {
      const action = actions?.find((a) => a.action_type === preferredAction);
      if (action && safeNum(action.value) > 0) {
        actionTypeUsed = preferredAction;
        results = Math.round(safeNum(action.value));
        break;
      }
    }

    // Fallback: nếu không tìm thấy, dùng action đầu tiên trong list
    if (!actionTypeUsed && preferredActions.length > 0) {
      actionTypeUsed = preferredActions[0];
      const action = actions?.find((a) => a.action_type === actionTypeUsed);
      results = action ? Math.round(safeNum(action.value)) : 0;
    }

    // Tính cost_per_result
    if (actionTypeUsed) {
      // Ưu tiên lấy từ cost_per_action_type
      const costAction = cost_per_action_type?.find((a) => a.action_type === actionTypeUsed);
      if (costAction) {
        costPerResult = safeNum(costAction.value);
      } else if (results > 0) {
        // Fallback: spend / results
        costPerResult = spendNum / results;
      }
    }
  }

  // Round to 2 decimals
  costPerResult = Math.round(costPerResult * 100) / 100;
  const resultLabel = ACTION_LABELS[actionTypeUsed] || actionTypeUsed;

  return {
    results,
    cost_per_result: costPerResult,
    result_label: resultLabel,
    action_type_used: actionTypeUsed,
  };
}

const AdsReportAuto = () => {
  const { user } = useAuth();
  const { settings } = useSupabaseSettings();
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Historical insights states
  const [historicalInsights, setHistoricalInsights] = useState<any[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalSyncing, setHistoricalSyncing] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [historicalBreadcrumbs, setHistoricalBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
  ]);
  const [historicalSelectedRows, setHistoricalSelectedRows] = useState<Set<string>>(new Set());
  const [historicalExpandedAds, setHistoricalExpandedAds] = useState<Set<string>>(new Set());
  const [historicalSortField, setHistoricalSortField] = useState<string | null>(null);
  const [historicalSortDirection, setHistoricalSortDirection] = useState<SortDirection>(null);
  const [historicalDraggedColumn, setHistoricalDraggedColumn] = useState<string | null>(null);
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [summaryCustomizerOpen, setSummaryCustomizerOpen] = useState(false);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  // Labels Manager State
  const [labelsManagerOpen, setLabelsManagerOpen] = useState(false);

  // Cron Settings State
  const [cronActive, setCronActive] = useState(true);
  const [cronInterval, setCronInterval] = useState('5');
  const [cronLoading, setCronLoading] = useState(false);
  const [cronPopoverOpen, setCronPopoverOpen] = useState(false);

  // Fetch Cron Status
  const fetchCronStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_ads_cron_status');
      if (error) {
        console.warn('Could not fetch cron status (RPC might be missing):', error);
        return;
      }
      if (data) {
        setCronActive(data.active);
        // Parse interval from schedule string '*/5 * * * *'
        const match = data.schedule?.match(/\*\/(\d+)/);
        if (match && match[1]) {
          setCronInterval(match[1]);
        }
      }
    } catch (error) {
      console.error('Error fetching cron status:', error);
    }
  };

  useEffect(() => {
    fetchCronStatus();
  }, []);

  // Update Cron Status
  const handleSaveCronSettings = async () => {
    setCronLoading(true);
    try {
      const schedule = `*/${cronInterval} * * * *`;
      const { error } = await supabase.rpc('update_ads_cron_schedule', {
        is_active: cronActive,
        schedule_expression: schedule
      });

      if (error) throw error;

      sonnerToast.success('Cập nhật cấu hình tự động thành công');
      setCronPopoverOpen(false);
    } catch (error: any) {
      console.error('Error updating cron:', error);
      sonnerToast.error('Lỗi cập nhật cấu hình: ' + error.message);
    } finally {
      setCronLoading(false);
    }
  };

  // Sync Now Function
  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatus('Đang gửi yêu cầu đồng bộ...');

    try {
      const { data, error } = await supabase.functions.invoke('sync-ads-cron', {
        body: {
          limit: 5000,
          date_preset: 'maximum' // Force fetch all historical data
        }
      });

      if (error) throw error;

      sonnerToast.success('Đã gửi yêu cầu đồng bộ thành công', {
        description: `Đã xử lý ${data?.processed || 0} bản ghi`
      });

      // Reload data after a short delay to allow DB to update
      setSyncStatus('Đang tải lại dữ liệu...');
      setTimeout(async () => {
        await fetchExisting(true);
        await fetchCatalog(true); // Sync catalog structure
        setIsSyncing(false);
      }, 2000);

    } catch (error: any) {
      console.error('Sync error:', error);
      sonnerToast.error('Lỗi đồng bộ: ' + error.message);
      setIsSyncing(false);
    }
  };




  // Store date range as strings in localStorage, convert to Date objects when used
  const [dateRangeStr, setDateRangeStr] = useLocalStorage<{ from?: string; to?: string } | undefined>('ads-report-date-range', {
    from: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // Convert stored strings back to Date objects - use useMemo to prevent infinite re-renders
  const dateRange: DateRange | undefined = useMemo(() => {
    if (!dateRangeStr) return undefined;
    return {
      from: dateRangeStr.from ? new Date(dateRangeStr.from) : undefined,
      to: dateRangeStr.to ? new Date(dateRangeStr.to) : undefined,
    };
  }, [dateRangeStr?.from, dateRangeStr?.to]);

  // Helper to set date range (converts Date to string for storage)
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

  // 🔥 Historical date range (independent from live date range)
  const [historicalDateRangeStr, setHistoricalDateRangeStr] = useLocalStorage<{ from?: string; to?: string } | undefined>('ads-report-historical-date-range', undefined);

  // Convert stored strings back to Date objects for historical
  const historicalDateRange: DateRange | undefined = useMemo(() => {
    if (!historicalDateRangeStr) return undefined;
    return {
      from: historicalDateRangeStr.from ? new Date(historicalDateRangeStr.from) : undefined,
      to: historicalDateRangeStr.to ? new Date(historicalDateRangeStr.to) : undefined,
    };
  }, [historicalDateRangeStr?.from, historicalDateRangeStr?.to]);

  // Helper to set historical date range
  const setHistoricalDateRange = (range: DateRange | undefined) => {
    if (range?.from || range?.to) {
      setHistoricalDateRangeStr({
        from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
        to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
      });
    } else {
      setHistoricalDateRangeStr(undefined);
    }
  };



  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ACTIVE', 'PAUSED']);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // ✅ FIX: Do NOT save rowStatuses to localStorage to avoid "flickering" issues
  // This state should be ephemeral (session only) to allow fresh server data to take precedence on reload
  const [rowStatuses, setRowStatuses] = useState<Record<string, boolean>>({});

  // ✅ Helper: Compute derived effective status (Logic liên kết chặt chẽ 100%)
  // Logic này đabm bảo status luôn đúng thực tế, không bị "UNKNOWN"
  const computeDerivedEffectiveStatus = (
    currentEffectiveStatus: string | undefined | null,
    configuredStatus: string | undefined, // 'ACTIVE' | 'PAUSED'
    parentStatus?: string, // Status của cấp cha (VD: Campaign status khi xét AdSet)
    grandParentStatus?: string // Status của cấp ông (VD: Campaign status khi xét Ad)
  ): string => {
    // 1. Ưu tiên status trả về từ API nếu nó rõ ràng (không phải UNKNOWN/IN_PROCESS)
    // Tuy nhiên, nếu status API conflict với logic cha con thì phải tính lại (để chắc chắn 100%)

    // 2. Nếu nút tắt (Configured = PAUSED) -> Chắc chắn là PAUSED
    if (configuredStatus === 'PAUSED') return 'PAUSED';
    // ✅ STRICT BACKEND MODE: Do not guess status. Rely on effective_status from DB.
    // configuredStatus (Switch State) is ONLY for the Switch itself.

    // 1. Check Parent Status (Blocking)
    // If Parent is ARCHIVED or DELETED -> Child is ARCHIVED/DELETED
    if (parentStatus === 'ARCHIVED') return 'ARCHIVED';
    if (parentStatus === 'DELETED') return 'DELETED';
    if (parentStatus === 'CAMPAIGN_PAUSED') return 'CAMPAIGN_PAUSED';

    // If GrandParent is Blocking -> Child is Blocking
    if (grandParentStatus === 'ARCHIVED') return 'ARCHIVED';
    if (grandParentStatus === 'DELETED') return 'DELETED';

    // 2. Specific Pause Inheritance
    // If Campaign is PAUSED -> AdSet/Ad is CAMPAIGN_PAUSED
    if (parentStatus === 'PAUSED' && parentStatus.includes('CAMPAIGN')) return 'CAMPAIGN_PAUSED'; // Ambiguous check, safer below

    // Strict hierarchy check for PAUSED states
    // Campaign PAUSED -> AdSet/Ad = CAMPAIGN_PAUSED
    if (grandParentStatus === 'PAUSED') return 'CAMPAIGN_PAUSED';
    if (parentStatus === 'CAMPAIGN_PAUSED') return 'CAMPAIGN_PAUSED';

    // AdSet PAUSED -> Ad = ADSET_PAUSED
    if (parentStatus === 'PAUSED' || parentStatus === 'ADSET_PAUSED') return 'ADSET_PAUSED';

    // 3. If no parent issues, return OWN effective_status directly from Backend
    // If null/undefined, fallback to configuredStatus (but mapped to effective)
    if (!currentEffectiveStatus) {
      return configuredStatus === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
    }

    return currentEffectiveStatus;
  };


  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
  ]);

  // Column resizing states
  const [columnWidths, setColumnWidths] = useLocalStorage<Record<string, number>>(
    'ads-report-column-widths',
    {}
  );
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [startX, setStartX] = useState<number>(0);
  const [startWidth, setStartWidth] = useState<number>(0);

  // Historical column resizing states
  const [historicalColumnWidths, setHistoricalColumnWidths] = useLocalStorage<Record<string, number>>(
    'ads-report-historical-column-widths',
    {}
  );
  const [resizingHistoricalColumn, setResizingHistoricalColumn] = useState<string | null>(null);
  const [historicalStartX, setHistoricalStartX] = useState<number>(0);
  const [historicalStartWidth, setHistoricalStartWidth] = useState<number>(0);

  // NOTE: Most metric/layout states moved to useAdsLayoutPresets hook (line ~597)

  // Catalog from FB (campaign list, ensures we show campaigns without insights)
  const [campaignCatalog, setCampaignCatalog] = useState<Array<{ id: string; name: string; status?: string; effective_status?: string; daily_budget?: string; lifetime_budget?: string; issues_info?: any[]; is_deleted?: boolean }>>([]);
  const [adsetCatalog, setAdsetCatalog] = useState<Array<{ id: string; name: string; status?: string; effective_status?: string; campaign_id?: string; daily_budget?: string; lifetime_budget?: string; issues_info?: any[]; is_deleted?: boolean }>>([]);
  const [adCatalog, setAdCatalog] = useState<Array<{ id: string; name: string; status?: string; effective_status?: string; adset_id?: string; campaign_id?: string; issues_info?: any[]; is_deleted?: boolean }>>([]);
  const [accountCurrency, setAccountCurrency] = useState<string>('VND');
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Expanded ads state for daily insights
  const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set());
  // NOTE: Detail & Historical layout presets moved to useAdsLayoutPresets hook

  // Labels management
  const [labels, setLabels] = useState<CampaignLabel[]>([]);
  const [assignLabelsOpen, setAssignLabelsOpen] = useState(false);
  const [labelAssignments, setLabelAssignments] = useState<CampaignLabelAssignment[]>([]);

  // Ad Account payment status
  const [adAccountStatus, setAdAccountStatus] = useState<{
    account_status?: number;
    disable_reason?: string;
    hasPaymentIssue: boolean;
  }>({ hasPaymentIssue: false });

  const { toast } = useToast();

  // ✅ HOOK: Layout Presets - destructure values từ hook
  const layoutPresets = useAdsLayoutPresets({ toast });
  const {
    // Metric Orders
    summaryMetricOrder,
    setSummaryMetricOrder,
    selectedSummaryMetrics,
    setSelectedSummaryMetrics,
    draggedSummaryMetric,
    setDraggedSummaryMetric,
    defaultSummaryMetricOrder,

    saleMetricOrder,
    setSaleMetricOrder,
    selectedSaleMetrics,
    setSelectedSaleMetrics,
    draggedSaleMetric,
    setDraggedSaleMetric,
    saleCustomizerOpen,
    setSaleCustomizerOpen,
    defaultSaleMetricOrder,

    marketingMetricOrder,
    setMarketingMetricOrder,
    selectedMarketingMetrics,
    setSelectedMarketingMetrics,
    draggedMarketingMetric,
    setDraggedMarketingMetric,
    marketingCustomizerOpen,
    setMarketingCustomizerOpen,
    defaultMarketingMetricOrder,

    // View Modes
    summaryViewMode,
    setSummaryViewMode,
    summaryChartType,
    setSummaryChartType,
    marketingViewMode,
    setMarketingViewMode,
    marketingChartType,
    setMarketingChartType,
    saleViewMode,
    setSaleViewMode,
    saleChartType,
    setSaleChartType,

    // Saved Layouts
    savedMarketingLayouts,
    savedSummaryLayouts,
    savedSaleLayouts,
    savedDetailLayouts,
    savedHistoricalLayouts,

    // Dialog States
    showSaveMarketingDialog,
    setShowSaveMarketingDialog,
    showSaveSummaryDialog,
    setShowSaveSummaryDialog,
    showSaveSaleDialog,
    setShowSaveSaleDialog,
    showSaveDetailDialog,
    setShowSaveDetailDialog,
    showSaveHistoricalDialog,
    setShowSaveHistoricalDialog,

    // Layout Names
    marketingLayoutName,
    setMarketingLayoutName,
    summaryLayoutName,
    setSummaryLayoutName,
    saleLayoutName,
    setSaleLayoutName,
    detailLayoutName,
    setDetailLayoutName,
    historicalLayoutName,
    setHistoricalLayoutName,

    // Selected Layouts
    selectedMarketingLayout,
    setSelectedMarketingLayout,
    selectedSummaryLayout,
    setSelectedSummaryLayout,
    selectedSaleLayout,
    setSelectedSaleLayout,
    selectedDetailLayout,
    setSelectedDetailLayout,
    selectedHistoricalLayout,
    setSelectedHistoricalLayout,

    // Handlers
    handleSaveMarketingLayout,
    handleLoadMarketingLayout,
    handleDeleteMarketingLayout,
    handleSaveSummaryLayout,
    handleLoadSummaryLayout,
    handleDeleteSummaryLayout,
    handleSaveSaleLayout,
    handleLoadSaleLayout,
    handleDeleteSaleLayout,
    handleSaveDetailLayout,
    handleLoadDetailLayout,
    handleDeleteDetailLayout,
    handleSaveHistoricalLayout,
    handleLoadHistoricalLayout,
    handleDeleteHistoricalLayout,
    handleResetAllLayouts,
  } = layoutPresets;

  // Default visible fields - comprehensive metrics (10 cột)
  const defaultFields = [
    'effective_status',
    'campaign_name',
    'spend',
    'results',
    'cost_per_result',

    'impressions',
    'clicks',
    'ctr',
    'phones',
    'cost_per_phone'
  ];

  const [selectedFields, setSelectedFields] = useLocalStorage<string[]>(
    'ads-report-columns',
    defaultFields
  );

  // 🔥 Historical table columns (independent from live table)
  const [historicalSelectedFields, setHistoricalSelectedFields] = useLocalStorage<string[]>(
    'ads-report-historical-columns',
    defaultFields
  );
  const [historicalCustomizerOpen, setHistoricalCustomizerOpen] = useState(false);

  // Migrate old 'results' field to new 'results_messaging_replied_7d' field
  // AND always deduplicate to fix any existing duplicates
  useEffect(() => {
    let needsUpdate = false;
    // Remove 'results_messaging_replied_7d' and 'cost_per_messaging_replied_7d' from default view
    // User can add them back manually via column customizer
    const migratedFields = selectedFields.filter(field =>
      field !== 'results_messaging_replied_7d' &&
      field !== 'cost_per_messaging_replied_7d'
    );

    // Make sure 'results' and 'cost_per_result' are present
    if (!migratedFields.includes('results')) {
      // Try to insert after 'spend'
      const spendIndex = migratedFields.indexOf('spend');
      if (spendIndex !== -1) {
        migratedFields.splice(spendIndex + 1, 0, 'results');
      } else {
        migratedFields.push('results');
      }
    }

    if (!migratedFields.includes('cost_per_result')) {
      // Try to insert after 'results' (which we just added/confirmed)
      const resultsIndex = migratedFields.indexOf('results');
      if (resultsIndex !== -1) {
        migratedFields.splice(resultsIndex + 1, 0, 'cost_per_result');
      } else {
        migratedFields.push('cost_per_result');
      }
    }

    // Always remove duplicates regardless of migration
    const uniqueFields = Array.from(new Set(migratedFields));

    // Check if anything changed (migration or deduplication)
    if (uniqueFields.length !== selectedFields.length) {
      needsUpdate = true;
    }

    // Force update if we found the banned fields during migration step
    if (migratedFields.length !== selectedFields.length) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      setSelectedFields(uniqueFields);
    }
  }, []); // Run once on mount



  // Migration: Ensure new metrics are in the order list
  useEffect(() => {
    const missingMetrics = defaultMarketingMetricOrder.filter(m => !marketingMetricOrder.includes(m));
    if (missingMetrics.length > 0) {
      // Insert new metrics after 'budget' if possible, otherwise append
      const newOrder = [...marketingMetricOrder];
      const budgetIndex = newOrder.indexOf('budget');

      missingMetrics.forEach(metric => {
        if (metric === 'adsetBudget' && budgetIndex !== -1) {
          newOrder.splice(budgetIndex + 1, 0, metric);
        } else {
          newOrder.push(metric);
        }
      });

      setMarketingMetricOrder(newOrder);
    }
  }, []);

  // AUTO-SYNC removed - using client-side sync only (see line ~1845)


  // Get current view level from breadcrumbs
  const currentView = breadcrumbs[breadcrumbs.length - 1];
  const viewLevel = currentView.level;

  // Helper function to split date range into 37-month chunks (Facebook API limit)
  const splitDateRangeIntoChunks = (startDate: Date, endDate: Date) => {
    const chunks: Array<{ since: string; until: string }> = [];
    const MAX_MONTHS = 37; // Facebook API limit

    // Handle same day case
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      chunks.push({
        since: format(startDate, 'yyyy-MM-dd'),
        until: format(endDate, 'yyyy-MM-dd'),
      });
      return chunks;
    }

    let currentStart = startDate;

    while (currentStart <= endDate) {
      const chunkEnd = min([addMonths(currentStart, MAX_MONTHS), endDate]);

      chunks.push({
        since: format(currentStart, 'yyyy-MM-dd'),
        until: format(chunkEnd, 'yyyy-MM-dd'),
      });

      currentStart = addMonths(chunkEnd, 1);

      // Safety check to prevent infinite loop
      if (chunks.length > 100) {
        console.error('Quá nhiều đợt, đang dừng');
        break;
      }
    }

    return chunks;
  };

  // ✅ Fetch catalog from Facebook (Campaigns, AdSets, Ads)
  const fetchCatalog = async (silent = false) => {
    try {
      if (!user?.id) return;

      const adAccounts = await getActiveAdAccounts(user.id);
      const accountData = adAccounts.find(acc => acc.is_active);
      if (!accountData) return;

      const { getCampaigns, getAdSets, getAds, getAdAccounts } = await import('@/services/facebookInsightsService');

      // Get account currency
      const accounts = await getAdAccounts(accountData.access_token);
      const currentAccount = accounts.find(acc => acc.id === `act_${accountData.account_id}`);
      const currency = currentAccount?.currency || 'VND';
      setAccountCurrency(currency);

      // Fetch all catalogs in parallel
      const [campaigns, adsets, ads] = await Promise.all([
        getCampaigns(accountData.access_token, accountData.account_id),
        getAdSets(accountData.access_token, accountData.account_id),
        getAds(accountData.access_token, accountData.account_id)
      ]);

      setCampaignCatalog(campaigns);
      setAdsetCatalog(adsets);
      setAdCatalog(ads);

      // Cache for AI Assistant to use without re-fetching
      localStorage.setItem('cached_campaign_catalog', JSON.stringify(campaigns));

      return { campaigns, adsets, ads };
    } catch (error) {
      console.error('Error fetching catalog:', error);
      if (!silent) {
        toast({
          title: "Lỗi tải cấu trúc",
          description: "Không thể tải danh sách chiến dịch từ Facebook",
          variant: "destructive",
        });
      }
      return null;
    }
  };

  // ✅ Fetch catalog on mount to ensure status is fresh
  useEffect(() => {
    if (user?.id) {
      fetchCatalog(true);
    }
  }, [user?.id]);

  // ✅ Sync insights effective_status logic is handled dynamically in the render loop (insightRecords map)
  // relying on (catalog?.effective_status || insight.effective_status) precedence.
  // We removed the redundant useEffect here to prevent race conditions/flickering.

  // ✅ Sync only structure (campaigns, adsets, ads) without insights
  const syncStructure = async () => {
    try {
      setIsAutoRefreshing(true);
      setSyncStatus('Đang cập nhật cấu trúc...');

      if (!user?.id) {
        toast({
          title: "Chưa đăng nhập",
          description: "Vui lòng đăng nhập để tiếp tục",
          variant: "destructive",
        });
        return;
      }

      const result = await fetchCatalog();

      if (result) {
        const { campaigns, adsets, ads } = result;
        toast({
          title: "✅ Đã cập nhật cấu trúc",
          description: `${campaigns.length} chiến dịch, ${adsets.length} nhóm QC, ${ads.length} quảng cáo. Bấm "Đồng bộ tất cả" để xem chỉ số.`,
          duration: 5000,
        });
      }

      setSyncStatus('');
    } catch (error: any) {
      console.error('❌ Lỗi đồng bộ cấu trúc:', error);
      toast({
        title: "Lỗi đồng bộ cấu trúc",
        description: error?.message || "Không thể tải cấu trúc từ Facebook",
        variant: "destructive",
      });
    } finally {
      setIsAutoRefreshing(false);
    }
  };



  // ✅ Sync ALL data (structure + insights)
  const loadInsights = async () => {
    // ✅ Don't use setLoading - keep existing data visible during sync
    setIsSyncing(true);
    setSyncProgress(0);
    setSyncStatus('Đang khởi tạo...');

    try {
      // Import services dynamically
      const { getInsights, calculateResultsAndCost, extractMessagingRepliedMetrics } = await import('@/services/facebookInsightsService');

      if (!user?.id) {
        console.error('❌ Chưa đăng nhập!');
        toast({
          title: "Chưa đăng nhập",
          description: "Vui lòng đăng nhập để tiếp tục",
          variant: "destructive",
        });
        return;
      }

      // Get active ad account from NocoDB
      const adAccounts = await getActiveAdAccounts(user.id);
      const accountData = adAccounts.find(acc => acc.is_active);

      if (!accountData) {
        console.error('❌ Không tìm thấy tài khoản quảng cáo kích hoạt trong NocoDB!');

        toast({
          title: "Chưa có tài khoản",
          description: "Vui lòng kết nối tài khoản Facebook Ads trước",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }



      // Prepare date range - Default: last 7 days
      let endDate = new Date();
      let startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      if (dateRange?.from && dateRange?.to) {
        startDate = dateRange.from;
        endDate = dateRange.to;
      }



      // Validate date range
      if (startDate > endDate) {
        toast({
          title: "Khoảng thời gian không hợp lệ",
          description: "Ngày bắt đầu phải trước ngày kết thúc",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      // Split into chunks (Facebook limits to 37 months)
      const chunks = splitDateRangeIntoChunks(startDate, endDate);
      const totalChunks = chunks.length;



      if (totalChunks > 1) {
        toast({
          title: "Đồng bộ dữ liệu lớn",
          description: `Chia thành ${totalChunks} đợt do giới hạn API Facebook (37 tháng/đợt)`,
        });
      }

      // Get current user session
      if (!user?.id) {
        toast({
          title: "Lỗi xác thực",
          description: "Bạn cần đăng nhập để đồng bộ dữ liệu lịch sử",
          variant: "destructive",
        });
        return;
      }
      const userId = user.id;

      let allCampaignInsights: any[] = [];
      let allAdsetInsights: any[] = [];
      let allAdInsights: any[] = [];

      // Process each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkProgress = (i / (totalChunks * 3)) * 100; // 3 levels per chunk

        setSyncProgress(chunkProgress);
        setSyncStatus(`Đợt ${i + 1}/${totalChunks}: ${chunk.since} → ${chunk.until}`);



        try {
          // Fetch campaigns for this chunk

          setSyncStatus(`Đợt ${i + 1}/${totalChunks}: Đang lấy chiến dịch...`);
          const campaignInsights = await getInsights({
            accessToken: accountData.access_token,
            adAccountId: accountData.account_id,
            level: 'campaign',
            since: chunk.since,
            until: chunk.until,
          });
          allCampaignInsights.push(...campaignInsights);


          // Log status breakdown
          const campaignStatusBreakdown = campaignInsights.reduce((acc: any, c: any) => {
            const st = c.effective_status || c.status || 'UNKNOWN';
            acc[st] = (acc[st] || 0) + 1;
            return acc;
          }, {});


          setSyncProgress(chunkProgress + ((1 / (totalChunks * 3)) * 100));

          // Fetch adsets for this chunk

          setSyncStatus(`Đợt ${i + 1}/${totalChunks}: Đang lấy nhóm quảng cáo...`);
          const adsetInsights = await getInsights({
            accessToken: accountData.access_token,
            adAccountId: accountData.account_id,
            level: 'adset',
            since: chunk.since,
            until: chunk.until,
          });
          allAdsetInsights.push(...adsetInsights);


          setSyncProgress(chunkProgress + ((2 / (totalChunks * 3)) * 100));

          // Fetch ads for this chunk

          setSyncStatus(`Đợt ${i + 1}/${totalChunks}: Đang lấy quảng cáo...`);
          const adInsights = await getInsights({
            accessToken: accountData.access_token,
            adAccountId: accountData.account_id,
            level: 'ad',
            since: chunk.since,
            until: chunk.until,
          });
          allAdInsights.push(...adInsights);


          // Small delay to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (chunkError: any) {
          console.error(`❌ Lỗi trong đợt ${i + 1}:`, chunkError);
          console.error(`❌ Chi tiết lỗi đầy đủ:`, JSON.stringify(chunkError, null, 2));
          toast({
            title: "Lỗi đồng bộ đợt " + (i + 1),
            description: chunkError.message || "Không thể lấy dữ liệu từ Facebook",
            variant: "destructive",
          });
          // Continue with other chunks
        }
      }

      // Combine all insights
      const insightsToFetch = [...allCampaignInsights, ...allAdsetInsights, ...allAdInsights];



      // Warning if no insights fetched
      if (insightsToFetch.length === 0) {
        console.warn('⚠️ KHÔNG LẤY ĐƯỢC DỮ LIỆU! Nguyên nhân có thể:');
        console.warn('  1. Không có quảng cáo chạy trong khoảng thời gian này');
        console.warn('  2. Facebook API trả về dữ liệu trống');
        console.warn('  3. Khoảng thời gian nằm trong tương lai');
        console.warn(`  Khoảng đã chọn: ${format(startDate, 'yyyy-MM-dd')} → ${format(endDate, 'yyyy-MM-dd')}`);

        toast({
          title: "Không có dữ liệu",
          description: `Không có insights cho khoảng ${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM')}. Thử chọn khoảng thời gian khác.`,
          variant: "destructive",
        });
      }


      // 🔄 Fetch and sync catalog to backend snapshot

      const { getCampaigns, getAdSets, getAds } = await import('@/services/facebookInsightsService');
      const [fbCampaigns, fbAdsets, fbAds] = await Promise.all([
        getCampaigns(accountData.access_token, accountData.account_id),
        getAdSets(accountData.access_token, accountData.account_id),
        getAds(accountData.access_token, accountData.account_id),
      ]);



      // Log Facebook API status breakdown
      const fbStatusBreakdown = fbCampaigns.reduce((acc: Record<string, number>, c: any) => {
        const status = c.effective_status || c.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});


      // Sync to backend snapshot

      // Sync to backend snapshot
      // const { upsertCampaigns, upsertAdsets, upsertAds, markDeletedCampaigns, markDeletedAdsets, markDeletedAds, getCampaignCatalog, getAdsetCatalog, getAdCatalog } = await import('@/services/nocodb/facebookCatalogSnapshotService');

      // Upsert current entities (mark as live) - SKIPPED
      /*
      await Promise.all([
        upsertCampaigns(userId, accountData.account_id, fbCampaigns),
        upsertAdsets(userId, accountData.account_id, fbAdsets),
        upsertAds(userId, accountData.account_id, fbAds),
      ]);

      // Mark entities not in Facebook response as deleted
      const liveCampaignIds = fbCampaigns.map(c => c.id);
      const liveAdsetIds = fbAdsets.map(a => a.id);
      const liveAdIds = fbAds.map(a => a.id);

      await Promise.all([
        markDeletedCampaigns(userId, accountData.account_id, liveCampaignIds),
        markDeletedAdsets(userId, accountData.account_id, liveAdsetIds),
        markDeletedAds(userId, accountData.account_id, liveAdIds),
      ]);

      // Fetch catalog from backend (includes DELETED entities)
      const [campaigns, adsets, ads] = await Promise.all([
        getCampaignCatalog(userId, accountData.account_id),
        getAdsetCatalog(userId, accountData.account_id),
        getAdCatalog(userId, accountData.account_id),
      ]);
      */

      // ✅ Use live data directly
      const campaigns = fbCampaigns;
      const adsets = fbAdsets;
      const ads = fbAds;



      // Log backend catalog status breakdown
      const backendStatusBreakdown = campaigns.reduce((acc: Record<string, number>, c: any) => {
        const status = c.effective_status || c.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});



      // Create lookup maps for fast status lookup (effective_status and user-configured status)
      const campaignEffectiveStatusMap = new Map(campaigns.map(c => [c.id, c.effective_status]));
      const campaignStatusMap = new Map(campaigns.map(c => [c.id, c.status]));
      const adsetEffectiveStatusMap = new Map(adsets.map(a => [a.id, a.effective_status]));
      const adsetStatusMap = new Map(adsets.map(a => [a.id, a.status]));
      const adEffectiveStatusMap = new Map(ads.map(a => [a.id, a.effective_status]));
      const adStatusMap = new Map(ads.map(a => [a.id, a.status]));



      // 🔍 Log campaigns with payment issues for debugging
      const paymentIssueCampaigns = campaigns.filter(c =>
        c.effective_status === 'WITH_ISSUES' ||
        c.effective_status === 'PENDING_BILLING_INFO'
      );

      if (paymentIssueCampaigns.length > 0) {
        console.warn('⚠️ Các chiến dịch có vấn đề thanh toán:', paymentIssueCampaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          effective_status: c.effective_status,
          issues_info: c.issues_info
        })));
      }

      if (paymentIssueCampaigns.length > 0) {
        console.warn('⚠️ Các chiến dịch có vấn đề thanh toán:', paymentIssueCampaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.effective_status,
          issues: c.issues_info
        })));
      }

      // Check ad account payment status
      try {
        const { getAdAccountDetails } = await import('@/services/facebookInsightsService');
        const accountDetails = await getAdAccountDetails(accountData.access_token, accountData.account_id);

        // Check for payment issues
        const hasPaymentIssue =
          accountDetails.account_status === 2 || // DISABLED
          accountDetails.disable_reason === 'PAYMENT_ISSUE' ||
          accountDetails.disable_reason === 'RISK_PAYMENT' ||
          accountDetails.disable_reason === 'GRAY_ACCOUNT_SHUT_DOWN' ||
          (accountDetails.funding_source_details && !accountDetails.funding_source_details.id);

        setAdAccountStatus({
          account_status: accountDetails.account_status,
          disable_reason: accountDetails.disable_reason,
          hasPaymentIssue
        });

        if (hasPaymentIssue) {
          console.warn('⚠️ PHÁT HIỆN VẤN ĐỀ THANH TOÁN:', {
            account_status: accountDetails.account_status,
            disable_reason: accountDetails.disable_reason
          });
        }
      } catch (accError) {
        console.warn('Không thể lấy thông tin tài khoản quảng cáo:', accError);
      }

      // Save catalog to state for UI display (no need to save to DB - insights table contains all names)
      setCampaignCatalog(campaigns);
      setAdsetCatalog(adsets);
      setAdCatalog(ads);

      // ✅ Step 7: Create pseudo-insights for entities WITHOUT data
      const since = format(startDate, 'yyyy-MM-dd');
      const until = format(endDate, 'yyyy-MM-dd');

      // Get IDs that HAVE insights
      const campaignIdsWithInsights = new Set(
        insightsToFetch
          .filter(i => i.campaign_id && !i.adset_id && !i.ad_id)
          .map(i => i.campaign_id)
      );
      const adsetIdsWithInsights = new Set(
        insightsToFetch
          .filter(i => i.adset_id && !i.ad_id)
          .map(i => i.adset_id)
      );
      const adIdsWithInsights = new Set(
        insightsToFetch
          .filter(i => i.ad_id)
          .map(i => i.ad_id)
      );



      // Create pseudo-insights for campaigns WITHOUT data (only for first day to save storage)
      const campaignPseudoInsights = campaigns
        .filter(c => !campaignIdsWithInsights.has(c.id))
        .map(c => ({
          campaign_id: c.id,
          campaign_name: c.name,
          adset_id: null,
          adset_name: null,
          ad_id: null,
          ad_name: null,
          date_start: since,
          date_stop: since, // Only save 1 day to save storage
          impressions: '0',
          clicks: '0',
          spend: '0',
          reach: '0',
          frequency: null,
          cpc: null,
          cpm: null,
          cpp: null,
          cost_per_unique_click: null,
          ctr: null,
          status: c.status,
          effective_status: c.effective_status,
          level: 'campaign' as const,
          objective: (c as any).objective || null,
          actions: null,
          cost_per_action_type: null,
        }));

      // Create pseudo-insights for adsets WITHOUT data
      const adsetPseudoInsights = adsets
        .filter(a => !adsetIdsWithInsights.has(a.id))
        .map(a => {
          const campaign = campaigns.find(c => c.id === a.campaign_id);
          return {
            campaign_id: a.campaign_id,
            campaign_name: campaign?.name || null,
            adset_id: a.id,
            adset_name: a.name,
            ad_id: null,
            ad_name: null,
            date_start: since,
            date_stop: since,
            impressions: '0',
            clicks: '0',
            spend: '0',
            reach: '0',
            frequency: null,
            cpc: null,
            cpm: null,
            cpp: null,
            cost_per_unique_click: null,
            ctr: null,
            status: a.status,
            effective_status: a.is_deleted ? 'DELETED' : a.effective_status,
            is_deleted: a.is_deleted || false,
            level: 'adset' as const,
            objective: (campaign as any)?.objective || null,
            actions: null,
            cost_per_action_type: null,
          };
        });

      // Create pseudo-insights for ads WITHOUT data
      const adPseudoInsights = ads
        .filter(a => !adIdsWithInsights.has(a.id))
        .map(a => {
          const adset = adsets.find(s => s.id === (a as any).adset_id);
          const campaign = campaigns.find(c => c.id === (a as any).campaign_id);
          return {
            campaign_id: (a as any).campaign_id,
            campaign_name: campaign?.name || null,
            adset_id: a.adset_id,
            adset_name: adset?.name || null,
            ad_id: a.id,
            ad_name: a.name,
            date_start: since,
            date_stop: since,
            impressions: '0',
            clicks: '0',
            spend: '0',
            reach: '0',
            frequency: null,
            cpc: null,
            cpm: null,
            cpp: null,
            cost_per_unique_click: null,
            ctr: null,
            status: a.status,
            effective_status: a.is_deleted ? 'DELETED' : a.effective_status,
            is_deleted: a.is_deleted || false,
            level: 'ad' as const,
            objective: (campaign as any)?.objective || null,
            actions: null,
            cost_per_action_type: null,
          };
        });


      // Merge real insights + pseudo-insights
      const allInsightsIncludingPseudo = [
        ...insightsToFetch,
        ...campaignPseudoInsights,
        ...adsetPseudoInsights,
        ...adPseudoInsights
      ];


      // Write insights to database in batches
      if (allInsightsIncludingPseudo.length > 0) {
        // ✅ NO DELETION - Just UPSERT (keep all historical data)
        setSyncStatus('Đang đồng bộ dữ liệu (không xóa data cũ)...');


        // Chuẩn hóa giá trị số: nhận số, chuỗi số, hoặc mảng [{action_type, value}]
        const num = (v: any): number | null => {
          if (v === null || v === undefined || v === '') return null;
          if (Array.isArray(v)) {
            const first = v[0]?.value ?? v[0];
            const n = Number(first);
            return isNaN(n) ? null : n;
          }
          const n = Number(v);
          return isNaN(n) ? null : n;
        };

        const int = (v: any): number => {
          const n = Number(v);
          return isNaN(n) ? 0 : Math.round(n);
        };

        // Map all insights (real + pseudo) for database insertion
        const insightsToInsert = allInsightsIncludingPseudo.map(insight => {
          // ✅ Only calculate metrics for REAL insights (with actions data or spend > 0)
          const hasRealData = insight.actions || insight.cost_per_action_type || Number(insight.spend) > 0;

          let metrics = { results: null, cost_per_result: null, result_label: null, action_type_used: null };
          let messagingMetrics = { count: null, cost: null };
          let actionValues = {
            started_7d: null,
            total_messaging_connection: null,
            link_click: null,
            messaging_welcome_message_view: null,
            post_engagement_action: null,
            messaging_first_reply: null,
            video_view: null,
            page_engagement_action: null,
            replied_7d: null,
            depth_2_message: null,
            depth_3_message: null,
          };
          let costPerActionValues = {
            cost_per_started_7d: null,
            cost_per_total_messaging_connection: null,
            cost_per_link_click: null,
            cost_per_messaging_welcome_message_view: null,
            cost_per_post_engagement: null,
            cost_per_messaging_first_reply: null,
            cost_per_video_view: null,
            cost_per_page_engagement: null,
            cost_per_replied_7d: null,
            cost_per_depth_2_message: null,
            cost_per_depth_3_message: null,
          };

          // Only calculate for REAL insights (skip pseudo-insights)
          if (hasRealData) {
            metrics = calculateResultsAndCost(
              insight.objective || '',
              insight.actions,
              insight.cost_per_action_type,
              insight.spend,
              insight.reach
            );

            messagingMetrics = extractMessagingRepliedMetrics(
              insight.actions,
              insight.cost_per_action_type,
              insight.spend
            );

            actionValues = extractActionValues(insight.actions || []);
            costPerActionValues = extractCostPerActionValues(insight.cost_per_action_type || []);
          }

          return {
            user_id: userId,
            account_id: accountData.account_id,
            account_name: accountData.account_name,
            campaign_id: insight.campaign_id || null,
            campaign_name: insight.campaign_name || null,
            adset_id: insight.adset_id || null,
            adset_name: insight.adset_name || null,
            ad_id: insight.ad_id || null,
            ad_name: insight.ad_name || null,
            date_start: insight.date_start,
            date_stop: insight.date_stop,
            impressions: int(insight.impressions),
            clicks: int(insight.clicks),
            spend: num(insight.spend) ?? 0,
            reach: int(insight.reach),
            frequency: num(insight.frequency),
            cpc: num(insight.cpc),
            cpm: num(insight.cpm),
            cpp: num(insight.cpp),
            cost_per_unique_click: num(insight.cost_per_unique_click),
            ctr: num(insight.ctr),
            // 🔄 CRITICAL: Merge status and effective_status from catalog (fresh from Facebook API)
            status: sanitizeNocoDBStatus(insight.ad_id
              ? (adStatusMap.get(insight.ad_id) || insight.status || 'ACTIVE')
              : insight.adset_id
                ? (adsetStatusMap.get(insight.adset_id) || insight.status || 'ACTIVE')
                : (campaignStatusMap.get(insight.campaign_id) || insight.status || 'ACTIVE')),
            // ✅ CRITICAL: Always use effective_status from catalog (real-time from Facebook)
            effective_status: sanitizeNocoDBStatus(insight.ad_id
              ? (adEffectiveStatusMap.get(insight.ad_id) || insight.effective_status || 'ACTIVE')
              : insight.adset_id
                ? (adsetEffectiveStatusMap.get(insight.adset_id) || insight.effective_status || 'ACTIVE')
                : (campaignEffectiveStatusMap.get(insight.campaign_id) || insight.effective_status || 'ACTIVE')),
            // 🏷️ Determine level based on what IDs are present
            level: (insight.ad_id ? 'ad' : insight.adset_id ? 'adset' : 'campaign') as 'campaign' | 'adset' | 'ad',
            budget: num(insight.budget) ?? 0,
            daily_budget: num(insight.daily_budget),
            lifetime_budget: num(insight.lifetime_budget),
            objective: insight.objective || null,
            actions: insight.actions || null,
            quality_ranking: insight.quality_ranking || null,
            engagement_rate_ranking: insight.engagement_rate_ranking || null,
            conversion_rate_ranking: insight.conversion_rate_ranking || null,
            purchase_roas: insight.purchase_roas || null,
            action_values: insight.action_values || null,
            cost_per_action_type: insight.cost_per_action_type || null,
            video_p25_watched_actions: insight.video_p25_watched_actions || null,
            video_p50_watched_actions: insight.video_p50_watched_actions || null,
            video_p75_watched_actions: insight.video_p75_watched_actions || null,
            video_p100_watched_actions: insight.video_p100_watched_actions || null,
            video_play_actions: insight.video_play_actions || null,
            cost_per_thruplay: num(insight.cost_per_thruplay),
            results: metrics.results,
            cost_per_result: metrics.cost_per_result,
            result_label: metrics.result_label,
            action_type_used: metrics.action_type_used,
            results_messaging_replied_7d: messagingMetrics.count,
            cost_per_messaging_replied_7d: messagingMetrics.cost,

            // 11 Action Fields (chuẩn hóa)
            started_7d: actionValues.started_7d,
            total_messaging_connection: actionValues.total_messaging_connection,
            link_click: actionValues.link_click,
            messaging_welcome_message_view: actionValues.messaging_welcome_message_view,
            post_engagement_action: actionValues.post_engagement_action,
            messaging_first_reply: actionValues.messaging_first_reply,
            video_view: actionValues.video_view,
            page_engagement_action: actionValues.page_engagement_action,
            replied_7d: actionValues.replied_7d,
            depth_2_message: actionValues.depth_2_message,
            depth_3_message: actionValues.depth_3_message,

            // 11 Cost Per Action Fields (chuẩn hóa)
            cost_per_started_7d: costPerActionValues.cost_per_started_7d,
            cost_per_total_messaging_connection: costPerActionValues.cost_per_total_messaging_connection,
            cost_per_link_click: costPerActionValues.cost_per_link_click,
            cost_per_messaging_welcome_message_view: costPerActionValues.cost_per_messaging_welcome_message_view,
            cost_per_post_engagement: costPerActionValues.cost_per_post_engagement,
            cost_per_messaging_first_reply: costPerActionValues.cost_per_messaging_first_reply,
            cost_per_video_view: costPerActionValues.cost_per_video_view,
            cost_per_page_engagement: costPerActionValues.cost_per_page_engagement,
            cost_per_replied_7d: costPerActionValues.cost_per_replied_7d,
            cost_per_depth_2_message: costPerActionValues.cost_per_depth_2_message,
            cost_per_depth_3_message: costPerActionValues.cost_per_depth_3_message,

            sync_date: insight.date_start,
          };
        });



        // Insert in batches of 1000 (Supabase limit)
        const BATCH_SIZE = 1000;
        let insertedCount = 0;
        let updatedRecordsCount = 0;

        for (let i = 0; i < insightsToInsert.length; i += BATCH_SIZE) {
          const batch = insightsToInsert.slice(i, i + BATCH_SIZE);
          const batchNum = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(insightsToInsert.length / BATCH_SIZE);

          setSyncStatus(`Đang lưu batch ${batchNum}/${totalBatches} (${batch.length} records)...`);
          setSyncProgress(80 + (batchNum / totalBatches) * 15);


          try {
            await bulkInsertInsights(batch);

          } catch (insertError) {
            console.error(`❌ Error inserting batch ${batchNum}:`, insertError);
            throw insertError;
          }

          insertedCount += batch.length;

        }
      }

      // Load from database to display - fetch all levels with proper filtering
      setSyncStatus('Đang tải dữ liệu từ NocoDB...');
      setSyncProgress(95);


      // ✅ since and until already declared above, no need to redeclare

      // ✅ CRITICAL: Pass account_id to prevent cross-account data contamination
      const data = await getInsightsByUserAndDate(
        userId,
        since,
        until,
        accountData.account_id // ← IMPORTANT: Filter by account_id
      );

      // ✨ NEW: Merge phones from SALES_REPORTS - filtered by selected date range
      let enrichedData = data || [];
      try {
        const salesData = await getSalesReports(userId, since, until);



        if (salesData && salesData.length > 0) {
          // ✅ Group sales by campaign_id + date to match insight rows correctly
          const salesByCampaignDate = new Map<string, { phones: number; bookings: number; revenue: number }>();
          salesData.forEach(sale => {
            if (sale.campaign_id) {
              const cid = String(sale.campaign_id);
              // Extract date from CreatedAt (YYYY-MM-DD)
              const saleDate = sale.CreatedAt ? sale.CreatedAt.split('T')[0] : '';
              const key = `${cid}_${saleDate}`;

              const existing = salesByCampaignDate.get(key) || { phones: 0, bookings: 0, revenue: 0 };
              existing.phones += 1;
              // Count bookings (Đã đặt lịch or Đã đến)
              if (sale.appointment_status === 'Đã đặt lịch' || sale.appointment_status === 'Đã đến') {
                existing.bookings += 1;
              }
              existing.revenue += Number(sale.total_revenue || sale.service_revenue || 0);
              salesByCampaignDate.set(key, existing);
            }
          });


          // Merge all sales metrics into insights
          enrichedData = (data || []).map((insight: any) => {
            const cid = String(insight.campaign_id);
            const insightDate = insight.date_start ? insight.date_start.split('T')[0] : '';
            const key = `${cid}_${insightDate}`;

            // Match by both campaign and date
            const salesMetrics = salesByCampaignDate.get(key) || { phones: 0, bookings: 0, revenue: 0 };
            const spend = Number(insight.spend || 0); // ✅ Already in VND
            const results = Number(insight.results || 0);

            // Calculate derived metrics
            const cost_per_phone = salesMetrics.phones > 0 ? spend / salesMetrics.phones : 0;
            const booking_rate = results > 0 ? (salesMetrics.bookings / results) * 100 : 0;
            const marketing_revenue_ratio = salesMetrics.revenue > 0 ? (spend / salesMetrics.revenue) * 100 : 0;

            // Debug: Log calculation values
            if (salesMetrics.revenue > 0) {
            }

            return {
              ...insight,
              phones: salesMetrics.phones,
              cost_per_phone,
              booking_count: salesMetrics.bookings,
              booking_rate: Math.round(booking_rate * 100) / 100,
              total_revenue: salesMetrics.revenue,
              marketing_revenue_ratio: Math.round(marketing_revenue_ratio * 100) / 100,
            };
          });
        }

      } catch (salesError) {
        console.warn('⚠️ Could not fetch sales for phones merge:', salesError);
      }

      setInsights(enrichedData);

      setSyncProgress(100);
      setSyncStatus('Hoàn thành!');

      sonnerToast.success("Đồng bộ thành công", {
        description: `Đã đồng bộ ${insightsToFetch.length} insights mới từ Facebook. Tổng ${data?.length || 0} records trong database.`
      });

      // Clear progress after 2 seconds
      setTimeout(() => {
        setSyncProgress(0);
        setSyncStatus('');
      }, 2000);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      toast({
        title: "Lỗi đồng bộ",
        description: error?.message || "Không thể tải dữ liệu insights",
        variant: "destructive",
      });
      setSyncStatus('Lỗi!');
    } finally {
      // ✅ Don't use setLoading - keep table visible
      setIsSyncing(false);
    }
  };

  // ✅ Fetch historical insights (read-only)
  const fetchHistoricalInsights = async () => {
    if (!historicalDateRange?.from || !historicalDateRange?.to) {

      return;
    }

    setHistoricalLoading(true);
    setHistoricalError(null);

    try {
      if (!user?.id) {
        console.warn('⚠️ No user logged in for historical fetch');
        setHistoricalInsights([]);
        setHistoricalLoading(false);
        return;
      }

      // Get active account
      const adAccounts = await getActiveAdAccounts(user.id);
      const accountData = adAccounts.find(acc => acc.is_active);

      if (!accountData) {
        console.warn('⚠️ No active ad account for historical fetch');
        setHistoricalInsights([]);
        setHistoricalLoading(false);
        return;
      }

      const startDate = format(historicalDateRange.from, 'yyyy-MM-dd');
      const endDate = format(historicalDateRange.to, 'yyyy-MM-dd');



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

  // ✅ Sync historical insights from Facebook to NocoDB
  const handleHistoricalSync = async () => {
    if (!historicalDateRange?.from || !historicalDateRange?.to) {
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

      // Get active account
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

      const since = format(historicalDateRange.from, 'yyyy-MM-dd');
      const until = format(historicalDateRange.to, 'yyyy-MM-dd');



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

      // Reload historical data
      await fetchHistoricalInsights();
    } catch (err: any) {
      console.error('❌ Error syncing historical insights:', err);

      // Enhanced error handling for "Failed to fetch"
      let errorMessage = err.message || 'Không thể đồng bộ dữ liệu lịch sử';
      let errorDetails = null;

      if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
        errorMessage = 'Không kết nối được tới function – có thể do Function chưa deploy hoặc gọi sai project.';
        errorDetails = {
          error: err.name,
          message: err.message,
          suggestion: 'Vui lòng kiểm tra: 1) Function đã được deploy chưa? 2) URL có đúng project không? 3) Thử làm mới trang',
        };
      }

      const errorLog = {
        type: 'error',
        message: errorMessage,
        details: errorDetails || { error: err.name, message: err.message },
        timestamp: new Date().toISOString(),
      };

      toast({
        title: "Lỗi đồng bộ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setHistoricalSyncing(false);
    }
  };

  // Auto-load existing insights from database on mount (no external sync)
  const fetchExisting = async (force = false) => {
    // If we already have data and not forcing, don't re-fetch
    if (!force && insights.length > 0) return;

    setLoading(true);
    try {
      if (!user?.id) {
        setInsights([]);
        setLoading(false);
        return;
      }

      // Get active account
      const adAccounts = await getActiveAdAccounts(user.id);
      const accountData = adAccounts.find(acc => acc.is_active);

      if (!accountData) {
        setInsights([]);
        setLoading(false);
        return;
      }

      // ✅ LOAD TẤT CẢ DATA (Auto + Archive)
      const { getAllInsightsByUserAndDate } = await import('@/services/nocodb/facebookInsightsAutoService');
      const { getAllArchivedInsightsByUserAndDate } = await import('@/services/nocodb/facebookInsightsArchiveService');

      // 🚀 OPTIMIZATION: Incremental Fetching Strategy to fix "laggy/flickering" UI
      // 1. Kick off all requests in parallel
      const autoPromise = getAllInsightsByUserAndDate(
        user.id,
        '2020-01-01',
        '2099-12-31',
        accountData.account_id
      );

      const archivePromise = getAllArchivedInsightsByUserAndDate(
        user.id,
        '2020-01-01',
        '2099-12-31',
        accountData.account_id
      );

      const salesPromise = getSalesReports(user.id).catch(e => {
        console.warn('⚠️ Sales fetch failed:', e);
        return [];
      });

      // 2. Stage 1: Render Active Data IMMEDIATELY (Fastest Response)
      let autoData: any[] = [];
      try {
        autoData = await autoPromise;
        if (autoData && autoData.length > 0) {
          const sortedAuto = [...autoData].sort((a, b) =>
            new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
          );
          setInsights(sortedAuto); // ⚡ Quick Initial Render
          setLoading(false); // ✅ STOP SPINNER IMMEDIATELY if we have data
        }
      } catch (e) {
        console.error('❌ Auto data fetch failed:', e);
      }

      // 3. Stage 2: Render Full Data (Archive + Sales + Metrics)
      let finalData: any[] = autoData; // Default to autoData if stage 2 fails

      try {
        const [archiveData, salesData] = await Promise.all([archivePromise, salesPromise]);

        const combinedData = [...autoData, ...(archiveData || [])].sort((a, b) =>
          new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
        );

        // Merge Sales Logic
        finalData = combinedData;


        if (salesData && salesData.length > 0) {
          // ✅ Group sales by campaign_id + date to match insight rows correctly
          const salesByCampaignDate = new Map<string, { phones: number; bookings: number; revenue: number }>();
          salesData.forEach((sale: any) => {
            if (sale.campaign_id) {
              const cid = String(sale.campaign_id);
              // Extract date from CreatedAt (YYYY-MM-DD)
              const saleDate = sale.CreatedAt ? sale.CreatedAt.split('T')[0] : '';
              const key = `${cid}_${saleDate}`;

              const existing = salesByCampaignDate.get(key) || { phones: 0, bookings: 0, revenue: 0 };
              existing.phones += 1;
              if (sale.appointment_status === 'Đã đặt lịch' || sale.appointment_status === 'Đã đến') {
                existing.bookings += 1;
              }
              existing.revenue += Number(sale.total_revenue || sale.service_revenue || 0);
              salesByCampaignDate.set(key, existing);
            }
          });

          finalData = combinedData.map((insight: any) => {
            const cid = String(insight.campaign_id);
            const insightDate = insight.date_start ? insight.date_start.split('T')[0] : '';
            const key = `${cid}_${insightDate}`;

            // Match by both campaign and date
            const salesMetrics = salesByCampaignDate.get(key) || { phones: 0, bookings: 0, revenue: 0 };
            const spend = Number(insight.spend || 0);
            const results = Number(insight.results || 0);

            const cost_per_phone = salesMetrics.phones > 0 ? spend / salesMetrics.phones : 0;
            const booking_rate = results > 0 ? (salesMetrics.bookings / results) * 100 : 0;
            const marketing_revenue_ratio = salesMetrics.revenue > 0 ? (spend / salesMetrics.revenue) * 100 : 0;

            return {
              ...insight,
              phones: salesMetrics.phones,
              cost_per_phone,
              booking_count: salesMetrics.bookings,
              booking_rate: Math.round(booking_rate * 100) / 100,
              total_revenue: salesMetrics.revenue,
              marketing_revenue_ratio: Math.round(marketing_revenue_ratio * 100) / 100,
            };
          });
        }


        // ⚡ Full Final Render
        setInsights(finalData);

        setLoading(false); // Make sure spinner is off

        if (archiveData && archiveData.length > 0) {
        }

      } catch (e) {
        console.error('❌ Stage 2 failed:', e);
        setLoading(false); // Turn off spinner even if failed
      }

      // ✅ Prompt user to sync if no data found (Compact Version)
      if (finalData.length === 0) {
        toast({
          title: "Chưa có dữ liệu",
          description: (
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={handleSyncNow} className="h-7 text-xs px-3">
                Đồng bộ ngay
              </Button>
            </div>
          ),
          duration: 3000,
          className: "w-[300px]", // Compact width
        });
      }

    } catch (e: any) {
      console.warn('⚠️ Error loading local insights (likely network or config issue):', e.message);
      if (e.message && e.message.includes('404')) {
        sonnerToast.error('Không tìm thấy bảng dữ liệu (404)', {
          description: 'Vui lòng kiểm tra cấu hình Table ID trong config.ts'
        });
      }
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      // Only fetch if we don't have data yet
      if (insights.length === 0) {
        fetchExisting();
      }
    }
  }, [user?.id]); // Re-run when user is authenticated

  // Load catalog from Supabase first (persistent data), then optionally sync from Facebook
  // Initial catalog fetch (runs once on mount)
  // ❌ REMOVED: Don't sync structure from FB API on mount to avoid rate limits
  // useEffect(() => {
  //   if (user?.id) {
  //     syncStructure();
  //   }
  // }, [user?.id]);

  // ✅ FIX: Use useMemo instead of useEffect to derive catalogs SYNCHRONOUSLY
  // This eliminates the race condition where useMemo ran before useEffect updated catalogs
  const derivedCatalogs = useMemo(() => {
    if (insights.length === 0) {
      return { campaigns: [], adsets: [], ads: [] };
    }

    // Extract unique campaigns
    const campaignsMap = new Map();
    const adsetsMap = new Map();
    const adsMap = new Map();

    insights.forEach(item => {
      // Campaign
      if (item.campaign_id && !campaignsMap.has(item.campaign_id)) {
        campaignsMap.set(item.campaign_id, {
          id: item.campaign_id,
          name: item.campaign_name || 'Unknown',
          status: item.status,
          effective_status: item.effective_status,
          daily_budget: item.daily_budget,
          lifetime_budget: item.lifetime_budget,
          is_deleted: item.effective_status === 'DELETED'
        });
      }

      // AdSet
      if (item.adset_id && !adsetsMap.has(item.adset_id)) {
        adsetsMap.set(item.adset_id, {
          id: item.adset_id,
          name: item.adset_name || 'Unknown',
          campaign_id: item.campaign_id,
          status: item.status,
          effective_status: item.effective_status,
          daily_budget: item.daily_budget,
          lifetime_budget: item.lifetime_budget,
          is_deleted: item.effective_status === 'DELETED'
        });
      }

      // Ad
      if (item.ad_id && !adsMap.has(item.ad_id)) {
        adsMap.set(item.ad_id, {
          id: item.ad_id,
          name: item.ad_name || 'Unknown',
          adset_id: item.adset_id,
          status: item.status,
          effective_status: item.effective_status,
          is_deleted: item.effective_status === 'DELETED'
        });
      }
    });

    return {
      campaigns: Array.from(campaignsMap.values()),
      adsets: Array.from(adsetsMap.values()),
      ads: Array.from(adsMap.values())
    };
  }, [insights]);

  // ✅ Sync derived catalogs to state (for backward compatibility with components that use state)
  useEffect(() => {
    if (derivedCatalogs.campaigns.length > 0) {
      setCampaignCatalog(derivedCatalogs.campaigns);
    }
    if (derivedCatalogs.adsets.length > 0) {
      setAdsetCatalog(derivedCatalogs.adsets);
    }
    if (derivedCatalogs.ads.length > 0) {
      setAdCatalog(derivedCatalogs.ads);
    }
  }, [derivedCatalogs]);


  // ✅ Fetch historical insights when date range or account changes
  useEffect(() => {
    fetchHistoricalInsights();
  }, [historicalDateRange?.from, historicalDateRange?.to]);

  // Auto-refresh interval management (updates when syncInterval or settings change)




  // Load sync settings from database on mount
  // Sync rowStatuses with catalog effective_status when catalog loads
  // IMPORTANT: Only sync items that don't have manual toggle state yet
  useEffect(() => {
    if (campaignCatalog.length === 0 && adsetCatalog.length === 0 && adCatalog.length === 0) {
      return; // Skip if no catalog loaded yet
    }



    setRowStatuses(prev => {
      const newRowStatuses: Record<string, boolean> = { ...prev }; // Keep existing manual toggles

      // Sync campaigns (Always update from catalog to ensure fresh status)
      campaignCatalog.forEach(campaign => {
        if (campaign.id) {
          // Sync with Configured Status (status), NOT Effective Status
          newRowStatuses[campaign.id] = campaign.status === 'ACTIVE';
        }
      });

      // Sync adsets
      adsetCatalog.forEach(adset => {
        if (adset.id) {
          newRowStatuses[adset.id] = adset.status === 'ACTIVE';
        }
      });

      // Sync ads
      adCatalog.forEach(ad => {
        if (ad.id) {
          newRowStatuses[ad.id] = ad.status === 'ACTIVE';
        }
      });

      const addedCount = Object.keys(newRowStatuses).length - Object.keys(prev).length;
      if (addedCount > 0) {
      }

      return newRowStatuses;
    });
  }, [campaignCatalog, adsetCatalog, adCatalog]); // Re-sync when catalog changes

  // Load labels function
  const loadLabels = async () => {
    try {
      if (!user?.id) return;
      const labelsData = await getLabelsByUserId(user.id);
      // console.log('🏷️ Loaded Labels:', labelsData);
      setLabels(labelsData);
    } catch (error) {
      console.error('Error loading labels:', error);
    }
  };

  // Load labels on mount
  useEffect(() => {
    loadLabels();
  }, [user?.id]);



  const handleManualAssignLabels = async (entityIds: string[], entityType: 'campaign' | 'adset' | 'ad', labelIds: number[]) => {
    try {
      // Convert entityIds to the format expected by bulkAssignLabels
      const entities = entityIds.map(id => ({ id, type: entityType }));
      await bulkAssignLabels(entities, labelIds);

      // Reload label assignments
      const allEntityIds = insights.map(i => i.id);
      const assignments = await getLabelAssignmentsByEntities(allEntityIds, entityType);
      setLabelAssignments(assignments);

      sonnerToast.success('Đã gắn nhãn thành công');
    } catch (error) {
      console.error('Error in manual label assignment:', error);
      throw error;
    }
  };

  // Load label assignments when insights change
  // Load label assignments when insights change
  const loadLabelAssignments = useCallback(async () => {
    if (insights.length === 0) {
      setLabelAssignments([]);
      return;
    }

    try {
      // Load assignments for all three entity types
      const campaignIds = [...new Set(insights.map(i => i.campaign_id).filter(Boolean))];
      const adsetIds = [...new Set(insights.map(i => i.adset_id).filter(Boolean))];
      const adIds = [...new Set(insights.map(i => i.ad_id).filter(Boolean))];

      const [campaignAssignments, adsetAssignments, adAssignments] = await Promise.all([
        campaignIds.length > 0 ? getLabelAssignmentsByEntities(campaignIds, 'campaign') : Promise.resolve([]),
        adsetIds.length > 0 ? getLabelAssignmentsByEntities(adsetIds, 'adset') : Promise.resolve([]),
        adIds.length > 0 ? getLabelAssignmentsByEntities(adIds, 'ad') : Promise.resolve([]),
      ]);

      const allAssignments = [...campaignAssignments, ...adsetAssignments, ...adAssignments];
      setLabelAssignments(allAssignments);
    } catch (error) {
      console.error('Error loading label assignments:', error);
    }
  }, [insights]);

  useEffect(() => {
    loadLabelAssignments();
  }, [loadLabelAssignments]);

  const handleDrillDown = (newLevel: 'campaign' | 'adset' | 'ad', parentId: string, parentName: string) => {

    // Clear selected rows when drilling down to prevent confusion
    setSelectedRows(new Set());

    // ✅ ROBUST FIX: Reset status filter to default (Show All) when drilling down
    // This ensures hidden items (e.g., PAUSED adsets inside ACTIVE campaign) become visible
    setSelectedStatuses([]);

    // ✅ Update breadcrumbs correctly based on level hierarchy
    if (newLevel === 'adset') {
      // Drilling into ad sets of a campaign
      setBreadcrumbs([
        { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' },
        { level: 'adset', parentId: parentId, name: parentName }
      ]);
    } else if (newLevel === 'ad') {
      // Drilling into ads of an ad set - need to preserve campaign breadcrumb
      const campaignInfo = insights.find(i => i.adset_id === parentId);
      setBreadcrumbs([
        { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' },
        { level: 'adset', parentId: campaignInfo?.campaign_id || '', name: campaignInfo?.campaign_name || '' },
        { level: 'ad', parentId: parentId, name: parentName }
      ]);
    } else {
      // Back to campaign root
      setBreadcrumbs([
        { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
      ]);
    }


  };

  const handleBreadcrumbClick = (index: number) => {

    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);

    setBreadcrumbs(newBreadcrumbs);

    // Clear selections when changing levels
    setSelectedRows(new Set());

    // Force insights to refresh by clearing and resetting
    // This ensures the filtered data updates correctly
    const currentInsights = insights;
    setInsights([]);
    setTimeout(() => {
      setInsights(currentInsights);
    }, 0);
  };

  // Unique selection key per level (campaign_id/adset_id/ad_id)
  const getRowKey = (item: any): string | null => {
    if (viewLevel === 'campaign') return item.campaign_id || null;
    if (viewLevel === 'adset') return item.adset_id || null;
    return item.ad_id || null;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const keys = filteredAndSortedInsights
        .map(getRowKey)
        .filter(Boolean) as string[];
      setSelectedRows(new Set(keys));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (key: string | null, checked: boolean) => {
    if (!key) return;
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedRows(newSelected);
  };

  // Handle assign labels to selected items (campaigns, adsets, ads)
  const handleAssignLabels = async (labelIds: number[]) => {
    try {
      // Get selected items and determine their entity types
      const selectedItems = filteredAndSortedInsights.filter(insight => {
        const key = getRowKey(insight);
        return key && selectedRows.has(key);
      });

      // Create entities array with proper type detection
      const entities = selectedItems.map(item => {
        let entityType: 'campaign' | 'adset' | 'ad';
        let entityId: string;

        if (viewLevel === 'campaign' || (!item.adset_id && !item.ad_id)) {
          entityType = 'campaign';
          entityId = item.campaign_id;
        } else if (viewLevel === 'adset' || (item.adset_id && !item.ad_id)) {
          entityType = 'adset';
          entityId = item.adset_id;
        } else {
          entityType = 'ad';
          entityId = item.ad_id;
        }

        return { id: entityId, type: entityType };
      }).filter(e => e.id);

      if (entities.length === 0) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy mục để gắn nhãn",
          variant: "destructive",
        });
        return;
      }

      const entityTypeName = entities.length === 1
        ? (entities[0].type === 'campaign' ? 'chiến dịch' : entities[0].type === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo')
        : 'mục';

      toast({
        title: "Đang gắn nhãn...",
        description: `Gắn ${labelIds.length} nhãn cho ${entities.length} ${entityTypeName}`,
      });

      await bulkAssignLabels(entities, labelIds);

      toast({
        title: "Đã gắn nhãn",
        description: `Đã gắn ${labelIds.length} nhãn cho ${entities.length} ${entityTypeName}`,
      });

      // ✅ ADD DELAY: Đợi NocoDB sync data

      // ✅ ADD DELAY: Đợi NocoDB sync data
      // ✅ ADD DELAY: Đợi NocoDB sync data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload label assignments for all entity types
      const campaignIds = [...new Set(insights.map(i => i.campaign_id).filter(Boolean))] as string[];
      const adsetIds = [...new Set(insights.map(i => i.adset_id).filter(Boolean))] as string[];
      const adIds = [...new Set(insights.map(i => i.ad_id).filter(Boolean))] as string[];


      const [campaignAssignments, adsetAssignments, adAssignments] = await Promise.all([
        campaignIds.length > 0 ? getLabelAssignmentsByEntities(campaignIds, 'campaign') : Promise.resolve([]),
        adsetIds.length > 0 ? getLabelAssignmentsByEntities(adsetIds, 'adset') : Promise.resolve([]),
        adIds.length > 0 ? getLabelAssignmentsByEntities(adIds, 'ad') : Promise.resolve([]),
      ]);

      const allAssignments = [...campaignAssignments, ...adsetAssignments, ...adAssignments];

      setLabelAssignments(allAssignments);

      // Clear selection
      setSelectedRows(new Set());
    } catch (error) {
      console.error('Error assigning labels:', error);
      toast({
        title: "Lỗi gắn nhãn",
        description: error instanceof Error ? error.message : "Không thể gắn nhãn",
        variant: "destructive",
      });
    }
  };

  // Handle quick assign labels from popover (for single entity)
  const handleQuickAssignLabelsFromPopover = useCallback(async (
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    labelIds: number[]
  ) => {
    try {
      // ✅ Validate user authentication
      if (!user?.id) {
        toast({
          title: "Lỗi xác thực",
          description: "Bạn cần đăng nhập để gắn nhãn",
          variant: "destructive",
        });
        return;
      }



      // ✅ Get current assignments for this entity
      const currentAssignments = await getLabelAssignmentsByEntities([entityId], entityType);
      const currentLabelIds = currentAssignments.map(a => Number(a.label_id));




      // ✅ Find labels to ADD (in target but not in current)
      const labelsToAdd = labelIds.filter(id => !currentLabelIds.includes(id));

      // ✅ Find labels to REMOVE (in current but not in target)
      const labelsToRemove = currentLabelIds.filter(id => !labelIds.includes(id));




      // Add new labels
      if (labelsToAdd.length > 0) {
        await Promise.all(
          labelsToAdd.map(labelId => assignLabel(entityId, entityType, labelId, user.id))
        );
      }

      // Remove old labels
      if (labelsToRemove.length > 0) {
        const { removeLabel } = await import('@/services/nocodb/campaignLabelAssignmentsService');
        await Promise.all(
          labelsToRemove.map(labelId => removeLabel(entityId, entityType, labelId))
        );
      }

      const entityTypeName = entityType === 'campaign' ? 'chiến dịch' : entityType === 'adset' ? 'nhóm QC' : 'quảng cáo';

      toast({
        title: "Đã gắn nhãn",
        description: `Đã gắn ${labelIds.length} nhãn cho ${entityTypeName}`,
      });

      // ✅ ADD DELAY: Đợi NocoDB sync data

      // ✅ ADD DELAY: Đợi NocoDB sync data
      // ✅ ADD DELAY: Đợi NocoDB sync data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload label assignments for all entity types
      const campaignIds = [...new Set(insights.map(i => i.campaign_id).filter(Boolean))] as string[];
      const adsetIds = [...new Set(insights.map(i => i.adset_id).filter(Boolean))] as string[];
      const adIds = [...new Set(insights.map(i => i.ad_id).filter(Boolean))] as string[];


      const [campaignAssignments, adsetAssignments, adAssignments] = await Promise.all([
        campaignIds.length > 0 ? getLabelAssignmentsByEntities(campaignIds, 'campaign') : Promise.resolve([]),
        adsetIds.length > 0 ? getLabelAssignmentsByEntities(adsetIds, 'adset') : Promise.resolve([]),
        adIds.length > 0 ? getLabelAssignmentsByEntities(adIds, 'ad') : Promise.resolve([]),
      ]);

      const allAssignments = [...campaignAssignments, ...adsetAssignments, ...adAssignments];

      setLabelAssignments(allAssignments);
    } catch (error) {
      console.error('❌ Error assigning labels:', error);
      toast({
        title: "Lỗi gắn nhãn",
        description: error instanceof Error ? error.message : "Không thể gắn nhãn",
        variant: "destructive",
      });
    }
  }, [user, insights, assignLabel, removeLabel, getLabelAssignmentsByEntities, setLabelAssignments]);

  // Handle removing a label badge directly from the badge X button
  const handleRemoveLabelBadge = async (
    e: React.MouseEvent,
    entityId: string,
    entityType: 'campaign' | 'adset' | 'ad',
    labelId: number | undefined
  ) => {
    e.stopPropagation();

    if (!labelId) {
      console.warn('⚠️ No label ID provided for removal');
      return;
    }

    try {


      await removeLabel(entityId, entityType, labelId);

      const entityTypeName = entityType === 'campaign' ? 'chiến dịch' : entityType === 'adset' ? 'nhóm QC' : 'quảng cáo';

      toast({
        title: "Đã xóa nhãn",
        description: `Đã xóa nhãn khỏi ${entityTypeName}`,
      });

      // Wait for NocoDB to sync

      // ✅ ADD DELAY: Đợi NocoDB sync data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reload label assignments
      const campaignIds = [...new Set(insights.map(i => i.campaign_id).filter(Boolean))] as string[];
      const adsetIds = [...new Set(insights.map(i => i.adset_id).filter(Boolean))] as string[];
      const adIds = [...new Set(insights.map(i => i.ad_id).filter(Boolean))] as string[];

      const [campaignAssignments, adsetAssignments, adAssignments] = await Promise.all([
        campaignIds.length > 0 ? getLabelAssignmentsByEntities(campaignIds, 'campaign') : Promise.resolve([]),
        adsetIds.length > 0 ? getLabelAssignmentsByEntities(adsetIds, 'adset') : Promise.resolve([]),
        adIds.length > 0 ? getLabelAssignmentsByEntities(adIds, 'ad') : Promise.resolve([]),
      ]);

      const allAssignments = [...campaignAssignments, ...adsetAssignments, ...adAssignments];
      setLabelAssignments(allAssignments);


    } catch (error) {
      console.error('❌ Error removing label:', error);
      toast({
        title: "Lỗi xóa nhãn",
        description: error instanceof Error ? error.message : "Không thể xóa nhãn",
        variant: "destructive",
      });
    }
  };


  // ✅ NEW: Refresh catalog status from Facebook after toggle
  const refreshCatalogForObject = async (objectId: string, objectType: 'campaign' | 'adset' | 'ad') => {
    try {
      if (!user?.id) return null;

      const adAccounts = await getActiveAdAccounts(user.id);
      const accountData = adAccounts.find(acc => acc.is_active);

      if (!accountData) return null;

      const { getCampaigns, getAdSets, getAds } = await import('@/services/facebookInsightsService');



      if (objectType === 'campaign') {
        const campaigns = await getCampaigns(accountData.access_token, accountData.account_id);
        const updated = campaigns.find(c => c.id === objectId);

        if (updated) {
          setCampaignCatalog(prev => prev.map(c =>
            c.id === objectId
              ? { ...c, effective_status: updated.effective_status, status: updated.status }
              : c
          ));

          // ✅ TRIGGER BACKEND SYNC (Fire & Forget)
          try {
            supabase.functions.invoke('sync-ads-cron', {
              body: {
                target_account_id: accountData.account_id,
                date_preset: 'today',
                limit: 500
              }
            }).then(({ error }) => {
              if (error) console.error('Background sync failed:', error);
            });
          } catch (e) {
            console.error('Failed to trigger background sync', e);
          }

          return updated;
        }
      } else if (objectType === 'adset') {
        const adsets = await getAdSets(accountData.access_token, accountData.account_id);
        const updated = adsets.find(a => a.id === objectId);

        if (updated) {
          setAdsetCatalog(prev => prev.map(a =>
            a.id === objectId
              ? { ...a, effective_status: updated.effective_status, status: updated.status }
              : a
          ));

          // ✅ TRIGGER BACKEND SYNC (Fire & Forget)
          try {
            supabase.functions.invoke('sync-ads-cron', {
              body: {
                target_account_id: accountData.account_id,
                date_preset: 'today',
                limit: 500
              }
            }).then(({ error }) => {
              if (error) console.error('Background sync failed:', error);
            });
          } catch (e) {
            console.error('Failed to trigger background sync', e);
          }

          return updated;
        }
      } else if (objectType === 'ad') {
        const ads = await getAds(accountData.access_token, accountData.account_id);
        const updated = ads.find(a => a.id === objectId);

        if (updated) {
          setAdCatalog(prev => prev.map(a =>
            a.id === objectId
              ? { ...a, effective_status: updated.effective_status, status: updated.status }
              : a
          ));

          // ✅ TRIGGER BACKEND SYNC (Fire & Forget)
          // This ensures NocoDB is updated so F5 works correcty
          // We call sync-ads-cron for this specific account
          try {
            supabase.functions.invoke('sync-ads-cron', {
              body: {
                target_account_id: accountData.account_id,
                date_preset: 'today', // Sync today's data to be fast
                limit: 500
              }
            }).then(({ error }) => {
              if (error) console.error('Background sync failed:', error);
            });
          } catch (e) {
            console.error('Failed to trigger background sync', e);
          }

          return updated;
        }
      }
    } catch (error) {
      console.error('Error refreshing catalog:', error);
    }

    return null;
  };

  const handleToggleStatus = async (insight: any, currentStatus: boolean) => {
    try {
      // Call Facebook API to update status
      const { updateObjectStatus } = await import('@/services/facebookInsightsService');

      if (!user?.id) {
        throw new Error('Vui lòng đăng nhập để tiếp tục');
      }

      // Get active ad account for access token
      const adAccounts = await getActiveAdAccounts(user.id);
      const accountData = adAccounts.find(acc => acc.is_active);

      if (!accountData) {
        throw new Error('Không tìm thấy tài khoản Facebook Ads');
      }

      // ✅ FIX: Determine which ID to use based on CURRENT VIEW LEVEL
      let objectId = '';
      let objectName = '';
      let objectType: 'campaign' | 'adset' | 'ad' = 'campaign';

      if (viewLevel === 'ad' && insight.ad_id) {
        objectId = insight.ad_id;
        objectName = insight.ad_name || 'Quảng cáo';
        objectType = 'ad';
      } else if (viewLevel === 'adset' && insight.adset_id) {
        objectId = insight.adset_id;
        objectName = insight.adset_name || 'Nhóm quảng cáo';
        objectType = 'adset';
      } else if (viewLevel === 'campaign' && insight.campaign_id) {
        objectId = insight.campaign_id;
        objectName = insight.campaign_name || 'Chiến dịch';
        objectType = 'campaign';
      }

      if (!objectId) {
        throw new Error('Không tìm thấy ID để cập nhật');
      }

      const newStatus = currentStatus ? 'PAUSED' : 'ACTIVE';

      // ✅ Step 1: Update Facebook
      await updateObjectStatus(accountData.access_token, objectId, newStatus);

      // ✅ Step 2: Update rowStatuses for immediate UI feedback
      setRowStatuses(prev => ({
        ...prev,
        [objectId]: !currentStatus
      }));

      toast({
        title: "✅ Đã cập nhật",
        description: `Đã ${!currentStatus ? 'bật' : 'tắt'} ${objectName}. Đang xác nhận từ Facebook...`,
      });

      // ✅ Step 3: Refresh catalog from Facebook to get REAL effective_status
      setTimeout(async () => {
        const updated = await refreshCatalogForObject(objectId, objectType);

        if (updated) {
          // ✅ Check if effective_status matches what we expected
          if (updated.effective_status === newStatus) {
            sonnerToast.success('✅ Đã xác nhận từ Facebook', {
              description: `${objectName} đã ${newStatus === 'ACTIVE' ? 'bật' : 'tắt'} thành công`
            });
          } else if (newStatus === 'ACTIVE' && updated.effective_status === 'ADSET_PAUSED') {
            sonnerToast.warning('⚠️ Chiến dịch đã bật nhưng Nhóm QC đang tắt', {
              description: 'Hãy bật Nhóm QC để quảng cáo chạy. Chuyển sang tab Nhóm QC để kiểm tra.'
            });
          } else if (newStatus === 'ACTIVE' && updated.effective_status === 'CAMPAIGN_PAUSED') {
            sonnerToast.warning('⚠️ Nhóm QC đã bật nhưng Chiến dịch đang tắt', {
              description: 'Hãy bật Chiến dịch để quảng cáo chạy. Chuyển sang tab Chiến dịch để kiểm tra.'
            });
          } else if (newStatus === 'ACTIVE' && updated.effective_status !== 'ACTIVE') {
            sonnerToast.warning(`⚠️ Trạng thái: ${updated.effective_status}`, {
              description: 'Có thể do vấn đề thanh toán hoặc chờ duyệt'
            });
          }
        }

        // ✅ DO NOT Clear rowStatuses automatically. Keep user intent.
        // setRowStatuses(prev => {
        //   const newStatuses = { ...prev };
        //   delete newStatuses[objectId];
        //   return newStatuses;
        // });
      }, 2000); // Wait 2 seconds for Facebook to process

    } catch (error: any) {
      console.error('Error updating status:', error);

      // Check if it's a payment error
      const isPaymentError = error?.isPaymentError || false;
      const errorCode = error?.code;

      let title = "❌ Lỗi cập nhật trạng thái";
      let description = error instanceof Error ? error.message : "Không thể cập nhật trạng thái";

      // Special handling for payment errors
      if (isPaymentError) {
        title = "⚠️ LỖI THANH TOÁN";
        description = error.message + "\n\n💡 Vui lòng kiểm tra Facebook Ads Manager để xử lý vấn đề thanh toán.";
      } else if (errorCode === 80004 || errorCode === 17) {
        title = "⏳ Vượt giới hạn";
        description = error.message + "\n\n💡 Vui lòng đợi vài phút rồi thử lại.";
      }

      toast({
        title,
        description,
        variant: "destructive",
        duration: isPaymentError ? 10000 : 5000, // Longer duration for payment errors
      });

      // Reload insights to get actual status from Facebook after error

      loadInsights();
    }
  };

  const handleColumnDragStart = (e: React.DragEvent, fieldName: string) => {
    setDraggedColumn(fieldName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleColumnDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault();

    if (!draggedColumn || draggedColumn === targetField) {
      setDraggedColumn(null);
      return;
    }

    // Reorder selectedFields
    const newFields = [...selectedFields];
    const draggedIndex = newFields.indexOf(draggedColumn);
    const targetIndex = newFields.indexOf(targetField);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newFields.splice(draggedIndex, 1);
      newFields.splice(targetIndex, 0, draggedColumn);
      setSelectedFields(newFields);
    }

    setDraggedColumn(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
  };

  // Historical column drag handlers
  const handleHistoricalColumnDragStart = (e: React.DragEvent, fieldName: string) => {
    setHistoricalDraggedColumn(fieldName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleHistoricalColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleHistoricalColumnDrop = (e: React.DragEvent, targetField: string) => {
    e.preventDefault();

    if (!historicalDraggedColumn || historicalDraggedColumn === targetField) {
      setHistoricalDraggedColumn(null);
      return;
    }

    // Reorder historicalSelectedFields
    const newFields = [...historicalSelectedFields];
    const draggedIndex = newFields.indexOf(historicalDraggedColumn);
    const targetIndex = newFields.indexOf(targetField);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newFields.splice(draggedIndex, 1);
      newFields.splice(targetIndex, 0, historicalDraggedColumn);
      setHistoricalSelectedFields(newFields);

      sonnerToast.success('Đã di chuyển cột', {
        description: 'Thứ tự cột đã được lưu tự động'
      });
    }

    setHistoricalDraggedColumn(null);
  };

  const handleHistoricalColumnDragEnd = () => {
    setHistoricalDraggedColumn(null);
  };

  // Summary metric card drag handlers
  const handleSummaryMetricDragStart = (e: React.DragEvent, metricKey: string) => {
    setDraggedSummaryMetric(metricKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSummaryMetricDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSummaryMetricDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();

    if (!draggedSummaryMetric || draggedSummaryMetric === targetKey) {
      setDraggedSummaryMetric(null);
      return;
    }

    const newOrder = [...summaryMetricOrder];
    const draggedIndex = newOrder.indexOf(draggedSummaryMetric);
    const targetIndex = newOrder.indexOf(targetKey);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSummaryMetric);
      setSummaryMetricOrder(newOrder);
    }

    setDraggedSummaryMetric(null);
  };

  const handleSummaryMetricDragEnd = () => {
    setDraggedSummaryMetric(null);
  };

  // Sale metric card drag handlers
  const handleSaleMetricDragStart = (e: React.DragEvent, metricKey: string) => {
    setDraggedSaleMetric(metricKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSaleMetricDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleSaleMetricDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();

    if (!draggedSaleMetric || draggedSaleMetric === targetKey) {
      setDraggedSaleMetric(null);
      return;
    }

    const newOrder = [...saleMetricOrder];
    const draggedIndex = newOrder.indexOf(draggedSaleMetric);
    const targetIndex = newOrder.indexOf(targetKey);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedSaleMetric);
      setSaleMetricOrder(newOrder);
    }

    setDraggedSaleMetric(null);
  };

  const handleSaleMetricDragEnd = () => {
    setDraggedSaleMetric(null);
  };

  // Marketing metric card drag handlers
  const handleMarketingMetricDragStart = (e: React.DragEvent, metricKey: string) => {
    setDraggedMarketingMetric(metricKey);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleMarketingMetricDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleMarketingMetricDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();

    if (!draggedMarketingMetric || draggedMarketingMetric === targetKey) {
      setDraggedMarketingMetric(null);
      return;
    }

    const newOrder = [...marketingMetricOrder];
    const draggedIndex = newOrder.indexOf(draggedMarketingMetric);
    const targetIndex = newOrder.indexOf(targetKey);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedMarketingMetric);
      setMarketingMetricOrder(newOrder);
    }

    setDraggedMarketingMetric(null);
  };

  const handleMarketingMetricDragEnd = () => {
    setDraggedMarketingMetric(null);
  };

  // NOTE: All layout handlers (handleSaveSummaryLayout, handleLoadSummaryLayout, etc.)
  // are now provided by useAdsLayoutPresets hook - see layoutPresets destructure above

  // Validate view modes on mount
  useEffect(() => {
    if (marketingViewMode !== 'cards' && marketingViewMode !== 'chart') {
      console.warn('Invalid marketingViewMode, resetting to cards');
      setMarketingViewMode('cards');
    }
    if (summaryViewMode !== 'cards' && summaryViewMode !== 'chart') {
      console.warn('Invalid summaryViewMode, resetting to cards');
      setSummaryViewMode('cards');
    }
    if (saleViewMode !== 'cards' && saleViewMode !== 'chart') {
      console.warn('Invalid saleViewMode, resetting to cards');
      setSaleViewMode('cards');
    }
  }, []);

  // Column resize handlers
  const handleResizeStart = (e: React.MouseEvent, fieldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(fieldName);
    setStartX(e.clientX);
    setStartWidth(columnWidths[fieldName] || 140);
  };

  // Historical column resize handlers
  const handleHistoricalResizeStart = (e: React.MouseEvent, fieldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingHistoricalColumn(fieldName);
    setHistoricalStartX(e.clientX);
    setHistoricalStartWidth(historicalColumnWidths[fieldName] || 140);
  };

  // Add event listeners for resize
  useEffect(() => {
    if (resizingColumn) {
      const handleResizeMove = (e: MouseEvent) => {
        const diff = e.clientX - startX;
        const newWidth = Math.max(80, startWidth + diff); // Min width 80px

        setColumnWidths(prev => ({
          ...prev,
          [resizingColumn]: newWidth
        }));
      };

      const handleResizeEnd = () => {
        setResizingColumn(null);
        sonnerToast.success('Đã thay đổi kích thước cột', {
          description: 'Kích thước cột đã được lưu tự động'
        });
      };

      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingColumn, startX, startWidth, setColumnWidths]);

  // Add event listeners for historical resize
  useEffect(() => {
    if (resizingHistoricalColumn) {
      const handleResizeMove = (e: MouseEvent) => {
        const diff = e.clientX - historicalStartX;
        const newWidth = Math.max(80, historicalStartWidth + diff); // Min width 80px

        setHistoricalColumnWidths(prev => ({
          ...prev,
          [resizingHistoricalColumn]: newWidth
        }));
      };

      const handleResizeEnd = () => {
        setResizingHistoricalColumn(null);
        sonnerToast.success('Đã thay đổi kích thước cột', {
          description: 'Kích thước cột đã được lưu tự động'
        });
      };

      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);

      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingHistoricalColumn, historicalStartX, historicalStartWidth, setHistoricalColumnWidths]);

  const formatValue = (field: string, value: any, row?: any, accountStatus?: typeof adAccountStatus) => {
    if (value === null || value === undefined) {
      // Show "Không rõ" for effective_status instead of "-"
      if (field === 'effective_status') return 'Không rõ';
      // ✅ For labels field, don't return '-', continue to render the assign button
      if (field !== 'labels') return '-';
      // For labels, continue to processing below
    }

    // Level field - display with icon
    if (field === 'level') {
      const levelMap: Record<string, { label: string; icon: string; className: string }> = {
        'campaign': { label: 'Chiến dịch', icon: '📊', className: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
        'adset': { label: 'Nhóm QC', icon: '📁', className: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
        'ad': { label: 'Quảng cáo', icon: '📢', className: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300' },
      };

      const level = levelMap[value] || { label: value, icon: '❓', className: 'bg-gray-50 text-gray-700' };

      return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${level.className}`}>
          <span>{level.icon}</span>
          <span>{level.label}</span>
        </span>
      );
    }

    // Status - user-set status (ACTIVE/PAUSED)
    if (field === 'status') {
      const statusMap: Record<string, { label: string; className: string }> = {
        'ACTIVE': { label: 'Đang bật', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
        'PAUSED': { label: 'Đã tắt', className: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200' },
      };

      const status = statusMap[value] || { label: value, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' };

      return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>
      );
    }

    // Effective status - translate to Vietnamese with badges
    if (field === 'effective_status') {
      // ✅ PRIORITY 1: Check account_status FIRST (account-level issues override everything)
      if (accountStatus?.account_status === 3) { // UNSETTLED
        return (
          <span
            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 animate-pulse"
            title="Tài khoản có khoản nợ chưa thanh toán. Vui lòng thanh toán để tiếp tục chạy quảng cáo."
          >
            💳 Tài khoản nợ chưa thanh toán
          </span>
        );
      }

      if (accountStatus?.account_status === 2) { // DISABLED
        return (
          <span
            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            title="Tài khoản quảng cáo đã bị vô hiệu hóa. Vui lòng kiểm tra Facebook Ads Manager."
          >
            🚫 Tài khoản bị vô hiệu hóa
          </span>
        );
      }

      // ✅ PRIORITY 2: If account OK, check object-level effective_status
      // Get issues_info for this object to show detailed error
      let issuesInfo: any[] = [];

      if (row) {
        const objectId = row.ad_id || row.adset_id || row.campaign_id;

        if (row.ad_id) {
          const ad = adCatalog.find(a => a.id === row.ad_id);
          issuesInfo = ad?.issues_info || [];
        } else if (row.adset_id) {
          const adset = adsetCatalog.find(a => a.id === row.adset_id);
          issuesInfo = adset?.issues_info || [];
        } else if (row.campaign_id) {
          const campaign = campaignCatalog.find(c => c.id === row.campaign_id);
          issuesInfo = campaign?.issues_info || [];
        }
      }

      // Parse issues to get detailed error message
      let detailedError = '';
      let isPaymentError = false;

      if (value === 'WITH_ISSUES' && issuesInfo && issuesInfo.length > 0) {
        const firstIssue = issuesInfo[0];
        const errorCode = firstIssue.error_code;
        const errorSummary = firstIssue.error_summary || '';
        const errorMessage = firstIssue.error_message || '';

        // Payment-related error codes
        const paymentErrorCodes = [1815055, 2635, 2634, 190];
        isPaymentError = paymentErrorCodes.includes(errorCode) ||
          errorSummary.toLowerCase().includes('payment') ||
          errorSummary.toLowerCase().includes('billing') ||
          errorMessage.toLowerCase().includes('payment') ||
          errorMessage.toLowerCase().includes('billing');

        detailedError = errorSummary || errorMessage || `Error code: ${errorCode}`;
      }

      // ✅ User Request: If Campaign is "ACTIVE" but all AdSets are PAUSED -> Show "Nhóm QC tắt"
      // Only apply this logic for Campaign Level rows
      // ✅ FIXED: Only override if adsetCatalog is loaded AND we're CERTAIN all adsets are paused
      if (value === 'ACTIVE' && row?.level === 'campaign' && row?.campaign_id) {
        // ✅ GUARD: Don't override if adset catalog hasn't been loaded yet
        if (adsetCatalog.length > 0) {
          const campaignAdsets = adsetCatalog.filter(a => String(a.campaign_id) === String(row.campaign_id));

          // Only override if:
          // 1. We found adsets for this campaign
          // 2. ALL adsets have effective_status that is NOT ACTIVE (explicitly paused)
          if (campaignAdsets.length > 0) {
            // ✅ Check BOTH effective_status and status fields for reliability
            // ✅ ALSO Check optimistic rowStatuses to ensure UI updates immediately
            const hasActiveOrRunning = campaignAdsets.some(a => {
              // 1. Check optimistic status first
              if (rowStatuses[a.id] !== undefined) {
                return rowStatuses[a.id]; // If explicitly toggled logic
              }
              // 2. Fallback to catalog status
              return a.effective_status === 'ACTIVE' ||
                a.status === 'ACTIVE' ||
                !a.effective_status;
            });

            // ✅ Only show ADSET_PAUSED if we're CERTAIN all adsets are paused
            if (!hasActiveOrRunning) {
              const allExplicitlyPaused = campaignAdsets.every(a => {
                // Check optimistic status
                if (rowStatuses[a.id] !== undefined) {
                  return rowStatuses[a.id] === false;
                }
                // Fallback to catalog
                return a.effective_status === 'PAUSED' ||
                  a.effective_status === 'CAMPAIGN_PAUSED' ||
                  a.effective_status === 'AD_PAUSED';
              });

              if (allExplicitlyPaused) {
                value = 'ADSET_PAUSED';
              }
            }
          }
        }
      }

      const statusMap: Record<string, { label: string; className: string; icon?: string }> = {
        'ACTIVE': { label: 'Đang chạy', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', icon: '🟢' },
        'PAUSED': { label: 'Tạm dừng', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', icon: '⚪' },
        'DELETED': { label: 'Đã xóa', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '🗑' },
        'PENDING_REVIEW': { label: 'Đang chờ duyệt', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '🔍' },
        'DISAPPROVED': { label: 'Bị từ chối', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '❌' },
        'PREAPPROVED': { label: 'Đã duyệt trước', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200', icon: '✅' },
        'PENDING_BILLING_INFO': {
          label: 'CHỜ THANH TOÁN',
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-bold animate-pulse',
          icon: '💳'
        },
        'CAMPAIGN_PAUSED': {
          label: '⏸️ Chiến dịch tắt',
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 font-medium',
          icon: '📊'
        },
        'ARCHIVED': { label: 'Đã xóa', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', icon: '🗑' },
        'ADSET_PAUSED': {
          label: '⏸️ Nhóm QC tắt',
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 font-medium',
          icon: '📁'
        },
        'IN_PROCESS': { label: 'Đang xử lý', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', icon: '⚙️' },
        'WITH_ISSUES': {
          label: isPaymentError ? 'LỖI THANH TOÁN' : 'Có vấn đề',
          className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-bold',
          icon: '⚠️'
        },
        'ACCOUNT_DISABLED': { label: 'Tài khoản bị vô hiệu', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 font-semibold', icon: '🚫' },
      };

      const status = statusMap[value] || { label: value, className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200', icon: undefined };

      // Generate tooltips for different statuses
      let tooltipText = '';
      if (value === 'WITH_ISSUES' && detailedError) {
        tooltipText = `⚠️ ${detailedError}\n\n💡 Kiểm tra Facebook Ads Manager để xử lý vấn đề.`;
      } else if (value === 'WITH_ISSUES') {
        tooltipText = 'Chiến dịch có vấn đề. Có thể do lỗi thanh toán, token hết hạn, hoặc vi phạm chính sách.';
      } else if (value === 'PENDING_BILLING_INFO') {
        tooltipText = '⚠️ Thiếu thông tin thanh toán. Vui lòng cập nhật phương thức thanh toán trong Facebook Ads Manager.';
      } else if (value === 'PENDING_REVIEW') {
        tooltipText = 'Quảng cáo đang được Facebook xem xét để đảm bảo tuân thủ chính sách.';
      } else if (value === 'DISAPPROVED') {
        tooltipText = 'Quảng cáo bị từ chối do vi phạm chính sách Facebook. Vui lòng kiểm tra và chỉnh sửa.';
      } else if (value === 'PREAPPROVED') {
        tooltipText = 'Quảng cáo đã được duyệt trước và sẵn sàng chạy.';
      } else if (value === 'CAMPAIGN_PAUSED') {
        tooltipText = '⚠️ Chiến dịch cha đã bị tạm dừng. Hãy bật chiến dịch để quảng cáo chạy.';
      } else if (value === 'ADSET_PAUSED') {
        tooltipText = '⚠️ Nhóm quảng cáo cha đã bị tạm dừng. Hãy bật nhóm QC để quảng cáo chạy.';
      } else if (value === 'NO_ADS') {
        tooltipText = '⚠️ Chiến dịch này không có quảng cáo nào đang chạy. Hãy tạo hoặc bật quảng cáo.';
      }

      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${status.className}`}
          title={tooltipText}
        >
          {status.icon && <span>{status.icon}</span>}
          <span>{status.label}</span>
        </span>
      );
    }

    // Labels field - show existing labels with + button for all entity types
    if (field === 'labels') {
      // Determine entity type and ID based on CURRENT VIEW LEVEL
      let entityId: string | undefined;
      let entityName: string;
      let entityType: 'campaign' | 'adset' | 'ad';

      // ✅ Use viewLevel to determine entity type (more reliable than row.level)
      if (viewLevel === 'campaign') {
        entityType = 'campaign';
        entityId = row.campaign_id;
        entityName = row.campaign_name || row.name;
      } else if (viewLevel === 'adset') {
        entityType = 'adset';
        entityId = row.adset_id;
        entityName = row.adset_name || row.name;
      } else { // viewLevel === 'ad'
        entityType = 'ad';
        entityId = row.ad_id;
        entityName = row.ad_name || row.name;
      }

      // If no entity ID found, just show the assign button anyway
      if (!entityId) {
        console.warn('⚠️ No valid entity ID found for labels field:', {
          viewLevel,
          row: {
            campaign_id: row.campaign_id,
            adset_id: row.adset_id,
            ad_id: row.ad_id,
            name: row.name
          }
        });
        // Don't return '-', still show the component for debugging
      }

      // ✅ Debug logging

      // Get labels for this entity
      const rowAssignments = labelAssignments.filter(a => {
        const match = entityType === 'campaign'
          ? String(a.campaign_id) === String(entityId)
          : entityType === 'adset'
            ? String(a.adset_id) === String(entityId)
            : String(a.ad_id) === String(entityId);

        // if (match) {
        // }

        // Debug first row only
        // if (entityType === 'campaign') {
        // }
        return match;
      });



      const rowLabels = rowAssignments
        .map(assignment => labels.find(l => String(l.Id) === String(assignment.label_id)))
        .filter((l): l is CampaignLabel => l !== undefined);



      return (
        <div className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
          <QuickAssignLabelsPopover
            labels={labels}
            entityId={entityId || ''}
            entityName={entityName}
            entityType={entityType}
            currentLabelIds={rowLabels.map(l => l.Id).filter((id): id is number => id !== undefined)}
            onAssignLabels={handleQuickAssignLabelsFromPopover}
          />
          {rowLabels.map((label, labelIndex) => (
            <Badge
              key={`${label.Id}-${labelIndex}`}
              style={{ backgroundColor: label.label_color }}
              className="text-white text-xs px-2 py-0.5 pr-0 flex items-center gap-1"
            >
              <span>{label.label_name}</span>
              <button
                onClick={(e) => handleRemoveLabelBadge(e, entityId || '', entityType, label.Id)}
                className="ml-0.5 hover:bg-black/20 rounded-full p-0.5 transition-colors"
                title="Xóa nhãn"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      );
    }

    // Campaign name in blue
    if (field === 'campaign_name' && value) {
      return <span className="text-blue-600 font-medium">{value}</span>;
    }

    // Adset name in blue  
    if (field === 'adset_name' && value) {
      return <span className="text-blue-600 font-medium">{value}</span>;
    }

    // ========== JSONB Extraction Logic ==========

    // Extract messaging connections from actions JSONB
    if (field === 'messaging_connections') {
      const actions = row?.actions;
      if (Array.isArray(actions)) {
        const messagingAction = actions.find(
          (a: any) => a.action_type === 'onsite_conversion.total_messaging_connection'
        );
        if (messagingAction) {
          return new Intl.NumberFormat('vi-VN').format(Number(messagingAction.value));
        }
      }
      return '-';
    }

    // Extract cost_per_link_click from cost_per_action_type JSONB
    if (field === 'cost_per_link_click') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) => a.action_type === 'link_click');
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_post_engagement from cost_per_action_type JSONB
    if (field === 'cost_per_post_engagement') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) => a.action_type === 'post_engagement');
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_video_view from cost_per_action_type JSONB
    if (field === 'cost_per_video_view') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) => a.action_type === 'video_view');
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_post_reaction from cost_per_action_type JSONB
    if (field === 'cost_per_post_reaction') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) => a.action_type === 'post_reaction');
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_page_engagement from cost_per_action_type JSONB
    if (field === 'cost_per_page_engagement') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) => a.action_type === 'page_engagement');
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_messaging_welcome_message_view from cost_per_action_type JSONB
    if (field === 'cost_per_messaging_welcome_message_view') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) =>
          a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
          a.action_type === 'onsite_conversion.messaging_welcome_message_view'
        );
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_messaging_first_reply from cost_per_action_type JSONB
    if (field === 'cost_per_messaging_first_reply') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) =>
          a.action_type === 'onsite_conversion.messaging_first_reply'
        );
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_messaging_user_depth_2 from cost_per_action_type JSONB
    if (field === 'cost_per_messaging_user_depth_2') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) =>
          a.action_type === 'onsite_conversion.messaging_user_depth_2_message'
        );
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract cost_per_post_interaction_gross from cost_per_action_type JSONB
    if (field === 'cost_per_post_interaction_gross') {
      const costActions = row?.cost_per_action_type;
      if (Array.isArray(costActions)) {
        const action = costActions.find((a: any) =>
          a.action_type === 'post' || a.action_type === 'post_interaction_gross'
        );
        if (action) {
          const numValue = Math.round(Number(action.value));
          return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(numValue) + ' ₫';
        }
      }
      return '-';
    }

    // Extract video metrics from video_play_actions, video_p25_watched_actions, etc.
    if (['video_play_actions', 'video_p25_watched_actions', 'video_p50_watched_actions',
      'video_p75_watched_actions', 'video_p100_watched_actions'].includes(field)) {
      const videoData = row?.[field];
      if (Array.isArray(videoData) && videoData.length > 0) {
        const total = videoData.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0);
        return new Intl.NumberFormat('vi-VN').format(Math.round(total));
      }
      return '-';
    }

    // Normalize API list metrics e.g. results, cost_per_result may come as [{ action_type, value }]
    if ((field === 'results' || field === 'cost_per_result' || field === 'results_messaging_replied_7d' || field === 'cost_per_messaging_replied_7d') && Array.isArray(value)) {
      value = Number(value[0]?.value ?? 0);
    }
    if ((field === 'results' || field === 'cost_per_result' || field === 'results_messaging_replied_7d' || field === 'cost_per_messaging_replied_7d') && typeof value === 'string') {
      const n = Number(value);
      value = isNaN(n) ? value : n;
    }

    // 🔥 Guard against NaN/Infinity for all numeric fields
    if (typeof value === 'number' || typeof value === 'string') {
      const numValue = Number(value);
      if (!isFinite(numValue)) {
        return '-';
      }
    }

    // Format currency fields (VND) - ALWAYS round to integer, NO decimals
    if ([
      'spend', 'budget', 'daily_budget', 'weekly_budget', 'monthly_budget', 'quarterly_budget', 'yearly_budget',
      'cost_per_result', 'cost_per_thruplay', 'cpc', 'cpm', 'cpp', 'cost_per_unique_click',
      'cost_per_phone', 'cost_per_messaging_replied_7d', 'cost_per_started_7d',
      'cost_per_total_messaging_connection', 'cost_per_action_type', 'cost_per_inline_link_click',
      'cost_per_inline_post_engagement', 'cost_per_outbound_click', 'cost_per_unique_outbound_click'
    ].includes(field)) {
      // ✅ Fallback: Try amount_spent/total_spend if spend is missing
      let actualValue = value;
      if ((actualValue === null || actualValue === undefined) && row) {
        actualValue = row.amount_spent ?? row.total_spend;
      }

      if (actualValue === null || actualValue === undefined) {
        return '-';
      }

      const numValue = Math.round(Number(actualValue)); // Force integer
      return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue) + ' ₫';
    }

    // Format number fields - ALWAYS round to integer, with thousand separator
    if ([
      'impressions', 'reach', 'clicks', 'results', 'messaging_connections', 'phones',
      'results_messaging_replied_7d', 'unique_clicks', 'inline_link_clicks', 'unique_inline_link_clicks',
      'outbound_clicks', 'unique_outbound_clicks', 'video_views', 'video_30_sec_watched_actions',
      'post_engagements', 'page_engagement', 'post_reactions', 'post_shares', 'post_comments'
    ].includes(field)) {
      const numValue = Math.round(Number(value)); // Force integer
      return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(numValue);
    }

    // Format percentage fields - Keep 2 decimals, remove trailing .00
    if (['ctr', 'frequency', 'unique_ctr', 'unique_inline_link_click_ctr'].includes(field)) {
      const numValue = Number(value);
      if (!isFinite(numValue)) return '0%';
      const formatted = numValue.toFixed(2).replace(/\.00$/, ''); // Bỏ .00 nếu là số nguyên
      return `${formatted}%`;
    }

    // Format date fields
    if (['date_start', 'date_stop'].includes(field)) {
      return new Date(value).toLocaleDateString('vi-VN');
    }

    // Format JSON fields - show count or summary
    if (['actions', 'cost_per_action_type', 'video_p25_watched_actions',
      'video_p50_watched_actions', 'video_p75_watched_actions',
      'video_p100_watched_actions', 'video_play_actions'].includes(field)) {
      if (Array.isArray(value)) {
        return `${value.length} hành động`;
      }
      return '-';
    }

    // Format ROAS (keep 2 decimals, remove trailing .00)
    if (field === 'purchase_roas') {
      if (Array.isArray(value) && value.length > 0) {
        const roasValue = Number(value[0].value);
        if (!isFinite(roasValue)) return '-';
        return roasValue.toFixed(2).replace(/\.00$/, '');
      }
      return '-';
    }

    // Format action_values (show total or first value)
    if (field === 'action_values') {
      if (Array.isArray(value) && value.length > 0) {
        const total = value.reduce((sum: number, item: any) => sum + (Number(item.value) || 0), 0);
        const numValue = Math.round(total);
        return new Intl.NumberFormat('vi-VN', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numValue) + ' ₫';
      }
      return '-';
    }

    // Format Rankings with badges
    if (['quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking'].includes(field)) {
      if (!value) return '-';

      // Define colors for rankings
      const colors: Record<string, string> = {
        'ABOVE_AVERAGE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'AVERAGE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        'BELOW_AVERAGE': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };

      const labels: Record<string, string> = {
        'ABOVE_AVERAGE': 'Cao',
        'AVERAGE': 'Trung bình',
        'BELOW_AVERAGE': 'Thấp',
      };

      const colorClass = colors[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      const label = labels[value] || value;

      return (
        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}>
          {label}
        </span>
      );
    }

    return value;
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort logic using useMemo for optimization
  const filteredAndSortedInsights = useMemo(() => {
    let filtered = insights;

    // ✅ CRITICAL: Filter by explicit 'level' field to prevent data mixing
    // This ensures we only show data for the current view level

    // ✅ Filter by breadcrumb hierarchy dynamically
    const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];


    if (currentBreadcrumb.level === 'campaign' && !currentBreadcrumb.parentId) {
      // Root campaign view - show all campaigns


      // ✅ Auto-fix missing level and filter strictly by level
      const allCampaigns = filtered.filter((i) => {
        // Auto-fix missing level based on entity IDs
        if (!i.level) {
          i.level = i.ad_id ? 'ad' : i.adset_id ? 'adset' : 'campaign';
        }
        return i.level === 'campaign';
      });

      // Get campaigns from both sources (include ALL campaigns)
      const insightCampaignIds = allCampaigns.map(i => i.campaign_id).filter(Boolean);
      const catalogCampaignIds = campaignCatalog
        .map(c => c.id)
        .filter(Boolean);
      const uniqueCampaignIds = Array.from(new Set([...catalogCampaignIds, ...insightCampaignIds]));


      // Filter data by date range if selected
      let dateFilteredData = filtered;
      if (dateRange?.from && dateRange?.to) {
        dateFilteredData = filtered.filter((insight) => {
          if (!insight.date_start) return false;
          const start = startOfDay(dateRange.from!);
          const end = endOfDay(dateRange.to!);
          const insightDate = parseISO(insight.date_start);
          return isWithinInterval(insightDate, {
            start,
            end,
          });
        });

      }

      // Group by campaign_id and aggregate metrics (only from filtered date range)
      // Get unique insights after deduplication - NO AGGREGATION
      // Group by campaign_id and aggregate metrics (only from filtered date range)
      // Get unique insights after deduplication - NO AGGREGATION
      // Group by campaign_id and aggregate metrics (only from filtered date range)
      // Get unique insights after deduplication - NO AGGREGATION
      let campaignInsights = dateFilteredData.filter(i => {
        if (i.level) return i.level === 'campaign';
        return i.campaign_id && !i.adset_id && !i.ad_id;
      });

      // ✅ FIXED AGGREGATION: Always check for Ad-Level insights to fill gaps
      // (Previous logic only checked ads if NO campaign insights existed at all, causing data loss)
      const adInsights = dateFilteredData.filter(i => i.level === 'ad');

      if (adInsights.length > 0) {
        const campaignDailyMap: Record<string, any> = {};

        // Metrics to sum
        const SUM_FIELDS = [
          'spend', 'impressions', 'clicks', 'reach', 'results',
          'results_messaging_replied_7d', 'started_7d', 'total_messaging_connection',
          'link_click', 'messaging_welcome_message_view', 'post_engagement_action',
          'messaging_first_reply', 'video_view', 'page_engagement_action',
          'replied_7d', 'depth_2_message', 'depth_3_message'
        ];

        for (const ad of adInsights) {
          // Key by campaign_id + date_start
          const key = `${ad.campaign_id}_${ad.date_start}`;

          if (!campaignDailyMap[key]) {
            // Initialize with first ad's metadata
            campaignDailyMap[key] = {
              ...ad,
              level: 'campaign', // Promote to campaign level
              ad_id: undefined,
              ad_name: undefined,
              adset_id: undefined,
              adset_name: undefined,
              // Initialize sum fields to 0
              ...SUM_FIELDS.reduce((acc, field) => ({ ...acc, [field]: 0 }), {})
            };
          }

          // Sum metrics
          const camp = campaignDailyMap[key];
          SUM_FIELDS.forEach(field => {
            camp[field] += Number(ad[field]) || 0;
          });
        }

        // Calculate derived metrics for aggregated rows
        const aggregatedCampaignInsights = Object.values(campaignDailyMap).map((camp: any) => {
          // Cost per result
          if (camp.results > 0) camp.cost_per_result = camp.spend / camp.results;
          else camp.cost_per_result = 0;

          // Cost per messaging replied
          if (camp.results_messaging_replied_7d > 0) {
            camp.cost_per_messaging_replied_7d = camp.spend / camp.results_messaging_replied_7d;
          } else {
            camp.cost_per_messaging_replied_7d = 0;
          }
          return camp;
        });

        // Merge Strategy: Add aggregated rows ONLY if campaign-level row doesn't exist for that day
        const existingKeys = new Set(campaignInsights.map(i => `${i.campaign_id}_${i.date_start}`));

        aggregatedCampaignInsights.forEach(agg => {
          const key = `${agg.campaign_id}_${agg.date_start}`;
          if (!existingKeys.has(key)) {
            campaignInsights.push(agg);
          }
        });
      }

      // Deduplicate by unique key: campaign_id + date_start + level
      const deduped = campaignInsights.reduce((acc, insight) => {
        const normalizedDate = insight.date_start?.split(/[T ]/)[0];
        const key = `${insight.campaign_id}_${normalizedDate}_${insight.level || 'campaign'}`;

        if (!acc[key]) {
          acc[key] = insight;
        } else {
          // Keep the one with most recent CreatedAt if duplicate (though our set logic handles overlap)
          const existingDate = new Date(acc[key].CreatedAt || acc[key].created_at || 0);
          const newDate = new Date(insight.CreatedAt || insight.created_at || 0);
          if (newDate > existingDate) {
            acc[key] = insight;
          }
        }
        return acc;
      }, {} as Record<string, any>);


      // ✅ NEW AGGREGATION STRATEGY:
      // 1. Get all daily records for campaign level
      const campaignDailyRecords = Object.values(deduped);

      // 2. Also get aggregated daily records from ADSET level (as a backup/source of truth)
      // This is crucial because sometimes campaign level data is missing or delayed
      const adsetInsights = dateFilteredData.filter(i => i.level === 'adset');
      const adsetAggregatedMap: Record<string, any> = {};

      // Metrics to sum
      const SUM_FIELDS_ADSET = [
        'spend', 'impressions', 'clicks', 'reach', 'results',
        'results_messaging_replied_7d', 'started_7d', 'total_messaging_connection',
        'link_click', 'messaging_welcome_message_view', 'post_engagement_action',
        'messaging_first_reply', 'video_view', 'page_engagement_action',
        'replied_7d', 'depth_2_message', 'depth_3_message'
      ];

      for (const adset of adsetInsights) {
        const key = `${adset.campaign_id}_${adset.date_start?.split(/[T ]/)[0]}`;
        if (!adsetAggregatedMap[key]) {
          adsetAggregatedMap[key] = {
            ...adset,
            level: 'campaign', // Treat as campaign level for merging
            adset_id: undefined,
            adset_name: undefined,
            ...SUM_FIELDS_ADSET.reduce((acc, field) => ({ ...acc, [field]: 0 }), {})
          };
        }
        const item = adsetAggregatedMap[key];
        SUM_FIELDS_ADSET.forEach(field => {
          item[field] += Number(adset[field]) || 0;
        });
      }

      // 3. Merge Campaign Level Data with Aggregated Adset Data
      // Priority: If Campaign Level data exists and has spend > 0, use it.
      // If not, use Aggregated Adset data.

      const mergedDailyMap: Record<string, any> = {};

      // First, populate with aggregated adset data (base layer)
      Object.entries(adsetAggregatedMap).forEach(([key, val]) => {
        mergedDailyMap[key] = val;
      });

      // Then, override with actual campaign level data IF it looks valid (has spend)
      campaignDailyRecords.forEach((camp: any) => {
        const key = `${camp.campaign_id}_${camp.date_start?.split(/[T ]/)[0]}`;
        // Only override if campaign record has meaningful data or if we don't have adset data
        if (!mergedDailyMap[key] || (Number(camp.spend) > 0)) {
          mergedDailyMap[key] = camp;
        }
      });

      const uniqueDailyInsights = Object.values(mergedDailyMap);

      // ✅ AGGREGATE BY CAMPAIGN_ID
      // User wants to see 1 row per campaign, not daily rows
      const aggregatedCampaigns = uniqueDailyInsights.reduce((acc, insight: any) => {
        const campaignId = insight.campaign_id;
        if (!campaignId) return acc; // Skip if no campaign_id

        if (!acc[campaignId]) {
          // Initialize with the first record found (for static fields like name, status)
          acc[campaignId] = { ...insight };
          // Reset metrics to 0 for accumulation
          acc[campaignId].impressions = 0;
          acc[campaignId].clicks = 0;
          acc[campaignId].spend = 0;
          acc[campaignId].reach = 0;
          acc[campaignId].results = 0;
          acc[campaignId].results_messaging_replied_7d = 0;
          acc[campaignId].started_7d = 0;
          acc[campaignId].total_messaging_connection = 0;
          acc[campaignId].link_click = 0;
          acc[campaignId].messaging_welcome_message_view = 0;
          acc[campaignId].post_engagement_action = 0;
          acc[campaignId].messaging_first_reply = 0;
          acc[campaignId].video_view = 0;
          acc[campaignId].page_engagement_action = 0;
          acc[campaignId].replied_7d = 0;
          acc[campaignId].depth_2_message = 0;
          acc[campaignId].depth_3_message = 0;
        }

        // Accumulate metrics
        const current = acc[campaignId];
        current.impressions += Number(insight.impressions) || 0;
        current.clicks += Number(insight.clicks) || 0;
        current.spend += Number(insight.spend) || 0;
        // Reach: Summing daily reach is an approximation but standard for simple views
        current.reach += Number(insight.reach) || 0;

        current.results += Number(insight.results) || 0;
        current.results_messaging_replied_7d += Number(insight.results_messaging_replied_7d) || 0;

        // Accumulate other action values
        current.started_7d += Number(insight.started_7d) || 0;
        current.total_messaging_connection += Number(insight.total_messaging_connection) || 0;
        current.link_click += Number(insight.link_click) || 0;
        current.messaging_welcome_message_view += Number(insight.messaging_welcome_message_view) || 0;
        current.post_engagement_action += Number(insight.post_engagement_action) || 0;
        current.messaging_first_reply += Number(insight.messaging_first_reply) || 0;
        current.video_view += Number(insight.video_view) || 0;
        current.page_engagement_action += Number(insight.page_engagement_action) || 0;
        current.replied_7d += Number(insight.replied_7d) || 0;
        current.depth_2_message += Number(insight.depth_2_message) || 0;
        current.depth_3_message += Number(insight.depth_3_message) || 0;

        return acc;
      }, {} as Record<string, any>);

      const uniqueInsights = Object.values(aggregatedCampaigns);

      // ✅ Thêm pseudo-insights cho campaigns chỉ có trong catalog (chưa có insights)
      // Filter out DELETED and ARCHIVED campaigns to avoid cluttering the view
      const uniqueInsightCampaignIdsSet = new Set(uniqueInsights.map((i: any) => String(i.campaign_id)));

      const filteredCatalogCampaigns = (campaignCatalog || []).filter(catalog =>
        !uniqueInsightCampaignIdsSet.has(String(catalog.id))
        // Show ALL campaigns including DELETED/ARCHIVED as per user request
      );

      // ✅ DEBUG: Comprehensive logging to trace campaign filtering


      // ✅ Thêm pseudo-insights cho campaigns chỉ có trong catalog (chưa có insights)
      // Filter out DELETED and ARCHIVED campaigns to avoid cluttering the view
      // (Already filtered above in filteredCatalogCampaigns)

      // Map insights and calculate derived metrics for each record (NO AGGREGATION)
      const insightRecords = uniqueInsights.map((insight: any) => {
        const campaignId = insight.campaign_id;
        const catalog = (campaignCatalog || []).find(c => String(c.id) === String(campaignId));

        // DEBUG: Log mismatch for specific campaign
        // if (insight.campaign_name?.includes('test 8')) {
        // }

        const isDeleted = catalog?.is_deleted ||
          catalog?.effective_status === 'DELETED' ||
          (!catalog && insight?.effective_status === 'DELETED');

        let effectiveStatus = isDeleted ? 'DELETED' : (catalog?.effective_status || insight.effective_status);

        // ✅ Force consistency with Toggle (rowStatuses)
        if (rowStatuses[campaignId] !== undefined) {
          const isActive = rowStatuses[campaignId];
          if (isActive && effectiveStatus === 'PAUSED') effectiveStatus = 'ACTIVE';
          if (!isActive && effectiveStatus === 'ACTIVE') effectiveStatus = 'PAUSED';
        }

        // Calculate budget from insight (Backend) ONLY
        // User request: "lấy từ backen cột ngân sách hàng ngày... Nếu không có thì 0"
        const dailyBudgetVal = insight.daily_budget ? Number(insight.daily_budget) : 0;
        let rawBudget = !isNaN(dailyBudgetVal) ? dailyBudgetVal : 0;

        // ✅ ABO Fallback: If campaign budget is 0, sum active adset budgets
        let isABO = false;
        if (rawBudget === 0 && catalog) {
          const campaignAdsets = (adsetCatalog || []).filter(a =>
            a.campaign_id === campaignId &&
            a.status !== 'DELETED' &&
            a.status !== 'ARCHIVED'
          );

          const adsetsDailyBudget = campaignAdsets.reduce((sum, a) => {
            return sum + (a.daily_budget ? Number(a.daily_budget) : 0);
          }, 0);

          if (adsetsDailyBudget > 0) {
            rawBudget = adsetsDailyBudget;
            isABO = true;
          }
        }

        const catalogBudget = accountCurrency === 'VND' ? rawBudget : rawBudget / 100;

        // Calculate period budgets based on daily budget
        const dailyBudget = insight.daily_budget ? (accountCurrency === 'VND' ? Number(insight.daily_budget) : Number(insight.daily_budget) / 100) : 0;
        const weeklyBudget = dailyBudget * 7;
        const monthlyBudget = dailyBudget * 30;
        const quarterlyBudget = dailyBudget * 90;
        const yearlyBudget = dailyBudget * 365;

        const record: any = {
          ...insight,
          id: insight.id || `campaign_${insight.campaign_id}_${insight.date_start}`,
          campaign_name: catalog?.name || insight.campaign_name,
          level: 'campaign' as 'campaign',
          // IMPORTANT: Keep original status if no catalog found (don't default to ACTIVE)
          effective_status: effectiveStatus,
          status: catalog?.status || insight.status,
          is_deleted: isDeleted,
          budget: catalogBudget || 0,
          budget_type: isABO ? 'daily' : (insight.daily_budget ? 'daily' : 'lifetime'),
          daily_budget: insight.daily_budget, // Ensure these exist
          lifetime_budget: insight.lifetime_budget,
          weekly_budget: weeklyBudget,
          monthly_budget: monthlyBudget,
          quarterly_budget: quarterlyBudget,
          yearly_budget: yearlyBudget,
          _isDeleted: isDeleted,
          ctr: 0,
          cpm: 0,
          cpc: 0,
          cpp: 0,
          cost_per_result: 0,
          cost_per_messaging_replied_7d: 0,
          frequency: 0
        };

        // Calculate rates based on this record's values
        if (record.impressions > 0) {
          record.ctr = (record.clicks / record.impressions) * 100;
          record.cpm = (record.spend / record.impressions) * 1000;
        }
        if (record.clicks > 0) {
          record.cpc = record.spend / record.clicks;
        }

        // Sync results with started_7d if needed
        // FIX: Do NOT force started_7d if results is missing.
        // If results is 0/null, try to recalculate from objective-specific columns if available in the flattened record
        if (record.results === undefined || record.results === null || record.results === 0) {
          // Try to find result based on objective
          const obj = record.objective || 'MESSAGES';
          const preferredActions = OBJECTIVE_ACTION_MAP[obj] || [];
          let calculatedResults = 0;

          // ✅ FIX: Prioritize messaging metrics which are often flattened differently
          const mess = Number(record.results_messaging_replied_7d) || 0;
          const start = Number(record.started_7d) || 0;

          if (mess > 0) calculatedResults = mess;
          else if (start > 0) calculatedResults = start;
          else {
            // ... existing fallback ...
            if (['REACH', 'OUTCOME_AWARENESS', 'AWARENESS'].includes(obj)) {
              calculatedResults = Number(record.reach) || 0;
            } else {
              for (const action of preferredActions) {
                // Check flattened columns first (e.g. 'purchase', 'lead')
                // Handle specific complex keys that might be flattened differently
                let val = 0;
                if (action === 'onsite_conversion.messaging_conversation_started_7d') val = Number(record['started_7d']) || Number(record['onsite_conversion.messaging_conversation_started_7d']);
                else if (action === 'onsite_conversion.messaging_first_reply') val = Number(record['messaging_first_reply']) || Number(record['onsite_conversion.messaging_first_reply']);
                else if (action === 'onsite_conversion.total_messaging_connection') val = Number(record['total_messaging_connection']) || Number(record['onsite_conversion.total_messaging_connection']);
                else val = Number(record[action]);

                if (!isNaN(val) && val > 0) {
                  calculatedResults = val;
                  break;
                }
              }
            }
          }

          if (calculatedResults > 0) {
            record.results = calculatedResults;
          } else if (record.results === undefined || record.results === null) {
            record.results = 0;
          }
        }

        // Calculate cost_per_result
        if (record.results > 0) {
          record.cost_per_result = record.spend > 0 ? record.spend / record.results : 0;
        } else {
          record.cost_per_result = 0;
        }
        if (record.results_messaging_replied_7d > 0) {
          record.cost_per_messaging_replied_7d = record.spend / record.results_messaging_replied_7d;
        }
        if (record.reach > 0) {
          record.frequency = record.impressions / record.reach;
          record.cpp = record.spend / record.reach;
        }


        return record;
      });

      // ✅ Thêm pseudo-insights cho campaigns chỉ có trong catalog (chưa có insights)
      const pseudoInsights = filteredCatalogCampaigns.map(catalog => {
        // ✅ Use daily_budget and lifetime_budget directly from catalog
        const dailyBudgetVal = catalog.daily_budget ? Number(catalog.daily_budget) : 0;
        let rawBudget = !isNaN(dailyBudgetVal) ? dailyBudgetVal : 0;

        // ✅ ABO Fallback for Pseudo-campaigns
        let isABO = false;
        if (rawBudget === 0) {
          const campaignAdsets = (adsetCatalog || []).filter(a =>
            a.campaign_id === catalog.id &&
            a.status !== 'DELETED' &&
            a.status !== 'ARCHIVED'
          );

          const adsetsDailyBudget = campaignAdsets.reduce((sum, a) => {
            return sum + (a.daily_budget ? Number(a.daily_budget) : 0);
          }, 0);

          if (adsetsDailyBudget > 0) {
            rawBudget = adsetsDailyBudget;
            isABO = true;
          }
        }

        const catalogBudget = accountCurrency === 'VND' ? rawBudget : rawBudget / 100;

        // Calculate period budgets based on daily budget
        const dailyBudget = catalog.daily_budget ? (accountCurrency === 'VND' ? Number(catalog.daily_budget) : Number(catalog.daily_budget) / 100) : 0;
        const weeklyBudget = dailyBudget * 7;
        const monthlyBudget = dailyBudget * 30;
        const quarterlyBudget = dailyBudget * 90;
        const yearlyBudget = dailyBudget * 365;

        return {
          id: `pseudo_campaign_${catalog.id}`,
          campaign_id: catalog.id,
          campaign_name: catalog.name,
          effective_status: (() => {
            let status = catalog.effective_status;
            if (rowStatuses[String(catalog.id)] !== undefined) {
              const isActive = rowStatuses[String(catalog.id)];
              if (isActive && status === 'PAUSED') status = 'ACTIVE';
              if (!isActive && status === 'ACTIVE') status = 'PAUSED';
            }
            return status;
          })(),
          status: catalog.status,
          level: 'campaign' as 'campaign',
          budget: catalogBudget,
          budget_type: isABO ? 'daily' : (catalog.daily_budget ? 'daily' : 'lifetime'),
          daily_budget: catalog.daily_budget, // Add these for consistency
          lifetime_budget: catalog.lifetime_budget,
          weekly_budget: weeklyBudget,
          monthly_budget: monthlyBudget,
          quarterly_budget: quarterlyBudget,
          yearly_budget: yearlyBudget,
          impressions: 0,
          clicks: 0,
          spend: 0,
          reach: 0,
          results: 0,
          results_messaging_replied_7d: 0,
          ctr: 0,
          cpm: 0,
          cpc: 0,
          cpp: 0,
          cost_per_result: 0,
          cost_per_messaging_replied_7d: 0,
          frequency: 0,
          date_start: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          date_stop: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          _isPseudo: true
        };
      });

      // Merge insights + pseudo-insights
      filtered = [...insightRecords, ...pseudoInsights];


      // Do NOT filter out any campaigns here - let status filter handle it

      // ✅ Sort: 4-tier priority system
      // Priority 1: ACTIVE
      // Priority 2: PAUSED, CAMPAIGN_PAUSED, ADSET_PAUSED
      // Priority 3: ARCHIVED, IN_PROCESS, WITH_ISSUES, PENDING_*, DISAPPROVED
      // Priority 4: DELETED (cuối cùng)
      filtered.sort((a, b) => {
        const getPriority = (status: string) => {
          if (status === 'DELETED') return 4; // Cuối cùng
          if (status === 'PAUSED' || status === 'CAMPAIGN_PAUSED' || status === 'ADSET_PAUSED') return 2;
          if (status === 'ARCHIVED' || status === 'IN_PROCESS' || status === 'WITH_ISSUES' ||
            status?.startsWith('PENDING_') || status === 'DISAPPROVED') return 3;
          return 1; // ACTIVE or other
        };

        const aPriority = getPriority(a.effective_status || 'ACTIVE');
        const bPriority = getPriority(b.effective_status || 'ACTIVE');

        return aPriority - bPriority;
      });


    } else if (currentBreadcrumb.level === 'adset') {
      // Adset view - show all adsets or filter by parent campaign

      if (currentBreadcrumb.parentId === 'EMPTY') {
        filtered = [];
      } else {
        // ✅ NEW APPROACH: Always show ALL adsets from catalog (including DELETED, ARCHIVED, etc.)
        // Step 1: Get adsets from catalog - filter by campaign if parentId specified, otherwise show ALL
        const allAdsets = currentBreadcrumb.parentId
          ? adsetCatalog.filter(a => String(a.campaign_id) === String(currentBreadcrumb.parentId))
          : adsetCatalog; // ✅ Show ALL adsets when parentId is null


        // Step 2: Filter insights by date range (for metrics only)
        let dateFilteredInsights = insights;
        if (dateRange?.from && dateRange?.to) {
          dateFilteredInsights = insights.filter((insight) => {
            if (!insight.date_start) return false;
            const start = startOfDay(dateRange.from!);
            const end = endOfDay(dateRange.to!);
            const dateStr = insight.date_start?.split(/[T ]/)[0]; // Handle 'T' or space
            if (!dateStr) return false;
            const insightDate = parseISO(dateStr);
            return isWithinInterval(insightDate, { start, end });
          });

        }

        // Step 3: Get adset-level insights for this campaign
        let adsetInsights = dateFilteredInsights.filter((i) => {
          // Auto-fix missing level
          if (!i.level) {
            i.level = i.ad_id ? 'ad' : i.adset_id ? 'adset' : 'campaign';
          }
          return i.level === 'adset' && String(i.campaign_id) === String(currentBreadcrumb.parentId);
        });

        // ✅ FALLBACK: If no adset level insights found, aggregate from AD level
        if (adsetInsights.length === 0) {
          const adInsights = dateFilteredInsights.filter(i =>
            i.level === 'ad' && String(i.campaign_id) === String(currentBreadcrumb.parentId)
          );

          if (adInsights.length > 0) {
            const adsetDailyMap: Record<string, any> = {};

            // Metrics to sum
            const SUM_FIELDS = [
              'spend', 'impressions', 'clicks', 'reach', 'results',
              'results_messaging_replied_7d', 'started_7d', 'total_messaging_connection',
              'link_click', 'messaging_welcome_message_view', 'post_engagement_action',
              'messaging_first_reply', 'video_view', 'page_engagement_action',
              'replied_7d', 'depth_2_message', 'depth_3_message'
            ];

            for (const ad of adInsights) {
              // Key by adset_id + date_start
              const key = `${ad.adset_id}_${ad.date_start}`;

              if (!adsetDailyMap[key]) {
                // Initialize with first ad's metadata
                adsetDailyMap[key] = {
                  ...ad,
                  level: 'adset',
                  ad_id: undefined,
                  ad_name: undefined,
                  // Initialize sum fields to 0
                  ...SUM_FIELDS.reduce((acc, field) => ({ ...acc, [field]: 0 }), {})
                };
              }

              // Sum metrics
              const item = adsetDailyMap[key];
              SUM_FIELDS.forEach(field => {
                item[field] += Number(ad[field]) || 0;
              });
            }

            // Calculate derived metrics (Cost per...)
            adsetInsights = Object.values(adsetDailyMap).map((item: any) => {
              // Cost per result
              if (item.results > 0) item.cost_per_result = item.spend / item.results;
              else item.cost_per_result = 0;

              // Cost per messaging replied
              if (item.results_messaging_replied_7d > 0) {
                item.cost_per_messaging_replied_7d = item.spend / item.results_messaging_replied_7d;
              } else {
                item.cost_per_messaging_replied_7d = 0;
              }

              return item;
            });
          }
        }

        // Deduplicate insights by adset_id + date_start (keep newest by created_at)
        const dedupedAdsets = adsetInsights.reduce((acc, insight) => {
          const normalizedDate = insight.date_start?.split(/[T ]/)[0];
          const key = `${insight.adset_id}_${normalizedDate}`;

          if (!acc[key]) {
            acc[key] = insight;
          } else {
            const existingDate = new Date(acc[key].CreatedAt || acc[key].created_at || 0);
            const newDate = new Date(insight.CreatedAt || insight.created_at || 0);
            if (newDate > existingDate) {
              acc[key] = insight;
            }
          }
          return acc;
        }, {} as Record<string, any>);

        const uniqueAdsetInsights = Object.values(dedupedAdsets) as any[];


        // Step 4: Build records for ALL catalog adsets
        const parentCampaign = campaignCatalog.find(c => c.id === currentBreadcrumb.parentId);

        // ✅ MERGE catalog AND insights để hiển thị đầy đủ (cả items chỉ có trong insights)
        // Build map of all unique adset IDs from BOTH sources
        const allAdsetIds = new Set<string>();
        allAdsets.forEach(a => allAdsetIds.add(a.id));
        uniqueAdsetInsights.forEach((i: any) => allAdsetIds.add(i.adset_id));



        filtered = Array.from(allAdsetIds).map(adsetId => {
          const catalog = allAdsets.find(a => String(a.id) === String(adsetId));
          const insightsForAdset = uniqueAdsetInsights.filter((i: any) => String(i.adset_id) === String(adsetId));

          // If only insights (no catalog) - use insights data
          if (!catalog && insightsForAdset.length > 0) {
            const insight = insightsForAdset[0];
            const record: any = {
              ...insight,
              level: 'adset' as 'adset',
              adset_name: insight.adset_name || adsetId,
              campaign_name: insight.campaign_name || currentBreadcrumb.name,
              effective_status: (() => {
                let status = insight.effective_status;
                if (rowStatuses[adsetId] !== undefined) {
                  const isActive = rowStatuses[adsetId];
                  if (isActive && status === 'PAUSED') status = 'ACTIVE';
                  if (!isActive && status === 'ACTIVE') status = 'PAUSED';
                }
                return status;
              })(),
              status: insight.status,
              budget: 0,
              weekly_budget: 0,
              monthly_budget: 0,
              quarterly_budget: 0,
              yearly_budget: 0,
              ctr: 0, cpm: 0, cpc: 0, cpp: 0,
              cost_per_result: 0,
              cost_per_messaging_replied_7d: 0,
              frequency: 0
            };
            if (record.impressions > 0) {
              record.ctr = (record.clicks / record.impressions) * 100;
              record.cpm = (record.spend / record.impressions) * 1000;
            }
            if (record.clicks > 0) record.cpc = record.spend / record.clicks;
            if (record.results === undefined || record.results === null || record.results === 0) {
              const obj = record.objective || 'MESSAGES';
              const preferredActions = OBJECTIVE_ACTION_MAP[obj] || [];
              let calculatedResults = 0;

              if (['REACH', 'OUTCOME_AWARENESS', 'AWARENESS'].includes(obj)) {
                calculatedResults = Number(record.reach) || 0;
              } else {
                for (const action of preferredActions) {
                  let val = 0;
                  if (action === 'onsite_conversion.messaging_conversation_started_7d') val = Number(record['started_7d']) || Number(record['onsite_conversion.messaging_conversation_started_7d']);
                  else if (action === 'onsite_conversion.messaging_first_reply') val = Number(record['messaging_first_reply']) || Number(record['onsite_conversion.messaging_first_reply']);
                  else if (action === 'onsite_conversion.total_messaging_connection') val = Number(record['total_messaging_connection']) || Number(record['onsite_conversion.total_messaging_connection']);
                  else val = Number(record[action]);

                  if (!isNaN(val) && val > 0) {
                    calculatedResults = val;
                    break;
                  }
                }
              }
              if (calculatedResults > 0) record.results = calculatedResults;
              else if (record.results === undefined || record.results === null) record.results = 0;
            }

            if (record.results > 0) {
              record.cost_per_result = record.spend > 0 ? record.spend / record.results : 0;
            } else {
              record.cost_per_result = 0;
            }
            if (record.results_messaging_replied_7d > 0) {
              record.cost_per_messaging_replied_7d = record.spend / record.results_messaging_replied_7d;
            }
            if (record.reach > 0) {
              record.frequency = record.impressions / record.reach;
              record.cpp = record.spend / record.reach;
            }
            return record;
          }

          // Has catalog - merge with insights if available
          if (!catalog) return null; // Should never happen after ID collection

          // Calculate budget from catalog
          // console.log(`AdSet ${catalog.name} (${catalog.id}): daily=${catalog.daily_budget}, lifetime=${catalog.lifetime_budget}, parent=${parentCampaign?.name}`);

          // Robust parent campaign lookup
          const parentCampaignId = catalog.campaign_id || currentBreadcrumb.parentId;
          const effectiveParentCampaign = campaignCatalog.find(c => c.id === parentCampaignId) || parentCampaign;

          // Determine if budget is inherited based on CATALOG (Configuration)
          // If catalog has no budget, it is inherited (CBO)
          let is_budget_inherited = false;
          const catalogHasBudget = catalog.daily_budget || catalog.lifetime_budget;
          if (!catalogHasBudget && effectiveParentCampaign) {
            is_budget_inherited = true;
          }

          // Get Budget Value: Prioritize Insight (Backend) -> Then Catalog
          const insight: any = insightsForAdset[0] || {};

          // ✅ FIX: If insight is missing or has 0 budget, fallback to Catalog Budget
          let dailyBudgetVal = insight.daily_budget ? Number(insight.daily_budget) : 0;
          let lifetimeBudgetVal = insight.lifetime_budget ? Number(insight.lifetime_budget) : 0;

          // Fallback to catalog if insight values are missing/zero
          if (dailyBudgetVal === 0 && lifetimeBudgetVal === 0) {
            if (catalog.daily_budget) dailyBudgetVal = Number(catalog.daily_budget);
            if (catalog.lifetime_budget) lifetimeBudgetVal = Number(catalog.lifetime_budget);
          }

          let rawBudget = 0;
          let budget_type = 'daily';

          if (dailyBudgetVal > 0) {
            rawBudget = dailyBudgetVal;
            budget_type = 'daily';
          } else if (lifetimeBudgetVal > 0) {
            rawBudget = lifetimeBudgetVal;
            budget_type = 'lifetime';
          }

          const catalogBudget = accountCurrency === 'VND' ? rawBudget : rawBudget / 100;

          // Calculate period budgets
          const dailyBudget = !isNaN(dailyBudgetVal) ? dailyBudgetVal : 0;
          const weeklyBudget = dailyBudget * 7;
          const monthlyBudget = dailyBudget * 30;
          const quarterlyBudget = dailyBudget * 90;
          const yearlyBudget = dailyBudget * 365;

          // If no insights, return zero metrics
          if (insightsForAdset.length === 0) {
            return {
              id: `pseudo_adset_${catalog.id}`,
              user_id: insights[0]?.user_id || user?.id,
              account_id: insights[0]?.account_id,
              account_name: insights[0]?.account_name,
              campaign_id: parentCampaignId,
              campaign_name: currentBreadcrumb.name,
              adset_id: catalog.id,
              adset_name: catalog.name,
              status: catalog.status,
              effective_status: catalog.effective_status,
              level: 'adset' as 'adset',
              budget: catalogBudget,
              budget_type,
              daily_budget: 0, // No insight -> 0
              lifetime_budget: 0,
              weekly_budget: weeklyBudget,
              monthly_budget: monthlyBudget,
              quarterly_budget: quarterlyBudget,
              yearly_budget: yearlyBudget,
              date_start: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
              date_stop: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
              impressions: 0, clicks: 0, spend: 0, reach: 0,
              results: 0, results_messaging_replied_7d: 0,
              frequency: 0, cpc: 0, cpm: 0, cpp: 0,
              cost_per_unique_click: 0, ctr: 0,
              cost_per_result: 0, cost_per_messaging_replied_7d: 0,
              cost_per_thruplay: 0,
              _isPseudo: true,
              is_budget_inherited
            } as any;
          }

          // Has insights - merge with catalog
          // const insight is already defined above
          const record: any = {
            ...insight,
            level: 'adset' as 'adset',
            adset_name: catalog.name,
            campaign_id: parentCampaignId,
            campaign_name: currentBreadcrumb.name,
            effective_status: (() => {
              // Calculate Configured Status (Button State)
              // If rowStatuses has override -> Use it. Else use catalog.status
              const isLocallyActive = rowStatuses[catalog.id] !== undefined ? rowStatuses[catalog.id] : catalog.status === 'ACTIVE';
              const configuredStatus = isLocallyActive ? 'ACTIVE' : 'PAUSED';

              // Get Parent Status (Campaign)
              const parentStatus = effectiveParentCampaign?.effective_status;

              return computeDerivedEffectiveStatus(
                catalog.effective_status || insight.effective_status,
                configuredStatus,
                parentStatus
              );
            })(),
            status: catalog.status,
            budget: catalogBudget,
            budget_type,
            daily_budget: insight.daily_budget,
            lifetime_budget: insight.lifetime_budget,
            weekly_budget: weeklyBudget,
            monthly_budget: monthlyBudget,
            quarterly_budget: quarterlyBudget,
            yearly_budget: yearlyBudget,
            ctr: 0, cpm: 0, cpc: 0, cpp: 0,
            cost_per_result: 0,
            cost_per_messaging_replied_7d: 0,
            frequency: 0,
            is_budget_inherited
          };

          if (record.impressions > 0) {
            record.ctr = (record.clicks / record.impressions) * 100;
            record.cpm = (record.spend / record.impressions) * 1000;
          }
          if (record.clicks > 0) record.cpc = record.spend / record.clicks;
          if (record.results === undefined || record.results === null || record.results === 0) {
            const obj = record.objective || 'MESSAGES';
            const preferredActions = OBJECTIVE_ACTION_MAP[obj] || [];
            let calculatedResults = 0;

            if (['REACH', 'OUTCOME_AWARENESS', 'AWARENESS'].includes(obj)) {
              calculatedResults = Number(record.reach) || 0;
            } else {
              for (const action of preferredActions) {
                let val = 0;
                if (action === 'onsite_conversion.messaging_conversation_started_7d') val = Number(record['started_7d']) || Number(record['onsite_conversion.messaging_conversation_started_7d']);
                else if (action === 'onsite_conversion.messaging_first_reply') val = Number(record['messaging_first_reply']) || Number(record['onsite_conversion.messaging_first_reply']);
                else if (action === 'onsite_conversion.total_messaging_connection') val = Number(record['total_messaging_connection']) || Number(record['onsite_conversion.total_messaging_connection']);
                else val = Number(record[action]);

                if (!isNaN(val) && val > 0) {
                  calculatedResults = val;
                  break;
                }
              }
            }
            if (calculatedResults > 0) record.results = calculatedResults;
            else if (record.results === undefined || record.results === null) record.results = 0;
          }

          if (record.results > 0) {
            record.cost_per_result = record.spend > 0 ? record.spend / record.results : 0;
          } else {
            record.cost_per_result = 0;
          }
          if (record.results_messaging_replied_7d > 0) {
            record.cost_per_messaging_replied_7d = record.spend / record.results_messaging_replied_7d;
          }
          if (record.reach > 0) {
            record.frequency = record.impressions / record.reach;
            record.cpp = record.spend / record.reach;
          }

          return record;
        }).filter(Boolean); // Remove nulls


      }

    } else if (currentBreadcrumb.level === 'ad' && currentBreadcrumb.parentId) {
      // Ad view - filter by parent adset


      if (currentBreadcrumb.parentId === 'EMPTY') {
        filtered = [];

      } else {
        // ✅ NEW APPROACH: Always show ALL ads from catalog (including DELETED, ARCHIVED, etc.)
        // Step 1: Get ALL ads from catalog for this adset - NO STATUS FILTER
        const allAds = adCatalog.filter(a =>
          String(a.adset_id) === String(currentBreadcrumb.parentId)
        );



        // Step 2: Filter insights by date range (for metrics only)
        let dateFilteredInsights = insights;
        if (dateRange?.from && dateRange?.to) {
          dateFilteredInsights = insights.filter((insight) => {
            if (!insight.date_start) return false;
            const start = startOfDay(dateRange.from!);
            const end = endOfDay(dateRange.to!);
            const dateStr = insight.date_start?.split(/[T ]/)[0]; // Handle 'T' or space
            if (!dateStr) return false;
            const insightDate = parseISO(dateStr);
            return isWithinInterval(insightDate, { start, end });
          });


        }

        // Step 3: Get ad-level insights for this adset
        const adInsights = dateFilteredInsights.filter((i) => {
          // Auto-fix missing level
          if (!i.level) {
            i.level = i.ad_id ? 'ad' : i.adset_id ? 'adset' : 'campaign';
          }
          return i.level === 'ad' && String(i.adset_id) === String(currentBreadcrumb.parentId);
        });

        // Deduplicate insights by ad_id + date_start (keep newest by created_at)
        const dedupedAds = adInsights.reduce((acc, insight) => {
          const normalizedDate = insight.date_start?.split('T')[0];
          const key = `${insight.ad_id}_${normalizedDate}`;

          if (!acc[key]) {
            acc[key] = insight;
          } else {
            const existingDate = new Date(acc[key].CreatedAt || acc[key].created_at || 0);
            const newDate = new Date(insight.CreatedAt || insight.created_at || 0);
            if (newDate > existingDate) {
              acc[key] = insight;
            }
          }
          return acc;
        }, {} as Record<string, any>);

        const uniqueAdInsights = Object.values(dedupedAds) as any[];



        // Step 4: MERGE catalog AND insights để hiển thị đầy đủ (cả ads chỉ có trong insights)
        const allAdIds = new Set<string>();
        allAds.forEach(a => allAdIds.add(a.id));
        uniqueAdInsights.forEach((i: any) => allAdIds.add(i.ad_id));



        filtered = Array.from(allAdIds).map(adId => {
          const catalog = allAds.find(a => String(a.id) === String(adId));
          const insightsForAd = uniqueAdInsights.filter((i: any) => String(i.ad_id) === String(adId));

          // If only insights (no catalog) - use insights data
          if (!catalog && insightsForAd.length > 0) {
            const insight = insightsForAd[0];
            const record: any = {
              ...insight,
              level: 'ad' as 'ad',
              ad_name: insight.ad_name || adId,
              adset_name: insight.adset_name || currentBreadcrumb.name,
              effective_status: (() => {
                // Determine Configured Status
                const isLocallyActive = rowStatuses[adId] !== undefined ? rowStatuses[adId] : insight.status === 'ACTIVE';
                const configuredStatus = isLocallyActive ? 'ACTIVE' : 'PAUSED';

                // Determine Parent (AdSet) and GrandParent (Campaign) Statuses
                // Parent is currentBreadcrumb.parentId (AdSet)
                const parentAdSet = adsetCatalog.find(a => String(a.id) === String(currentBreadcrumb.parentId));
                const grandParentCampaign = campaignCatalog.find(c => String(c.id) === String(parentAdSet?.campaign_id));

                return computeDerivedEffectiveStatus(
                  insight.effective_status,
                  configuredStatus,
                  parentAdSet?.effective_status,
                  grandParentCampaign?.effective_status
                );
              })(),
              status: insight.status,
              ctr: 0, cpm: 0, cpc: 0, cpp: 0,
              cost_per_result: 0,
              cost_per_messaging_replied_7d: 0,
              frequency: 0
            };
            if (record.impressions > 0) {
              record.ctr = (record.clicks / record.impressions) * 100;
              record.cpm = (record.spend / record.impressions) * 1000;
            }
            if (record.clicks > 0) record.cpc = record.spend / record.clicks;
            if ((record.results === undefined || record.results === null) && record.started_7d !== undefined) {
              record.results = Number(record.started_7d) || 0;
            }
            if (record.results > 0) {
              const cps = record.cost_per_started_7d;
              record.cost_per_result = (cps !== null && cps !== undefined && !isNaN(Number(cps)))
                ? Number(cps)
                : (record.spend > 0 ? record.spend / record.results : 0);
            } else {
              record.cost_per_result = 0;
            }
            if (record.results_messaging_replied_7d > 0) {
              record.cost_per_messaging_replied_7d = record.spend / record.results_messaging_replied_7d;
            }
            if (record.reach > 0) {
              record.frequency = record.impressions / record.reach;
              record.cpp = record.spend / record.reach;
            }
            return record;
          }

          // Has catalog - merge with insights if available
          if (!catalog) return null; // Should never happen after ID collection

          // If no insights, return zero metrics
          if (insightsForAd.length === 0) {
            return {
              id: `pseudo_${catalog.id}`,
              user_id: insights[0]?.user_id || user?.id,
              account_id: insights[0]?.account_id,
              account_name: insights[0]?.account_name,
              adset_id: currentBreadcrumb.parentId,
              adset_name: currentBreadcrumb.name,
              ad_id: catalog.id,
              ad_name: catalog.name,
              status: catalog.status,
              effective_status: catalog.effective_status,
              level: 'ad' as 'ad',
              date_start: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
              date_stop: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
              impressions: 0, clicks: 0, spend: 0, reach: 0,
              results: 0, results_messaging_replied_7d: 0,
              frequency: 0, cpc: 0, cpm: 0, cpp: 0,
              cost_per_unique_click: 0, ctr: 0,
              cost_per_result: 0, cost_per_messaging_replied_7d: 0,
              cost_per_thruplay: 0,
              _isPseudo: true
            } as any;
          }

          // Has insights - merge with catalog
          const insight: any = insightsForAd[0];
          const record: any = {
            ...insight,
            level: 'ad' as 'ad',
            ad_name: catalog.name,
            adset_name: currentBreadcrumb.name,
            effective_status: catalog.effective_status,
            status: catalog.status,
            ctr: 0, cpm: 0, cpc: 0, cpp: 0,
            cost_per_result: 0,
            cost_per_messaging_replied_7d: 0,
            frequency: 0
          };

          if (record.impressions > 0) {
            record.ctr = (record.clicks / record.impressions) * 100;
            record.cpm = (record.spend / record.impressions) * 1000;
          }
          if (record.clicks > 0) record.cpc = record.spend / record.clicks;
          if ((record.results === undefined || record.results === null) && record.started_7d !== undefined) {
            record.results = Number(record.started_7d) || 0;
          }
          if (record.results > 0) {
            const cps = record.cost_per_started_7d;
            record.cost_per_result = (cps !== null && cps !== undefined && !isNaN(Number(cps)))
              ? Number(cps)
              : (record.spend > 0 ? record.spend / record.results : 0);
          } else {
            record.cost_per_result = 0;
          }
          if (record.results_messaging_replied_7d > 0) {
            record.cost_per_messaging_replied_7d = record.spend / record.results_messaging_replied_7d;
          }
          if (record.reach > 0) {
            record.frequency = record.impressions / record.reach;
            record.cpp = record.spend / record.reach;
          }

          return record;
        }).filter(Boolean); // Remove nulls


      }

    } else if (viewLevel === 'ad-daily') {
      // Ad view - filter by parent adset
      const adId = currentView.parentId;

      if (!adId || adId === 'EMPTY') {
        filtered = [];

      } else {
        // Filter insights by specific ad_id and show daily breakdown
        filtered = insights.filter(i => {
          if (!i.level || i.level !== 'ad') return false;
          if (i.ad_id !== adId) return false;

          // Date range filter
          if (dateRange?.from && dateRange?.to && i.date_start) {
            const insightDate = parseISO(i.date_start);
            return isWithinInterval(insightDate, {
              start: startOfDay(dateRange.from),
              end: endOfDay(dateRange.to)
            });
          }
          return true;
        });

        // Sort by date descending (newest first)
        filtered.sort((a, b) => {
          const dateA = a.date_start ? new Date(a.date_start) : new Date(0);
          const dateB = b.date_start ? new Date(b.date_start) : new Date(0);
          return dateB.getTime() - dateA.getTime();
        });


      }
    }


    // 🔍 Debug logging - check campaign counts by status

    const statusBreakdown = filtered.reduce((acc: Record<string, number>, item: any) => {
      // Consider is_deleted flag from backend catalog
      const status = item.is_deleted ? 'DELETED' : (item.effective_status || item.status || 'NO_STATUS');
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});



    // Filter by status - support multiple statuses
    // If no status filter selected, show all records EXCEPT DELETED/ARCHIVED
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((insight) => {
        // Determine effective status (prioritize is_deleted flag)
        const effectiveStatus = insight.is_deleted ? 'DELETED' : (insight.effective_status || insight.status);

        // Show records with matching status OR records without status (NULL)
        if (!effectiveStatus) return true;
        return selectedStatuses.includes(effectiveStatus);
      });
    } else {
      // ✅ Default behavior when filter is empty: Hide DELETED and ARCHIVED
      filtered = filtered.filter((insight) => {
        const effectiveStatus = insight.is_deleted ? 'DELETED' : (insight.effective_status || insight.status);
        return effectiveStatus !== 'DELETED' && effectiveStatus !== 'ARCHIVED';
      });
    }

    // Sort the filtered data
    // Sort the filtered data
    // Sort the filtered data
    if (!sortField || !sortDirection) {
      // Default sort: Active on top, then by Date (recency)
      return [...filtered].sort((a, b) => {
        const getStatusPriority = (row: any) => {
          let status = row.effective_status || 'ACTIVE';

          // 🛑 Replicate "Display Status" Logic for accurate sorting
          // ✅ FIXED: Only override if we're CERTAIN all adsets are paused
          if (status === 'ACTIVE' && row.level === 'campaign' && row.campaign_id && adsetCatalog.length > 0) {
            const campaignAdsets = adsetCatalog.filter(adset => String(adset.campaign_id) === String(row.campaign_id));

            if (campaignAdsets.length > 0) {
              const hasActiveOrRunning = campaignAdsets.some(adset =>
                adset.effective_status === 'ACTIVE' ||
                adset.status === 'ACTIVE' ||
                !adset.effective_status
              );
              if (!hasActiveOrRunning) {
                const allExplicitlyPaused = campaignAdsets.every(adset =>
                  adset.effective_status === 'PAUSED' ||
                  adset.effective_status === 'CAMPAIGN_PAUSED' ||
                  adset.effective_status === 'AD_PAUSED'
                );
                if (allExplicitlyPaused) status = 'ADSET_PAUSED';
              }
            }
          }

          if (status === 'ACTIVE') return 0;
          if (status === 'ADSET_PAUSED') return 1;
          if (status === 'PAUSED') return 2; // Moved up since NO_ADS is gone
          return 3;
        };

        const pA = getStatusPriority(a);
        const pB = getStatusPriority(b);
        if (pA !== pB) return pA - pB;

        // Tie-break by Date (Newest first)
        return new Date(b.date_start).getTime() - new Date(a.date_start).getTime();
      });
    }

    return [...filtered].sort((a, b) => {
      // Helper to determine accurate status for sorting
      const getRealStatus = (row: any) => {
        let status = row.effective_status || 'ACTIVE';

        // 🛑 Replicate "Display Status" Logic
        // ✅ FIXED: Only override if we're CERTAIN all adsets are paused
        if (status === 'ACTIVE' && row.level === 'campaign' && row.campaign_id && adsetCatalog.length > 0) {
          const campaignAdsets = adsetCatalog.filter(adset => String(adset.campaign_id) === String(row.campaign_id));
          if (campaignAdsets.length > 0) {
            const hasActiveOrRunning = campaignAdsets.some(adset =>
              adset.effective_status === 'ACTIVE' ||
              adset.status === 'ACTIVE' ||
              !adset.effective_status
            );
            if (!hasActiveOrRunning) {
              const allExplicitlyPaused = campaignAdsets.every(adset =>
                adset.effective_status === 'PAUSED' ||
                adset.effective_status === 'CAMPAIGN_PAUSED' ||
                adset.effective_status === 'AD_PAUSED'
              );
              if (allExplicitlyPaused) status = 'ADSET_PAUSED';
            }
          }
        }
        return status;
      };

      // 1. If sorting by Status, implement the Custom Rank
      if (sortField === 'effective_status') {
        const statusA = getRealStatus(a);
        const statusB = getRealStatus(b);

        const getPriority = (s: string) => {
          if (s === 'ACTIVE') return 0;
          if (s === 'ADSET_PAUSED') return 1;
          if (s === 'PAUSED') return 2;
          if (s === 'DELETED' || s === 'ARCHIVED') return 3;
          return 4;
        };

        const pA = getPriority(statusA);
        const pB = getPriority(statusB);

        if (pA !== pB) {
          return sortDirection === 'asc' ? pA - pB : pB - pA;
        }
        return 0;
      }

      // 2. For other fields, use standard sort
      // (Optional: You can keep the "Active First" tier logic here if user wants it for ALL columns)
      // Current decision: Remove strict tiering for other columns to allow true sorting by value (e.g. Spend)

      const aVal = a[sortField];
      const bVal = b[sortField];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [insights, dateRange, selectedStatuses, sortField, sortDirection, viewLevel, currentView, derivedCatalogs, campaignCatalog, adsetCatalog, adCatalog, accountCurrency, rowStatuses]);


  // Get visible fields based on selection (preserve user order)
  const visibleFields = selectedFields
    .map((key) => ALL_FIELDS.find((f) => f.field === key))
    .filter((f): f is FieldMetadata => Boolean(f));

  // 🔥 Historical table visible fields (independent)
  const historicalVisibleFields = historicalSelectedFields
    .map((key) => ALL_FIELDS.find((f) => f.field === key))
    .filter((f): f is FieldMetadata => Boolean(f));

  // Filter and ensure proper name columns based on view level
  let displayFields = visibleFields.filter(f => {
    if (viewLevel === 'campaign') {
      // Campaign level: hide adset_name and ad_name
      return f.field !== 'adset_name' && f.field !== 'ad_name';
    } else if (viewLevel === 'adset') {
      // Adset level: hide campaign_name and ad_name
      return f.field !== 'campaign_name' && f.field !== 'ad_name';
    } else if (viewLevel === 'ad') {
      // Ad level: hide campaign_name (show adset_name and ad_name)
      return f.field !== 'campaign_name';
    }
    return true;
  });

  // Ensure the appropriate name field is always present
  const nameFieldMap = {
    'campaign': 'campaign_name',
    'adset': 'adset_name',
    'ad': 'ad_name'
  };
  const requiredNameField = nameFieldMap[viewLevel];
  const hasNameField = displayFields.some(f => f.field === requiredNameField);

  if (!hasNameField) {
    const nameField = ALL_FIELDS.find(f => f.field === requiredNameField);
    if (nameField) {
      // Insert name field after the first column (after labels/status)
      displayFields = [displayFields[0], displayFields[1], nameField, ...displayFields.slice(2)].filter(Boolean);
    }
  }

  // Ensure effective_status is always present and displayed first
  const hasEffectiveStatus = displayFields.some(f => f.field === 'effective_status');
  if (!hasEffectiveStatus) {
    const statusField = ALL_FIELDS.find(f => f.field === 'effective_status');
    if (statusField) {
      displayFields = [statusField, ...displayFields];
    }
  } else {
    // If effective_status exists, move it to first position
    const statusFieldIndex = displayFields.findIndex(f => f.field === 'effective_status');
    if (statusFieldIndex > 0) {
      const statusField = displayFields[statusFieldIndex];
      displayFields = [
        statusField,
        ...displayFields.slice(0, statusFieldIndex),
        ...displayFields.slice(statusFieldIndex + 1)
      ];
    }
  }

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const totalSpend = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.spend) || 0), 0);
    // Use generic results as the primary "results" metric (Standard sum)
    const totalResults = filteredAndSortedInsights.reduce((sum, i) => {
      const res = Number(i.results);
      const mess = Number(i.results_messaging_replied_7d);
      const start = Number(i.started_7d);
      return sum + (res || mess || start || 0);
    }, 0);
    const avgCostPerResult = totalResults > 0 ? totalSpend / totalResults : 0;

    // Calculate days count for budget multiplication
    let daysCount = 1;
    if (dateRange?.from && dateRange?.to) {
      daysCount = differenceInDays(dateRange.to, dateRange.from) + 1;
    }
    daysCount = Math.max(1, daysCount);

    // Simple Sum of Displayed Budget Column
    // Logic: If the budget column shows X, and we selected N days, the total budget spent/allocated is X * N (if daily) or X (if lifetime).
    // But wait, the user said "sum by camp id is correct".
    // If we are in Campaign view, each row is a campaign. We just sum the budget column.
    // If we are in AdSet view, each row is an adset.
    //   - If CBO, the adset rows show the Campaign budget (inherited). Summing them would double count.
    //   - If ABO, the adset rows show their own budget. Summing them is correct.

    // So we need to handle CBO double counting in AdSet view.
    // But in Campaign view (which the user is looking at), it's just a simple sum.

    const totalBudget = filteredAndSortedInsights.reduce((sum, i) => {
      // User request: Include Active campaigns AND Paused campaigns that have spend
      const hasSpend = Number(i.spend) > 0;
      const isActive = i.effective_status === 'ACTIVE';
      const isPausedWithSpend = i.effective_status === 'PAUSED' && hasSpend;

      if (isActive || isPausedWithSpend) {
        // i.budget is already calculated as the daily budget (including ABO sum) in the main loop
        return sum + (Number(i.budget) || 0);
      }

      return sum;
    }, 0);
    const totalImpressions = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.impressions) || 0), 0);
    const totalClicks = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.clicks) || 0), 0);

    // Count phone numbers from messaging_connections
    const totalPhones = filteredAndSortedInsights.reduce((sum, i) => {
      if (Array.isArray(i.actions)) {
        const messagingAction = i.actions.find((a: any) =>
          a.action_type === 'onsite_conversion.total_messaging_connection'
        );
        return sum + (Number(messagingAction?.value) || 0);
      }
      return sum;
    }, 0);

    // TODO: New metrics - placeholder values for future implementation
    const totalAppointments = 0; // số đặt lịch
    const totalCustomers = 0; // số khách hàng
    const totalRevenue = 0; // doanh thu

    // Derived metrics
    const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
    const costPerPhone = totalPhones > 0 ? totalSpend / totalPhones : 0;

    // Daily Marketing Cost = Total Spend (since we are usually looking at "Today" or specific range)
    // If range > 1 day, this should be average. 
    // But for "Today", it is just Total Spend.
    // Let's keep it as Total Spend for now or Average if > 1 day?
    // User label is "CHI PHÍ MKT TRÊN NGÀY". 
    // If date range is 1 day, it's total spend.
    // If date range is 7 days, it should be Total Spend / 7.
    const dailyMarketingCost = daysCount > 0 ? totalSpend / daysCount : 0;

    const marketingCostPerRevenue = totalRevenue > 0 ? totalSpend / totalRevenue : 0;

    // Calculate Adset Budget (Sum of ACTIVE adsets in the current view)
    const totalAdsetBudget = (() => {
      const getBudget = (budget: string | undefined) => {
        if (!budget) return 0;
        const val = Number(budget);
        return isNaN(val) ? 0 : (accountCurrency === 'VND' ? val : val / 100);
      };

      let targetAdsetIds = new Set<string>();

      if (viewLevel === 'campaign') {
        const visibleCampaignIds = new Set(filteredAndSortedInsights.map(c => c.campaign_id));
        adsetCatalog.forEach(a => {
          if (visibleCampaignIds.has(a.campaign_id)) targetAdsetIds.add(a.id);
        });
      } else if (viewLevel === 'adset') {
        filteredAndSortedInsights.forEach(a => targetAdsetIds.add(a.adset_id || a.id));
      } else if (viewLevel === 'ad') {
        filteredAndSortedInsights.forEach(a => targetAdsetIds.add(a.adset_id));
      }

      // Map adsets that have spend to include them even if PAUSED
      const adsetIdsWithSpend = new Set(
        filteredAndSortedInsights
          .filter(i => Number(i.spend) > 0)
          .map(i => i.adset_id || i.id) // handle adset view where i.id might be adset_id
      );

      return adsetCatalog
        .filter(a => {
          if (!targetAdsetIds.has(a.id)) return false;
          if (a.effective_status === 'ACTIVE') return true;
          if (a.effective_status === 'PAUSED' && adsetIdsWithSpend.has(a.id)) return true;
          return false;
        })
        .reduce((sum, a) => sum + getBudget(a.daily_budget), 0);
    })();

    return {
      spend: totalSpend,
      results: totalResults,
      costPerResult,
      budget: totalBudget,
      adsetBudget: totalAdsetBudget,
      impressions: totalImpressions,
      clicks: totalClicks,
      phones: totalPhones,
      costPerPhone,
      dailyMarketingCost,
      appointments: totalAppointments,
      customers: totalCustomers,
      revenue: totalRevenue,
      costPerAppointment: totalAppointments > 0 ? totalSpend / totalAppointments : 0,
      costPerCustomer: totalCustomers > 0 ? totalSpend / totalCustomers : 0,
      marketingCostPerRevenue,
      conversionRate: totalPhones > 0 ? (totalCustomers / totalPhones) * 100 : 0,
    };
  }, [filteredAndSortedInsights, dateRange, accountCurrency, adsetCatalog, viewLevel]);



  // Count for tabs - Only count what's actually displayed in the filtered table
  const campaignCount = viewLevel === 'campaign' ? filteredAndSortedInsights.length : 0;
  const adsetCount = new Set(insights.filter(i => {
    if (i.level) return i.level === 'adset';
    return i.adset_id && !i.ad_id;
  }).map(i => i.adset_id)).size;
  const adCount = new Set(insights.filter(i => {
    if (i.level) return i.level === 'ad';
    return i.ad_id;
  }).map(i => i.ad_id)).size;

  // Get account info from first insight
  const accountInfo = insights.length > 0 ? {
    account_id: insights[0].account_id,
    account_name: insights[0].account_name
  } : null;

  const handleTriggerAutoSync = async () => {
    try {
      setSyncStatus("Đang kích hoạt đồng bộ tự động (Test 5000)...");
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke('sync-ads-cron', {
        body: { limit: 5000 }
      });

      if (error) {
        console.error("Auto-sync invoke error:", error);
        throw error;
      }

      sonnerToast.success("Đã kích hoạt đồng bộ tự động (Test)", {
        description: `Đã xử lý ${data?.processed || 0} bản ghi. (Giới hạn 50)`
      });

      // Reload data after sync
      await loadInsights();

    } catch (error: any) {
      console.error("Auto-sync trigger error:", error);
      sonnerToast.error("Lỗi kích hoạt đồng bộ", {
        description: error.message || "Lỗi không xác định. Kiểm tra console."
      });
    } finally {
      setIsSyncing(false);
      setSyncStatus("");
    }
  };

  // Realtime Subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('table-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'FacebookInsights_Auto',
        },
        (payload) => {
          // console.log('Realtime update:', payload);
          const newRecord = payload.new as any;

          if (!newRecord || !newRecord.user_id || newRecord.user_id !== user.id) return;

          // Update state
          setInsights(prev => {
            const index = prev.findIndex(i => i.insight_key === newRecord.insight_key);
            if (index >= 0) {
              const newInsights = [...prev];
              newInsights[index] = { ...newInsights[index], ...newRecord };
              return newInsights;
            } else {
              // Only add if it matches current date range filter (optional, but good for performance)
              return [...prev, newRecord];
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-4 md:space-y-6">
      <Card>
        <CardContent className="p-3 sm:p-4">
          {/* Payment Warning Banner */}
          {adAccountStatus.hasPaymentIssue && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/50 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 text-destructive mt-0.5">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-destructive mb-1">
                    ⚠️ Tài khoản quảng cáo có vấn đề thanh toán
                  </h3>
                  <p className="text-sm text-destructive/80 mb-2">
                    {adAccountStatus.disable_reason === 'PAYMENT_ISSUE' && 'Cần cập nhật phương thức thanh toán để tiếp tục chạy quảng cáo.'}
                    {adAccountStatus.disable_reason === 'RISK_PAYMENT' && 'Tài khoản bị hạn chế do rủi ro thanh toán.'}
                    {adAccountStatus.disable_reason === 'GRAY_ACCOUNT_SHUT_DOWN' && 'Tài khoản đã bị vô hiệu hóa.'}
                    {adAccountStatus.account_status === 2 && !adAccountStatus.disable_reason && 'Tài khoản đang bị vô hiệu hóa.'}
                    {!adAccountStatus.disable_reason && adAccountStatus.account_status !== 2 && 'Không tìm thấy phương thức thanh toán hợp lệ.'}
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => window.open('https://business.facebook.com/settings/payment-methods', '_blank')}
                    className="h-7 text-xs"
                  >
                    Mở cài đặt thanh toán
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Báo cáo tổng quan */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-base font-semibold">Báo cáo tổng quan</h3>
              <div className="flex gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResetAllLayouts}
                        className="h-8 px-3 text-xs"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Đặt lại về mặc định</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex gap-1 border rounded-md">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={marketingViewMode === 'cards' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setMarketingViewMode('cards')}
                          className="h-8 px-3 rounded-none rounded-l-md"
                        >
                          <Grid3x3 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hiển thị dạng thẻ</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={marketingViewMode === 'chart' ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setMarketingViewMode('chart')}
                          className="h-8 px-3 rounded-none rounded-r-md"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hiển thị dạng biểu đồ</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {marketingViewMode === 'chart' && (
                  <Select value={marketingChartType} onValueChange={(v: any) => setMarketingChartType(v)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar" className="text-xs">Cột</SelectItem>
                      <SelectItem value="line" className="text-xs">Đường</SelectItem>
                      <SelectItem value="area" className="text-xs">Vùng</SelectItem>
                      <SelectItem value="pie" className="text-xs">Tròn</SelectItem>
                      <SelectItem value="donut" className="text-xs">Vòng tròn</SelectItem>
                      <SelectItem value="stacked" className="text-xs">Cột chồng</SelectItem>
                      <SelectItem value="radar" className="text-xs">Radar</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMarketingCustomizerOpen(true)}
                  className="h-8 px-3 text-xs"
                >
                  <Settings className="w-3.5 h-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Tùy chỉnh cột</span>
                </Button>
                {savedMarketingLayouts.length > 0 && (
                  <Select value={selectedMarketingLayout} onValueChange={handleLoadMarketingLayout}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="Chọn định dạng..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedMarketingLayouts.map((layout) => (
                        <SelectItem key={layout.name} value={layout.name} className="text-xs">
                          {layout.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {marketingViewMode === 'cards' ? (
              <ScrollArea className="max-h-[250px] overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pr-2">
                  {marketingMetricOrder.filter(key => selectedMarketingMetrics.includes(key)).map((key) => {
                    // Dynamic label based on view level
                    const budgetLabel = viewLevel === 'adset' ? 'NGÂN SÁCH NHÓM QC' : 'NGÂN SÁCH HÀNG NGÀY';

                    const metricConfig: Record<string, { label: string; value: number; color?: string }> = {
                      spend: { label: 'CHI PHÍ', value: summaryMetrics.spend, color: 'text-red-600' },
                      costPerResult: { label: 'CHI PHÍ TRÊN KẾT QUẢ', value: summaryMetrics.costPerResult },
                      budget: { label: budgetLabel, value: summaryMetrics.budget },
                      adsetBudget: { label: 'NGÂN SÁCH NHÓM QC', value: summaryMetrics.adsetBudget },
                      results: { label: 'KẾT QUẢ', value: summaryMetrics.results, color: 'text-blue-600' },
                      impressions: { label: 'HIỂN THỊ', value: summaryMetrics.impressions },
                      clicks: { label: 'NHẤP CHUỘT', value: summaryMetrics.clicks },
                      phones: { label: 'SDT', value: summaryMetrics.phones, color: 'text-green-600' },
                      costPerPhone: { label: 'CHI PHÍ TRÊN SDT', value: summaryMetrics.costPerPhone },
                      dailyMarketingCost: { label: 'CHI PHÍ MKT TRÊN NGÀY', value: summaryMetrics.dailyMarketingCost },
                    };

                    const metric = metricConfig[key];
                    if (!metric) return null;

                    return (
                      <Card
                        key={key}
                        className={`p-3 cursor-move ${draggedMarketingMetric === key ? 'opacity-50' : ''}`}
                        draggable
                        onDragStart={(e) => handleMarketingMetricDragStart(e, key)}
                        onDragOver={handleMarketingMetricDragOver}
                        onDrop={(e) => handleMarketingMetricDrop(e, key)}
                        onDragEnd={handleMarketingMetricDragEnd}
                      >
                        <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
                        <div className={`text-base font-bold ${metric.color || ''}`}>
                          {`${new Intl.NumberFormat('vi-VN').format(Math.round(metric.value))} ${key.includes('cost') || key.includes('Cost') || key === 'spend' || key === 'budget' ? '₫' : ''}`}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            ) : (
              <MetricsChart
                metrics={Object.fromEntries(
                  marketingMetricOrder
                    .filter(key => selectedMarketingMetrics.includes(key))
                    .map(key => {
                      // Dynamic label based on view level
                      const budgetLabel = viewLevel === 'adset' ? 'NGÂN SÁCH NHÓM QC' : 'NGÂN SÁCH HÀNG NGÀY';

                      const metricConfig: Record<string, { label: string; value: number; color?: string }> = {
                        spend: { label: 'CHI PHÍ', value: summaryMetrics.spend },
                        costPerResult: { label: 'CHI PHÍ/KQ', value: summaryMetrics.costPerResult },
                        budget: { label: budgetLabel, value: summaryMetrics.budget },
                        adsetBudget: { label: 'NGÂN SÁCH NHÓM QC', value: summaryMetrics.adsetBudget },
                        results: { label: 'KẾT QUẢ', value: summaryMetrics.results },
                        impressions: { label: 'HIỂN THỊ', value: summaryMetrics.impressions },
                        clicks: { label: 'NHẤP CHUỘT', value: summaryMetrics.clicks },
                        phones: { label: 'SDT', value: summaryMetrics.phones },
                        costPerPhone: { label: 'CHI PHÍ/SDT', value: summaryMetrics.costPerPhone },
                        dailyMarketingCost: { label: 'CHI PHÍ MKT/NGÀY', value: summaryMetrics.dailyMarketingCost },
                      };
                      return [key, metricConfig[key]];
                    })
                )}
                chartType={marketingChartType}
                title="Báo cáo tổng quan"
              />
            )}
          </div>

          {/* Cấp chi tiết quảng cáo */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Cấp chi tiết quảng cáo</h3>
                <span className="text-xs text-muted-foreground">({visibleFields.length} cột)</span>
              </div>
              <div className="flex gap-2">
                {savedDetailLayouts.length > 0 && (
                  <Select value={selectedDetailLayout} onValueChange={handleLoadDetailLayout}>
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue placeholder="Chọn định dạng..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedDetailLayouts.map((layout) => (
                        <SelectItem key={layout.name} value={layout.name} className="text-xs">
                          {layout.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDetailDialog(true)}
                  className="h-8 px-3 text-xs"
                >
                  Lưu định dạng
                </Button>
              </div>
            </div>
          </div>

          {/* Alert when user needs to select a campaign */}
          {viewLevel !== 'campaign' && currentView.parentId === 'EMPTY' && (
            <Alert className="mb-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800">
              <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-300">
                Vui lòng chọn chiến dịch
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-400">
                Quay về tab <strong>Chiến dịch</strong>, sau đó nhấp vào tên chiến dịch để xem {viewLevel === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo'} của nó.
              </AlertDescription>
            </Alert>
          )}

          {/* Indicator when displaying catalog without insights */}
          {insights.length === 0 && (campaignCatalog.length > 0 || adsetCatalog.length > 0 || adCatalog.length > 0) && (
            <Alert className="mb-4 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle className="text-blue-800 dark:text-blue-300">Đang hiển thị cấu trúc chiến dịch</AlertTitle>
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                Chưa có dữ liệu chỉ số trong khoảng thời gian này.
                Bấm <strong>"Đồng bộ tất cả"</strong> để tải chỉ số hiệu suất từ Facebook.
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs and toolbar controls aligned */}
          <div className="mb-1 flex flex-col lg:flex-row gap-1 items-start lg:items-center justify-between">
            {/* Tabs for level selection */}
            <Tabs value={viewLevel} onValueChange={(v) => {

              // Clear selected rows when changing tabs
              setSelectedRows(new Set());

              if (v === 'campaign') {
                // Campaign level - show all campaigns
                const newBreadcrumbs: BreadcrumbItem[] = [{
                  level: 'campaign' as const,
                  parentId: null,
                  name: 'Tất cả chiến dịch'
                }];

                setBreadcrumbs(newBreadcrumbs);
              } else if (v === 'adset') {
                // ✅ FIX: AdSet level - show ALL adsets (no campaign filter)
                setBreadcrumbs([{
                  level: 'adset' as const,
                  parentId: null, // null means show all adsets
                  name: 'Tất cả nhóm quảng cáo'
                }]);
              } else {
                // ✅ FIX: Ad level - show ALL ads (no adset filter) 
                setBreadcrumbs([{
                  level: 'ad' as const,
                  parentId: null, // null means show all ads
                  name: 'Tất cả quảng cáo'
                }]);
              }

              // ✅ FIX: Force insights refresh to ensure UI updates correctly
              const currentInsights = insights;
              setInsights([]);
              setTimeout(() => {
                setInsights(currentInsights);

              }, 0);
            }}>
              <TabsList className="grid w-full max-w-md grid-cols-3 h-9">
                <TabsTrigger value="campaign" className="text-xs py-1">
                  Chiến dịch ({campaignCount})
                </TabsTrigger>
                <TabsTrigger value="adset" className="text-xs py-1">
                  Nhóm quảng cáo
                </TabsTrigger>
                <TabsTrigger value="ad" className="text-xs py-1">
                  Quảng cáo
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Toolbar controls */}
            <div className="flex gap-2 flex-wrap items-center">
              {selectedRows.size > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setAssignLabelsOpen(true)}
                  className="h-8 px-3 text-xs"
                >
                  <Tag className="w-3.5 h-3.5 mr-1" />
                  Gắn nhãn ({selectedRows.size})
                </Button>
              )}
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              <StatusFilter
                selectedStatuses={selectedStatuses}
                onChange={setSelectedStatuses}
              />
              {/* Cron Settings */}
              <Popover open={cronPopoverOpen} onOpenChange={setCronPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Zap className="w-3.5 h-3.5 mr-1" />
                    <span className="hidden sm:inline">Cài đặt tự động</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">Cấu hình tự động</h4>
                      <p className="text-sm text-muted-foreground">
                        Thiết lập lịch đồng bộ dữ liệu tự động.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cron-active">Tự động đồng bộ</Label>
                        <Switch
                          id="cron-active"
                          checked={cronActive}
                          onCheckedChange={setCronActive}
                        />
                      </div>
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="cron-interval">Tần suất</Label>
                        <Select
                          value={cronInterval}
                          onValueChange={setCronInterval}
                          disabled={!cronActive}
                        >
                          <SelectTrigger className="col-span-2 h-8">
                            <SelectValue placeholder="Chọn tần suất" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">Mỗi 5 phút</SelectItem>
                            <SelectItem value="10">Mỗi 10 phút</SelectItem>
                            <SelectItem value="15">Mỗi 15 phút</SelectItem>
                            <SelectItem value="30">Mỗi 30 phút</SelectItem>
                            <SelectItem value="60">Mỗi 60 phút</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleSaveCronSettings}
                        disabled={cronLoading}
                        className="mt-2"
                      >
                        {cronLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Lưu cấu hình
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={() => setCustomizerOpen(true)} className="h-8 px-3 text-xs">
                <Settings className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Cột</span>
              </Button>

              {/* Sync Now Button */}
              <Button
                variant="default"
                size="sm"
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="h-8 px-3 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}</span>
              </Button>

              {isAutoRefreshing && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="hidden md:inline">Đang cập nhật...</span>
                </span>
              )}
              {lastRefreshTime && !isAutoRefreshing && (
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  Cập nhật: {format(lastRefreshTime, 'HH:mm:ss')}
                </span>
              )}
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs hidden md:flex">
                <Download className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 sm:py-12">
              <RefreshCw className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-muted-foreground" />
            </div>
          ) : insights.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground px-4">
              Chưa có dữ liệu insights. Vui lòng đồng bộ dữ liệu từ Facebook.
            </div>
          ) : filteredAndSortedInsights.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <div className="text-sm text-muted-foreground mb-4">
                Không có dữ liệu {viewLevel === 'campaign' ? 'chiến dịch' : viewLevel === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo'} phù hợp với bộ lọc hiện tại.
              </div>
              {viewLevel !== 'campaign' && (
                <div className="text-xs text-muted-foreground mb-4">
                  💡 Lưu ý: Nếu bạn mới đồng bộ dữ liệu gần đây, hãy ấn <strong className="text-primary">Đồng bộ</strong> lại để tải đầy đủ dữ liệu ở tất cả các cấp độ.
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Hãy thử:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Điều chỉnh khoảng thời gian</li>
                  <li>Thay đổi bộ lọc trạng thái</li>
                  {breadcrumbs.length > 1 && <li>Quay lại cấp trước</li>}
                  <li>Ấn nút "Đồng bộ" để tải dữ liệu mới</li>
                </ul>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="border rounded-lg">
                <Table className="min-w-[1000px] md:min-w-[1200px] table-fixed w-full">
                  <TableHeader className="sticky top-0 bg-muted z-20 shadow-sm">
                    <TableRow>
                      {/* Labels column - first position, resizable */}
                      <TableHead
                        className="sticky left-0 z-20 bg-muted px-2 sm:px-4 text-xs sm:text-sm border-r relative"
                        style={{
                          width: columnWidths['labels'] || 200,
                          minWidth: '150px'
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <span>Nhãn dán</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 hover:bg-background rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadLabelAssignments();
                              toast({ title: "Đang tải lại nhãn..." });
                            }}
                            title="Tải lại nhãn"
                          >
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Resize handle for labels column */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary z-10"
                          style={{ backgroundColor: resizingColumn === 'labels' ? 'hsl(var(--primary))' : 'transparent' }}
                          onMouseDown={(e) => handleResizeStart(e, 'labels')}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableHead>
                      {/* Checkbox - second position */}
                      <TableHead
                        className="sticky z-20 bg-muted w-12 px-2 sm:px-4 border-r"
                        style={{ left: `${columnWidths['labels'] || 200}px` }}
                      >
                        <Checkbox
                          checked={selectedRows.size === filteredAndSortedInsights.length && filteredAndSortedInsights.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      {/* Switch - third position */}
                      <TableHead
                        className="sticky z-20 bg-muted w-24 px-2 sm:px-4 text-xs sm:text-sm border-r"
                        style={{ left: `${(columnWidths['labels'] || 200) + 48}px` }}
                      >
                        Trạng thái
                      </TableHead>
                      {displayFields.filter(f => f.field !== 'labels').map((field) => {
                        // Special width for status column
                        const defaultWidth = field.field === 'effective_status' ? 120 :
                          field.field === 'labels' ? 120 : 150;

                        // Check if this is the effective_status field to make it sticky
                        const isStatusField = field.field === 'effective_status';

                        return (
                          <TableHead
                            key={field.field}
                            className={`relative whitespace-nowrap hover:bg-muted-foreground/10 transition-colors text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 select-none border-r ${draggedColumn === field.field ? 'opacity-50' : ''
                              } ${isStatusField ? 'sticky z-20 bg-muted' : ''}`}
                            style={isStatusField ? {
                              width: columnWidths[field.field] || defaultWidth,
                              minWidth: '80px',
                              userSelect: 'none',
                              left: `${(columnWidths['labels'] || 200) + 128}px`
                            } : {
                              width: columnWidths[field.field] || defaultWidth,
                              minWidth: '80px',
                              userSelect: 'none'
                            }}
                          >
                            <div
                              className="flex items-center gap-1 sm:gap-2 cursor-move"
                              draggable
                              onDragStart={(e) => handleColumnDragStart(e, field.field)}
                              onDragOver={handleColumnDragOver}
                              onDrop={(e) => handleColumnDrop(e, field.field)}
                              onDragEnd={handleColumnDragEnd}
                              onClick={() => handleSort(field.field)}
                            >
                              <span className="text-xs sm:text-sm">{field.label}</span>
                              {sortField === field.field ? (
                                sortDirection === 'asc' ? (
                                  <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
                                ) : (
                                  <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 opacity-30" />
                              )}
                            </div>
                            {/* Resize handle */}
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary z-10"
                              style={{ backgroundColor: resizingColumn === field.field ? 'hsl(var(--primary))' : 'transparent' }}
                              onMouseDown={(e) => handleResizeStart(e, field.field)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedInsights.map((insight, idx) => {
                      const rowKey = getRowKey(insight);
                      const isChecked = rowKey ? selectedRows.has(rowKey) : false;
                      // Determine if active based on effective_status or fallback to rowStatuses state
                      const effectiveStatus = insight.effective_status; // Don't default to ACTIVE
                      // ✅ FIX: Use viewLevel to determine correct statusKey
                      const statusKey = viewLevel === 'ad' ? insight.ad_id
                        : viewLevel === 'adset' ? insight.adset_id
                          : insight.campaign_id;
                      const isActive = statusKey && rowStatuses[statusKey] !== undefined
                        ? rowStatuses[statusKey]
                        : effectiveStatus === 'ACTIVE';
                      const isDeleted = effectiveStatus === 'DELETED';

                      // ✅ Check account-level issues first (highest priority)
                      const hasAccountIssue = adAccountStatus.account_status === 2 || adAccountStatus.account_status === 3;

                      // Determine if switch should be disabled
                      const disabledStatuses = ['DELETED', 'ARCHIVED', 'WITH_ISSUES', 'IN_PROCESS', 'PENDING_BILLING_INFO', 'PENDING_REVIEW', 'DISAPPROVED'];
                      const isSwitchDisabled = hasAccountIssue || disabledStatuses.includes(effectiveStatus);

                      // Get disable reason for tooltip
                      const getDisableReason = () => {
                        // ✅ Account-level issues take priority
                        if (adAccountStatus.account_status === 3) return '💳 Tài khoản nợ chưa thanh toán. Vui lòng thanh toán để tiếp tục sử dụng.';
                        if (adAccountStatus.account_status === 2) return '🚫 Tài khoản bị vô hiệu hóa. Vui lòng kiểm tra Facebook Ads Manager.';

                        // Object-level issues
                        if (effectiveStatus === 'WITH_ISSUES') return '⚠️ Chiến dịch có vấn đề (có thể do lỗi thanh toán). Vui lòng kiểm tra Facebook Ads Manager.';
                        if (effectiveStatus === 'PENDING_BILLING_INFO') return '⚠️ Thiếu thông tin thanh toán. Vui lòng cập nhật phương thức thanh toán trong Facebook Ads Manager.';
                        if (effectiveStatus === 'PENDING_REVIEW') return '🔍 Quảng cáo đang chờ duyệt. Không thể bật/tắt trong lúc này.';
                        if (effectiveStatus === 'DISAPPROVED') return '❌ Quảng cáo bị từ chối. Vui lòng chỉnh sửa và gửi lại để duyệt.';
                        if (effectiveStatus === 'DELETED') return '🗑️ Chiến dịch đã bị xóa';
                        if (effectiveStatus === 'ARCHIVED') return '📦 Chiến dịch đã được lưu trữ';
                        if (effectiveStatus === 'IN_PROCESS') return '⏳ Chiến dịch đang được xử lý';
                        return '';
                      };

                      // Helper to get daily insights for an ad
                      const getDailyInsights = (adId: string) => {
                        return insights.filter(i =>
                          i.ad_id === adId &&
                          i.level === 'ad' &&
                          (dateRange?.from && dateRange?.to ? isWithinInterval(parseISO(i.date_start), {
                            start: startOfDay(dateRange.from),
                            end: endOfDay(dateRange.to)
                          }) : true)
                        ).sort((a, b) => {
                          // Sort by date descending
                          return new Date(b.date_start).getTime() - new Date(a.date_start).getTime();
                        });
                      };

                      const toggleAdExpansion = (adId: string) => {
                        setExpandedAds(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(adId)) {
                            newSet.delete(adId);
                          } else {
                            newSet.add(adId);
                          }
                          return newSet;
                        });
                      };

                      const isExpanded = viewLevel === 'ad' && insight.ad_id && expandedAds.has(insight.ad_id);
                      const dailyInsights = isExpanded ? getDailyInsights(insight.ad_id) : [];

                      return (
                        <Fragment key={rowKey || idx}>
                          <TableRow className={`border-b ${isDeleted ? 'bg-muted/30' : ''}`}>
                            {/* Labels column - first position, resizable */}
                            <TableCell
                              className="sticky left-0 z-10 bg-background px-2 sm:px-4 border-r"
                              style={{
                                width: columnWidths['labels'] || 200,
                                maxWidth: columnWidths['labels'] || 200,
                                minWidth: '150px'
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {viewLevel === 'ad' && insight.ad_id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleAdExpansion(insight.ad_id);
                                    }}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    {expandedAds.has(insight.ad_id) ?
                                      <ChevronDown className="w-4 h-4" /> :
                                      <ChevronUp className="w-4 h-4" />
                                    }
                                  </button>
                                )}
                                {formatValue('labels', insight['labels'], insight, adAccountStatus)}
                              </div>
                            </TableCell>
                            {/* Checkbox - second position */}
                            <TableCell
                              className="sticky z-10 bg-background px-2 sm:px-4 border-r"
                              style={{ left: `${columnWidths['labels'] || 200}px` }}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => handleSelectRow(rowKey, checked as boolean)}
                                disabled={isDeleted}
                              />
                            </TableCell>
                            {/* Switch - third position */}
                            <TableCell
                              className="sticky z-10 bg-background px-2 sm:px-4 border-r"
                              style={{ left: `${(columnWidths['labels'] || 200) + 48}px` }}
                              title={isSwitchDisabled ? getDisableReason() : ''}
                            >
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={() => {
                                    handleToggleStatus(insight, isActive);
                                  }}
                                  disabled={isSwitchDisabled}
                                  className={hasAccountIssue ? 'opacity-40' : ''}
                                />
                                <span className={`text-xs font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {isActive ? '▶ Bật' : '⏸ Tắt'}
                                </span>
                              </div>
                            </TableCell>
                            {displayFields.filter(f => f.field !== 'labels').map((field, fieldIndex) => {
                              const cellValue = formatValue(field.field, insight[field.field], insight, adAccountStatus);
                              const defaultWidth = field.field === 'effective_status' ? 120 :
                                field.field === 'labels' ? 120 : 140;
                              const cellWidth = columnWidths[field.field] || defaultWidth;

                              // Check if this field is drillable (not drillable if deleted)
                              const isDrillable = !isDeleted && (
                                (viewLevel === 'campaign' && field.field === 'campaign_name' && insight.campaign_id) ||
                                (viewLevel === 'adset' && field.field === 'adset_name' && insight.adset_id) ||
                                (viewLevel === 'ad' && field.field === 'adset_name' && insight.adset_id)
                              );

                              // Check if this is the effective_status field to make it sticky
                              const isStatusField = field.field === 'effective_status';

                              return (
                                <TableCell
                                  key={field.field}
                                  className={`whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 border-r ${isStatusField ? 'sticky z-10 bg-background' : ''
                                    }`}
                                  style={isStatusField ? {
                                    ...{
                                      width: cellWidth,
                                      maxWidth: cellWidth,
                                      minWidth: '80px'
                                    },
                                    left: `${(columnWidths['labels'] || 200) + 128}px`
                                  } : {
                                    width: cellWidth,
                                    maxWidth: cellWidth,
                                    minWidth: '80px'
                                  }}
                                >
                                  {isDrillable ? (
                                    <button
                                      onClick={() => {
                                        if (viewLevel === 'campaign' && insight.campaign_id) {
                                          handleDrillDown('adset', insight.campaign_id, insight.campaign_name);
                                        } else if (viewLevel === 'adset' && insight.adset_id) {
                                          handleDrillDown('ad', insight.adset_id, insight.adset_name);
                                        } else if (viewLevel === 'ad' && field.field === 'adset_name' && insight.adset_id) {
                                          // From ad level, drill to the specific adset
                                          handleDrillDown('adset', insight.campaign_id, insight.campaign_name);
                                          // Then immediately drill to this adset
                                          setTimeout(() => {
                                            handleDrillDown('ad', insight.adset_id, insight.adset_name);
                                          }, 100);
                                        }
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium text-left"
                                    >
                                      {cellValue}
                                    </button>
                                  ) : isDeleted && (field.field === 'campaign_name' || field.field === 'adset_name' || field.field === 'ad_name') ? (
                                    <span className="text-muted-foreground">{cellValue}</span>
                                  ) : (
                                    cellValue
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>

                          {/* Daily insights sub-rows */}
                          {isExpanded && dailyInsights.length > 0 && (
                            dailyInsights.map((dailyInsight: any, dailyIdx: number) => (
                              <TableRow key={`daily-${insight.ad_id}-${dailyInsight.date_start}-${dailyIdx}`} className="bg-muted/20">
                                {/* Labels column with date */}
                                <TableCell
                                  className="sticky left-0 z-10 bg-muted/20 px-2 sm:px-4 border-r pl-8"
                                  style={{
                                    width: columnWidths['labels'] || 200,
                                    maxWidth: columnWidths['labels'] || 200,
                                    minWidth: '150px'
                                  }}
                                >
                                  <span className="text-xs text-muted-foreground">
                                    📅 {format(parseISO(dailyInsight.date_start), 'dd/MM/yyyy')}
                                  </span>
                                </TableCell>
                                {/* Checkbox column - empty */}
                                <TableCell
                                  className="sticky z-10 bg-muted/20 px-2 sm:px-4 border-r"
                                  style={{ left: `${columnWidths['labels'] || 200}px` }}
                                />
                                {/* Switch column - empty */}
                                <TableCell
                                  className="sticky z-10 bg-muted/20 px-2 sm:px-4 border-r"
                                  style={{ left: `${(columnWidths['labels'] || 200) + 48}px` }}
                                />
                                {/* Render all metrics for this daily insight */}
                                {displayFields.filter(f => f.field !== 'labels').map((field) => {
                                  const cellValue = formatValue(field.field, dailyInsight[field.field], dailyInsight, adAccountStatus);
                                  const defaultWidth = field.field === 'effective_status' ? 120 :
                                    field.field === 'labels' ? 120 : 140;
                                  const cellWidth = columnWidths[field.field] || defaultWidth;
                                  const isStatusField = field.field === 'effective_status';

                                  return (
                                    <TableCell
                                      key={field.field}
                                      className={`whitespace-nowrap overflow-hidden text-ellipsis text-xs px-2 sm:px-4 py-2 border-r ${isStatusField ? 'sticky z-10 bg-muted/20' : ''
                                        }`}
                                      style={isStatusField ? {
                                        ...{
                                          width: cellWidth,
                                          maxWidth: cellWidth,
                                          minWidth: '80px'
                                        },
                                        left: `${(columnWidths['labels'] || 200) + 48 + 48}px`
                                      } : {
                                        width: cellWidth,
                                        maxWidth: cellWidth,
                                        minWidth: '80px'
                                      }}
                                    >
                                      {cellValue}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))
                          )}

                          {/* Show message if no daily data */}
                          {isExpanded && dailyInsights.length === 0 && (
                            <TableRow className="bg-muted/20">
                              <TableCell
                                colSpan={displayFields.length + 2}
                                className="text-center text-xs text-muted-foreground py-4 pl-8"
                              >
                                Chưa có dữ liệu theo ngày
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })}

                    {/* Summary Row - Tổng cộng */}
                    {filteredAndSortedInsights.length > 0 && (
                      <TableRow className="bg-muted/50 font-semibold border-t-2">
                        {/* Labels column - empty */}
                        <TableCell
                          className="sticky left-0 z-10 bg-muted/50 px-2 sm:px-4 border-r"
                          style={{
                            width: columnWidths['labels'] || 200,
                            minWidth: '150px'
                          }}
                        />
                        {/* Checkbox column - empty */}
                        <TableCell
                          className="sticky z-10 bg-muted/50 px-2 sm:px-4 border-r"
                          style={{ left: `${columnWidths['labels'] || 200}px` }}
                        />
                        {/* Switch column - empty */}
                        <TableCell
                          className="sticky z-10 bg-muted/50 px-2 sm:px-4 border-r"
                          style={{ left: `${(columnWidths['labels'] || 200) + 48}px` }}
                        />
                        {displayFields.filter(f => f.field !== 'labels').map((field, fieldIndex) => {
                          const defaultWidth = field.field === 'effective_status' ? 120 :
                            field.field === 'labels' ? 120 : 140;
                          const cellWidth = columnWidths[field.field] || defaultWidth;

                          // Check if this is the effective_status field to make it sticky
                          const isStatusField = field.field === 'effective_status';

                          // Calculate totals for numeric fields
                          let summaryValue: any = '';

                          // Show count in the name field column (campaign_name, adset_name, or ad_name)
                          const nameFieldMap: Record<string, string> = {
                            'campaign': 'campaign_name',
                            'adset': 'adset_name',
                            'ad': 'ad_name'
                          };
                          const currentNameField = nameFieldMap[viewLevel];

                          if (field.field === currentNameField) {
                            // Name column shows count
                            const levelLabel = viewLevel === 'campaign' ? 'chiến dịch' :
                              viewLevel === 'adset' ? 'nhóm quảng cáo' : 'quảng cáo';
                            summaryValue = `Kết quả từ ${filteredAndSortedInsights.length} ${levelLabel}`;
                          } else {
                            // Sum numeric fields
                            const numericFields = ['impressions', 'clicks', 'spend', 'reach', 'results', 'results_messaging_replied_7d', 'budget', 'weekly_budget', 'monthly_budget', 'quarterly_budget', 'yearly_budget', 'phones'];
                            if (numericFields.includes(field.field)) {
                              const total = filteredAndSortedInsights.reduce((sum, insight) => {
                                return sum + (Number(insight[field.field]) || 0);
                              }, 0);
                              summaryValue = formatValue(field.field, total, {});
                            } else if (['cpc', 'cpm', 'ctr', 'cost_per_result', 'frequency'].includes(field.field)) {
                              // Calculate weighted averages for rate metrics
                              const totalSpend = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.spend) || 0), 0);
                              const totalImpressions = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.impressions) || 0), 0);
                              const totalClicks = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.clicks) || 0), 0);
                              const totalResults = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.results) || 0), 0);
                              const totalReach = filteredAndSortedInsights.reduce((sum, i) => sum + (Number(i.reach) || 0), 0);

                              if (field.field === 'cpc' && totalClicks > 0) {
                                summaryValue = formatValue('cpc', totalSpend / totalClicks, {});
                              } else if (field.field === 'cpm' && totalImpressions > 0) {
                                summaryValue = formatValue('cpm', (totalSpend / totalImpressions) * 1000, {});
                              } else if (field.field === 'ctr' && totalImpressions > 0) {
                                summaryValue = formatValue('ctr', (totalClicks / totalImpressions) * 100, {});
                              } else if (field.field === 'cost_per_result' && totalResults > 0) {
                                summaryValue = formatValue('cost_per_result', totalSpend / totalResults, {});
                              } else if (field.field === 'frequency' && totalReach > 0) {
                                summaryValue = formatValue('frequency', totalImpressions / totalReach, {});
                              } else {
                                summaryValue = '—';
                              }
                            } else {
                              summaryValue = '—';
                            }
                          }

                          return (
                            <TableCell
                              key={`${field.field}-${fieldIndex}`}
                              className={`whitespace-nowrap overflow-hidden text-ellipsis text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 border-r ${isStatusField ? 'sticky z-10 bg-muted/50' : ''
                                }`}
                              style={isStatusField ? {
                                ...{
                                  width: cellWidth,
                                  maxWidth: cellWidth,
                                  minWidth: '80px'
                                },
                                left: `${(columnWidths['labels'] || 200) + 128}px`
                              } : {
                                width: cellWidth,
                                maxWidth: cellWidth,
                                minWidth: '80px'
                              }}
                            >
                              {summaryValue}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Historical section moved to AdsHistory.tsx page */}

      {/* Assign Labels Dialog */}
      <AssignLabelsDialog
        open={assignLabelsOpen}
        onOpenChange={setAssignLabelsOpen}
        labels={labels}
        selectedCampaigns={Array.from(selectedRows).map(key => {
          const insight = filteredAndSortedInsights.find(i => getRowKey(i) === key);
          return {
            id: key,
            name: insight?.campaign_name || insight?.adset_name || insight?.ad_name || key,
            labels: insight?.labels || []
          };
        })}
        onAssignLabels={handleAssignLabels}
      />



      <LabelsManagerDialog
        open={labelsManagerOpen}
        onOpenChange={setLabelsManagerOpen}
        labels={labels}
        onLabelsChange={loadLabels}
        userId={user?.id}
      />

      {/* ✅ FIX: Column Customizer Dialog - Was imported but not rendered */}
      <AdsTableColumnsCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        selectedFields={selectedFields}
        onFieldsChange={setSelectedFields}
      />


    </div>
  );
};

export default AdsReportAuto;
