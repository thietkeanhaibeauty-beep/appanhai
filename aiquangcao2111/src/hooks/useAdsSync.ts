/**
 * useAdsSync - Hook quản lý đồng bộ dữ liệu từ Facebook
 * 
 * Tách từ AdsReportAuto.tsx để giảm kích thước component chính
 * Bao gồm: loadInsights, fetchCatalog, fetchExisting, handleHistoricalSync
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { format, subDays, addMonths, min } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { supabase } from '@/integrations/supabase/client';
import { getActiveAdAccounts } from '@/services/nocodb/facebookAdAccountsService';
import {
    getInsightsByUserAndDate,
    bulkInsertInsights
} from '@/services/nocodb/facebookInsightsAutoService';
import { getHistoricalInsightsByUserAndDate } from '@/services/nocodb/facebookInsightsHistoryService';
import { triggerHistoricalSync } from '@/services/nocodb/historicalInsightsSyncService';
import { getSalesReports } from '@/services/nocodb/salesReportsService';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

// ========================= TYPES =========================

export interface AdAccountStatus {
    account_status?: number;
    disable_reason?: string;
    hasPaymentIssue: boolean;
}

export interface CatalogItem {
    id: string;
    name: string;
    status?: string;
    effective_status?: string;
    daily_budget?: string;
    lifetime_budget?: string;
    campaign_id?: string;
    adset_id?: string;
    issues_info?: any[];
    is_deleted?: boolean;
}

export interface UseAdsSyncOptions {
    userId: string | undefined;
    dateRange: DateRange | undefined;
    historicalDateRange: DateRange | undefined;

    // ✅ Setters và values từ component - hook sẽ cập nhật states của component
    insights: any[];
    isSyncing: boolean;
    setInsights: React.Dispatch<React.SetStateAction<any[]>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    setIsSyncing: React.Dispatch<React.SetStateAction<boolean>>;
    setSyncStatus: React.Dispatch<React.SetStateAction<string>>;
    setCampaignCatalog: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
    setAdsetCatalog: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
    setAdCatalog: React.Dispatch<React.SetStateAction<CatalogItem[]>>;
    setAccountCurrency: React.Dispatch<React.SetStateAction<string>>;
}

// ========================= HELPERS =========================

/**
 * Sanitize status for NocoDB (which only accepts specific values)
 */
export const sanitizeNocoDBStatus = (status: string | null | undefined): string => {
    if (!status) return 'ACTIVE';
    const s = status.toUpperCase();

    if (['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'].includes(s)) {
        return s;
    }

    // Map known invalid statuses
    if (s === 'WITH_ISSUES') return 'PAUSED';
    if (s === 'PENDING_BILLING_INFO') return 'PAUSED';
    if (s === 'CAMPAIGN_PAUSED') return 'PAUSED';
    if (s === 'ADSET_PAUSED') return 'PAUSED';
    if (s === 'AD_PAUSED') return 'PAUSED';
    if (s === 'IN_PROCESS') return 'ACTIVE';
    if (s === 'PENDING_REVIEW') return 'PAUSED';

    return 'PAUSED';
};

/**
 * Split date range into 37-month chunks (Facebook API limit)
 */
export const splitDateRangeIntoChunks = (startDate: Date, endDate: Date) => {
    const chunks: Array<{ since: string; until: string }> = [];
    const MAX_MONTHS = 37;

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

        if (chunks.length > 100) {
            console.error('Quá nhiều đợt, đang dừng');
            break;
        }
    }

    return chunks;
};

// ========================= MAIN HOOK =========================

