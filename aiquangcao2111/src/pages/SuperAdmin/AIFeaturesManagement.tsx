import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFeatures } from '@/hooks/useFeatures';
import { AI_FEATURES, AI_FEATURE_NAMES } from '@/hooks/useAIFeatures';
import { Activity, TrendingUp, Users, Zap, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AIFeaturesManagement() {
  const navigate = useNavigate();
  const { features, loading } = useFeatures();
  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'limits'>('overview');

  const aiFeatures = Object.values(AI_FEATURES)
    .map(key => features[key])
    .filter(Boolean);

  const enabledCount = aiFeatures.filter(f => f?.enabled).length;
  const totalCount = aiFeatures.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Tính năng AI</h1>
          <p className="text-muted-foreground mt-1">
            Theo dõi các tính năng AI Assistant và thống kê sử dụng
          </p>
        </div>
        <Button
          onClick={() => navigate('/super-admin/features')}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Cấu hình Feature Flags
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tính năng AI</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enabledCount}/{totalCount}</div>
            <p className="text-xs text-muted-foreground">Đang hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Sử dụng AI hôm nay</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng requests</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Trong 24h qua</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tăng trưởng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">So với tuần trước</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'overview' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan
        </Button>
        <Button
          variant={activeTab === 'usage' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('usage')}
        >
          Thống kê sử dụng
        </Button>
        <Button
          variant={activeTab === 'limits' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('limits')}
        >
          Giới hạn
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách tính năng AI</CardTitle>
              <CardDescription>
                Quản lý các tính năng AI có sẵn trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(AI_FEATURE_NAMES).map(([key, name]) => {
                const feature = features[key];
                const isEnabled = feature?.enabled ?? false;

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{name}</h3>
                        <Badge variant={isEnabled ? 'default' : 'secondary'}>
                          {isEnabled ? 'Bật' : 'Tắt'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {feature?.description || 'Không có mô tả'}
                      </p>
                      {feature && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Nguồn: {feature.source === 'global' ? 'Toàn cục' : 
                                 feature.source === 'role' ? 'Theo vai trò' : 'Override'}
                        </p>
                      )}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/super-admin/features')}
                    >
                      Quản lý
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Thông tin quan trọng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>• Trang này dùng để <strong>XEM</strong> trạng thái và thống kê các tính năng AI</p>
              <p>• Để <strong>BẬT/TẮT</strong> tính năng, nhấn nút "Cấu hình Feature Flags" ở trên hoặc nút "Quản lý" bên cạnh mỗi tính năng</p>
              <p>• Mỗi vai trò (super_admin, admin, user) có thể có quyền truy cập khác nhau</p>
              <p>• Thống kê sử dụng chi tiết sẽ được cập nhật trong các phiên bản tới</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'usage' && (
        <Card>
          <CardHeader>
            <CardTitle>Thống kê sử dụng</CardTitle>
            <CardDescription>
              Theo dõi việc sử dụng các tính năng AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chức năng thống kê sẽ được triển khai trong phiên bản tiếp theo</p>
              <p className="text-sm mt-2">Sẽ bao gồm: Biểu đồ sử dụng, Top users, Thời gian đỉnh điểm</p>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'limits' && (
        <Card>
          <CardHeader>
            <CardTitle>Giới hạn sử dụng</CardTitle>
            <CardDescription>
              Cấu hình giới hạn sử dụng theo vai trò
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Chức năng giới hạn sẽ được triển khai trong phiên bản tiếp theo</p>
              <p className="text-sm mt-2">Sẽ cho phép: Đặt giới hạn hàng ngày, Theo vai trò, Rate limiting</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
