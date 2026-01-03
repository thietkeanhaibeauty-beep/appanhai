import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Target, Eye, MousePointer, Download, BarChart3, Loader2 } from 'lucide-react';

export interface ReportData {
    reportType: 'marketing' | 'sales' | 'summary';
    dateRange: {
        startDate: string;
        endDate: string;
    };
    accountName?: string;
    summary: {
        spend: number;
        results: number;
        costPerResult: number;
        impressions?: number;
        reach?: number;
        clicks?: number;
        ctr?: number;
        revenue?: number;      // For sales
        phones?: number;       // For sales
        costPerPhone?: number; // For sales
    };
    topCampaigns?: Array<{
        name: string;
        results: number;
        spend: number;
    }>;
    comparison?: {
        spendChange: number;      // % change
        resultsChange: number;    // % change
    };
}

interface ReportCardProps {
    data: ReportData;
    isLoading?: boolean;
    onExportExcel?: () => void;
    onViewDetails?: () => void;
}

const formatVND = (value: number): string => {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M ₫`;
    }
    if (value >= 1000) {
        return `${(value / 1000).toFixed(0)}K ₫`;
    }
    return `${value.toLocaleString('vi-VN')} ₫`;
};

const formatNumber = (value: number): string => {
    return value.toLocaleString('vi-VN');
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

export const ReportCard: React.FC<ReportCardProps> = ({
    data,
    isLoading = false,
    onExportExcel,
    onViewDetails,
}) => {
    if (isLoading) {
        return (
            <Card className="w-full max-w-lg overflow-hidden bg-gradient-to-br from-pink-50 to-rose-50 dark:from-slate-800 dark:to-slate-900 border-pink-200 dark:border-slate-700 shadow-lg">
                {/* Skeleton Header */}
                <CardHeader className="pb-2 bg-gradient-to-r from-pink-400 to-rose-400 animate-pulse">
                    <div className="h-5 w-40 bg-white/30 rounded" />
                    <div className="h-3 w-56 bg-white/20 rounded mt-2" />
                </CardHeader>

                <CardContent className="p-4 space-y-4">
                    {/* Skeleton Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                                <div className="h-3 w-16 bg-gray-200 dark:bg-slate-600 rounded animate-pulse mb-2" />
                                <div className="h-6 w-24 bg-gray-300 dark:bg-slate-500 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Skeleton Top Campaigns */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-slate-600 rounded animate-pulse mb-3" />
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-2 py-2 border-b border-gray-100 dark:border-slate-700 last:border-0">
                                <div className="h-5 w-5 bg-gray-200 dark:bg-slate-600 rounded-full animate-pulse" />
                                <div className="flex-1 h-4 bg-gray-200 dark:bg-slate-600 rounded animate-pulse" />
                                <div className="h-4 w-16 bg-gray-200 dark:bg-slate-600 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>

                    {/* Loading Text */}
                    <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                        <span className="text-sm text-muted-foreground">Đang tải báo cáo...</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const { reportType, dateRange, summary, topCampaigns, comparison, accountName } = data;

    const getReportTitle = () => {
        switch (reportType) {
            case 'sales': return '📊 BÁO CÁO DOANH THU';
            case 'summary': return '📊 BÁO CÁO TỔNG HỢP';
            default: return '📊 BÁO CÁO MARKETING';
        }
    };

    return (
        <Card className="w-full max-w-lg overflow-hidden bg-gradient-to-br from-pink-50 to-rose-50 dark:from-slate-800 dark:to-slate-900 border-pink-200 dark:border-slate-700 shadow-lg">
            {/* Header */}
            <CardHeader className="pb-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white">
                <CardTitle className="text-lg font-bold">{getReportTitle()}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-pink-100">
                    <span>📅 {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}</span>
                    {accountName && (
                        <>
                            <span>│</span>
                            <span>📱 {accountName}</span>
                        </>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
                {/* Main Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Spend */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <DollarSign className="h-3 w-3" />
                            <span>Chi tiêu</span>
                        </div>
                        <div className="text-lg font-bold text-pink-600 dark:text-pink-400">
                            {formatVND(summary.spend)}
                        </div>
                        {comparison?.spendChange !== undefined && (
                            <div className={`flex items-center gap-1 text-xs ${comparison.spendChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {comparison.spendChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span>{comparison.spendChange >= 0 ? '+' : ''}{comparison.spendChange.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>

                    {/* Results */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Target className="h-3 w-3" />
                            <span>Kết quả</span>
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {formatNumber(summary.results)}
                        </div>
                        {comparison?.resultsChange !== undefined && (
                            <div className={`flex items-center gap-1 text-xs ${comparison.resultsChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {comparison.resultsChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span>{comparison.resultsChange >= 0 ? '+' : ''}{comparison.resultsChange.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>

                    {/* Cost per Result */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <BarChart3 className="h-3 w-3" />
                            <span>Chi phí/KQ</span>
                        </div>
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                            {formatVND(summary.costPerResult)}
                        </div>
                    </div>

                    {/* Reach or Revenue - show Revenue for sales/summary */}
                    {(reportType === 'sales' || reportType === 'summary') && summary.revenue !== undefined ? (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <DollarSign className="h-3 w-3" />
                                <span>Doanh thu</span>
                            </div>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {formatVND(summary.revenue)}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                <Eye className="h-3 w-3" />
                                <span>Reach</span>
                            </div>
                            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                {formatNumber(summary.reach || 0)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Additional Sales Metrics for sales/summary */}
                {(reportType === 'sales' || reportType === 'summary') && (summary.phones !== undefined || summary.costPerPhone !== undefined) && (
                    <div className="grid grid-cols-3 gap-3">
                        {summary.phones !== undefined && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <span>📱</span>
                                    <span>Số SĐT</span>
                                </div>
                                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {formatNumber(summary.phones)}
                                </div>
                            </div>
                        )}
                        {summary.costPerPhone !== undefined && summary.costPerPhone > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <span>💰</span>
                                    <span>Chi phí/SĐT</span>
                                </div>
                                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                                    {formatVND(summary.costPerPhone)}
                                </div>
                            </div>
                        )}
                        {/* Reach for summary - show at end */}
                        {reportType === 'summary' && summary.reach !== undefined && (
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                    <Eye className="h-3 w-3" />
                                    <span>Reach</span>
                                </div>
                                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    {formatNumber(summary.reach)}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Top Campaigns */}
                {topCampaigns && topCampaigns.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm border border-pink-100 dark:border-slate-700">
                        <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                            🏆 TOP CHIẾN DỊCH
                        </div>
                        <div className="space-y-2">
                            {topCampaigns.slice(0, 3).map((campaign, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                        <span className="truncate max-w-[120px]" title={campaign.name}>
                                            {campaign.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="font-medium text-foreground">{campaign.results} KQ</span>
                                        <span>{formatVND(campaign.spend)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {onExportExcel && (
                        <Button variant="outline" size="sm" onClick={onExportExcel} className="flex-1">
                            <Download className="h-4 w-4 mr-1" />
                            Excel
                        </Button>
                    )}
                    {onViewDetails && (
                        <Button variant="default" size="sm" onClick={onViewDetails} className="flex-1 bg-pink-500 hover:bg-pink-600">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            Chi tiết
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default ReportCard;
