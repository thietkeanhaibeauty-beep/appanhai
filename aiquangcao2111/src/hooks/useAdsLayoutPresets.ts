/**
 * useAdsLayoutPresets - Hook quản lý Layout Presets cho Ads Report
 * 
 * Tách từ AdsReportAuto.tsx để giảm kích thước component chính
 * Bao gồm: saved layouts cho Marketing, Summary, Sale, Detail, Historical tables
 */

import { useState, useCallback } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// ========================= TYPES =========================

export interface MetricLayoutPreset {
    name: string;
    metricOrder: string[];
    selectedMetrics: string[];
}

export interface TableLayoutPreset {
    name: string;
    columnOrder: string[];
    columnWidths: Record<string, number>;
}

// Toast interface matching useToast from shadcn
interface ToastFn {
    (opts: { title?: string; description?: string; variant?: 'default' | 'destructive' }): void;
}

interface UseAdsLayoutPresetsOptions {
    toast: ToastFn;
}

// ========================= DEFAULT VALUES =========================

const defaultSummaryMetricOrder = [
    'spend', 'costPerResult', 'budget', 'adsetBudget', 'results', 'impressions',
    'clicks', 'phones', 'costPerPhone', 'appointments', 'costPerAppointment',
    'customers', 'costPerCustomer', 'dailyMarketingCost', 'marketingCostPerRevenue',
    'revenue', 'conversionRate'
];

const defaultSaleMetricOrder = [
    'appointments', 'costPerAppointment', 'customers', 'costPerCustomer',
    'revenue', 'marketingCostPerRevenue', 'conversionRate'
];

const defaultMarketingMetricOrder = [
    'spend', 'costPerResult', 'budget', 'adsetBudget', 'results', 'impressions',
    'clicks', 'phones', 'costPerPhone', 'dailyMarketingCost'
];

// ========================= MAIN HOOK =========================

