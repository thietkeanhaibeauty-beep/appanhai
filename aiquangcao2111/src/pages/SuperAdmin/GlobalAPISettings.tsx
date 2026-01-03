/**
 * Global API Settings - SuperAdmin
 * Quản lý Global AI API Keys (OpenAI, DeepSeek, Gemini)
 * 
 * Flow: Chọn Provider → Nhập API Key → Kiểm tra → Chọn Model → Lưu
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Key, Eye, EyeOff, Check, AlertCircle, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    getGlobalOpenAIConfig,
    setGlobalOpenAIConfig,
    getGlobalDeepSeekConfig,
    setGlobalDeepSeekConfig,
    getGlobalGeminiConfig,
    setGlobalGeminiConfig,
    deleteGlobalProviderConfig,
    getProviderPriority,
    setProviderPriority,
    SETTING_KEYS,
    type AIProvider,
} from '@/services/nocodb/systemSettingsService';
import { supabase } from '@/integrations/supabase/client';

// Model lists for each provider
const PROVIDER_MODELS = {
    openai: [
        { value: 'gpt-4.1-mini-2025-04-14', label: 'GPT-4.1 Mini (2025-04-14) ⭐', description: 'Khuyến nghị - mới nhất' },
        { value: 'gpt-4.1', label: 'GPT-4.1', description: 'Mạnh, ổn định' },
        { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'Nhanh, giá rẻ' },
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Phổ biến, ổn định' },
        { value: 'gpt-4o', label: 'GPT-4o', description: 'Mạnh' },
        { value: 'o1', label: 'O1 (Reasoning)', description: 'Lập luận phức tạp' },
        { value: 'o1-mini', label: 'O1 Mini', description: 'Reasoning, tiết kiệm' },
        { value: 'o3-mini', label: 'O3 Mini', description: 'Reasoning mới nhất' },
    ],
    deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat (V3)', description: 'Khuyến nghị - đa năng' },
        { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)', description: 'Reasoning mạnh' },
    ],
    gemini: [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Khuyến nghị)', description: 'Nhanh, đa năng' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Mới nhất, nhanh' },
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Mạnh nhất' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', description: 'Ổn định' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Ổn định, mạnh' },
    ],
};

const PROVIDER_INFO = {
    openai: {
        name: 'OpenAI',
        keyPrefix: 'sk-',
        keyPlaceholder: 'sk-...',
        keyHint: 'Lấy từ platform.openai.com/api-keys',
        keyLink: 'https://platform.openai.com/api-keys',
    },
    deepseek: {
        name: 'DeepSeek',
        keyPrefix: 'sk-',
        keyPlaceholder: 'sk-...',
        keyHint: 'Lấy từ platform.deepseek.com/api_keys',
        keyLink: 'https://platform.deepseek.com/api_keys',
    },
    gemini: {
        name: 'Google Gemini',
        keyPrefix: 'AIza',
        keyPlaceholder: 'AIza...',
        keyHint: 'Lấy từ aistudio.google.com/apikey',
        keyLink: 'https://aistudio.google.com/apikey',
    },
};

const GlobalAPISettings: React.FC = () => {
    // Provider priority order (fallback chain)
    const [providerPriority, setProviderPriorityState] = useState<AIProvider[]>(['openai', 'deepseek', 'gemini']);

    // Selected provider for editing
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('openai');

    // API Key states
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [model, setModel] = useState('');

    // Saved configs (to show status badges)
    const [savedConfigs, setSavedConfigs] = useState<{
        openai: { hasKey: boolean; model: string };
        deepseek: { hasKey: boolean; model: string };
        gemini: { hasKey: boolean; model: string };
    }>({
        openai: { hasKey: false, model: '' },
        deepseek: { hasKey: false, model: '' },
        gemini: { hasKey: false, model: '' },
    });

    // Status states
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingPriority, setSavingPriority] = useState(false);
    const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

    // Load all configs on mount
    useEffect(() => {
        loadAllConfigs();
    }, []);

    // Load config when provider changes
    useEffect(() => {
        loadProviderConfig(selectedProvider);
    }, [selectedProvider]);

    const loadAllConfigs = async () => {
        setLoading(true);
        try {
            const [openai, deepseek, gemini, priority] = await Promise.all([
                getGlobalOpenAIConfig(),
                getGlobalDeepSeekConfig(),
                getGlobalGeminiConfig(),
                getProviderPriority(),
            ]);

            setSavedConfigs({
                openai: { hasKey: !!openai.apiKey, model: openai.model },
                deepseek: { hasKey: !!deepseek.apiKey, model: deepseek.model },
                gemini: { hasKey: !!gemini.apiKey, model: gemini.model },
            });

            setProviderPriorityState(priority);

            // Load first provider's config
            if (openai.apiKey) {
                setApiKey(openai.apiKey);
                setModel(openai.model);
                setKeyStatus('valid');
            }
        } catch (error) {
            console.error('Error loading configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProviderConfig = async (provider: AIProvider) => {
        setKeyStatus('idle');
        setApiKey('');
        setModel('');

        try {
            let config;
            switch (provider) {
                case 'openai':
                    config = await getGlobalOpenAIConfig();
                    break;
                case 'deepseek':
                    config = await getGlobalDeepSeekConfig();
                    break;
                case 'gemini':
                    config = await getGlobalGeminiConfig();
                    break;
            }

            if (config.apiKey) {
                setApiKey(config.apiKey);
                setModel(config.model);
                setKeyStatus('valid');
            } else {
                // Set default model
                const defaultModel = PROVIDER_MODELS[provider][0]?.value || '';
                setModel(defaultModel);
            }
        } catch (error) {
            console.error('Error loading provider config:', error);
        }
    };

    const handleCheckKey = async () => {
        if (!apiKey.trim()) {
            toast.error('Vui lòng nhập API Key');
            return;
        }

        setChecking(true);
        setKeyStatus('idle');

        try {
            // Use check-openai-api for all providers (they're OpenAI-compatible)
            const { data, error } = await supabase.functions.invoke('check-openai-api', {
                body: {
                    apiKey: apiKey.trim(),
                    model: PROVIDER_MODELS[selectedProvider][0]?.value || model,
                    provider: selectedProvider, // Pass provider for correct endpoint
                },
            });

            if (error) throw error;

            if (data.success) {
                setKeyStatus('valid');
                if (data.warning) {
                    // Key is valid but has warning (e.g., quota exceeded)
                    toast.warning('⚠️ API Key hợp lệ (có cảnh báo)', {
                        description: data.warning,
                    });
                } else {
                    toast.success('✅ API Key hợp lệ', {
                        description: `${PROVIDER_INFO[selectedProvider].name} đã xác thực thành công`,
                    });
                }
            } else {
                setKeyStatus('invalid');
                toast.error('❌ API Key không hợp lệ', {
                    description: data.error || 'Vui lòng kiểm tra lại',
                });
            }
        } catch (error: any) {
            console.error('Check key error:', error);
            setKeyStatus('invalid');
            toast.error('Lỗi kiểm tra', {
                description: error.message || 'Không thể kết nối server',
            });
        } finally {
            setChecking(false);
        }
    };

    const handleSave = async () => {
        if (keyStatus !== 'valid') {
            toast.error('Vui lòng kiểm tra API Key trước khi lưu');
            return;
        }

        if (!model) {
            toast.error('Vui lòng chọn Model');
            return;
        }

        setSaving(true);
        try {
            let success = false;
            switch (selectedProvider) {
                case 'openai':
                    success = await setGlobalOpenAIConfig(apiKey.trim(), model);
                    break;
                case 'deepseek':
                    success = await setGlobalDeepSeekConfig(apiKey.trim(), model);
                    break;
                case 'gemini':
                    success = await setGlobalGeminiConfig(apiKey.trim(), model);
                    break;
            }

            if (success) {
                toast.success('✅ Đã lưu cấu hình', {
                    description: `${PROVIDER_INFO[selectedProvider].name} - ${model}`,
                });

                // Update saved configs
                setSavedConfigs(prev => ({
                    ...prev,
                    [selectedProvider]: { hasKey: true, model },
                }));
            } else {
                toast.error('Không thể lưu cấu hình');
            }
        } catch (error: any) {
            toast.error('Lỗi: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    // Move provider up in priority
    const moveProviderUp = (index: number) => {
        if (index <= 0) return;
        const newPriority = [...providerPriority];
        [newPriority[index - 1], newPriority[index]] = [newPriority[index], newPriority[index - 1]];
        setProviderPriorityState(newPriority);
    };

    // Move provider down in priority
    const moveProviderDown = (index: number) => {
        if (index >= providerPriority.length - 1) return;
        const newPriority = [...providerPriority];
        [newPriority[index], newPriority[index + 1]] = [newPriority[index + 1], newPriority[index]];
        setProviderPriorityState(newPriority);
    };

    // Save provider priority to database
    const handleSavePriority = async () => {
        setSavingPriority(true);
        try {
            const success = await setProviderPriority(providerPriority);
            if (success) {
                toast.success('✅ Đã lưu thứ tự ưu tiên', {
                    description: `${providerPriority.map((p, i) => `#${i + 1}: ${PROVIDER_INFO[p].name}`).join(' → ')}`,
                });
            } else {
                toast.error('Không thể lưu thứ tự ưu tiên');
            }
        } catch (error) {
            toast.error('Lỗi khi lưu thứ tự ưu tiên');
        } finally {
            setSavingPriority(false);
        }
    };

    // Delete API key for a provider
    const handleDeleteConfig = async (provider: AIProvider) => {
        if (!confirm(`Bạn có chắc muốn xóa API Key của ${PROVIDER_INFO[provider].name}?`)) {
            return;
        }

        try {
            let success = false;
            if (provider === 'openai') {
                success = await deleteGlobalProviderConfig(SETTING_KEYS.GLOBAL_OPENAI_KEY);
            } else if (provider === 'deepseek') {
                success = await deleteGlobalProviderConfig(SETTING_KEYS.GLOBAL_DEEPSEEK_KEY);
            } else if (provider === 'gemini') {
                success = await deleteGlobalProviderConfig(SETTING_KEYS.GLOBAL_GEMINI_KEY);
            }

            if (success) {
                setSavedConfigs(prev => ({
                    ...prev,
                    [provider]: { hasKey: false, model: '' }
                }));
                toast.success(`✅ Đã xóa API Key của ${PROVIDER_INFO[provider].name}`);

                // If currently editing this provider, reset the form
                if (selectedProvider === provider) {
                    setApiKey('');
                    setModel('');
                    setKeyStatus('idle');
                }
            } else {
                toast.error('Không thể xóa API Key');
            }
        } catch (error) {
            toast.error('Lỗi khi xóa API Key');
        }
    };

    const maskKey = (key: string) => {
        if (!key || key.length < 10) return key;
        return key.substring(0, 7) + '...' + key.substring(key.length - 4);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    const providerInfo = PROVIDER_INFO[selectedProvider];
    const models = PROVIDER_MODELS[selectedProvider];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold">Cài đặt Global API</h2>
                <p className="text-muted-foreground">
                    Cấu hình AI API Keys cho tất cả users (khi họ không có Personal Key)
                </p>
            </div>

            {/* Info Alert */}
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                    <strong>Logic ưu tiên:</strong> User có Personal API Key → dùng Personal (miễn phí).
                    Không có → dùng Global API (tính coin theo token).
                </AlertDescription>
            </Alert>

            {/* Provider Status & Priority - 2 Column Layout */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* LEFT: Trạng thái cấu hình */}
                        <div>
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                📋 Trạng thái cấu hình
                            </h3>
                            <div className="space-y-2">
                                {(['openai', 'deepseek', 'gemini'] as AIProvider[]).map((provider) => (
                                    <div key={provider} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                        <div className="flex items-center gap-2">
                                            {savedConfigs[provider].hasKey ? (
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="font-medium">{PROVIDER_INFO[provider].name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {savedConfigs[provider].hasKey ? (
                                                <>
                                                    <Badge variant="outline">{savedConfigs[provider].model}</Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDeleteConfig(provider)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Chưa cấu hình</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VERTICAL DIVIDER */}
                        <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-border" />

                        {/* RIGHT: Thứ tự ưu tiên */}
                        <div className="md:pl-6 md:border-l">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                🔢 Thứ tự ưu tiên
                                <span className="text-xs font-normal text-muted-foreground">(#1 chính, lỗi → #2 → #3)</span>
                            </h3>
                            <div className="space-y-2">
                                {providerPriority.map((provider, index) => (
                                    <div key={provider} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                        <Badge variant="secondary" className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
                                            {index + 1}
                                        </Badge>
                                        <span className="flex-1 font-medium">{PROVIDER_INFO[provider].name}</span>
                                        <div className="flex gap-1">
                                            {index > 0 && (
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveProviderUp(index)}>
                                                    ↑
                                                </Button>
                                            )}
                                            {index < providerPriority.length - 1 && (
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveProviderDown(index)}>
                                                    ↓
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end mt-3">
                                <Button size="sm" onClick={handleSavePriority} disabled={savingPriority}>
                                    {savingPriority ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Lưu thứ tự
                                </Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Provider Configuration */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Key className="h-5 w-5" />
                                Cấu hình API Key
                            </CardTitle>
                            <CardDescription>
                                Chọn provider và nhập API Key
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Step 1: Select Provider */}
                    <div className="grid gap-2">
                        <Label>1. Chọn Provider</Label>
                        <Select
                            value={selectedProvider}
                            onValueChange={(v) => setSelectedProvider(v as AIProvider)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="openai">
                                    <div className="flex items-center gap-2">
                                        OpenAI
                                        {savedConfigs.openai.hasKey && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                    </div>
                                </SelectItem>
                                <SelectItem value="deepseek">
                                    <div className="flex items-center gap-2">
                                        DeepSeek
                                        {savedConfigs.deepseek.hasKey && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                    </div>
                                </SelectItem>
                                <SelectItem value="gemini">
                                    <div className="flex items-center gap-2">
                                        Google Gemini
                                        {savedConfigs.gemini.hasKey && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Step 2: Enter API Key */}
                    <div className="grid gap-2">
                        <Label className="flex items-center gap-2">
                            2. Nhập API Key
                            {keyStatus === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                            {keyStatus === 'invalid' && <XCircle className="h-4 w-4 text-red-500" />}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Input
                                    type={showKey ? 'text' : 'password'}
                                    placeholder={providerInfo.keyPlaceholder}
                                    value={showKey ? apiKey : (apiKey ? maskKey(apiKey) : '')}
                                    onChange={(e) => {
                                        setApiKey(e.target.value);
                                        setKeyStatus('idle');
                                    }}
                                    className={`pr-10 ${keyStatus === 'valid' ? 'border-green-500' :
                                        keyStatus === 'invalid' ? 'border-red-500' : ''
                                        }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <Button
                                onClick={handleCheckKey}
                                disabled={checking || !apiKey.trim()}
                                variant="outline"
                            >
                                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kiểm tra'}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {providerInfo.keyHint} →{' '}
                            <a
                                href={providerInfo.keyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                Lấy API Key
                            </a>
                        </p>
                    </div>

                    {/* Step 3: Select Model (only show if key is valid) */}
                    {keyStatus === 'valid' && (
                        <div className="grid gap-2">
                            <Label>3. Chọn Model mặc định</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn model" />
                                </SelectTrigger>
                                <SelectContent>
                                    {models.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            <div className="flex flex-col">
                                                <span>{m.label}</span>
                                                <span className="text-xs text-muted-foreground">{m.description}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Step 4: Save Button */}
                    {keyStatus === 'valid' && model && (
                        <div className="flex justify-end pt-2">
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Lưu cấu hình {providerInfo.name}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default GlobalAPISettings;
