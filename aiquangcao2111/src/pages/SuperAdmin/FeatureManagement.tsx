import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw, Trash2, Plus } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  getFeatureFlags,
  getAllRoleFeatureFlags,
  upsertFeatureFlag,
  updateRoleFeatureFlag,
  deleteRoleFeatureFlagsByFeatureKey,
  deleteFeatureFlag,
  inferCategory,
  getUserFeatureOverrides,
  setUserFeatureOverride,
  deleteUserFeatureOverride,
  type FeatureFlag,
  type RoleFeatureFlag,
  type UserFeatureOverride
} from '@/services/nocodb/featureFlagsService';
import { Input } from '@/components/ui/input';

export default function FeatureManagement() {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [roleFeatures, setRoleFeatures] = useState<RoleFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // User Override Management
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userOverrides, setUserOverrides] = useState<UserFeatureOverride[]>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);

  const [changes, setChanges] = useState<{
    [key: string]: {
      enabled?: boolean;
      roles?: string[];
    };
  }>({});

  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    feature: FeatureFlag | null;
  }>({ open: false, feature: null });

  const [seeding, setSeeding] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load feature flags from NocoDB
      const flagsData = await getFeatureFlags();

      // Sort by Id DESC to get newest record first (Id auto-increments)
      const sortedFlags = [...flagsData].sort((a, b) => {
        const idA = (a as any).Id || 0;
        const idB = (b as any).Id || 0;
        return idB - idA; // DESC - highest Id (newest) first
      });

      // Remove duplicates based on key (keeps first = newest by Id)
      const uniqueFlags = Array.from(
        new Map(sortedFlags.map(flag => [flag.key, flag])).values()
      );



      // Auto-assign categories based on key prefix if not set
      const flagsWithCategories = uniqueFlags.map(flag => ({
        ...flag,
        category: flag.category || inferCategory(flag.key)
      }));

      // Load role features from NocoDB
      const roleFeaturesData = await getAllRoleFeatureFlags();

      setFeatures(flagsWithCategories);
      setRoleFeatures(roleFeaturesData);
    } catch (error) {
      console.error('❌ Error loading features:', error);
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load user overrides when user ID changes
  useEffect(() => {
    const loadUserOverrides = async () => {
      if (!selectedUserId || selectedUserId.length < 36) {
        setUserOverrides([]);
        return;
      }

      try {
        setLoadingOverrides(true);
        const overrides = await getUserFeatureOverrides(selectedUserId);
        setUserOverrides(overrides);

      } catch (error) {
        console.error('❌ Error loading user overrides:', error);
        toast.error('Lỗi khi tải overrides cho user');
        setUserOverrides([]);
      } finally {
        setLoadingOverrides(false);
      }
    };

    loadUserOverrides();
  }, [selectedUserId]);

  const handleToggleGlobal = (key: string, enabled: boolean) => {

    setChanges(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        enabled: Boolean(enabled),
      },
    }));
  };

  const handleToggleRole = (key: string, role: string, checked: boolean) => {
    setChanges(prev => {
      const existingRoles = prev[key]?.roles || getRolesForFeature(key);
      const newRoles = checked
        ? [...existingRoles.filter(r => r !== role), role] // Remove duplicates
        : existingRoles.filter(r => r !== role);

      return {
        ...prev,
        [key]: {
          ...prev[key],
          roles: newRoles,
        },
      };
    });
  };

  const getRolesForFeature = (key: string): string[] => {
    const roleFeature = roleFeatures.find(rf => rf.feature_key === key);
    if (!roleFeature) return [];

    const roles: string[] = [];
    if (roleFeature.User) roles.push('user');
    if (roleFeature.admin) roles.push('admin');
    if (roleFeature.Superadmin) roles.push('super_admin');

    return roles;
  };

  const isRoleChecked = (key: string, role: string): boolean => {
    if (changes[key]?.roles !== undefined) {
      return changes[key].roles!.includes(role);
    }
    return getRolesForFeature(key).includes(role);
  };

  const hasChanges = Object.keys(changes).length > 0;

  // Filter features by category
  const filteredFeatures = categoryFilter === 'all'
    ? features
    : features.filter(f => f.category === categoryFilter);

  const getCategoryBadge = (category: string) => {
    const badges = {
      ai: { label: '🤖 AI', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' },
      manual: { label: '🛠️ Thủ công', className: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30' },
      report: { label: '📊 Báo cáo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30' },
      system: { label: '⚙️ Hệ thống', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30' },
      general: { label: '📌 Chung', className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30' },
    };
    return badges[category as keyof typeof badges] || badges.general;
  };

  const handleSave = async () => {
    try {
      setSaving(true);



      // Save ALL changes in parallel to avoid race conditions
      await Promise.all(
        Object.entries(changes).map(async ([key, change]) => {
          const feature = features.find(f => f.key === key);
          if (!feature) return;

          // Update global flag if changed
          if (change.enabled !== undefined) {

            await upsertFeatureFlag({
              key,
              name: feature.name,
              description: feature.description,
              enabled: change.enabled,
              category: feature.category, // CRITICAL: Include category
            });
          }

          // Update role assignments if changed (new consolidated format)
          if (change.roles !== undefined) {


            await updateRoleFeatureFlag(key, {
              User: change.roles.includes('user'),
              admin: change.roles.includes('admin'),
              Superadmin: change.roles.includes('super_admin'),
            });
          }
        })
      );



      // Load data mới TRƯỚC khi clear changes
      await loadData();

      // Clear changes SAU KHI data đã load xong
      setChanges({});

      toast.success('✅ Đã cập nhật cấu hình thành công');
    } catch (error) {
      console.error('❌ Error saving features:', error);
      toast.error('Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChanges({});
    toast.info('Đã hủy thay đổi');
  };

  const handleDeleteFeature = async (feature: FeatureFlag) => {
    try {
      setSaving(true);



      // 1. Xóa role assignments
      await deleteRoleFeatureFlagsByFeatureKey(feature.key);


      // 2. Xóa feature flag
      if (feature.Id) {
        await deleteFeatureFlag(feature.Id);

      }

      toast.success(`✅ Đã xóa feature: ${feature.name}`);
      setDeleteDialog({ open: false, feature: null });
      await loadData();
    } catch (error) {
      console.error('❌ Error deleting feature:', error);

      // Chi tiết lỗi
      if (error instanceof Error) {
        toast.error(`Lỗi khi xóa feature: ${error.message}`);
      } else {
        toast.error('Lỗi không xác định khi xóa feature');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddUserOverride = async (featureKey: string, enabled: boolean) => {
    if (!selectedUserId) {
      toast.error('Vui lòng nhập User ID');
      return;
    }

    try {
      setSaving(true);
      await setUserFeatureOverride(selectedUserId, featureKey, enabled);
      toast.success(`✅ Đã ${enabled ? 'bật' : 'tắt'} ${featureKey} cho user`);

      // Reload overrides
      const overrides = await getUserFeatureOverrides(selectedUserId);
      setUserOverrides(overrides);
    } catch (error) {
      console.error('❌ Error setting user override:', error);
      toast.error('Lỗi khi cập nhật override');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUserOverride = async (featureKey: string) => {
    if (!selectedUserId) return;

    try {
      setSaving(true);
      await deleteUserFeatureOverride(selectedUserId, featureKey);
      toast.success(`✅ Đã xóa override ${featureKey}`);

      // Reload overrides
      const overrides = await getUserFeatureOverrides(selectedUserId);
      setUserOverrides(overrides);
    } catch (error) {
      console.error('❌ Error deleting user override:', error);
      toast.error('Lỗi khi xóa override');
    } finally {
      setSaving(false);
    }
  };

  const handleSeedReports = async () => {
    const REPORT_FEATURES = [
      {
        key: 'report_ads',
        name: '📊 Báo cáo ADS',
        description: 'Xem báo cáo hiệu suất quảng cáo chi tiết',
        category: 'report',
      },
      {
        key: 'report_sale',
        name: '💰 Báo cáo Sale',
        description: 'Xem báo cáo doanh số và chuyển đổi',
        category: 'report',
      },
      {
        key: 'report_summary',
        name: '📈 Báo cáo Tổng',
        description: 'Xem tổng quan toàn bộ hiệu suất',
        category: 'report',
      },
    ];

    try {
      setSeeding(true);


      for (const feature of REPORT_FEATURES) {
        // 1. Create feature flag
        await upsertFeatureFlag({
          key: feature.key,
          name: feature.name,
          description: feature.description,
          enabled: true,
          category: feature.category,
        });


        // 2. Assign to all roles using new format
        await updateRoleFeatureFlag(feature.key, {
          User: true,
          admin: true,
          Superadmin: true,
        });

      }

      toast.success('✅ Đã thêm 3 report features thành công!');
      await loadData();
    } catch (error) {
      console.error('❌ Error seeding features:', error);
      toast.error('Lỗi khi thêm features');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* User Override Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔐 Gán tính năng cho User cụ thể</CardTitle>
          <CardDescription>
            Override role assignment - cho phép/chặn user cụ thể sử dụng feature (ưu tiên cao nhất)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nhập User ID (UUID) - ví dụ: 936acca5-d200-4f43-bfff-d9cf5cea4109"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => setSelectedUserId('')}
                disabled={!selectedUserId}
              >
                Xóa
              </Button>
            </div>

            {selectedUserId && selectedUserId.length >= 36 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Overrides cho user này:
                    <Badge variant="outline" className="ml-2">
                      {userOverrides.length}
                    </Badge>
                  </Label>
                  {loadingOverrides && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>

                {userOverrides.length > 0 ? (
                  <div className="grid gap-2">
                    {userOverrides.map(override => {
                      const feature = features.find(f => f.key === override.feature_key);
                      return (
                        <div
                          key={override.feature_key}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm">
                              {feature?.name || override.feature_key}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {override.feature_key}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={override.enabled ? 'default' : 'destructive'}>
                              {override.enabled ? '✓ Enabled' : '✗ Disabled'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUserOverride(override.feature_key)}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                    Chưa có override nào cho user này
                  </div>
                )}

                {/* Quick Add Override */}
                <div className="border-t pt-3 mt-3">
                  <Label className="text-sm font-medium mb-2 block">Thêm Override:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {features.map(feature => {
                      const hasOverride = userOverrides.some(o => o.feature_key === feature.key);
                      return (
                        <div key={feature.key} className="flex gap-1">
                          <Button
                            variant={hasOverride ? 'secondary' : 'outline'}
                            size="sm"
                            className="flex-1 justify-start text-xs"
                            onClick={() => handleAddUserOverride(feature.key, true)}
                            disabled={saving}
                          >
                            ✓ {feature.name}
                          </Button>
                          <Button
                            variant={hasOverride ? 'secondary' : 'outline'}
                            size="sm"
                            onClick={() => handleAddUserOverride(feature.key, false)}
                            disabled={saving}
                          >
                            ✗
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Tính năng</h1>
          <p className="text-muted-foreground mt-2">
            Bật/tắt tính năng cho toàn hệ thống hoặc theo vai trò
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedReports}
            disabled={seeding || saving}
          >
            {seeding ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang thêm...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Thêm Reports
              </>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={saving}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Làm mới
          </Button>

          {hasChanges && (
            <>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={saving}
              >
                Hủy thay đổi
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Lưu thay đổi
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <Button
          variant={categoryFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('all')}
        >
          Tất cả ({features.length})
        </Button>
        <Button
          variant={categoryFilter === 'ai' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('ai')}
        >
          🤖 AI ({features.filter(f => f.category === 'ai').length})
        </Button>
        <Button
          variant={categoryFilter === 'manual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('manual')}
        >
          🛠️ Thủ công ({features.filter(f => f.category === 'manual').length})
        </Button>
        <Button
          variant={categoryFilter === 'report' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('report')}
        >
          📊 Báo cáo ({features.filter(f => f.category === 'report').length})
        </Button>
        <Button
          variant={categoryFilter === 'system' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setCategoryFilter('system')}
        >
          ⚙️ Hệ thống ({features.filter(f => f.category === 'system').length})
        </Button>
      </div>

      <div className="grid gap-4">
        {filteredFeatures.map((feature) => {
          // Ensure proper boolean conversion
          const featureEnabled = Boolean(feature.enabled);
          const currentEnabled = changes[feature.key]?.enabled !== undefined
            ? Boolean(changes[feature.key]?.enabled)
            : featureEnabled;
          const isModified = changes[feature.key] !== undefined;
          const category = feature.category || 'general';
          const categoryBadge = getCategoryBadge(category);

          return (
            <Card key={feature.key} className={isModified ? 'border-primary' : ''}>
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 flex-wrap">
                      {feature.name}
                      {isModified && (
                        <Badge variant="secondary">Đã sửa</Badge>
                      )}
                      <Badge className={categoryBadge.className}>
                        {categoryBadge.label}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {feature.description || 'Không có mô tả'}
                    </CardDescription>
                    <div className="mt-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {feature.key}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`global-${feature.key}`}>Bật toàn cục</Label>
                        <Switch
                          id={`global-${feature.key}`}
                          checked={currentEnabled}
                          onCheckedChange={(checked) => handleToggleGlobal(feature.key, checked)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteDialog({ open: true, feature })}
                        title="Xóa feature"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Label className="text-sm font-medium">Quyền truy cập:</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {/* User Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${feature.key}-user`}
                            checked={isRoleChecked(feature.key, 'user')}
                            onCheckedChange={(checked) =>
                              handleToggleRole(feature.key, 'user', checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`${feature.key}-user`}
                            className="text-sm cursor-pointer whitespace-nowrap"
                          >
                            👤 User
                          </Label>
                        </div>

                        {/* Admin Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${feature.key}-admin`}
                            checked={isRoleChecked(feature.key, 'admin')}
                            onCheckedChange={(checked) =>
                              handleToggleRole(feature.key, 'admin', checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`${feature.key}-admin`}
                            className="text-sm cursor-pointer whitespace-nowrap"
                          >
                            🔧 Admin
                          </Label>
                        </div>

                        {/* Super Admin Checkbox */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${feature.key}-super_admin`}
                            checked={isRoleChecked(feature.key, 'super_admin')}
                            onCheckedChange={(checked) =>
                              handleToggleRole(feature.key, 'super_admin', checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`${feature.key}-super_admin`}
                            className="text-sm cursor-pointer whitespace-nowrap"
                          >
                            👑 Super Admin
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ open, feature: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa feature</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa feature <strong>{deleteDialog.feature?.name}</strong>?
              <br /><br />
              <Badge variant="outline" className="font-mono">
                {deleteDialog.feature?.key}
              </Badge>
              <br /><br />
              ⚠️ Hành động này sẽ xóa:
              <ul className="list-disc list-inside mt-2">
                <li>Feature flag chính</li>
                <li>Tất cả role assignments</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.feature && handleDeleteFeature(deleteDialog.feature)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
