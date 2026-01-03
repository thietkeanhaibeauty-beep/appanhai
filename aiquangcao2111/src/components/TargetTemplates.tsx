import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceTemplates, createServiceTemplate, updateServiceTemplate, deleteServiceTemplate, ServiceTemplate } from '@/services/nocodb/serviceTemplatesService';
import { Plus, Pencil, Trash2, Target, Loader2, MapPin } from 'lucide-react';
import LocationPickerDialog from './LocationPickerDialog';

// Using ServiceTemplate from service

interface TemplateFormData {
    name: string;
    campaign_name: string; // Tên chiến dịch mặc định
    template_type: string;
    age_min: number;
    age_max: number;
    gender: string;
    budget: number;
    budget_type: string;
    location_type: string;
    location_name: string;
    latitude?: string;
    longitude?: string;
    radius_km?: number;
    interest_keywords: string;
    headline: string;
    greeting_template: string;
    frequent_questions: string;
    is_default: boolean;
}

const defaultFormData: TemplateFormData = {
    name: '',
    campaign_name: '',
    template_type: 'link',
    age_min: 18,
    age_max: 65,
    gender: 'all',
    budget: 200000,
    budget_type: 'daily',
    location_type: 'country',
    location_name: 'Việt Nam',
    interest_keywords: '',
    headline: '',
    greeting_template: '',
    frequent_questions: '',
    is_default: false,
};

// Format number with commas (e.g., 200000 → 200,000)
const formatNumber = (num: number | string): string => {
    if (!num && num !== 0) return '';
    return Number(num).toLocaleString('vi-VN');
};

// Parse formatted number back to integer
const parseFormattedNumber = (str: string): number => {
    const cleaned = str.replace(/[^0-9]/g, '');
    if (!cleaned) return 0;
    return parseInt(cleaned, 10);
};
const FORM_STORAGE_KEY = 'targetTemplateFormDraft';

