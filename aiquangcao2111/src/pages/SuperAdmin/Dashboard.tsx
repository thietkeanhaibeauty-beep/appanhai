import React, { useEffect, useState } from 'react';
import { Users, Database, Activity, ShieldCheck, TrendingUp } from 'lucide-react';
import { StatsCard } from '@/components/superadmin/StatsCard';
import { SystemHealthIndicator } from '@/components/superadmin/SystemHealthIndicator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSystemStats, SystemStats } from '@/services/nocodb/systemStatsService';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const systemStats = await getSystemStats();
        setStats(systemStats);
      } catch (error) {
        console.error('Error fetching stats:', error);
        toast.error('Failed to fetch dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const systemServices = [
    { name: 'Database', status: 'healthy' as const, uptime: '99.9%' },
    { name: 'Authentication', status: 'healthy' as const, uptime: '99.8%' },
    { name: 'Edge Functions', status: 'healthy' as const, uptime: '99.7%' },
    { name: 'Storage', status: 'healthy' as const, uptime: '99.9%' },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bảng điều khiển</h2>
        <p className="text-muted-foreground">
          Tổng quan hệ thống và các chỉ số chính
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Tổng người dùng"
          value={stats?.users.total || 0}
          description="Người dùng đã đăng ký trong hệ thống"
          icon={Users}
        />
        <StatsCard
          title="Tổng vai trò"
          value={stats?.roles.total || 0}
          description="Phân quyền trên toàn hệ thống"
          icon={ShieldCheck}
        />
        <StatsCard
          title="Thời gian hoạt động"
          value="99.9%"
          description="30 ngày qua"
          icon={Activity}
        />
        <StatsCard
          title="Trạng thái cơ sở dữ liệu"
          value="Hoạt động tốt"
          description="Tất cả bảng đang hoạt động"
          icon={Database}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tăng trưởng người dùng (30 ngày qua)
            </CardTitle>
            <CardDescription>
              Số lượng người dùng mới đăng ký theo thời gian
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats && stats.users.growth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.users.growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    name="Người dùng mới"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Không có dữ liệu tăng trưởng
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Phân bố vai trò
            </CardTitle>
            <CardDescription>
              Phân loại vai trò người dùng trong hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats && stats.roles.byType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.roles.byType}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ role, count }) => `${role}: ${count}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.roles.byType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Không có dữ liệu vai trò
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SystemHealthIndicator services={systemServices} />
      </div>
    </div>
  );
}
