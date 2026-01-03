import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  XCircle,
  Package
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  getFeatureStatistics,
  getOrphanedFeatures,
  getValidFeatures,
  getMissingFeatures,
  deleteOrphanedFeature,
  cleanupOrphanedFeatures,
} from '@/services/nocodb/featureCleanupService';
import { seedAll, seedStandardFeatures } from '@/services/nocodb/featureSeedService';
import type { FeatureFlag } from '@/services/nocodb/featureFlagsService';

const FeatureCleanup = () => {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [orphanedFeatures, setOrphanedFeatures] = useState<FeatureFlag[]>([]);
  const [validFeatures, setValidFeatures] = useState<FeatureFlag[]>([]);
  const [missingFeatures, setMissingFeatures] = useState<string[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    orphaned: 0,
    missing: 0,
    expectedTotal: 0,
  });

  const loadFeatures = async () => {
    setLoading(true);
    try {
      const [statistics, orphaned, valid, missing] = await Promise.all([
        getFeatureStatistics(),
        getOrphanedFeatures(),
        getValidFeatures(),
        getMissingFeatures(),
      ]);

      setStats(statistics);
      setOrphanedFeatures(orphaned);
      setValidFeatures(valid);
      setMissingFeatures(missing);


    } catch (error) {
      console.error('❌ Failed to load features:', error);
      toast.error('Không thể tải danh sách features');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatures();
  }, []);

  const handleDeleteOrphaned = async (feature: FeatureFlag) => {
    if (!feature.Id) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa feature "${feature.name}" (${feature.key})?\n\nĐiều này cũng sẽ xóa tất cả role permissions liên quan.`
    );

    if (!confirmed) return;

    setDeleting(feature.key);
    try {
      await deleteOrphanedFeature(feature.Id, feature.key);
      toast.success(`Đã xóa feature: ${feature.name}`);
      loadFeatures();
    } catch (error) {
      console.error('❌ Failed to delete feature:', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Không thể xóa feature: ${errorMsg}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleCleanupAll = async () => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa TẤT CẢ ${stats.orphaned} features thừa?\n\nĐiều này không thể hoàn tác!`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const deletedCount = await cleanupOrphanedFeatures();
      toast.success(`Đã xóa ${deletedCount} features thừa`);
      loadFeatures();
    } catch (error) {
      console.error('❌ Failed to cleanup features:', error);
      toast.error('Không thể xóa features');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedMissing = async () => {
    const confirmed = window.confirm(
      `Bạn có muốn thêm ${stats.missing} features còn thiếu vào hệ thống?`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      await seedStandardFeatures({ overwrite: false });
      toast.success('Đã thêm features còn thiếu');
      loadFeatures();
    } catch (error) {
      console.error('❌ Failed to seed features:', error);
      toast.error('Không thể thêm features');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedAll = async () => {
    const confirmed = window.confirm(
      `Bạn có muốn seed TẤT CẢ features chuẩn và role permissions?\n\nĐiều này sẽ thêm features còn thiếu và cấu hình quyền mặc định.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const result = await seedAll({ overwrite: false });
      toast.success(`Đã seed ${result.features.length} features và ${result.rolePermissions} role permissions`);
      loadFeatures();
    } catch (error) {
      console.error('❌ Failed to seed all:', error);
      toast.error('Không thể seed features');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'ai':
        return <Badge variant="default" className="bg-purple-500">AI</Badge>;
      case 'manual':
        return <Badge variant="secondary">Thủ công</Badge>;
      case 'reporting':
        return <Badge variant="outline">Báo cáo</Badge>;
      default:
        return <Badge variant="outline">Khác</Badge>;
    }
  };

  if (loading && stats.total === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dọn dẹp Features</h2>
        <p className="text-muted-foreground">
          Quản lý và dọn dẹp các features thừa trong hệ thống
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tổng số</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-600">Hợp lệ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600">Thừa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.orphaned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600">Thiếu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.missing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Mong đợi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expectedTotal}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={loadFeatures} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
        {stats.missing > 0 && (
          <Button onClick={handleSeedMissing} disabled={loading} variant="default">
            <Sparkles className="h-4 w-4 mr-2" />
            Thêm {stats.missing} features thiếu
          </Button>
        )}
        {stats.orphaned > 0 && (
          <Button onClick={handleCleanupAll} disabled={loading} variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa {stats.orphaned} features thừa
          </Button>
        )}
        <Button onClick={handleSeedAll} disabled={loading} variant="secondary">
          <Package className="h-4 w-4 mr-2" />
          Seed tất cả (Features + Roles)
        </Button>
      </div>

      {/* Missing Features */}
      {missingFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Features còn thiếu ({missingFeatures.length})
            </CardTitle>
            <CardDescription>
              Các features được định nghĩa trong code nhưng chưa có trong database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {missingFeatures.map((key) => (
                <Alert key={key} variant="default" className="bg-orange-50 dark:bg-orange-950/20">
                  <AlertDescription>
                    <code className="text-sm font-mono">{key}</code>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orphaned Features */}
      {orphanedFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Features thừa cần xóa ({orphanedFeatures.length})
            </CardTitle>
            <CardDescription>
              Các features tồn tại trong database nhưng không được sử dụng trong code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {orphanedFeatures.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-950/20"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{feature.name}</span>
                      {getCategoryBadge(feature.category)}
                    </div>
                    <code className="text-sm text-muted-foreground">{feature.key}</code>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteOrphaned(feature)}
                    disabled={loading || deleting !== null}
                  >
                    {deleting === feature.key ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Valid Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Features hợp lệ ({validFeatures.length})
          </CardTitle>
          <CardDescription>
            Các features đang được sử dụng trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {validFeatures.map((feature) => (
              <div
                key={feature.key}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{feature.name}</span>
                    {getCategoryBadge(feature.category)}
                    {feature.enabled && (
                      <Badge variant="outline" className="text-green-600">
                        Đang bật
                      </Badge>
                    )}
                  </div>
                  <code className="text-sm text-muted-foreground">{feature.key}</code>
                  {feature.description && (
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureCleanup;
