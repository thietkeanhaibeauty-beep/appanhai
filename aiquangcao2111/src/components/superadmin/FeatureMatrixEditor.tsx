import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Loader2, Plus, Pencil, Check, X, RotateCcw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
    getPaymentPackages,
    createPaymentPackage,
    type PaymentPackage
} from '@/services/nocodb/paymentPackagesService';
import {
    getFeatureFlags,
    getAllRoleFeatureFlags,
    updatePackageTierFeature,
    upsertFeatureFlag,
    createNewFeature,
    type FeatureFlag,
    type RoleFeatureFlag
} from '@/services/nocodb/featureFlagsService';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { enableTrialFeatures } from '@/utils/enableTrialFeatures';

interface FeatureMatrixEditorProps {
    onUpdate?: () => void;
}

// Track pending changes: { "featureKey:tierName": newEnabled }
type PendingChanges = Map<string, boolean>;

export default function FeatureMatrixEditor({ onUpdate }: FeatureMatrixEditorProps) {
    const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
    const [roleFeatures, setRoleFeatures] = useState<RoleFeatureFlag[]>([]);
    const [packages, setPackages] = useState<PaymentPackage[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Pending changes (not yet saved to DB)
    const [pendingChanges, setPendingChanges] = useState<PendingChanges>(new Map());

    // State cho edit tên
    const [editingFeature, setEditingFeature] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');

    // State cho tạo gói mới
    const [showNewPackage, setShowNewPackage] = useState(false);
    const [newPackage, setNewPackage] = useState({
        name: '',
        price: '',
        tokens: '',
        duration_days: '30'
    });

    // State cho tạo tính năng mới
    const [showNewFeature, setShowNewFeature] = useState(false);
    const [newFeature, setNewFeature] = useState({
        key: '',
        name: '',
        description: '',
        category: 'system'
    });
    const [creatingFeature, setCreatingFeature] = useState(false);
    const [enablingTrial, setEnablingTrial] = useState(false);

    // Handler to enable all Trial features
    const handleEnableTrialFeatures = async () => {
        setEnablingTrial(true);
        try {
            const result = await enableTrialFeatures();
            toast.success(`✅ Đã bật ${result.enabled} tính năng cho Trial!`);
            await fetchData(); // Reload data
            onUpdate?.();
        } catch (error) {
            console.error('Error enabling Trial features:', error);
            toast.error('Lỗi khi bật tính năng Trial');
        } finally {
            setEnablingTrial(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [packagesData, flagsData, roleFeaturesData] = await Promise.all([
                getPaymentPackages(true),
                getFeatureFlags(),
                getAllRoleFeatureFlags()
            ]);

            // Sort packages by tier order
            const order = ['Trial', 'Starter', 'Pro', 'Enterprise', 'Team'];
            packagesData.sort((a, b) => {
                const aIndex = order.indexOf(a.name);
                const bIndex = order.indexOf(b.name);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });

            setPackages(packagesData);
            setRoleFeatures(roleFeaturesData);

            // Sort flags by feature_key order in roleFeatures
            const orderedKeys = roleFeaturesData.map(rf => rf.feature_key);
            flagsData.sort((a, b) => {
                const indexA = orderedKeys.indexOf(a.key);
                const indexB = orderedKeys.indexOf(b.key);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return a.key.localeCompare(b.key);
            });

            setFeatureFlags(flagsData);
            setPendingChanges(new Map()); // Clear pending changes on fresh load
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Không thể tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const startEditName = (feature: FeatureFlag) => {
        setEditingFeature(feature.key);
        setEditValue(feature.name);
    };

    const cancelEditName = () => {
        setEditingFeature(null);
        setEditValue('');
    };

    const saveEditName = async (feature: FeatureFlag) => {
        if (!editValue.trim()) return;

        try {
            await upsertFeatureFlag({
                ...feature,
                name: editValue.trim()
            });

            setFeatureFlags(prev => prev.map(f =>
                f.key === feature.key ? { ...f, name: editValue.trim() } : f
            ));

            toast.success('Đã cập nhật tên');
            setEditingFeature(null);
            setEditValue('');
        } catch (error) {
            console.error('Error updating feature name:', error);
            toast.error('Lỗi khi lưu tên');
        }
    };

    // Get key for pending changes map
    const getChangeKey = (featureKey: string, tierName: string) => `${featureKey}:${tierName}`;

    // Check if feature is enabled (considering pending changes)
    const isFeatureEnabled = (pkg: PaymentPackage, featureKey: string): boolean => {
        const tierName = pkg.name;
        const changeKey = getChangeKey(featureKey, tierName);

        // If there's a pending change, use that value
        if (pendingChanges.has(changeKey)) {
            return pendingChanges.get(changeKey)!;
        }

        // Otherwise get from roleFeatures
        const roleFeature = roleFeatures.find(rf => rf.feature_key === featureKey);
        if (!roleFeature) return false;
        return Boolean(roleFeature[tierName as keyof RoleFeatureFlag]);
    };

    // Toggle feature - just update pending changes, don't save yet
    const toggleFeature = (pkg: PaymentPackage, featureKey: string) => {
        const tierName = pkg.name;
        const changeKey = getChangeKey(featureKey, tierName);
        const currentValue = isFeatureEnabled(pkg, featureKey);
        const newValue = !currentValue;

        const newChanges = new Map(pendingChanges);
        newChanges.set(changeKey, newValue);
        setPendingChanges(newChanges);
    };

    // Check if there are unsaved changes
    const hasUnsavedChanges = () => pendingChanges.size > 0;

    // Save all pending changes to DB
    const saveAllChanges = async () => {
        if (!hasUnsavedChanges()) return;

        setSaving(true);
        try {
            const promises = Array.from(pendingChanges.entries()).map(([changeKey, enabled]) => {
                const [featureKey, tierName] = changeKey.split(':');
                return updatePackageTierFeature(featureKey, tierName, enabled);
            });

            await Promise.all(promises);

            // Update local roleFeatures state
            const newRoleFeatures = [...roleFeatures];
            pendingChanges.forEach((enabled, changeKey) => {
                const [featureKey, tierName] = changeKey.split(':');
                const idx = newRoleFeatures.findIndex(rf => rf.feature_key === featureKey);
                if (idx !== -1) {
                    (newRoleFeatures[idx] as any)[tierName] = enabled;
                }
            });
            setRoleFeatures(newRoleFeatures);

            setPendingChanges(new Map());
            toast.success(`Đã lưu ${pendingChanges.size} thay đổi`);
            onUpdate?.();
        } catch (error) {
            console.error('Error saving changes:', error);
            toast.error('Không thể lưu thay đổi');
        } finally {
            setSaving(false);
        }
    };

    // Discard all pending changes
    const discardChanges = () => {
        setPendingChanges(new Map());
        toast.info('Đã hủy thay đổi');
    };

    const handleCreatePackage = async () => {
        if (!newPackage.name.trim()) {
            toast.error('Vui lòng nhập tên gói');
            return;
        }

        try {
            await createPaymentPackage({
                name: newPackage.name.trim(),
                price: parseInt(newPackage.price) || 0,
                tokens: parseInt(newPackage.tokens) || 0,
                duration_days: parseInt(newPackage.duration_days) || 30,
                features: [],
                is_active: true
            });
            toast.success('Đã tạo gói mới. Vui lòng thêm cột tương ứng trong NocoDB table ROLE_FEATURE_FLAGS');
            setShowNewPackage(false);
            setNewPackage({ name: '', price: '', tokens: '', duration_days: '30' });
            await fetchData();
            onUpdate?.();
        } catch (error) {
            console.error('Error creating package:', error);
            toast.error('Không thể tạo gói');
        }
    };

    const handleCreateFeature = async () => {
        if (!newFeature.key.trim() || !newFeature.name.trim()) {
            toast.error('Vui lòng nhập key và tên tính năng');
            return;
        }

        setCreatingFeature(true);
        try {
            await createNewFeature({
                key: newFeature.key.trim(),
                name: newFeature.name.trim(),
                description: newFeature.description.trim(),
                category: newFeature.category,
                tiers: {
                    Trial: false,
                    Starter: false,
                    Pro: true,
                    Enterprise: true,
                    Team: false,
                },
            });
            toast.success('Đã tạo tính năng mới!');
            setShowNewFeature(false);
            setNewFeature({ key: '', name: '', description: '', category: 'system' });
            await fetchData();
            onUpdate?.();
        } catch (error) {
            console.error('Error creating feature:', error);
            toast.error('Không thể tạo tính năng');
        } finally {
            setCreatingFeature(false);
        }
    };

    // Get category badge based on feature key prefix
    const getCategoryBadge = (key: string) => {
        if (key.startsWith('ai_')) return <span className="text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 mr-1">🤖 AI</span>;
        if (key.startsWith('manual_')) return <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 mr-1">🛠️ Thủ công</span>;
        if (key.startsWith('report_')) return <span className="text-[9px] px-1 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 mr-1">📊 Báo cáo</span>;
        return <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 mr-1">⚙️ Hệ thống</span>;
    };

    const renderFeatureName = (feature: FeatureFlag) => {
        if (editingFeature === feature.key) {
            return (
                <div className="flex items-center gap-0.5">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="h-6 text-xs w-32 px-1"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditName(feature);
                            if (e.key === 'Escape') cancelEditName();
                        }}
                    />
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => saveEditName(feature)}>
                        <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-5 w-5" onClick={cancelEditName}>
                        <X className="h-3 w-3 text-red-600" />
                    </Button>
                </div>
            );
        }

        return (
            <div className="flex items-center gap-1 group">
                {getCategoryBadge(feature.key)}
                <span className="truncate max-w-[150px] text-sm" title={feature.name}>{feature.name}</span>
                <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => startEditName(feature)}
                >
                    <Pencil className="h-2.5 w-2.5 text-muted-foreground hover:text-primary" />
                </button>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-24">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <>
            <Card>
                <CardHeader className="py-2 px-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base">Quản lý tính năng theo gói</CardTitle>
                            <CardDescription className="text-xs">
                                Tick bật/tắt tính năng, ấn Lưu để áp dụng
                            </CardDescription>
                        </div>
                        <div className="flex gap-1">
                            <Button onClick={() => setShowNewFeature(true)} variant="outline" size="sm" className="h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                Thêm tính năng
                            </Button>
                            <Button onClick={() => setShowNewPackage(true)} variant="outline" size="sm" className="h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" />
                                Thêm gói
                            </Button>
                            <Button
                                onClick={handleEnableTrialFeatures}
                                disabled={enablingTrial}
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800"
                            >
                                {enablingTrial ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                Bật hết Trial
                            </Button>
                            {hasUnsavedChanges() && (
                                <>
                                    <Button onClick={discardChanges} variant="outline" size="sm" className="h-7 text-xs">
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        Hủy
                                    </Button>
                                    <Button onClick={saveAllChanges} disabled={saving} size="sm" className="h-7 text-xs">
                                        {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                                        Lưu ({pendingChanges.size})
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-muted/50 sticky top-0 z-10">
                                <tr>
                                    <th className="text-left p-2 font-medium min-w-[180px] sticky left-0 bg-muted/50">Tính năng</th>
                                    {packages.map(pkg => (
                                        <th key={pkg.id || pkg.Id} className="text-center p-2 font-medium min-w-[80px]">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className="text-xs font-semibold">{pkg.name}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {pkg.price.toLocaleString('vi-VN')} đ
                                                </span>
                                                <span className="text-[10px] text-muted-foreground bg-secondary/50 px-1 rounded">
                                                    {pkg.tokens?.toLocaleString('vi-VN') || 0} Tokens
                                                </span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {featureFlags.map((feature, idx) => (
                                    <tr key={feature.key} className={`border-b hover:bg-muted/20 ${idx % 2 === 0 ? '' : 'bg-muted/5'}`}>
                                        <td className="p-2 sticky left-0 bg-inherit">{renderFeatureName(feature)}</td>
                                        {packages.map(pkg => {
                                            const changeKey = getChangeKey(feature.key, pkg.name);
                                            const hasChange = pendingChanges.has(changeKey);
                                            return (
                                                <td key={pkg.id || pkg.Id} className="text-center p-2">
                                                    <Checkbox
                                                        checked={isFeatureEnabled(pkg, feature.key)}
                                                        onCheckedChange={() => toggleFeature(pkg, feature.key)}
                                                        className={`h-4 w-4 ${hasChange ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Dialog tạo gói mới */}
            <Dialog open={showNewPackage} onOpenChange={setShowNewPackage}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Tạo gói mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div>
                            <Label className="text-[10px]">Tên gói</Label>
                            <Input
                                value={newPackage.name}
                                onChange={(e) => setNewPackage(p => ({ ...p, name: e.target.value }))}
                                placeholder="VD: Premium"
                                className="h-7 text-xs"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label className="text-[10px]">Giá (VND)</Label>
                                <Input
                                    type="number"
                                    value={newPackage.price}
                                    onChange={(e) => setNewPackage(p => ({ ...p, price: e.target.value }))}
                                    placeholder="500000"
                                    className="h-7 text-xs"
                                />
                            </div>
                            <div>
                                <Label className="text-[10px]">Tokens</Label>
                                <Input
                                    type="number"
                                    value={newPackage.tokens}
                                    onChange={(e) => setNewPackage(p => ({ ...p, tokens: e.target.value }))}
                                    placeholder="50000"
                                    className="h-7 text-xs"
                                />
                            </div>
                        </div>
                        <div>
                            <Label className="text-[10px]">Thời hạn (ngày)</Label>
                            <Input
                                type="number"
                                value={newPackage.duration_days}
                                onChange={(e) => setNewPackage(p => ({ ...p, duration_days: e.target.value }))}
                                className="h-7 text-xs"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Sau khi tạo gói, cần thêm cột tương ứng trong NocoDB table ROLE_FEATURE_FLAGS
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewPackage(false)} size="sm" className="h-7 text-xs">Hủy</Button>
                        <Button onClick={handleCreatePackage} size="sm" className="h-7 text-xs">Tạo gói</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dialog tạo tính năng mới */}
            <Dialog open={showNewFeature} onOpenChange={setShowNewFeature}>
                <DialogContent className="max-w-xs">
                    <DialogHeader>
                        <DialogTitle className="text-sm">Thêm tính năng mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                        <div>
                            <Label className="text-[10px]">Key (ví dụ: notification_zalo_personal)</Label>
                            <Input
                                value={newFeature.key}
                                onChange={(e) => setNewFeature(f => ({ ...f, key: e.target.value }))}
                                placeholder="notification_zalo_personal"
                                className="h-7 text-xs"
                            />
                        </div>
                        <div>
                            <Label className="text-[10px]">Tên hiển thị</Label>
                            <Input
                                value={newFeature.name}
                                onChange={(e) => setNewFeature(f => ({ ...f, name: e.target.value }))}
                                placeholder="Thông báo Zalo cá nhân"
                                className="h-7 text-xs"
                            />
                        </div>
                        <div>
                            <Label className="text-[10px]">Mô tả</Label>
                            <Input
                                value={newFeature.description}
                                onChange={(e) => setNewFeature(f => ({ ...f, description: e.target.value }))}
                                placeholder="Gửi thông báo về Zalo cá nhân"
                                className="h-7 text-xs"
                            />
                        </div>
                        <div>
                            <Label className="text-[10px]">Phân loại</Label>
                            <select
                                value={newFeature.category}
                                onChange={(e) => setNewFeature(f => ({ ...f, category: e.target.value }))}
                                className="w-full h-7 text-xs border rounded px-2"
                            >
                                <option value="ai_">🤖 AI</option>
                                <option value="manual_">🛠️ Thủ công</option>
                                <option value="report_">📊 Báo cáo</option>
                                <option value="system">⚙️ Hệ thống</option>
                            </select>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                            Mặc định: Pro và Enterprise được bật, bạn có thể chỉnh trong bảng sau khi tạo
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowNewFeature(false)} size="sm" className="h-7 text-xs">Hủy</Button>
                        <Button onClick={handleCreateFeature} disabled={creatingFeature} size="sm" className="h-7 text-xs">
                            {creatingFeature ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                            Tạo tính năng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
