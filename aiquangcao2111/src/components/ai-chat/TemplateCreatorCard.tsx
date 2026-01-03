import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2, Target, MapPin, Plus } from 'lucide-react';
import { TemplateFormData } from '@/hooks/useTemplateCreatorFlow';
import LocationPickerDialog from '@/components/LocationPickerDialog';

interface TemplateCreatorCardProps {
    formData: TemplateFormData;
    isSaving: boolean;
    onUpdate: (updates: Partial<TemplateFormData>) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

// Format number with commas
const formatNumber = (num: number | string): string => {
    if (!num && num !== 0) return '';
    return Number(num).toLocaleString('vi-VN');
};

// Parse formatted number back to integer
const parseFormattedNumber = (str: string): number | undefined => {
    const cleaned = str.replace(/[,.\s]/g, '');
    if (!cleaned) return undefined;
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? undefined : num;
};

export function TemplateCreatorCard({
    formData,
    isSaving,
    onUpdate,
    onSubmit,
    onCancel,
}: TemplateCreatorCardProps) {
    const [mapDialogOpen, setMapDialogOpen] = useState(false);

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Header - inline style */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Target className="w-4 h-4 text-primary" />
                    Tạo mẫu nhắm mục tiêu
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10" onClick={onCancel}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Form Content - 3 columns on desktop */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-3">

                {/* Column 1: Basic Info */}
                <div className="space-y-2">
                    {/* Keyword */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Từ khóa <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="spa, khóa_ads..."
                            value={formData.keyword}
                            onChange={(e) => onUpdate({ keyword: e.target.value })}
                            className="h-8 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                        />
                        {formData.keyword && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                → <code className="text-primary">@#{formData.keyword.replace(/\s+/g, '_')}</code>
                            </p>
                        )}
                    </div>

                    {/* Campaign Name */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Tên chiến dịch <span className="text-destructive">*</span></Label>
                        <Input
                            placeholder="Tên mặc định..."
                            value={formData.campaignName}
                            onChange={(e) => onUpdate({ campaignName: e.target.value })}
                            className="h-8 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                        />
                    </div>

                    {/* Age + Gender - inline */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Tuổi (18-65) <span className="text-destructive">*</span></Label>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    min={18}
                                    max={65}
                                    value={formData.ageMin || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            onUpdate({ ageMin: 0 }); // Allow empty temporarily
                                        } else {
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num)) {
                                                onUpdate({ ageMin: num });
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        let val = formData.ageMin;
                                        if (!val || val < 18) val = 18;
                                        if (val > 65) val = 65;
                                        onUpdate({ ageMin: val });
                                    }}
                                    className="h-7 w-12 text-sm text-center border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                                />
                                <span className="text-muted-foreground text-xs">-</span>
                                <Input
                                    type="number"
                                    min={18}
                                    max={65}
                                    value={formData.ageMax || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') {
                                            onUpdate({ ageMax: 0 }); // Allow empty temporarily
                                        } else {
                                            const num = parseInt(val, 10);
                                            if (!isNaN(num)) {
                                                onUpdate({ ageMax: num });
                                            }
                                        }
                                    }}
                                    onBlur={() => {
                                        let val = formData.ageMax;
                                        const minAge = formData.ageMin || 18;

                                        // Default to 65 if empty
                                        if (!val) val = 65;
                                        // Must be >= ageMin
                                        if (val < minAge) val = minAge;
                                        // Clamp to range
                                        if (val > 65) val = 65;
                                        if (val < 18) val = 18;

                                        onUpdate({ ageMax: val });
                                    }}
                                    className="h-7 w-12 text-sm text-center border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Giới tính <span className="text-destructive">*</span></Label>
                            <Select value={formData.gender} onValueChange={(v: any) => onUpdate({ gender: v })}>
                                <SelectTrigger className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus:ring-0">
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

                    {/* Budget - only daily, with comma formatting */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Ngân sách (tối thiểu 30,000 VNĐ) <span className="text-destructive">*</span></Label>
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={formData.budget ? formatNumber(formData.budget) : ''}
                            onChange={(e) => {
                                const parsed = parseFormattedNumber(e.target.value);
                                onUpdate({ budget: parsed || 0 });
                            }}
                            onBlur={() => {
                                // Minimum 30000
                                let val = formData.budget;
                                if (!val || val < 30000) val = 30000;
                                onUpdate({ budget: val });
                            }}
                            placeholder="200,000"
                            className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                        />
                    </div>
                </div>

                {/* Column 2: Location + Interests */}
                <div className="space-y-2">
                    {/* Location Type + Name - inline */}
                    <div className="flex gap-3 items-end">
                        <div className="flex-1">
                            <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Loại vị trí <span className="text-destructive">*</span></Label>
                            <Select
                                value={formData.locationType}
                                onValueChange={(v: any) => {
                                    const defaultRadius = v === 'city' ? 17 : v === 'coordinate' ? 3 : undefined;
                                    onUpdate({
                                        locationType: v,
                                        radiusKm: defaultRadius || formData.radiusKm,
                                        locationName: v === 'country' ? 'Việt Nam' : ''
                                    });
                                }}
                            >
                                <SelectTrigger className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus:ring-0">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="country">Quốc gia</SelectItem>
                                    <SelectItem value="city">Thành phố</SelectItem>
                                    <SelectItem value="coordinate">Tọa độ</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex-1">
                            {formData.locationType !== 'coordinate' ? (
                                <>
                                    <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">
                                        {formData.locationType === 'country' ? 'Quốc gia' : 'Thành phố'}
                                    </Label>
                                    <Input
                                        placeholder={formData.locationType === 'country' ? 'Việt Nam' : 'Hà Nội...'}
                                        value={formData.locationName}
                                        onChange={(e) => onUpdate({ locationName: e.target.value })}
                                        className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                                    />
                                </>
                            ) : (
                                <>
                                    <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Bán kính (km)</Label>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={formData.radiusKm ?? ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '');
                                            onUpdate({ radiusKm: val === '' ? undefined : parseInt(val) });
                                        }}
                                        onBlur={() => {
                                            if (!formData.radiusKm || formData.radiusKm < 1) {
                                                onUpdate({ radiusKm: 1 });
                                            }
                                        }}
                                        className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    {/* Coordinates */}
                    {formData.locationType === 'coordinate' && (
                        <>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Vĩ độ</Label>
                                    <Input
                                        placeholder="21.0285"
                                        value={formData.latitude}
                                        onChange={(e) => onUpdate({ latitude: e.target.value })}
                                        className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Kinh độ</Label>
                                    <Input
                                        placeholder="105.8542"
                                        value={formData.longitude}
                                        onChange={(e) => onUpdate({ longitude: e.target.value })}
                                        className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                                    />
                                </div>
                            </div>

                            {/* Map picker buttons */}
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setMapDialogOpen(true)}
                                    className="flex-1 h-8"
                                >
                                    <MapPin className="w-3.5 h-3.5 mr-1" />
                                    📍 Chọn bản đồ
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setMapDialogOpen(true)}
                                    className="h-8 px-3"
                                    title="Thêm vị trí mới"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            {/* Display list of coordinates if multiple */}
                            {formData.latitude && formData.latitude.includes(',') && (
                                <div className="p-2 bg-muted/30 rounded-md">
                                    <Label className="text-[10px] text-muted-foreground">Danh sách vị trí:</Label>
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
                                                            const lngsList = formData.longitude?.split(',') || [];
                                                            lats.splice(idx, 1);
                                                            lngsList.splice(idx, 1);
                                                            onUpdate({
                                                                latitude: lats.join(','),
                                                                longitude: lngsList.join(',')
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

                            {/* Location Picker Dialog */}
                            <LocationPickerDialog
                                open={mapDialogOpen}
                                onOpenChange={setMapDialogOpen}
                                onSave={(lat, lng) => {
                                    // If already has coordinates, append with comma
                                    if (formData.latitude && formData.longitude) {
                                        onUpdate({
                                            latitude: formData.latitude + ',' + lat.toFixed(8),
                                            longitude: formData.longitude + ',' + lng.toFixed(8)
                                        });
                                    } else {
                                        onUpdate({
                                            latitude: lat.toFixed(8),
                                            longitude: lng.toFixed(8)
                                        });
                                    }
                                    setMapDialogOpen(false);
                                }}
                                showRadius={true}
                                initialRadius={formData.radiusKm || 1}
                                onSaveWithRadius={(lat, lng, radius) => {
                                    // If already has coordinates, append with comma
                                    if (formData.latitude && formData.longitude) {
                                        onUpdate({
                                            latitude: formData.latitude + ',' + lat.toFixed(8),
                                            longitude: formData.longitude + ',' + lng.toFixed(8),
                                            radiusKm: radius
                                        });
                                    } else {
                                        onUpdate({
                                            latitude: lat.toFixed(8),
                                            longitude: lng.toFixed(8),
                                            radiusKm: radius
                                        });
                                    }
                                    setMapDialogOpen(false);
                                }}
                                initialLat={formData.latitude ? parseFloat(formData.latitude.split(',')[0]) : undefined}
                                initialLng={formData.longitude ? parseFloat(formData.longitude.split(',')[0]) : undefined}
                            />
                        </>
                    )}

                    {/* Radius for city */}
                    {formData.locationType === 'city' && (
                        <div>
                            <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Bán kính (min 17km)</Label>
                            <Input
                                type="text"
                                inputMode="numeric"
                                value={formData.radiusKm ?? ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    onUpdate({ radiusKm: val === '' ? undefined : parseInt(val) });
                                }}
                                onBlur={() => {
                                    if (!formData.radiusKm || formData.radiusKm < 17) {
                                        onUpdate({ radiusKm: 17 });
                                    }
                                }}
                                className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                            />
                        </div>
                    )}

                    {/* Interests */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Sở thích (phẩy cách)</Label>
                        <Input
                            placeholder="làm đẹp, spa..."
                            value={formData.interests}
                            onChange={(e) => onUpdate({ interests: e.target.value })}
                            className="h-7 text-sm border-0 border-b border-border/50 rounded-none bg-transparent px-0 focus-visible:ring-0"
                        />
                    </div>

                    {/* Headlines */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Tiêu đề (mỗi dòng 1) <span className="text-destructive">*</span></Label>
                        <Textarea
                            placeholder={"Tiêu đề 1\nTiêu đề 2\nTiêu đề 3"}
                            rows={3}
                            value={formData.headlines}
                            onChange={(e) => onUpdate({ headlines: e.target.value })}
                            className="text-sm resize-none min-h-[60px] border border-border/30 rounded-md bg-background/50 px-2 py-1.5 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>
                </div>

                {/* Column 3: Content + Actions */}
                <div className="space-y-2">
                    {/* Greeting - multiple allowed, random pick */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Mẫu chào (nhiều dòng = ngẫu nhiên) <span className="text-destructive">*</span></Label>
                        <Textarea
                            placeholder={"Chào bạn, mình có thể hỗ trợ gì?\nXin chào! Bạn cần tư vấn gì ạ?\nHi, mình sẵn sàng giúp bạn!"}
                            rows={3}
                            value={formData.greetingText}
                            onChange={(e) => onUpdate({ greetingText: e.target.value })}
                            className="text-sm resize-none min-h-[60px] border border-border/30 rounded-md bg-background/50 px-2 py-1.5 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>

                    {/* Questions - max 3 */}
                    <div>
                        <Label className="text-[11px] text-foreground font-semibold uppercase tracking-wide">Câu hỏi thường gặp (tối đa 3)</Label>
                        <Textarea
                            placeholder={"Giá bao nhiêu ạ?\nCó khuyến mãi không?\nLàm có đau không?"}
                            rows={3}
                            value={formData.frequentQuestions}
                            onChange={(e) => {
                                const lines = e.target.value.split('\n');
                                if (lines.length <= 3) {
                                    onUpdate({ frequentQuestions: e.target.value });
                                } else {
                                    // Keep only first 3 lines
                                    onUpdate({ frequentQuestions: lines.slice(0, 3).join('\n') });
                                }
                            }}
                            className="text-sm resize-none min-h-[60px] border border-border/30 rounded-md bg-background/50 px-2 py-1.5 focus-visible:ring-1 focus-visible:ring-primary"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button variant="ghost" onClick={onCancel} className="flex-1 h-8 text-xs text-muted-foreground hover:text-foreground">
                            Hủy
                        </Button>
                        <Button
                            onClick={onSubmit}
                            disabled={isSaving || !formData.keyword.trim()}
                            className="flex-1 h-8 text-xs"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                '✓ Tạo template'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