export const useAdsSync = ({
    userId,
    dateRange,
    historicalDateRange,
    // ✅ Setters và values từ component
    insights,
    isSyncing,
    setInsights,
    setLoading,
    setIsSyncing,
    setSyncStatus,
    setCampaignCatalog,
    setAdsetCatalog,
    setAdCatalog,
    setAccountCurrency,
}: UseAdsSyncOptions) => {
    const { toast } = useToast();

    // ✅ Chỉ giữ states cục bộ cho sync progress (không ảnh hưởng UI chính)
    const [syncProgress, setSyncProgress] = useState(0);

    // Historical states (riêng biệt, không ảnh hưởng main flow)
    const [historicalInsights, setHistoricalInsights] = useState<any[]>([]);
    const [historicalLoading, setHistoricalLoading] = useState(false);
    const [historicalSyncing, setHistoricalSyncing] = useState(false);
    const [historicalError, setHistoricalError] = useState<string | null>(null);

    // ==================== FETCH CATALOG ====================

    const fetchCatalog = useCallback(async (silent = false) => {
        try {
            if (!userId) return null;

            const adAccounts = await getActiveAdAccounts(userId);
            const accountData = adAccounts.find(acc => acc.is_active);
            if (!accountData) return null;

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

            // Cache for AI Assistant
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
    }, [userId, toast]);

    // ==================== FETCH EXISTING (FROM DB) ====================

    const fetchExisting = useCallback(async (force = false) => {
        if (!force && insights.length > 0) return;

        setLoading(true);
        try {
            if (!userId) {
                setInsights([]);
                setLoading(false);
                return;
            }

            const adAccounts = await getActiveAdAccounts(userId);
            const accountData = adAccounts.find(acc => acc.is_active);

            if (!accountData) {
                setInsights([]);
                setLoading(false);
                return;
            }

            const { getAllInsightsByUserAndDate } = await import('@/services/nocodb/facebookInsightsAutoService');
            const { getAllArchivedInsightsByUserAndDate } = await import('@/services/nocodb/facebookInsightsArchiveService');

            // Parallel fetching
            const autoPromise = getAllInsightsByUserAndDate(
                userId,
                '2020-01-01',
                '2099-12-31',
                accountData.account_id
            );

            const archivePromise = getAllArchivedInsightsByUserAndDate(
                userId,
                '2020-01-01',
                '2099-12-31',
                accountData.account_id
            );

            const salesPromise = getSalesReports(userId).catch(e => {
                console.warn('⚠️ Sales fetch failed:', e);
                return [];
            });

            // Stage 1: Render Active Data IMMEDIATELY
            let autoData: any[] = [];
            try {
                autoData = await autoPromise;
                if (autoData && autoData.length > 0) {
                    const sortedAuto = [...autoData].sort((a, b) =>
                        new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
                    );
                    setInsights(sortedAuto);
                    setLoading(false);
                }
            } catch (e) {
                console.error('❌ Auto data fetch failed:', e);
            }

            // Stage 2: Merge Archive + Sales
            let finalData: any[] = autoData;

            try {
                const [archiveData, salesData] = await Promise.all([archivePromise, salesPromise]);

                const combinedData = [...autoData, ...(archiveData || [])].sort((a, b) =>
                    new Date(b.date_start).getTime() - new Date(a.date_start).getTime()
                );

                finalData = combinedData;

                if (salesData && salesData.length > 0) {
                    const salesByCampaignDate = new Map<string, { phones: number; bookings: number; revenue: number }>();
                    salesData.forEach((sale: any) => {
                        if (sale.campaign_id) {
                            const cid = String(sale.campaign_id);
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

                setInsights(finalData);
                setLoading(false);

            } catch (e) {
                console.error('❌ Stage 2 failed:', e);
                setLoading(false);
            }

        } catch (e: any) {
            console.warn('⚠️ Error loading local insights:', e.message);
            setInsights([]);
        } finally {
            setLoading(false);
        }
    }, [userId, insights.length]);

    // ==================== SYNC NOW (TRIGGER CRON) ====================

    const handleSyncNow = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        setSyncStatus('Đang gửi yêu cầu đồng bộ...');

        try {
            const { data, error } = await supabase.functions.invoke('sync-ads-cron', {
                body: { limit: 5000, date_preset: 'maximum' }
            });

            if (error) throw error;

            sonnerToast.success('Đã gửi yêu cầu đồng bộ thành công', {
                description: `Đã xử lý ${data?.processed || 0} bản ghi`
            });

            setSyncStatus('Đang tải lại dữ liệu...');
            setTimeout(async () => {
                await fetchExisting(true);
                await fetchCatalog(true);
                setIsSyncing(false);
            }, 2000);

        } catch (error: any) {
            console.error('Sync error:', error);
            sonnerToast.error('Lỗi đồng bộ: ' + error.message);
            setIsSyncing(false);
        }
    }, [isSyncing, fetchExisting, fetchCatalog]);

    // ==================== FETCH HISTORICAL INSIGHTS ====================

    const fetchHistoricalInsights = useCallback(async () => {
        if (!historicalDateRange?.from || !historicalDateRange?.to) return;

        setHistoricalLoading(true);
        setHistoricalError(null);

        try {
            if (!userId) {
                setHistoricalInsights([]);
                setHistoricalLoading(false);
                return;
            }

            const adAccounts = await getActiveAdAccounts(userId);
            const accountData = adAccounts.find(acc => acc.is_active);

            if (!accountData) {
                setHistoricalInsights([]);
                setHistoricalLoading(false);
                return;
            }

            const startDate = format(historicalDateRange.from, 'yyyy-MM-dd');
            const endDate = format(historicalDateRange.to, 'yyyy-MM-dd');

            const data = await getHistoricalInsightsByUserAndDate(
                userId,
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
    }, [userId, historicalDateRange]);

    // ==================== SYNC HISTORICAL ====================

    const handleHistoricalSync = useCallback(async () => {
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
            if (!userId) {
                setHistoricalError('Vui lòng đăng nhập để tiếp tục');
                return;
            }

            const adAccounts = await getActiveAdAccounts(userId);
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
                userId: userId,
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
            console.error('❌ Error syncing historical insights:', err);

            let errorMessage = err.message || 'Không thể đồng bộ dữ liệu lịch sử';
            if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
                errorMessage = 'Không kết nối được tới function – có thể do Function chưa deploy hoặc gọi sai project.';
            }

            toast({
                title: "Lỗi đồng bộ",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setHistoricalSyncing(false);
        }
    }, [userId, historicalDateRange, toast, fetchHistoricalInsights]);

    // ==================== DERIVED CATALOGS ====================

    const derivedCatalogs = useMemo(() => {
        if (insights.length === 0) {
            return { campaigns: [], adsets: [], ads: [] };
        }

        const campaignsMap = new Map();
        const adsetsMap = new Map();
        const adsMap = new Map();

        insights.forEach(item => {
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

    // ✅ AUTO-LOAD: Tự động tải dữ liệu khi có userId
    useEffect(() => {
        if (userId && insights.length === 0) {
            console.log('🔄 [useAdsSync] Auto-loading data for user:', userId);
            fetchExisting();
        }
    }, [userId]);

    return {
        // Sync progress
        syncProgress,
        setSyncProgress,

        // Historical (quản lý riêng trong hook)
        historicalInsights,
        setHistoricalInsights,
        historicalLoading,
        setHistoricalLoading,
        historicalSyncing,
        setHistoricalSyncing,
        historicalError,
        setHistoricalError,

        // Actions
        fetchCatalog,
        fetchExisting,
        handleSyncNow,
        fetchHistoricalInsights,
        handleHistoricalSync,

        // Helpers
        sanitizeNocoDBStatus,
        splitDateRangeIntoChunks,
    };
};

export default useAdsSync;
