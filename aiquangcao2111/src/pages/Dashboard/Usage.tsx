import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useFeatureLimits } from '@/hooks/useFeatureLimits';
import { getUsageSummary } from '@/services/usageTrackingService';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Usage() {
  const navigate = useNavigate();
  const { features, getUsagePercentage, isApproachingLimit } = useFeatureLimits();
  const [usageSummary, setUsageSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<7 | 30>(30);

  useEffect(() => {
    loadUsage();
  }, [period]);

  const loadUsage = async () => {
    try {
      setLoading(true);
      const summary = await getUsageSummary(period);
      setUsageSummary(summary);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUsageData = () => [
    {
      label: 'Chiến dịch',
      count: usageSummary['campaign_created'] || 0,
      limit: features?.max_campaigns || 0,
      percentage: getUsagePercentage('campaigns'),
      approaching: isApproachingLimit('campaigns'),
    },
    {
      label: 'Tài khoản quảng cáo',
      count: usageSummary['ad_account_connected'] || 0,
      limit: features?.max_ad_accounts || 0,
      percentage: getUsagePercentage('adAccounts'),
      approaching: isApproachingLimit('adAccounts'),
    },
    {
      label: 'Điểm AI',
      count: (usageSummary['ai_chat_message'] || 0) +
        (usageSummary['ai_campaign_generated'] || 0) +
        (usageSummary['ai_creative_generated'] || 0),
      limit: features?.ai_credits || 0,
      percentage: getUsagePercentage('aiCreditsUsed'),
      approaching: isApproachingLimit('aiCreditsUsed'),
    },
  ];

  const getTotalActions = () => {
    return Object.values(usageSummary).reduce((sum, count) => sum + count, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const usageData = getUsageData();
  const hasWarnings = usageData.some(item => item.approaching);

  return (
    <div className="w-full max-w-6xl mx-auto p-3 md:p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Thống kê sử dụng</h1>
          <p className="text-muted-foreground text-sm">
            Theo dõi mức sử dụng của bạn so với giới hạn gói
          </p>
        </div>

        <div className="flex gap-1">
          <Button
            variant={period === 7 ? 'default' : 'outline'}
            onClick={() => setPeriod(7)}
            size="sm"
          >
            7 ngày qua
          </Button>
          <Button
            variant={period === 30 ? 'default' : 'outline'}
            onClick={() => setPeriod(30)}
            size="sm"
          >
            30 ngày qua
          </Button>
        </div>
      </div>

      {hasWarnings && (
        <Alert variant="default">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Sắp đạt giới hạn</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              Bạn đang sắp đạt giới hạn cho một số tính năng. Hãy cân nhắc nâng cấp gói.
            </span>
            <Button onClick={() => navigate('/dashboard/packages')} size="sm">
              Nâng cấp gói
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">
              Tổng hành động
            </CardTitle>
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-lg font-bold">{getTotalActions()}</div>
            <p className="text-[10px] text-muted-foreground">
              {period} ngày qua
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">
              Yêu cầu AI
            </CardTitle>
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-lg font-bold">
              {(usageSummary['ai_chat_message'] || 0) +
                (usageSummary['ai_campaign_generated'] || 0) +
                (usageSummary['ai_creative_generated'] || 0)}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Điểm AI đã dùng
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-medium">
              Thời gian
            </CardTitle>
            <Calendar className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <div className="text-lg font-bold">{period}</div>
            <p className="text-[10px] text-muted-foreground">
              Số ngày theo dõi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Details */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        {usageData.map((item) => (
          <Card key={item.label}>
            <CardHeader className="py-2 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">{item.label}</CardTitle>
                {item.approaching ? (
                  <Badge variant="destructive" className="text-[10px] px-2 py-0">
                    <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                    Sắp đạt giới hạn
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Bình thường
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                Mức sử dụng của bạn trong {period} ngày qua
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 py-2 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.limit === -1 ? 'Không giới hạn' : `trên ${item.limit}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold">
                    {item.limit === -1 ? '∞' : `${Math.round(item.percentage)}%`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Đã dùng</p>
                </div>
              </div>

              {item.limit !== -1 && (
                <div className="space-y-1">
                  <Progress
                    value={item.percentage}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    {item.limit - item.count} còn lại
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Breakdown */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm">Chi tiết hoạt động</CardTitle>
          <CardDescription className="text-xs">
            Chi tiết các hành động của bạn
          </CardDescription>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="space-y-2">
            {Object.entries(usageSummary).map(([action, count]) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-xs capitalize">
                  {action.replace(/_/g, ' ')}
                </span>
                <Badge variant="secondary" className="text-xs">{count}</Badge>
              </div>
            ))}

            {Object.keys(usageSummary).length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">
                Chưa có hoạt động nào được ghi nhận
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
