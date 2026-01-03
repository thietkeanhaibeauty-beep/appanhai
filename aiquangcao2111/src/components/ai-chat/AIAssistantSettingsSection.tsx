/**
 * AIAssistantSettingsSection.tsx
 * Component cho phép người dùng cá nhân hóa Trợ lý AI
 * - Collapsible section
 * - Click avatar để upload ảnh
 * - Uses Edge Function for reliable NocoDB access
 */
import { useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sparkles, Loader2, ChevronDown, Camera } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIAssistantSettingsSectionProps {
    userId: string;
    onUpdate?: () => void;
}

// Helper function to call update-user-profile Edge Function
async function callProfileEdgeFunction(action: 'get' | 'update', data?: any) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("User not authenticated");

    const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user-profile`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, ...data }),
        }
    );

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Request failed');
    }
    return result;
}

export const AIAssistantSettingsSection = ({
    userId,
    onUpdate,
}: AIAssistantSettingsSectionProps) => {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // AI Settings state
    const [aiNickname, setAiNickname] = useState("");
    const [aiAvatarUrl, setAiAvatarUrl] = useState("");
    const [aiSelfPronoun, setAiSelfPronoun] = useState("");
    const [aiUserPronoun, setAiUserPronoun] = useState("");

    // Load current settings via Edge Function
    useEffect(() => {
        const loadSettings = async () => {
            if (!userId) return;
            setLoading(true);
            try {
                const result = await callProfileEdgeFunction('get');
                const profile = result.profile;
                if (profile) {
                    setAiNickname(profile.ai_nickname || "");
                    // Handle NocoDB LongText field - now using ai_avatar_url
                    if (profile.ai_avatar_url && typeof profile.ai_avatar_url === 'string') {
                        setAiAvatarUrl(profile.ai_avatar_url);
                    }
                    // Using actual NocoDB column names
                    setAiSelfPronoun(profile.ai_pronoun_style || "");
                    setAiUserPronoun(profile.ai_pronoun_custom || "");
                }
            } catch (error) {
                console.error("Failed to load AI settings:", error);
            } finally {
                setLoading(false);
            }
        };

        loadSettings();
    }, [userId]);

    // Handle avatar file upload - with compression
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    // Compress image using canvas
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Create canvas with max 150x150 size
                    const canvas = document.createElement('canvas');
                    const maxSize = 150;
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxSize) {
                            height = Math.round((height * maxSize) / width);
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = Math.round((width * maxSize) / height);
                            height = maxSize;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context not available'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with 70% quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(compressedDataUrl);
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast({
                title: "❌ Lỗi",
                description: "Vui lòng chọn file ảnh (JPG, PNG, GIF)",
                variant: "destructive",
            });
            return;
        }

        // Validate file size (max 5MB before compression)
        if (file.size > 5 * 1024 * 1024) {
            toast({
                title: "❌ Ảnh quá lớn",
                description: "Vui lòng chọn ảnh dưới 5MB",
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        try {
            // Compress image before saving
            const compressedDataUrl = await compressImage(file);
            setAiAvatarUrl(compressedDataUrl);
            setUploading(false);
            toast({
                title: "✅ Đã chọn ảnh",
                description: "Ảnh đã được nén. Nhấn 'Lưu' để lưu thay đổi",
            });
        } catch (error) {
            setUploading(false);
            console.error("Upload error:", error);
            toast({
                title: "❌ Lỗi",
                description: "Không thể xử lý ảnh",
                variant: "destructive",
            });
        }

        // Reset input
        e.target.value = '';
    };

    // Save settings via Edge Function
    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);
        try {
            // Using actual NocoDB column names
            const payload = {
                ai_nickname: aiNickname || null,
                ai_pronoun_style: aiSelfPronoun || null,
                ai_pronoun_custom: aiUserPronoun || null,
                ai_avatar_url: aiAvatarUrl || null,
            };

            await callProfileEdgeFunction('update', payload);

            toast({
                title: "✅ Đã lưu",
                description: "Cài đặt Trợ lý AI đã được cập nhật",
            });

            // Trigger event to update AI Chat Panel header
            window.dispatchEvent(new CustomEvent("ai-settings-updated"));
            onUpdate?.();
        } catch (error: any) {
            console.error("Failed to save AI settings:", error);
            toast({
                title: "❌ Lỗi",
                description: error.message || "Không thể lưu cài đặt",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    // Quick pronoun presets
    const handlePronounPreset = (preset: 'anh_em' | 'ban_minh' | 'em_yeu') => {
        switch (preset) {
            case 'anh_em':
                setAiSelfPronoun("Em");
                setAiUserPronoun("Anh");
                break;
            case 'ban_minh':
                setAiSelfPronoun("Mình");
                setAiUserPronoun("Bạn");
                break;
            case 'em_yeu':
                setAiSelfPronoun("Em yêu");
                setAiUserPronoun("Anh yêu");
                break;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs text-muted-foreground">Đang tải...</span>
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            {/* Header - Always visible, clickable to expand */}
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg border border-pink-200 dark:border-pink-800 cursor-pointer hover:bg-pink-100/50 dark:hover:bg-pink-900/30 transition-colors">
                    <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-pink-600">
                            <Sparkles className="h-3 w-3 text-white" />
                        </div>
                        <span className="font-medium text-xs">Cài đặt Trợ lý AI</span>
                        {aiNickname && (
                            <span className="text-[10px] text-muted-foreground">
                                ({aiNickname})
                            </span>
                        )}
                    </div>
                    <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </CollapsibleTrigger>

            {/* Content - Expandable */}
            <CollapsibleContent>
                <div className="mt-2 p-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/20 dark:to-purple-950/20 rounded-lg border border-pink-200 dark:border-pink-800 space-y-3">

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                    />

                    {/* Avatar & Nickname Row */}
                    <div className="flex items-center gap-3">
                        {/* Clickable Avatar */}
                        <div
                            className="relative cursor-pointer group"
                            onClick={handleAvatarClick}
                        >
                            <Avatar className="h-12 w-12 border-2 border-pink-300 group-hover:border-pink-500 transition-colors">
                                <AvatarImage src={aiAvatarUrl} />
                                <AvatarFallback className="bg-pink-600 text-white">
                                    <Sparkles className="h-5 w-5" />
                                </AvatarFallback>
                            </Avatar>
                            {/* Upload overlay */}
                            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                {uploading ? (
                                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-4 w-4 text-white" />
                                )}
                            </div>
                        </div>

                        {/* Nickname Input */}
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Biệt danh Trợ lý</Label>
                            <Input
                                value={aiNickname}
                                onChange={(e) => setAiNickname(e.target.value)}
                                placeholder="AI Assistant"
                                className="h-7 text-xs"
                            />
                        </div>
                    </div>

                    {/* Pronouns */}
                    <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground">Xưng hô</Label>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-1">
                            <Button
                                type="button"
                                variant={aiSelfPronoun === "Em" && aiUserPronoun === "Anh" ? "default" : "outline"}
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handlePronounPreset('anh_em')}
                            >
                                Anh - Em
                            </Button>
                            <Button
                                type="button"
                                variant={aiSelfPronoun === "Mình" && aiUserPronoun === "Bạn" ? "default" : "outline"}
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handlePronounPreset('ban_minh')}
                            >
                                Bạn - Mình
                            </Button>
                            <Button
                                type="button"
                                variant={aiSelfPronoun === "Em yêu" && aiUserPronoun === "Anh yêu" ? "default" : "outline"}
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => handlePronounPreset('em_yeu')}
                            >
                                💕 Em yêu
                            </Button>
                        </div>

                        {/* Custom Pronouns */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                                <Label className="text-[10px] text-muted-foreground">AI tự xưng</Label>
                                <Input
                                    value={aiSelfPronoun}
                                    onChange={(e) => setAiSelfPronoun(e.target.value)}
                                    placeholder="Em"
                                    className="h-6 text-xs"
                                />
                            </div>
                            <div className="space-y-0.5">
                                <Label className="text-[10px] text-muted-foreground">Gọi bạn là</Label>
                                <Input
                                    value={aiUserPronoun}
                                    onChange={(e) => setAiUserPronoun(e.target.value)}
                                    placeholder="Anh"
                                    className="h-6 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-1">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            size="sm"
                            className="h-7 text-xs bg-pink-600 hover:bg-pink-700"
                        >
                            {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            Lưu cài đặt AI
                        </Button>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};

export default AIAssistantSettingsSection;