export const useAdsLayoutPresets = ({ toast }: UseAdsLayoutPresetsOptions) => {
    // ==================== SUMMARY METRICS ====================
    const [summaryMetricOrder, setSummaryMetricOrder] = useLocalStorage<string[]>(
        'ads-report-summary-metric-order',
        defaultSummaryMetricOrder
    );
    const [selectedSummaryMetrics, setSelectedSummaryMetrics] = useLocalStorage<string[]>(
        'ads-report-summary-selected-metrics',
        defaultSummaryMetricOrder
    );
    const [draggedSummaryMetric, setDraggedSummaryMetric] = useState<string | null>(null);

    // ==================== SALE METRICS ====================
    const [saleMetricOrder, setSaleMetricOrder] = useLocalStorage<string[]>(
        'ads-report-sale-metric-order',
        defaultSaleMetricOrder
    );
    const [selectedSaleMetrics, setSelectedSaleMetrics] = useLocalStorage<string[]>(
        'ads-report-sale-selected-metrics',
        defaultSaleMetricOrder
    );
    const [draggedSaleMetric, setDraggedSaleMetric] = useState<string | null>(null);

    // ==================== MARKETING METRICS ====================
    const [marketingMetricOrder, setMarketingMetricOrder] = useLocalStorage<string[]>(
        'ads-report-marketing-metric-order',
        defaultMarketingMetricOrder
    );
    const [selectedMarketingMetrics, setSelectedMarketingMetrics] = useLocalStorage<string[]>(
        'ads-report-marketing-selected-metrics',
        defaultMarketingMetricOrder
    );
    const [draggedMarketingMetric, setDraggedMarketingMetric] = useState<string | null>(null);

    // ==================== VIEW MODES ====================
    const [summaryViewMode, setSummaryViewMode] = useLocalStorage<'cards' | 'chart'>(
        'ads-report-summary-view',
        'cards',
        (value) => value === 'cards' || value === 'chart'
    );
    const [summaryChartType, setSummaryChartType] = useLocalStorage<'line' | 'bar' | 'area' | 'pie'>(
        'ads-report-summary-chart',
        'bar',
        (value) => ['line', 'bar', 'area', 'pie'].includes(value)
    );
    const [marketingViewMode, setMarketingViewMode] = useLocalStorage<'cards' | 'chart'>(
        'ads-report-marketing-view',
        'cards',
        (value) => value === 'cards' || value === 'chart'
    );
    const [marketingChartType, setMarketingChartType] = useLocalStorage<'line' | 'bar' | 'area' | 'pie'>(
        'ads-report-marketing-chart',
        'bar',
        (value) => ['line', 'bar', 'area', 'pie'].includes(value)
    );
    const [saleViewMode, setSaleViewMode] = useLocalStorage<'cards' | 'chart'>(
        'ads-report-sale-view',
        'cards',
        (value) => value === 'cards' || value === 'chart'
    );
    const [saleChartType, setSaleChartType] = useLocalStorage<'line' | 'bar' | 'area' | 'pie'>(
        'ads-report-sale-chart',
        'bar',
        (value) => ['line', 'bar', 'area', 'pie'].includes(value)
    );

    // ==================== SAVED LAYOUTS ====================
    const [savedMarketingLayouts, setSavedMarketingLayouts] = useLocalStorage<MetricLayoutPreset[]>(
        'ads-report-marketing-layouts',
        []
    );
    const [savedSummaryLayouts, setSavedSummaryLayouts] = useLocalStorage<MetricLayoutPreset[]>(
        'ads-report-summary-layouts',
        []
    );
    const [savedSaleLayouts, setSavedSaleLayouts] = useLocalStorage<MetricLayoutPreset[]>(
        'ads-report-sale-layouts',
        []
    );
    const [savedDetailLayouts, setSavedDetailLayouts] = useLocalStorage<TableLayoutPreset[]>(
        'ads-report-detail-layouts',
        []
    );
    const [savedHistoricalLayouts, setSavedHistoricalLayouts] = useLocalStorage<TableLayoutPreset[]>(
        'ads-report-historical-layouts',
        []
    );

    // ==================== DIALOG STATES ====================
    const [showSaveMarketingDialog, setShowSaveMarketingDialog] = useState(false);
    const [showSaveSummaryDialog, setShowSaveSummaryDialog] = useState(false);
    const [showSaveSaleDialog, setShowSaveSaleDialog] = useState(false);
    const [showSaveDetailDialog, setShowSaveDetailDialog] = useState(false);
    const [showSaveHistoricalDialog, setShowSaveHistoricalDialog] = useState(false);

    const [marketingLayoutName, setMarketingLayoutName] = useState('');
    const [summaryLayoutName, setSummaryLayoutName] = useState('');
    const [saleLayoutName, setSaleLayoutName] = useState('');
    const [detailLayoutName, setDetailLayoutName] = useState('');
    const [historicalLayoutName, setHistoricalLayoutName] = useState('');

    const [selectedMarketingLayout, setSelectedMarketingLayout] = useState<string>('');
    const [selectedSummaryLayout, setSelectedSummaryLayout] = useState<string>('');
    const [selectedSaleLayout, setSelectedSaleLayout] = useState<string>('');
    const [selectedDetailLayout, setSelectedDetailLayout] = useState<string>('');
    const [selectedHistoricalLayout, setSelectedHistoricalLayout] = useState<string>('');

    // ==================== CUSTOMIZER STATES ====================
    const [customizerOpen, setCustomizerOpen] = useState(false);
    const [summaryCustomizerOpen, setSummaryCustomizerOpen] = useState(false);
    const [saleCustomizerOpen, setSaleCustomizerOpen] = useState(false);
    const [marketingCustomizerOpen, setMarketingCustomizerOpen] = useState(false);
    const [historicalCustomizerOpen, setHistoricalCustomizerOpen] = useState(false);

    // ==================== MARKETING LAYOUT HANDLERS ====================

    const handleSaveMarketingLayout = useCallback(() => {
        if (!marketingLayoutName.trim()) return;

        const newLayout: MetricLayoutPreset = {
            name: marketingLayoutName.trim(),
            metricOrder: marketingMetricOrder,
            selectedMetrics: selectedMarketingMetrics
        };

        setSavedMarketingLayouts(prev => {
            const exists = prev.findIndex(l => l.name === newLayout.name);
            if (exists !== -1) {
                const updated = [...prev];
                updated[exists] = newLayout;
                return updated;
            }
            return [...prev, newLayout];
        });

        setMarketingLayoutName('');
        setShowSaveMarketingDialog(false);
        toast({ title: "Đã lưu", description: "Layout Marketing đã được lưu" });
    }, [marketingLayoutName, marketingMetricOrder, selectedMarketingMetrics, setSavedMarketingLayouts]);

    const handleLoadMarketingLayout = useCallback((layoutName: string) => {
        const layout = savedMarketingLayouts.find(l => l.name === layoutName);
        if (layout) {
            setMarketingMetricOrder(layout.metricOrder);
            setSelectedMarketingMetrics(layout.selectedMetrics);
            setSelectedMarketingLayout(layoutName);
            toast({ title: "Đã tải", description: `Layout "${layoutName}" đã được áp dụng` });
        }
    }, [savedMarketingLayouts, setMarketingMetricOrder, setSelectedMarketingMetrics]);

    const handleDeleteMarketingLayout = useCallback((layoutName: string) => {
        setSavedMarketingLayouts(prev => prev.filter(l => l.name !== layoutName));
        if (selectedMarketingLayout === layoutName) {
            setSelectedMarketingLayout('');
        }
        toast({ title: "Đã xóa", description: "Layout đã được xóa" });
    }, [setSavedMarketingLayouts, selectedMarketingLayout]);

    // ==================== SUMMARY LAYOUT HANDLERS ====================

    const handleSaveSummaryLayout = useCallback(() => {
        if (!summaryLayoutName.trim()) return;

        const newLayout: MetricLayoutPreset = {
            name: summaryLayoutName.trim(),
            metricOrder: summaryMetricOrder,
            selectedMetrics: selectedSummaryMetrics
        };

        setSavedSummaryLayouts(prev => {
            const exists = prev.findIndex(l => l.name === newLayout.name);
            if (exists !== -1) {
                const updated = [...prev];
                updated[exists] = newLayout;
                return updated;
            }
            return [...prev, newLayout];
        });

        setSummaryLayoutName('');
        setShowSaveSummaryDialog(false);
        toast({ title: "Đã lưu", description: "Layout Summary đã được lưu" });
    }, [summaryLayoutName, summaryMetricOrder, selectedSummaryMetrics, setSavedSummaryLayouts]);

    const handleLoadSummaryLayout = useCallback((layoutName: string) => {
        const layout = savedSummaryLayouts.find(l => l.name === layoutName);
        if (layout) {
            setSummaryMetricOrder(layout.metricOrder);
            setSelectedSummaryMetrics(layout.selectedMetrics);
            setSelectedSummaryLayout(layoutName);
            toast({ title: "Đã tải", description: `Layout "${layoutName}" đã được áp dụng` });
        }
    }, [savedSummaryLayouts, setSummaryMetricOrder, setSelectedSummaryMetrics]);

    const handleDeleteSummaryLayout = useCallback((layoutName: string) => {
        setSavedSummaryLayouts(prev => prev.filter(l => l.name !== layoutName));
        if (selectedSummaryLayout === layoutName) {
            setSelectedSummaryLayout('');
        }
        toast({ title: "Đã xóa", description: "Layout đã được xóa" });
    }, [setSavedSummaryLayouts, selectedSummaryLayout]);

    // ==================== SALE LAYOUT HANDLERS ====================

    const handleSaveSaleLayout = useCallback(() => {
        if (!saleLayoutName.trim()) return;

        const newLayout: MetricLayoutPreset = {
            name: saleLayoutName.trim(),
            metricOrder: saleMetricOrder,
            selectedMetrics: selectedSaleMetrics
        };

        setSavedSaleLayouts(prev => {
            const exists = prev.findIndex(l => l.name === newLayout.name);
            if (exists !== -1) {
                const updated = [...prev];
                updated[exists] = newLayout;
                return updated;
            }
            return [...prev, newLayout];
        });

        setSaleLayoutName('');
        setShowSaveSaleDialog(false);
        toast({ title: "Đã lưu", description: "Layout Sale đã được lưu" });
    }, [saleLayoutName, saleMetricOrder, selectedSaleMetrics, setSavedSaleLayouts]);

    const handleLoadSaleLayout = useCallback((layoutName: string) => {
        const layout = savedSaleLayouts.find(l => l.name === layoutName);
        if (layout) {
            setSaleMetricOrder(layout.metricOrder);
            setSelectedSaleMetrics(layout.selectedMetrics);
            setSelectedSaleLayout(layoutName);
            toast({ title: "Đã tải", description: `Layout "${layoutName}" đã được áp dụng` });
        }
    }, [savedSaleLayouts, setSaleMetricOrder, setSelectedSaleMetrics]);

    const handleDeleteSaleLayout = useCallback((layoutName: string) => {
        setSavedSaleLayouts(prev => prev.filter(l => l.name !== layoutName));
        if (selectedSaleLayout === layoutName) {
            setSelectedSaleLayout('');
        }
        toast({ title: "Đã xóa", description: "Layout đã được xóa" });
    }, [setSavedSaleLayouts, selectedSaleLayout]);

    // ==================== DETAIL TABLE LAYOUT HANDLERS ====================

    const handleSaveDetailLayout = useCallback((columnOrder: string[], columnWidths: Record<string, number>) => {
        if (!detailLayoutName.trim()) return;

        const newLayout: TableLayoutPreset = {
            name: detailLayoutName.trim(),
            columnOrder,
            columnWidths
        };

        setSavedDetailLayouts(prev => {
            const exists = prev.findIndex(l => l.name === newLayout.name);
            if (exists !== -1) {
                const updated = [...prev];
                updated[exists] = newLayout;
                return updated;
            }
            return [...prev, newLayout];
        });

        setDetailLayoutName('');
        setShowSaveDetailDialog(false);
        toast({ title: "Đã lưu", description: "Layout chi tiết đã được lưu" });
    }, [detailLayoutName, setSavedDetailLayouts]);

    const handleLoadDetailLayout = useCallback((layoutName: string): TableLayoutPreset | null => {
        const layout = savedDetailLayouts.find(l => l.name === layoutName);
        if (layout) {
            setSelectedDetailLayout(layoutName);
            toast({ title: "Đã tải", description: `Layout "${layoutName}" đã được áp dụng` });
            return layout;
        }
        return null;
    }, [savedDetailLayouts]);

    const handleDeleteDetailLayout = useCallback((layoutName: string) => {
        setSavedDetailLayouts(prev => prev.filter(l => l.name !== layoutName));
        if (selectedDetailLayout === layoutName) {
            setSelectedDetailLayout('');
        }
        toast({ title: "Đã xóa", description: "Layout đã được xóa" });
    }, [setSavedDetailLayouts, selectedDetailLayout]);

    // ==================== HISTORICAL TABLE LAYOUT HANDLERS ====================

    const handleSaveHistoricalLayout = useCallback((columnOrder: string[], columnWidths: Record<string, number>) => {
        if (!historicalLayoutName.trim()) return;

        const newLayout: TableLayoutPreset = {
            name: historicalLayoutName.trim(),
            columnOrder,
            columnWidths
        };

        setSavedHistoricalLayouts(prev => {
            const exists = prev.findIndex(l => l.name === newLayout.name);
            if (exists !== -1) {
                const updated = [...prev];
                updated[exists] = newLayout;
                return updated;
            }
            return [...prev, newLayout];
        });

        setHistoricalLayoutName('');
        setShowSaveHistoricalDialog(false);
        toast({ title: "Đã lưu", description: "Layout lịch sử đã được lưu" });
    }, [historicalLayoutName, setSavedHistoricalLayouts]);

    const handleLoadHistoricalLayout = useCallback((layoutName: string): TableLayoutPreset | null => {
        const layout = savedHistoricalLayouts.find(l => l.name === layoutName);
        if (layout) {
            setSelectedHistoricalLayout(layoutName);
            toast({ title: "Đã tải", description: `Layout "${layoutName}" đã được áp dụng` });
            return layout;
        }
        return null;
    }, [savedHistoricalLayouts]);

    const handleDeleteHistoricalLayout = useCallback((layoutName: string) => {
        setSavedHistoricalLayouts(prev => prev.filter(l => l.name !== layoutName));
        if (selectedHistoricalLayout === layoutName) {
            setSelectedHistoricalLayout('');
        }
        toast({ title: "Đã xóa", description: "Layout đã được xóa" });
    }, [setSavedHistoricalLayouts, selectedHistoricalLayout]);

    // ==================== RESET ALL LAYOUTS ====================

    const handleResetAllLayouts = useCallback(() => {
        setMarketingMetricOrder(defaultMarketingMetricOrder);
        setSelectedMarketingMetrics(defaultMarketingMetricOrder);
        setSummaryMetricOrder(defaultSummaryMetricOrder);
        setSelectedSummaryMetrics(defaultSummaryMetricOrder);
        setSaleMetricOrder(defaultSaleMetricOrder);
        setSelectedSaleMetrics(defaultSaleMetricOrder);
        setSelectedMarketingLayout('');
        setSelectedSummaryLayout('');
        setSelectedSaleLayout('');
        setSelectedDetailLayout('');
        setSelectedHistoricalLayout('');
        toast({ title: "Đã đặt lại", description: "Tất cả giao diện đã được đặt lại về mặc định" });
    }, [
        setMarketingMetricOrder, setSelectedMarketingMetrics,
        setSummaryMetricOrder, setSelectedSummaryMetrics,
        setSaleMetricOrder, setSelectedSaleMetrics
    ]);

    // ==================== METRIC DRAG HANDLERS ====================

    const createMetricDragHandlers = useCallback((
        setDragged: (v: string | null) => void,
        order: string[],
        setOrder: (v: string[]) => void
    ) => ({
        handleDragStart: (e: React.DragEvent, metricKey: string) => {
            setDragged(metricKey);
            e.dataTransfer.effectAllowed = 'move';
        },
        handleDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        },
        handleDrop: (e: React.DragEvent, targetKey: string, dragged: string | null) => {
            e.preventDefault();
            if (!dragged || dragged === targetKey) {
                setDragged(null);
                return;
            }
            const newOrder = [...order];
            const draggedIndex = newOrder.indexOf(dragged);
            const targetIndex = newOrder.indexOf(targetKey);
            if (draggedIndex !== -1 && targetIndex !== -1) {
                newOrder.splice(draggedIndex, 1);
                newOrder.splice(targetIndex, 0, dragged);
                setOrder(newOrder);
            }
            setDragged(null);
        },
        handleDragEnd: () => setDragged(null)
    }), []);

    return {
        // Summary Metrics
        summaryMetricOrder,
        setSummaryMetricOrder,
        selectedSummaryMetrics,
        setSelectedSummaryMetrics,
        draggedSummaryMetric,
        setDraggedSummaryMetric,
        defaultSummaryMetricOrder,

        // Sale Metrics
        saleMetricOrder,
        setSaleMetricOrder,
        selectedSaleMetrics,
        setSelectedSaleMetrics,
        draggedSaleMetric,
        setDraggedSaleMetric,
        defaultSaleMetricOrder,

        // Marketing Metrics
        marketingMetricOrder,
        setMarketingMetricOrder,
        selectedMarketingMetrics,
        setSelectedMarketingMetrics,
        draggedMarketingMetric,
        setDraggedMarketingMetric,
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

        // Customizer States
        customizerOpen,
        setCustomizerOpen,
        summaryCustomizerOpen,
        setSummaryCustomizerOpen,
        saleCustomizerOpen,
        setSaleCustomizerOpen,
        marketingCustomizerOpen,
        setMarketingCustomizerOpen,
        historicalCustomizerOpen,
        setHistoricalCustomizerOpen,

        // Layout Handlers
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

        // Drag Handler Factory
        createMetricDragHandlers,
    };
};

export default useAdsLayoutPresets;
