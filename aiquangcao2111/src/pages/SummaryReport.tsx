import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BarChart3, DollarSign, TrendingUp, Users, Phone, Calendar, Eye, MousePointer } from "lucide-react";
import { formatCurrencyDisplay } from "@/utils/currencyHelpers";
import { getSalesReports } from "@/services/nocodb/salesReportsService";
import { getInsightsByUserAndDate, FacebookInsight } from "@/services/nocodb/facebookInsightsAutoService";
import { getActiveAdAccounts } from "@/services/nocodb/facebookAdAccountsService";
import DateRangePicker from "@/components/DateRangePicker";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast as sonnerToast } from "sonner";
import { useUserReportSettings } from "@/hooks/useUserReportSettings";

interface SalesRecord {
  Id?: number;
  phone_number: string;
  total_revenue: number;
  call_answered: boolean;
}

const SummaryReport = () => {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<SalesRecord[]>([]);
  const [insightsData, setInsightsData] = useState<FacebookInsight[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      if (!user?.id) {
        sonnerToast.error("Vui lòng đăng nhập");
        return;
      }

      // Get active ad account first
      const adAccounts = await getActiveAdAccounts(user.id);
      const activeAccount = adAccounts.find(acc => acc.is_active);

      if (!activeAccount) {
        sonnerToast.error("Không tìm thấy tài khoản quảng cáo đang hoạt động");
        return;
      }

      setActiveAccountId(activeAccount.account_id);

      // Fetch sales data
      const sales = await getSalesReports(user.id);
      setSalesData(sales || []);

      // Fetch insights data with account filter
      if (dateRange?.from && dateRange?.to) {
        const startDate = format(dateRange.from, 'yyyy-MM-dd');
        const endDate = format(dateRange.to, 'yyyy-MM-dd');

        const insights = await getInsightsByUserAndDate(
          user.id,
          startDate,
          endDate,
          activeAccount.account_id
        );

        setInsightsData(insights || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      sonnerToast.error("Không thể tải dữ liệu báo cáo: " + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Marketing metrics - Deduplicate first, then use campaign level only
  // Step 1: Deduplicate by campaign_id + date + level
  // Step 1: Deduplicate by campaign_id + date + level
  const dedupedInsights = insightsData.reduce((acc, insight) => {
    const normalizedDate = insight.date_start?.split('T')[0];
    const key = `${insight.campaign_id}_${normalizedDate}_${insight.level || 'campaign'}`;

    if (!acc[key]) {
      acc[key] = insight;
    } else {
      // Keep the insight with newest created_at timestamp
      const existingDate = new Date(acc[key].created_at || 0);
      const newDate = new Date(insight.created_at || 0);
      if (newDate > existingDate) {
        acc[key] = insight;
      }
    }
    return acc;
  }, {} as Record<string, FacebookInsight>);

  const uniqueInsights: FacebookInsight[] = Object.values(dedupedInsights);

  // Step 2: Filter to campaign level only (with auto-fix for missing level)
  const campaignLevelInsights: FacebookInsight[] = uniqueInsights.filter((row: FacebookInsight) => {
    // Auto-fix missing level based on entity IDs if needed
    const effectiveLevel = row.level || (row.ad_id ? 'ad' : row.adset_id ? 'adset' : 'campaign');
    return effectiveLevel === 'campaign';
  });


  const totalSpend = campaignLevelInsights.reduce((sum, row) => sum + Number(row.spend || 0), 0);
  const totalImpressions = campaignLevelInsights.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const totalReach = campaignLevelInsights.reduce((sum, row) => sum + Number(row.reach || 0), 0);
  const totalClicks = campaignLevelInsights.reduce((sum, row) => sum + Number(row.clicks || 0), 0);

  // Calculate Total Results: Robust Sum (Results OR Mess 7d OR Started 7d)
  const totalResults = campaignLevelInsights.reduce((sum, row) => {
    const res = Number(row.results);
    const mess = Number(row.results_messaging_replied_7d);
    const start = Number(row.started_7d);

    // Sum logic: whatever non-zero value is found first (or all if additive? No, we treat them as fallbacks for the same concept "Result")
    // Wait, in AdsReportAuto we used additive: returns sum + (res || mess || start || 0)
    return sum + (res || mess || start || 0);
  }, 0);
  const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
  const avgCPC = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "0.00";
  const avgCPM = totalImpressions > 0 ? ((totalSpend / totalImpressions) * 1000).toFixed(2) : "0.00";
  const avgCPP = totalReach > 0 ? ((totalSpend / totalReach) * 1000).toFixed(2) : "0.00";
  const avgCostPerResult = totalResults > 0 ? (totalSpend / totalResults).toFixed(2) : "0.00";

  // New Metrics for Sync
  const totalBudget = campaignLevelInsights.reduce((sum, row: any) => sum + Number(row.daily_budget || row.budget || 0), 0);
  const totalPhones = campaignLevelInsights.reduce((sum, row: any) => sum + Number(row.phones || 0), 0);
  const avgCostPerPhone = totalPhones > 0 ? (totalSpend / totalPhones).toFixed(2) : "0.00";
  const dailyMarketingCost = totalSpend; // Currently using totalSpend as placeholder for daily cost

  // Sales metrics
  const totalAppointments = salesData.length;
  const totalCustomers = new Set(salesData.map(r => r.phone_number)).size;
  const totalRevenue = salesData.reduce((sum, r) => sum + Number(r.total_revenue || r.service_revenue || 0), 0);
  const answeredCalls = salesData.filter(r => r.call_answered).length;
  const conversionRate = totalAppointments > 0 ? ((answeredCalls / totalAppointments) * 100).toFixed(2) : "0.00";
  const roas = totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : "0.00";

  // ✨ NEW: Business metrics for management
  // Tỉ lệ SĐT = SĐT (từ Sales) / Kết quả (từ FB) × 100
  const sdtRate = totalResults > 0 ? ((totalCustomers / totalResults) * 100).toFixed(2) : "0.00";
  // ✅ FIX: Tỉ lệ đặt lịch = Số đặt lịch / Kết quả (FB) × 100  
  const bookingRate = totalResults > 0 ? ((totalAppointments / totalResults) * 100).toFixed(2) : "0.00";
  // ✅ FIX: Chi phí/Đặt lịch = Chi tiêu / Số đặt lịch (totalSpend đã là VND, không cần chia 100)
  const costPerBooking = totalAppointments > 0 ? (totalSpend / totalAppointments).toFixed(0) : "0";
  // ✅ FIX: Chi phí MKT/Doanh thu % = Chi tiêu / Doanh thu × 100
  const revenueRate = totalRevenue > 0 ? ((totalSpend / totalRevenue) * 100).toFixed(2) : "0.00";

  return (
    <div className="p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Báo cáo Tổng</h1>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* ✨ TOP ROW: Key Business Metrics - TRÊN CÙNG */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-[10px] font-medium">DOANH THU</CardTitle>
            <DollarSign className="h-3 w-3 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-base font-bold text-yellow-600 dark:text-yellow-400">{formatCurrencyDisplay(totalRevenue, "VND")}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-[10px] font-medium">SỐ ĐẶT LỊCH</CardTitle>
            <Calendar className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-base font-bold text-green-600 dark:text-green-400">{totalAppointments.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-[10px] font-medium">SỐ KHÁCH HÀNG</CardTitle>
            <Users className="h-3 w-3 text-orange-600" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-base font-bold text-orange-600 dark:text-orange-400">{totalCustomers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
            <CardTitle className="text-[10px] font-medium">CHI PHÍ MKT %</CardTitle>
            <TrendingUp className="h-3 w-3 text-purple-600" />
          </CardHeader>
          <CardContent className="p-2 pt-0">
            <div className="text-base font-bold text-purple-600 dark:text-purple-400">{revenueRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Marketing - Compact */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">1. Marketing</h2>
        <MarketingOverviewSection
          totalSpend={totalSpend}
          totalImpressions={totalImpressions}
          totalResults={totalResults}
          avgCostPerResult={Number(avgCostPerResult)}
          totalClicks={totalClicks}
          avgCTR={Number(avgCTR)}
          avgCPC={Number(avgCPC)}
          avgCPM={Number(avgCPM)}
          avgCPP={Number(avgCPP)}
          totalReach={totalReach}
          totalBudget={totalBudget}
          totalPhones={totalPhones}
          avgCostPerPhone={Number(avgCostPerPhone)}
          dailyMarketingCost={dailyMarketingCost}
        />
      </div>

      {/* Section 2: Báo cáo Bán hàng - Compact */}
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">2. Báo cáo Bán hàng</h2>

        {/* All sales metrics in one compact row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] font-medium">TỈ LỆ ĐẶT LỊCH</CardTitle>
              <Calendar className="h-3 w-3 text-emerald-600" />
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{bookingRate}%</div>
              <p className="text-[10px] text-muted-foreground">{totalAppointments}/{totalResults}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] font-medium">TỈ LỆ SĐT</CardTitle>
              <Phone className="h-3 w-3 text-blue-600" />
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">{sdtRate}%</div>
              <p className="text-[10px] text-muted-foreground">{totalCustomers}/{totalResults}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] font-medium">CHI PHÍ/ĐẶT LỊCH</CardTitle>
              <DollarSign className="h-3 w-3 text-amber-600" />
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-base font-bold text-amber-600 dark:text-amber-400">{formatCurrencyDisplay(Number(costPerBooking), "VND")}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] font-medium">ROAS</CardTitle>
              <BarChart3 className="h-3 w-3 text-pink-600" />
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-base font-bold text-pink-600 dark:text-pink-400">{roas}x</div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Conversion metrics */}
        <div className="grid grid-cols-2 gap-1.5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] font-medium text-muted-foreground">TỶ LỆ CHUYỂN ĐỔI</CardTitle>
              <TrendingUp className="h-3 w-3 text-primary" />
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-base font-bold text-primary">{conversionRate}%</div>
              <p className="text-[10px] text-muted-foreground">{answeredCalls}/{totalAppointments} cuộc gọi</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
              <CardTitle className="text-[10px] font-medium text-muted-foreground">CUỘC GỌI THÀNH CÔNG</CardTitle>
              <Phone className="h-3 w-3 text-primary" />
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="text-base font-bold text-primary">{answeredCalls.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SummaryReport;

// Sub-component for Dynamic Marketing Overview
const MarketingOverviewSection = ({
  totalSpend,
  totalImpressions,
  totalResults,
  avgCostPerResult,
  totalClicks,
  avgCTR,
  avgCPC,
  avgCPM,
  avgCPP,
  totalReach,
  totalBudget,
  totalPhones,
  avgCostPerPhone,
  dailyMarketingCost
}: {
  totalSpend: number;
  totalImpressions: number;
  totalResults: number;
  avgCostPerResult: number;
  totalClicks: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  avgCPP: number;
  totalReach: number;
  totalBudget: number;
  totalPhones: number;
  avgCostPerPhone: number;
  dailyMarketingCost: number;
}) => {
  const { settings, loading } = useUserReportSettings();
  const selectedMetrics = settings.selectedMarketingMetrics || ['spend', 'impressions', 'results', 'costPerResult'];

  // Helper to get metric config
  const getMetricConfig = (key: string) => {
    switch (key) {
      case 'spend':
        return { label: 'CHI PHÍ', icon: DollarSign, value: formatCurrencyDisplay(totalSpend, "VND") };
      case 'impressions':
        return { label: 'LƯỢT HIỂN THỊ', icon: Eye, value: totalImpressions.toLocaleString() };
      case 'results':
        return { label: 'KẾT QUẢ', icon: TrendingUp, value: totalResults.toLocaleString() };
      case 'costPerResult':
        // ✅ FIX: Recalculate from totalSpend/totalResults to ensure consistency
        const calculatedCostPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
        return { label: 'CHI PHÍ/KẾT QUẢ', icon: BarChart3, value: formatCurrencyDisplay(Math.round(calculatedCostPerResult), "VND") };
      case 'clicks':
        return { label: 'LƯỢT NHẤP', icon: MousePointer, value: totalClicks.toLocaleString() };
      case 'ctr':
        return { label: 'CTR', icon: MousePointer, value: `${avgCTR}%` };
      case 'cpc':
        return { label: 'CPC', icon: DollarSign, value: formatCurrencyDisplay(avgCPC, "VND") };
      case 'cpm':
        return { label: 'CPM', icon: Eye, value: formatCurrencyDisplay(avgCPM, "VND") };
      case 'cpp':
        return { label: 'CPP', icon: Users, value: formatCurrencyDisplay(avgCPP, "VND") };
      case 'reach':
        return { label: 'TIẾP CẬN', icon: Users, value: totalReach.toLocaleString() };
      case 'budget':
      case 'adsetBudget': // Map adsetBudget to total budget for now
        return { label: 'NGÂN SÁCH HÀNG NGÀY', icon: DollarSign, value: formatCurrencyDisplay(totalBudget, "VND") };
      case 'phones':
        return { label: 'SỐ ĐIỆN THOẠI', icon: Phone, value: totalPhones.toLocaleString() };
      case 'costPerPhone':
        return { label: 'CHI PHÍ/SĐT', icon: DollarSign, value: formatCurrencyDisplay(avgCostPerPhone, "VND") };
      case 'dailyMarketingCost':
        return { label: 'CHI PHÍ MKT/NGÀY', icon: DollarSign, value: formatCurrencyDisplay(dailyMarketingCost, "VND") };
      default:
        return null;
    }
  };

  if (loading) return <div>Đang tải cài đặt...</div>;

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
        {selectedMetrics.map(metricKey => {
          const config = getMetricConfig(metricKey);
          if (!config) return null;
          const Icon = config.icon;

          return (
            <Card key={metricKey} className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-2 pb-0">
                <CardTitle className="text-[10px] font-medium text-muted-foreground">{config.label}</CardTitle>
                <Icon className="h-3 w-3 text-primary" />
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="text-base font-bold text-primary">{config.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
