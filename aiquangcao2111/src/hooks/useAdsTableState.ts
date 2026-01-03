/**
 * useAdsTableState - Hook quản lý state cho bảng Ads Report
 * 
 * Tách từ AdsReportAuto.tsx để giảm kích thước component chính
 * Bao gồm: sorting, selection, breadcrumbs, column resize, drag & drop
 */

import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
// Toast is passed as parameter from parent component

// ========================= TYPES =========================

type SortDirection = 'asc' | 'desc' | null;

export interface BreadcrumbItem {
    level: 'campaign' | 'adset' | 'ad' | 'ad-daily';
    parentId: string | null;
    name: string;
}

// Toast function type (from useToast hook)
type ToastFunction = (props: { title?: string; description?: string; variant?: 'default' | 'destructive' }) => void;

export interface UseAdsTableStateOptions {
    insights: any[];
    toast: ToastFunction;
}

// ========================= DEFAULT VALUES =========================

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

// ========================= MAIN HOOK =========================

export const useAdsTableState = ({ insights, toast }: UseAdsTableStateOptions) => {
    // ==================== SORTING ====================
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [historicalSortField, setHistoricalSortField] = useState<string | null>(null);
    const [historicalSortDirection, setHistoricalSortDirection] = useState<SortDirection>(null);

    // ==================== SELECTION ====================
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [historicalSelectedRows, setHistoricalSelectedRows] = useState<Set<string>>(new Set());
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ACTIVE', 'PAUSED']);

    // ==================== BREADCRUMBS ====================
    const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
        { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
    ]);
    const [historicalBreadcrumbs, setHistoricalBreadcrumbs] = useState<BreadcrumbItem[]>([
        { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
    ]);

    // ==================== EXPANDED ADS ====================
    const [expandedAds, setExpandedAds] = useState<Set<string>>(new Set());
    const [historicalExpandedAds, setHistoricalExpandedAds] = useState<Set<string>>(new Set());

    // ==================== COLUMN FIELDS ====================
    const [selectedFields, setSelectedFields] = useLocalStorage<string[]>(
        'ads-report-columns',
        defaultFields
    );
    const [historicalSelectedFields, setHistoricalSelectedFields] = useLocalStorage<string[]>(
        'ads-report-historical-columns',
        defaultFields
    );

    // ==================== COLUMN WIDTHS ====================
    const [columnWidths, setColumnWidths] = useLocalStorage<Record<string, number>>(
        'ads-report-column-widths',
        {}
    );
    const [historicalColumnWidths, setHistoricalColumnWidths] = useLocalStorage<Record<string, number>>(
        'ads-report-historical-column-widths',
        {}
    );

    // ==================== COLUMN RESIZE STATE ====================
    const [resizingColumn, setResizingColumn] = useState<string | null>(null);
    const [startX, setStartX] = useState<number>(0);
    const [startWidth, setStartWidth] = useState<number>(0);
    const [resizingHistoricalColumn, setResizingHistoricalColumn] = useState<string | null>(null);
    const [historicalStartX, setHistoricalStartX] = useState<number>(0);
    const [historicalStartWidth, setHistoricalStartWidth] = useState<number>(0);

    // ==================== DRAG & DROP ====================
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
    const [historicalDraggedColumn, setHistoricalDraggedColumn] = useState<string | null>(null);

    // ==================== ROW STATUSES (UI Toggle) ====================
    const [rowStatuses, setRowStatuses] = useState<Record<string, boolean>>({});

    // ==================== DERIVED VALUES ====================
    const currentView = breadcrumbs[breadcrumbs.length - 1];
    const viewLevel = currentView.level;

    // ==================== HANDLERS ====================

    const handleSort = useCallback((field: string) => {
        if (sortField === field) {
            if (sortDirection === 'asc') {
                setSortDirection('desc');
            } else if (sortDirection === 'desc') {
                setSortField(null);
                setSortDirection(null);
            } else {
                setSortDirection('asc');
            }
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    }, [sortField, sortDirection]);

    const handleHistoricalSort = useCallback((field: string) => {
        if (historicalSortField === field) {
            if (historicalSortDirection === 'asc') {
                setHistoricalSortDirection('desc');
            } else if (historicalSortDirection === 'desc') {
                setHistoricalSortField(null);
                setHistoricalSortDirection(null);
            } else {
                setHistoricalSortDirection('asc');
            }
        } else {
            setHistoricalSortField(field);
            setHistoricalSortDirection('asc');
        }
    }, [historicalSortField, historicalSortDirection]);

    const getRowKey = useCallback((item: any): string | null => {
        if (viewLevel === 'campaign') return item.campaign_id || null;
        if (viewLevel === 'adset') return item.adset_id || null;
        return item.ad_id || null;
    }, [viewLevel]);

    const handleSelectAll = useCallback((checked: boolean, filteredInsights: any[]) => {
        if (checked) {
            const keys = filteredInsights
                .map(item => getRowKey(item))
                .filter(Boolean) as string[];
            setSelectedRows(new Set(keys));
        } else {
            setSelectedRows(new Set());
        }
    }, [getRowKey]);

    const handleSelectRow = useCallback((key: string | null, checked: boolean) => {
        if (!key) return;
        setSelectedRows(prev => {
            const newSelected = new Set(prev);
            if (checked) {
                newSelected.add(key);
            } else {
                newSelected.delete(key);
            }
            return newSelected;
        });
    }, []);

    const handleDrillDown = useCallback((
        newLevel: 'campaign' | 'adset' | 'ad',
        parentId: string,
        parentName: string
    ) => {
        setSelectedRows(new Set());
        setSelectedStatuses([]);

        if (newLevel === 'adset') {
            setBreadcrumbs([
                { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' },
                { level: 'adset', parentId: parentId, name: parentName }
            ]);
        } else if (newLevel === 'ad') {
            const campaignInfo = insights.find(i => i.adset_id === parentId);
            setBreadcrumbs([
                { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' },
                { level: 'adset', parentId: campaignInfo?.campaign_id || '', name: campaignInfo?.campaign_name || '' },
                { level: 'ad', parentId: parentId, name: parentName }
            ]);
        } else {
            setBreadcrumbs([
                { level: 'campaign', parentId: null, name: 'Tất cả chiến dịch' }
            ]);
        }
    }, [insights]);

    const handleBreadcrumbClick = useCallback((index: number) => {
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        setSelectedRows(new Set());
    }, [breadcrumbs]);

    const toggleAdExpansion = useCallback((adId: string) => {
        setExpandedAds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(adId)) {
                newSet.delete(adId);
            } else {
                newSet.add(adId);
            }
            return newSet;
        });
    }, []);

    // ==================== COLUMN DRAG HANDLERS ====================

    const handleColumnDragStart = useCallback((e: React.DragEvent, fieldName: string) => {
        setDraggedColumn(fieldName);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleColumnDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleColumnDrop = useCallback((e: React.DragEvent, targetField: string) => {
        e.preventDefault();

        if (!draggedColumn || draggedColumn === targetField) {
            setDraggedColumn(null);
            return;
        }

        const newFields = [...selectedFields];
        const draggedIndex = newFields.indexOf(draggedColumn);
        const targetIndex = newFields.indexOf(targetField);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            newFields.splice(draggedIndex, 1);
            newFields.splice(targetIndex, 0, draggedColumn);
            setSelectedFields(newFields);
        }

        setDraggedColumn(null);
    }, [draggedColumn, selectedFields, setSelectedFields]);

    const handleColumnDragEnd = useCallback(() => {
        setDraggedColumn(null);
    }, []);

    // Historical column drag
    const handleHistoricalColumnDragStart = useCallback((e: React.DragEvent, fieldName: string) => {
        setHistoricalDraggedColumn(fieldName);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleHistoricalColumnDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleHistoricalColumnDrop = useCallback((e: React.DragEvent, targetField: string) => {
        e.preventDefault();

        if (!historicalDraggedColumn || historicalDraggedColumn === targetField) {
            setHistoricalDraggedColumn(null);
            return;
        }

        const newFields = [...historicalSelectedFields];
        const draggedIndex = newFields.indexOf(historicalDraggedColumn);
        const targetIndex = newFields.indexOf(targetField);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            newFields.splice(draggedIndex, 1);
            newFields.splice(targetIndex, 0, historicalDraggedColumn);
            setHistoricalSelectedFields(newFields);

            toast({
                title: 'Đã di chuyển cột',
                description: 'Thứ tự cột đã được lưu tự động'
            });
        }

        setHistoricalDraggedColumn(null);
    }, [historicalDraggedColumn, historicalSelectedFields, setHistoricalSelectedFields]);

    const handleHistoricalColumnDragEnd = useCallback(() => {
        setHistoricalDraggedColumn(null);
    }, []);

    // ==================== COLUMN RESIZE HANDLERS ====================

    const handleResizeStart = useCallback((e: React.MouseEvent, fieldName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumn(fieldName);
        setStartX(e.clientX);
        setStartWidth(columnWidths[fieldName] || 150);
    }, [columnWidths]);

    const handleHistoricalResizeStart = useCallback((e: React.MouseEvent, fieldName: string) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingHistoricalColumn(fieldName);
        setHistoricalStartX(e.clientX);
        setHistoricalStartWidth(historicalColumnWidths[fieldName] || 150);
    }, [historicalColumnWidths]);

    return {
        // Sorting
        sortField,
        setSortField,
        sortDirection,
        setSortDirection,
        handleSort,
        historicalSortField,
        historicalSortDirection,
        handleHistoricalSort,

        // Selection
        selectedRows,
        setSelectedRows,
        historicalSelectedRows,
        setHistoricalSelectedRows,
        selectedStatuses,
        setSelectedStatuses,
        handleSelectAll,
        handleSelectRow,
        getRowKey,

        // Breadcrumbs
        breadcrumbs,
        setBreadcrumbs,
        historicalBreadcrumbs,
        setHistoricalBreadcrumbs,
        currentView,
        viewLevel,
        handleDrillDown,
        handleBreadcrumbClick,

        // Expanded Ads
        expandedAds,
        setExpandedAds,
        historicalExpandedAds,
        setHistoricalExpandedAds,
        toggleAdExpansion,

        // Column Fields
        selectedFields,
        setSelectedFields,
        historicalSelectedFields,
        setHistoricalSelectedFields,
        defaultFields,

        // Column Widths
        columnWidths,
        setColumnWidths,
        historicalColumnWidths,
        setHistoricalColumnWidths,

        // Column Resize
        resizingColumn,
        setResizingColumn,
        startX,
        setStartX,
        startWidth,
        setStartWidth,
        resizingHistoricalColumn,
        setResizingHistoricalColumn,
        historicalStartX,
        setHistoricalStartX,
        historicalStartWidth,
        setHistoricalStartWidth,
        handleResizeStart,
        handleHistoricalResizeStart,

        // Column Drag
        draggedColumn,
        setDraggedColumn,
        historicalDraggedColumn,
        setHistoricalDraggedColumn,
        handleColumnDragStart,
        handleColumnDragOver,
        handleColumnDrop,
        handleColumnDragEnd,
        handleHistoricalColumnDragStart,
        handleHistoricalColumnDragOver,
        handleHistoricalColumnDrop,
        handleHistoricalColumnDragEnd,

        // Row Statuses
        rowStatuses,
        setRowStatuses,
    };
};

export default useAdsTableState;