const TargetTemplates = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);

    // Initialize formData from sessionStorage if available (prevents reset on app switch)
    const [formData, setFormData] = useState<TemplateFormData>(() => {
        try {
            const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Check if draft is less than 1 hour old
                if (parsed.timestamp && Date.now() - parsed.timestamp < 3600000) {
                    return parsed.data;
                }
            }
        } catch (e) {
            console.error('Failed to restore form draft:', e);
        }
        return defaultFormData;
    });

    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [mapDialogOpen, setMapDialogOpen] = useState(false);

    // Auto-save formData to sessionStorage when it changes (only when dialog is open)
    useEffect(() => {
        if (dialogOpen && formData.name) {
            try {
                sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
                    data: formData,
                    timestamp: Date.now()
                }));
            } catch (e) {
                console.error('Failed to save form draft:', e);
            }
        }
    }, [formData, dialogOpen]);

    // Clear draft when dialog closes normally (not from app switch)
    const clearFormDraft = () => {
        try {
            sessionStorage.removeItem(FORM_STORAGE_KEY);
        } catch (e) { }
    };

    // Load templates
    const loadTemplates = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const data = await getServiceTemplates(user.id);
            setTemplates(data || []);
        } catch (error: any) {
            console.error('Failed to load templates:', error);
            toast({
                title: 'Lỗi',
                description: 'Không thể tải danh sách template',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTemplates();
    }, [user]);

    // Handle save
    const handleSave = async () => {
        if (!formData.name.trim() || !user) {
            toast({
                title: 'Lỗi',
                description: 'Vui lòng nhập tên template',
                variant: 'destructive',
            });
            return;
        }

        setSaving(true);
        try {
            // Auto-add @# prefix to each keyword (separated by comma)
            const formattedName = formData.name
                .split(',')
                .map(k => {
                    const cleaned = k.trim().replace(/\s+/g, '_');
                    // Add @# if not already present
                    return cleaned.startsWith('@#') ? cleaned : `@#${cleaned}`;
                })
                .join(', ');

            const templateData = {
                user_id: user.id,
                ...formData,
                name: formattedName, // Use formatted name with @# prefix
                campaign_name: formData.campaign_name || '', // Tên chiến dịch mặc định
                interest_keywords: formData.interest_keywords ? formData.interest_keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
                headline: formData.headline ? formData.headline.split('\n').map(s => s.trim()).filter(Boolean) : [],
                frequent_questions: formData.frequent_questions ? formData.frequent_questions.split('\n').map(s => s.trim()).filter(Boolean) : [],
            };

            if (editingTemplate) {
                await updateServiceTemplate(editingTemplate.Id!, templateData);
            } else {
                await createServiceTemplate(templateData);
            }

            toast({
                title: '✅ Thành công',
                description: editingTemplate ? 'Đã cập nhật template' : 'Đã tạo template mới',
            });
            setDialogOpen(false);
            setFormData(defaultFormData);
            setEditingTemplate(null);
            clearFormDraft(); // Clear saved draft on successful save
            loadTemplates();
        } catch (error: any) {
            console.error('Failed to save template:', error);
            toast({
                title: 'Lỗi',
                description: error.message || 'Không thể lưu template',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    // Handle delete
    const handleDelete = async (template: ServiceTemplate) => {
        if (!confirm(`Bạn có chắc muốn xóa template "${template.name}"?`)) return;

        try {
            await deleteServiceTemplate(template.Id!);
            toast({
                title: '✅ Đã xóa',
                description: `Template "${template.name}" đã được xóa`,
            });
            loadTemplates();
        } catch (error: any) {
            toast({
                title: 'Lỗi',
                description: 'Không thể xóa template',
                variant: 'destructive',
            });
        }
    };

    // Handle edit
    const handleEdit = (template: ServiceTemplate) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            campaign_name: template.campaign_name || '',
            template_type: template.template_type || 'link',
            age_min: template.age_min || 18,
            age_max: template.age_max || 65,
            gender: template.gender || 'all',
            budget: template.budget || 200000,
            budget_type: template.budget_type || 'daily',
            location_type: template.location_type || 'country',
            location_name: template.location_name || 'Việt Nam',
            latitude: template.latitude || '',
            longitude: template.longitude || '',
            radius_km: template.radius_km,
            interest_keywords: (template.interest_keywords || []).join(', '),
            headline: (template.headline || []).join('\n'),
            greeting_template: template.greeting_template || '',
            frequent_questions: (template.frequent_questions || []).join('\n'),
            is_default: template.is_default || false,
        });
        setDialogOpen(true);
    };

    // Handle new
    const handleNew = () => {
        setEditingTemplate(null);
        setFormData(defaultFormData);
        setDialogOpen(true);
    };

    const genderLabels: Record<string, string> = {
        'all': 'Tất cả',
        'male': 'Nam',
        'female': 'Nữ',
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-shrink-0 p-4 border-b">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Target className="w-6 h-6" />
                            Mẫu nhắm mục tiêu
                        </h1>
                        <p className="text-muted-foreground">
                            Lưu sẵn cấu hình để tạo quảng cáo nhanh bằng @#từkhóa
                        </p>
                    </div>
                    <Button onClick={handleNew}>
                        <Plus className="w-4 h-4 mr-2" />
                        Tạo mới
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : templates.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold mb-2">Chưa có template nào</h3>
                            <p className="text-muted-foreground mb-4">
                                Tạo template để lưu sẵn cấu hình quảng cáo
                            </p>
                            <Button onClick={handleNew}>
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo template đầu tiên
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {templates.map((template) => {
                            const isExpanded = expandedIds.has(template.Id!);
                            const toggleExpand = () => {
                                setExpandedIds(prev => {
                                    const next = new Set(prev);
                                    if (next.has(template.Id!)) next.delete(template.Id!);
                                    else next.add(template.Id!);
                                    return next;
                                });
                            };
                            return (
                                <Card
                                    key={template.Id}
                                    className="hover:shadow-md transition-shadow cursor-pointer"
                                    onClick={toggleExpand}
                                >
                                    <CardHeader className="pb-2 pt-3 px-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-sm font-semibold truncate">
                                                    {template.name}
                                                </CardTitle>
                                                <CardDescription className="text-xs mt-0.5">
                                                    {genderLabels[template.gender] || 'Tất cả'} • {template.age_min}-{template.age_max}t • {(template.budget / 1000).toFixed(0)}k
                                                </CardDescription>
                                            </div>
                                            <div className="flex gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleEdit(template)}>
                                                    <Pencil className="w-3 h-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(template)}>
                                                    <Trash2 className="w-3 h-3 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {isExpanded && (
                                        <CardContent className="pt-0 pb-2 px-3">
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                                <div>📍 {
                                                    template.location_type === 'coordinate' && template.latitude && template.longitude
                                                        ? `${Number(template.latitude).toFixed(4)}, ${Number(template.longitude).toFixed(4)} (r=${template.radius_km || 1}km)`
                                                        : template.location_name || 'Việt Nam'
                                                }</div>
                                                {template.interest_keywords && template.interest_keywords.length > 0 && (
                                                    <div className="truncate">🎯 {template.interest_keywords.slice(0, 2).join(', ')}</div>
                                                )}
                                                {template.headline && template.headline.length > 0 && (
                                                    <div>📝 {template.headline.length} tiêu đề</div>
                                                )}
                                                {template.greeting_template && (
                                                    <div>👋 Có mẫu chào</div>
                                                )}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader className="pb-2">
                        <DialogTitle>
                            {editingTemplate ? 'Sửa mẫu mục tiêu' : 'Tạo mẫu mục tiêu mới'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid gap-3 py-2 sm:gap-4 sm:py-4">
                        {/* Keyword Triggers + Campaign Name - Same Row */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                            <div className="grid gap-1 sm:gap-1.5">
                                <Label className="text-xs sm:text-sm">Từ khóa kích hoạt <span className="text-destructive">*</span></Label>
                                <Input
                                    placeholder="spa, khóa ads..."
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-1 sm:gap-1.5">
                                <Label className="text-xs sm:text-sm">Tên chiến dịch <span className="text-destructive">*</span></Label>
                                <Input
                                    placeholder="Quảng cáo FB..."
                                    value={formData.campaign_name}
                                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                                />
                            </div>
                        </div>
                        {formData.name && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-foreground -mt-1">
                                <span>💡 Chat:</span>
                                <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold text-xs">
                                    {formData.name.split(',').map(k => {
                                        const cleaned = k.trim().replace(/^@#/, '').replace(/\s+/g, '_');
                                        return `@#${cleaned}`;
                                    }).join(' ')}
                                </code>
                            </div>
                        )}

                        {/* Age & Gender */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-4">
                            <div className="grid gap-1 sm:gap-2">
                                <Label className="text-xs sm:text-sm">Tuổi từ <span className="text-destructive">*</span></Label>
                                <Input
                                    type="number"
                                    min={18}
                                    max={65}
                                    value={formData.age_min || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setFormData({ ...formData, age_min: 0 }); // Allow empty temporarily
                                        } else {
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num)) {
                                                setFormData({ ...formData, age_min: num });
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        // Set default and clamp on blur
                                        let val = formData.age_min;
                                        if (!val || val < 18) val = 18;
                                        if (val > 65) val = 65;
                                        setFormData({ ...formData, age_min: val });
                                    }}
                                />
                            </div>
                            <div className="grid gap-1 sm:gap-2">
                                <Label className="text-xs sm:text-sm">Đến</Label>
                                <Input
                                    type="number"
                                    min={18}
                                    max={65}
                                    value={formData.age_max || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            setFormData({ ...formData, age_max: 0 }); // Allow empty temporarily
                                        } else {
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num)) {
                                                setFormData({ ...formData, age_max: num });
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        // Set default and clamp on blur
                                        let val = formData.age_max;
                                        const minAge = formData.age_min || 18;

                                        // Default to 65 if empty
                                        if (!val) val = 65;
                                        // Must be >= age_min
                                        if (val < minAge) val = minAge;
                                        // Clamp to range
                                        if (val > 65) val = 65;
                                        if (val < 18) val = 18;

                                        setFormData({ ...formData, age_max: val });
                                    }}
                                />
                            </div>
                            <div className="grid gap-1 sm:gap-2">
                                <Label className="text-xs sm:text-sm">Giới tính <span className="text-destructive">*</span></Label>
                                <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="female">Nữ</SelectItem>
                                        <SelectItem value="male">Nam</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Budget - only daily (hide when coordinate, shown inline) */}
                        {formData.location_type !== 'coordinate' && (
                            <div className="grid gap-1 sm:gap-2">
                                <Label className="text-xs sm:text-sm">Ngân sách/ngày <span className="text-destructive">*</span></Label>
                                <Input
                                    type="text"
                                    inputMode="numeric"
                                    value={formData.budget ? formatNumber(formData.budget) : ''}
                                    onChange={(e) => {
                                        const parsed = parseFormattedNumber(e.target.value);
                                        setFormData({ ...formData, budget: parsed });
                                    }}
                                    onBlur={() => {
                                        // Minimum 30000, default 200000
                                        let val = formData.budget;
                                        if (!val || val < 30000) val = 30000;
                                        setFormData({ ...formData, budget: val });
                                    }}
                                    placeholder="200,000"
                                />
                            </div>
                        )}

                        {/* Location */}
                        <div className="grid gap-2 sm:gap-4">
                            {/* Country type - 2 columns */}
                            {formData.location_type === 'country' && (
                                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                                    <div className="grid gap-1 sm:gap-2">
                                        <Label className="text-xs sm:text-sm">Loại vị trí</Label>
                                        <Select value={formData.location_type} onValueChange={(v) => {
                                            const defaultRadius = v === 'city' ? 17 : v === 'coordinate' ? 1 : undefined;
                                            setFormData({ ...formData, location_type: v, radius_km: defaultRadius });
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="country">Quốc gia</SelectItem>
                                                <SelectItem value="city">Thành phố</SelectItem>
                                                <SelectItem value="coordinate">Tọa độ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1 sm:gap-2">
                                        <Label className="text-xs sm:text-sm">Tên quốc gia</Label>
                                        <Input
                                            placeholder="Việt Nam"
                                            value={formData.location_name}
                                            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* City type - 3 columns: Type | City Name | Radius */}
                            {formData.location_type === 'city' && (
                                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                    <div className="grid gap-1 sm:gap-2">
                                        <Label className="text-xs sm:text-sm">Loại vị trí</Label>
                                        <Select value={formData.location_type} onValueChange={(v) => {
                                            const defaultRadius = v === 'city' ? 17 : v === 'coordinate' ? 1 : undefined;
                                            setFormData({ ...formData, location_type: v, radius_km: defaultRadius });
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="country">Quốc gia</SelectItem>
                                                <SelectItem value="city">Thành phố</SelectItem>
                                                <SelectItem value="coordinate">Tọa độ</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-1 sm:gap-2">
                                        <Label className="text-xs sm:text-sm">Tên thành phố</Label>
                                        <Input
                                            placeholder="Hà Nội, HCM..."
                                            value={formData.location_name}
                                            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-1 sm:gap-2">
                                        <Label className="text-xs sm:text-sm">Bán kính (km)</Label>
                                        <Input
                                            type="number"
                                            min={17}
                                            placeholder="17"
                                            value={formData.radius_km === 0 ? '' : formData.radius_km || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '') {
                                                    setFormData({ ...formData, radius_km: 0 });
                                                } else {
                                                    setFormData({ ...formData, radius_km: parseInt(val) || 0 });
                                                }
                                            }}
                                            onBlur={() => {
                                                // Validate min 17 on blur
                                                const val = formData.radius_km || 0;
                                                if (val < 17) {
                                                    setFormData({ ...formData, radius_km: 17 });
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Coordinate type - 3 columns: Budget | Type | Radius */}
                            {formData.location_type === 'coordinate' && (
                                <>
                                    <div className="grid grid-cols-3 gap-2 sm:gap-4">
                                        <div className="grid gap-1 sm:gap-2">
                                            <Label className="text-xs sm:text-sm">Ngân sách/ngày</Label>
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                value={formData.budget ? formatNumber(formData.budget) : ''}
                                                onChange={(e) => {
                                                    const parsed = parseFormattedNumber(e.target.value);
                                                    setFormData({ ...formData, budget: parsed });
                                                }}
                                                onBlur={() => {
                                                    let val = formData.budget;
                                                    if (!val || val < 30000) val = 30000;
                                                    setFormData({ ...formData, budget: val });
                                                }}
                                                placeholder="200,000"
                                            />
                                        </div>
                                        <div className="grid gap-1 sm:gap-2">
                                            <Label className="text-xs sm:text-sm">Loại vị trí</Label>
                                            <Select value={formData.location_type} onValueChange={(v) => {
                                                const defaultRadius = v === 'city' ? 17 : v === 'coordinate' ? 1 : undefined;
                                                setFormData({ ...formData, location_type: v, radius_km: defaultRadius });
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="country">Quốc gia</SelectItem>
                                                    <SelectItem value="city">Thành phố</SelectItem>
                                                    <SelectItem value="coordinate">Tọa độ</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {/* Coordinates + Radius on same row (3 columns) */}
                                    <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
                                        <div className="grid gap-0.5 sm:gap-2">
                                            <Label className="text-[10px] sm:text-sm">Vĩ độ</Label>
                                            <Input
                                                placeholder="21.85..."
                                                className="h-8 sm:h-9 text-xs sm:text-sm"
                                                value={formData.latitude || ''}
                                                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-0.5 sm:gap-2">
                                            <Label className="text-[10px] sm:text-sm">Kinh độ</Label>
                                            <Input
                                                placeholder="106.76..."
                                                className="h-8 sm:h-9 text-xs sm:text-sm"
                                                value={formData.longitude || ''}
                                                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid gap-0.5 sm:gap-2">
                                            <Label className="text-[10px] sm:text-sm">Bán kính</Label>
                                            <Input
                                                type="number"
                                                min={1}
                                                placeholder="1"
                                                className="h-8 sm:h-9 text-xs sm:text-sm"
                                                value={formData.radius_km || 1}
                                                onChange={(e) => {
                                                    const val = parseInt(e.target.value) || 1;
                                                    setFormData({ ...formData, radius_km: Math.max(1, val) });
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {/* Map picker buttons - 2 buttons side by side */}
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setMapDialogOpen(true)}
                                            className="flex-1 h-9"
                                        >
                                            <MapPin className="w-4 h-4 mr-1" />
                                            📍 Chọn bản đồ
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                // Append to existing latitude/longitude with comma separator
                                                setMapDialogOpen(true);
                                            }}
                                            className="h-9 px-3"
                                            title="Thêm vị trí mới"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    {/* Display list of coordinates if multiple */}
                                    {formData.latitude && formData.latitude.includes(',') && (
                                        <div className="mt-2 p-2 bg-muted/30 rounded-md">
                                            <Label className="text-xs text-muted-foreground">Danh sách vị trí:</Label>
                                            <div className="mt-1 space-y-1">
                                                {formData.latitude.split(',').map((lat, idx) => {
                                                    const lngs = formData.longitude?.split(',') || [];
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between text-xs font-mono bg-background px-2 py-1 rounded">
                                                            <span>📍 {lat.trim()}, {lngs[idx]?.trim() || '?'}</span>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                                                onClick={() => {
                                                                    const lats = formData.latitude?.split(',') || [];
                                                                    const lngs = formData.longitude?.split(',') || [];
                                                                    lats.splice(idx, 1);
                                                                    lngs.splice(idx, 1);
                                                                    setFormData({
                                                                        ...formData,
                                                                        latitude: lats.join(','),
                                                                        longitude: lngs.join(',')
                                                                    });
                                                                }}
                                                            >
                                                                ×
                                                            </Button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <LocationPickerDialog
                                        open={mapDialogOpen}
                                        onOpenChange={setMapDialogOpen}
                                        onSave={(lat, lng) => {
                                            // If already has coordinates, append with comma
                                            if (formData.latitude && formData.longitude) {
                                                setFormData({
                                                    ...formData,
                                                    latitude: formData.latitude + ',' + lat.toFixed(8),
                                                    longitude: formData.longitude + ',' + lng.toFixed(8)
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    latitude: lat.toFixed(8),
                                                    longitude: lng.toFixed(8)
                                                });
                                            }
                                            setMapDialogOpen(false);
                                        }}
                                        showRadius={true}
                                        initialRadius={formData.radius_km || 1}
                                        onSaveWithRadius={(lat, lng, radius) => {
                                            // If already has coordinates, append with comma
                                            if (formData.latitude && formData.longitude) {
                                                setFormData({
                                                    ...formData,
                                                    latitude: formData.latitude + ',' + lat.toFixed(8),
                                                    longitude: formData.longitude + ',' + lng.toFixed(8),
                                                    radius_km: radius
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    latitude: lat.toFixed(8),
                                                    longitude: lng.toFixed(8),
                                                    radius_km: radius
                                                });
                                            }
                                            setMapDialogOpen(false);
                                        }}
                                        initialLat={formData.latitude ? parseFloat(formData.latitude.split(',')[0]) : undefined}
                                        initialLng={formData.longitude ? parseFloat(formData.longitude.split(',')[0]) : undefined}
                                    />
                                </>
                            )}
                        </div>

                        {/* Interests */}
                        <div className="grid gap-1.5 sm:gap-2">
                            <Label>Sở thích (cách nhau bằng dấu phẩy)</Label>
                            <Input
                                placeholder="làm đẹp, spa, thẩm mỹ viện..."
                                value={formData.interest_keywords}
                                onChange={(e) => setFormData({ ...formData, interest_keywords: e.target.value })}
                            />
                        </div>

                        {/* Headlines + Greeting - Same Row */}
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                            <div className="grid gap-1 sm:gap-1.5">
                                <Label className="text-xs sm:text-sm">Tiêu đề (mỗi dòng 1) <span className="text-destructive">*</span></Label>
                                <Textarea
                                    placeholder={"Tiêu đề 1\nTiêu đề 2"}
                                    rows={2}
                                    className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm"
                                    value={formData.headline}
                                    onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-1 sm:gap-1.5">
                                <Label className="text-xs sm:text-sm">Mẫu câu chào <span className="text-destructive">*</span></Label>
                                <Textarea
                                    placeholder={"Chào bạn!\nXin chào!"}
                                    rows={2}
                                    className="min-h-[50px] sm:min-h-[60px] text-xs sm:text-sm"
                                    value={formData.greeting_template}
                                    onChange={(e) => setFormData({ ...formData, greeting_template: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Questions - max 3 */}
                        <div className="grid gap-1.5 sm:gap-2">
                            <Label>Câu hỏi thường gặp (tối đa 3 câu)</Label>
                            <Textarea
                                placeholder={"Giá bao nhiêu ạ?\nCó khuyến mãi không?\nLàm có đau không?"}
                                rows={2}
                                className="min-h-[60px] sm:min-h-[80px]"
                                value={formData.frequent_questions}
                                onChange={(e) => {
                                    const lines = e.target.value.split('\n');
                                    if (lines.length <= 3) {
                                        setFormData({ ...formData, frequent_questions: e.target.value });
                                    } else {
                                        // Keep only first 3 lines
                                        setFormData({ ...formData, frequent_questions: lines.slice(0, 3).join('\n') });
                                    }
                                }}
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-row gap-2 sm:gap-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setDialogOpen(false);
                                setFormData(defaultFormData);
                                setEditingTemplate(null);
                                clearFormDraft(); // Clear draft when user cancels
                            }}
                            className="flex-1"
                        >
                            Hủy
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="flex-1">
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {editingTemplate ? 'Cập nhật' : 'Tạo mẫu'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TargetTemplates;
