import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, Image, Video, Save, Eye, RefreshCw } from 'lucide-react';
import {
    getLandingPageSettings,
    saveLandingPageSettings,
    LandingPageSettings,
    DEFAULT_SETTINGS
} from '@/services/nocodb/landingPageService';
import { supabase } from '@/integrations/supabase/client';

export default function LandingPageEditor() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [settings, setSettings] = useState<LandingPageSettings>(DEFAULT_SETTINGS);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const data = await getLandingPageSettings();
            setSettings(data);
        } catch (error) {
            console.error('Error loading settings:', error);
            toast({
                title: 'Lỗi',
                description: 'Không thể tải cài đặt landing page',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const success = await saveLandingPageSettings(settings);
            if (success) {
                toast({
                    title: 'Thành công',
                    description: 'Đã lưu cài đặt landing page',
                });
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            toast({
                title: 'Lỗi',
                description: 'Không thể lưu cài đặt',
                variant: 'destructive',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');

        if (!isVideo && !isImage) {
            toast({
                title: 'Lỗi',
                description: 'Chỉ hỗ trợ file ảnh hoặc video',
                variant: 'destructive',
            });
            return;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
            toast({
                title: 'Lỗi',
                description: 'File quá lớn. Tối đa 50MB',
                variant: 'destructive',
            });
            return;
        }

        setUploading(true);
        try {
            const fileName = `landing-hero-${Date.now()}.${file.name.split('.').pop()}`;
            const { data, error } = await supabase.storage
                .from('landing-assets')
                .upload(fileName, file, { upsert: true });

            if (error) {
                // Try to create bucket if not exists
                if (error.message.includes('not found')) {
                    toast({
                        title: 'Lỗi',
                        description: 'Bucket "landing-assets" chưa tồn tại. Vui lòng tạo trong Supabase.',
                        variant: 'destructive',
                    });
                    return;
                }
                throw error;
            }

            const { data: urlData } = supabase.storage
                .from('landing-assets')
                .getPublicUrl(fileName);

            setSettings(prev => ({
                ...prev,
                hero_media_url: urlData.publicUrl,
                hero_media_type: isVideo ? 'video' : 'image',
            }));

            toast({
                title: 'Thành công',
                description: 'Đã upload media thành công',
            });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: 'Lỗi upload',
                description: error.message || 'Không thể upload file',
                variant: 'destructive',
            });
        } finally {
            setUploading(false);
        }
    };

    const updateSetting = (key: keyof LandingPageSettings, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Landing Page Editor</h2>
                    <p className="text-sm text-muted-foreground">Chỉnh sửa nội dung trang chủ</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open('/landing', '_blank')}>
                        <Eye className="h-4 w-4 mr-1" />
                        Xem trang
                    </Button>
                    <Button variant="outline" size="sm" onClick={loadSettings}>
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Tải lại
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Text Content */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Nội dung Text</CardTitle>
                        <CardDescription>Chỉnh sửa các đoạn văn bản</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-xs">Logo Text</Label>
                            <Input
                                value={settings.logo_text}
                                onChange={(e) => updateSetting('logo_text', e.target.value)}
                                placeholder="KJM GROUP"
                                className="h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                            <Label className="text-xs font-medium">Headline (3 phần)</Label>
                            <Input
                                value={settings.headline_prefix}
                                onChange={(e) => updateSetting('headline_prefix', e.target.value)}
                                placeholder="Nền tảng"
                                className="h-8 text-sm"
                            />
                            <div className="flex items-center gap-2">
                                <Input
                                    value={settings.headline_underline}
                                    onChange={(e) => updateSetting('headline_underline', e.target.value)}
                                    placeholder="AI Quảng Cáo Tự Động 24/7"
                                    className="h-8 text-sm flex-1"
                                />
                                <div
                                    className="w-6 h-6 rounded border cursor-pointer"
                                    style={{ backgroundColor: settings.underline_color }}
                                    onClick={() => {
                                        const color = prompt('Nhập màu (hex):', settings.underline_color);
                                        if (color) updateSetting('underline_color', color);
                                    }}
                                    title="Click để đổi màu underline"
                                />
                            </div>
                            <Input
                                value={settings.headline_suffix}
                                onChange={(e) => updateSetting('headline_suffix', e.target.value)}
                                placeholder="cho Spa/Clinic"
                                className="h-8 text-sm"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Mô tả</Label>
                            <Textarea
                                value={settings.description}
                                onChange={(e) => updateSetting('description', e.target.value)}
                                placeholder="Mô tả ngắn về dịch vụ..."
                                className="text-sm min-h-[80px]"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs">Button chính</Label>
                                <Input
                                    value={settings.cta_primary_text}
                                    onChange={(e) => updateSetting('cta_primary_text', e.target.value)}
                                    placeholder="Bắt đầu miễn phí"
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div>
                                <Label className="text-xs">Button phụ</Label>
                                <Input
                                    value={settings.cta_secondary_text}
                                    onChange={(e) => updateSetting('cta_secondary_text', e.target.value)}
                                    placeholder="Xem demo"
                                    className="h-8 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">Màu chủ đạo (Buttons)</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={settings.primary_color}
                                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                                    placeholder="#2563eb"
                                    className="h-8 text-sm flex-1"
                                />
                                <div
                                    className="w-8 h-8 rounded border cursor-pointer"
                                    style={{ backgroundColor: settings.primary_color }}
                                    onClick={() => {
                                        const color = prompt('Nhập màu (hex):', settings.primary_color);
                                        if (color) updateSetting('primary_color', color);
                                    }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Hero Media */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Hero Media</CardTitle>
                        <CardDescription>
                            Upload ảnh hoặc video ngang. Kích thước chuẩn: <strong>1920x1080px</strong> (16:9)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileUpload}
                            className="hidden"
                        />

                        <div
                            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Đang upload...</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">
                                        Click để upload ảnh hoặc video
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Tối đa 50MB • MP4, WebM, JPG, PNG, WebP
                                    </p>
                                </div>
                            )}
                        </div>

                        {settings.hero_media_url && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                    {settings.hero_media_type === 'video' ? (
                                        <Video className="h-4 w-4" />
                                    ) : (
                                        <Image className="h-4 w-4" />
                                    )}
                                    <span>Preview:</span>
                                </div>

                                <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                                    {settings.hero_media_type === 'video' ? (
                                        <video
                                            src={settings.hero_media_url}
                                            controls
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <img
                                            src={settings.hero_media_url}
                                            alt="Hero preview"
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => {
                                        setSettings(prev => ({
                                            ...prev,
                                            hero_media_url: '',
                                            hero_media_type: 'image',
                                        }));
                                    }}
                                >
                                    Xóa media
                                </Button>
                            </div>
                        )}

                        <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
                            <p className="font-medium mb-1">💡 Hướng dẫn kích thước:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li><strong>Video:</strong> 1920x1080px, MP4/WebM, tối đa 50MB</li>
                                <li><strong>Ảnh:</strong> 1920x1080px, JPG/PNG/WebP</li>
                                <li>Tỉ lệ 16:9 để hiển thị đẹp nhất</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Product Features Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Product Features</CardTitle>
                    <CardDescription>Chỉnh sửa các card sản phẩm (JSON format)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="p-3 bg-muted/50 rounded-lg text-xs mb-3">
                            <p className="font-medium mb-1">📋 Cấu trúc mỗi item:</p>
                            <code className="text-[10px] block whitespace-pre-wrap">
                                {`{ "tag": "PRODUCT", "title": "...", "description": "...", "buttonText": "...", "dark": false, "buttonVariant": "outline" }`}
                            </code>
                        </div>
                        <Textarea
                            value={settings.product_features || '[]'}
                            onChange={(e) => updateSetting('product_features', e.target.value)}
                            placeholder='[{"tag": "PRODUCT", "title": "...", "description": "...", "buttonText": "..."}]'
                            className="text-xs min-h-[200px] font-mono"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Latest Updates Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Latest Updates</CardTitle>
                    <CardDescription>Chỉnh sửa các card tin tức (JSON format)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div className="p-3 bg-muted/50 rounded-lg text-xs mb-3">
                            <p className="font-medium mb-1">📋 Cấu trúc mỗi item:</p>
                            <code className="text-[10px] block whitespace-pre-wrap">
                                {`{ "tag": "PRODUCT", "title": "...", "description": "...", "buttonText": "Read more" }`}
                            </code>
                        </div>
                        <Textarea
                            value={settings.latest_updates || '[]'}
                            onChange={(e) => updateSetting('latest_updates', e.target.value)}
                            placeholder='[{"tag": "PRODUCT", "title": "...", "description": "...", "buttonText": "Read more"}]'
                            className="text-xs min-h-[150px] font-mono"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Footer Section */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Footer</CardTitle>
                    <CardDescription>Chỉnh sửa thông tin công ty (JSON format)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Thông tin công ty</Label>
                        <div className="p-3 bg-muted/50 rounded-lg text-xs mb-2">
                            <code className="text-[10px] block whitespace-pre-wrap">
                                {`{ "name": "KJM GROUP", "tagline": "...", "address": "...", "hotline": "...", "email": "..." }`}
                            </code>
                        </div>
                        <Textarea
                            value={settings.footer_company || '{}'}
                            onChange={(e) => updateSetting('footer_company', e.target.value)}
                            placeholder='{"name": "KJM GROUP", "tagline": "...", "address": "...", "hotline": "...", "email": "..."}'
                            className="text-xs min-h-[120px] font-mono"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
