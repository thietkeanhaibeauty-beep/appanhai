import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, Plus, Edit, Trash2, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  getPaymentPackages,
  createPaymentPackage,
  updatePaymentPackage,
  deletePaymentPackage,
  type PaymentPackage
} from '@/services/nocodb/paymentPackagesService';
import { AVAILABLE_FEATURES } from '@/constants/availableFeatures';
import { seedPaymentPackages } from '@/utils/seedPackages';
import FeatureMatrixEditor from '@/components/superadmin/FeatureMatrixEditor';

// Sử dụng danh sách tính năng dùng chung
// (xem src/constants/availableFeatures.ts)

export default function PaymentPackages() {
  const [packages, setPackages] = useState<PaymentPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PaymentPackage | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    tokens: '',
    duration_days: '30',
    features: [] as string[],
    is_active: true,
  });
  const [expandedPackages, setExpandedPackages] = useState<Set<string>>(new Set());

  const toggleExpand = (pkgId: string) => {
    setExpandedPackages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pkgId)) {
        newSet.delete(pkgId);
      } else {
        newSet.add(pkgId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const data = await getPaymentPackages(true); // Admin can see all
      setPackages(data);
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Không thể tải danh sách gói');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (pkg?: PaymentPackage) => {
    if (pkg) {
      console.log('📦 Opening package for edit:', pkg.name);
      console.log('📋 Package features:', pkg.features);
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        price: pkg.price.toString(),
        tokens: pkg.tokens?.toString() || '',
        duration_days: pkg.duration_days.toString(),
        features: Array.isArray(pkg.features) ? pkg.features : [],
        is_active: pkg.is_active,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        tokens: '',
        duration_days: '30',
        features: [],
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleFeatureToggle = (featureId: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter(f => f !== featureId)
        : [...prev.features, featureId]
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        toast.error('Vui lòng nhập tên gói');
        return;
      }

      const price = parseFloat(formData.price);
      if (!formData.price || isNaN(price) || price <= 0) {
        toast.error('Vui lòng nhập giá hợp lệ (lớn hơn 0)');
        return;
      }

      const durationDays = parseInt(formData.duration_days);
      if (!formData.duration_days || isNaN(durationDays) || durationDays <= 0) {
        toast.error('Vui lòng nhập thời hạn hợp lệ (lớn hơn 0)');
        return;
      }

      const tokens = formData.tokens ? parseInt(formData.tokens) : 0;

      const packageData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: price,
        tokens: tokens,
        duration_days: durationDays,
        features: formData.features,
        is_active: formData.is_active,
      };

      if (editingPackage) {
        await updatePaymentPackage(editingPackage.id, packageData);
        toast.success('Đã cập nhật gói thành công');
      } else {
        await createPaymentPackage(packageData);
        toast.success('Đã tạo gói mới thành công');
      }

      setDialogOpen(false);
      fetchPackages();
    } catch (error) {
      console.error('Error saving package:', error);
      toast.error('Không thể lưu gói');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa gói này?')) return;

    try {
      await deletePaymentPackage(id);
      toast.success('Đã xóa gói thành công');
      fetchPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Không thể xóa gói');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý gói thanh toán</h2>
          <p className="text-muted-foreground">
            Tạo và quản lý các gói dịch vụ
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo gói mới
          </Button>
        </div>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {packages.map((pkg) => (
          <Card key={pkg.id} className={`${!pkg.is_active ? 'opacity-60' : ''}`}>
            <CardHeader className="py-2 px-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <CardTitle className="text-sm">{pkg.name}</CardTitle>
                </div>
                <Badge variant={pkg.is_active ? 'default' : 'secondary'} className="text-[9px] px-1 py-0">
                  {pkg.is_active ? 'Hoạt động' : 'Tạm dừng'}
                </Badge>
              </div>
              <CardDescription className="text-[10px] line-clamp-1">{pkg.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 py-2 px-3">
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">{formatPrice(pkg.price)}</span>
                <span className="text-[10px] text-muted-foreground">/ {pkg.duration_days} ngày</span>
              </div>

              {pkg.tokens && pkg.tokens > 0 && (
                <div className="text-[10px] text-muted-foreground">
                  🪙 {pkg.tokens.toLocaleString('vi-VN')} Token
                </div>
              )}

              <button
                onClick={() => toggleExpand(pkg.id || String(pkg.Id))}
                className="flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                <span>Tính năng ({Array.isArray(pkg.features) ? pkg.features.length : 0})</span>
                {expandedPackages.has(pkg.id || String(pkg.Id)) ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>

              {expandedPackages.has(pkg.id || String(pkg.Id)) && Array.isArray(pkg.features) && pkg.features.length > 0 && (
                <ul className="text-[10px] space-y-0.5 pl-2 border-l border-primary/20 max-h-24 overflow-y-auto">
                  {pkg.features.slice(0, 5).map((featureId, idx) => {
                    const feature = AVAILABLE_FEATURES.find(f => f.id === featureId);
                    return (
                      <li key={idx} className="flex items-center gap-1 truncate">
                        <span className="text-primary">✓</span>
                        {feature?.name || featureId}
                      </li>
                    );
                  })}
                  {pkg.features.length > 5 && (
                    <li className="text-muted-foreground">+{pkg.features.length - 5} tính năng khác</li>
                  )}
                </ul>
              )}

              <div className="flex gap-1 pt-1">
                <Button variant="outline" size="sm" className="flex-1 h-6 text-[10px]" onClick={() => handleOpenDialog(pkg)}>
                  <Edit className="h-3 w-3 mr-1" />
                  Sửa
                </Button>
                <Button variant="outline" size="sm" className="h-6 px-2" onClick={() => handleDelete(pkg.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {packages.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Chưa có gói nào. Tạo gói đầu tiên để bắt đầu!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Feature Matrix Editor */}
      {packages.length > 0 && (
        <FeatureMatrixEditor onUpdate={fetchPackages} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Chỉnh sửa gói' : 'Tạo gói mới'}
            </DialogTitle>
            <DialogDescription>
              Điền thông tin gói dịch vụ bên dưới
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tên gói *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Gói cơ bản"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Giá (VNĐ) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="100000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tokens">Số Token AI</Label>
                <Input
                  id="tokens"
                  type="number"
                  value={formData.tokens}
                  onChange={(e) => setFormData({ ...formData, tokens: e.target.value })}
                  placeholder="300000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_days_inline">Thời hạn (ngày)</Label>
                <Input
                  id="duration_days_inline"
                  type="number"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả ngắn về gói"
                rows={2}
              />
            </div>

            <div className="space-y-3">
              <Label>Chức năng được sử dụng</Label>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  {/* Basic Features */}
                  <div>
                    <p className="text-sm font-semibold text-green-600 mb-2">🟢 Tính năng cơ bản (Starter)</p>
                    <div className="space-y-2 pl-2">
                      {AVAILABLE_FEATURES.filter(f => f.category === 'basic').map((feature) => (
                        <div key={feature.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature.id}
                            checked={formData.features.includes(feature.id)}
                            onCheckedChange={() => handleFeatureToggle(feature.id)}
                          />
                          <Label htmlFor={feature.id} className="text-sm font-normal cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pro Features */}
                  <div>
                    <p className="text-sm font-semibold text-amber-600 mb-2">🟡 Tính năng Pro</p>
                    <div className="space-y-2 pl-2">
                      {AVAILABLE_FEATURES.filter(f => f.category === 'pro').map((feature) => (
                        <div key={feature.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature.id}
                            checked={formData.features.includes(feature.id)}
                            onCheckedChange={() => handleFeatureToggle(feature.id)}
                          />
                          <Label htmlFor={feature.id} className="text-sm font-normal cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Enterprise Features */}
                  <div>
                    <p className="text-sm font-semibold text-purple-600 mb-2">🟣 Tính năng Enterprise</p>
                    <div className="space-y-2 pl-2">
                      {AVAILABLE_FEATURES.filter(f => f.category === 'enterprise').map((feature) => (
                        <div key={feature.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={feature.id}
                            checked={formData.features.includes(feature.id)}
                            onCheckedChange={() => handleFeatureToggle(feature.id)}
                          />
                          <Label htmlFor={feature.id} className="text-sm font-normal cursor-pointer">
                            {feature.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                Đã chọn {formData.features.length} chức năng
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Kích hoạt gói này</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSubmit}>
              {editingPackage ? 'Cập nhật' : 'Tạo gói'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}