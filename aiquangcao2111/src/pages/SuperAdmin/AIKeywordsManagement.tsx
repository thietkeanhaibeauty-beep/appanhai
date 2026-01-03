/**
 * AIKeywordsManagement.tsx - Quản lý từ khóa AI Assistant
 * 
 * Format 3 cột:
 * 1. Metric/Key (từ code, cố định)
 * 2. Keywords hiện tại 
 * 3. Bổ sung (user tự thêm)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Save, Plus, X, Sparkles, ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    getAIKeywords,
    updateKeywords,
    addKeywordConfig,
    seedDefaultKeywords,
    DEFAULT_KEYWORDS,
    type AIKeywordConfig,
} from '@/services/nocodb/aiKeywordsService';
import { supabase } from '@/integrations/supabase/client';

// =========================================================================
// CẤU TRÚC METRICS CHUẨN (từ code - KHÔNG ĐỔI)
// =========================================================================

interface MetricDefinition {
    key: string;
    name: string;
    description: string;
    defaultKeywords: string[];
}

interface FunctionGroup {
    intent: string;
    title: string;
    emoji: string;
    description: string;
    metrics: MetricDefinition[];
}

const FUNCTION_GROUPS: FunctionGroup[] = [
    {
        intent: 'REPORT',
        title: 'Báo cáo',
        emoji: '📊',
        description: 'Báo cáo thống kê marketing/sales',
        metrics: [
            { key: 'doanh_thu', name: 'Doanh thu', description: 'Tổng doanh thu', defaultKeywords: ['doanh thu', 'tổng doanh thu', 'revenue', 'tiền bán', 'thu nhập'] },
            { key: 'so_dat_lich', name: 'Số đặt lịch', description: 'Số lượng đặt lịch', defaultKeywords: ['tổng lịch hẹn', 'số lịch tuần', 'tổng đặt lịch'] },
            { key: 'so_khach_hang', name: 'Số khách hàng', description: 'Tổng số khách', defaultKeywords: ['tổng khách', 'số khách hàng tuần', 'số khách tháng'] },
            { key: 'ti_le_dat_lich', name: 'Tỉ lệ đặt lịch', description: 'Từ kết quả FB', defaultKeywords: ['tỉ lệ đặt lịch', 'tỷ lệ booking'] },
            { key: 'ti_le_sdt', name: 'Tỉ lệ SĐT', description: 'Từ kết quả FB', defaultKeywords: ['tổng sđt', 'số điện thoại tuần', 'tổng số phone'] },
            { key: 'ti_le_chuyen_doi', name: 'Tỉ lệ chuyển đổi', description: 'Conversion rate', defaultKeywords: ['tỉ lệ chuyển đổi', 'conversion rate'] },
            { key: 'spend', name: 'Chi tiêu', description: 'Chi phí quảng cáo', defaultKeywords: ['chi tiêu', 'spend', 'ngân sách', 'chi phí quảng cáo', 'tổng chi'] },
            { key: 'results', name: 'Kết quả', description: 'Kết quả từ FB', defaultKeywords: ['kết quả fb', 'tin nhắn fb', 'message ads'] },
            { key: 'cost_per_result', name: 'CPA', description: 'Chi phí/kết quả', defaultKeywords: ['cpa', 'chi phí kết quả', 'cost per result'] },
        ],
    },
    {
        intent: 'SCHEDULE',
        title: 'Xem lịch/Dữ liệu',
        emoji: '📅',
        description: 'Xem lịch hẹn, dữ liệu cụ thể',
        metrics: [
            { key: 'lich_hen', name: 'Lịch hẹn', description: 'Filter theo appointment_time', defaultKeywords: ['có lịch hẹn', 'lịch hẹn nào', 'xem lịch hẹn', 'hẹn khách', 'lịch hẹn mai', 'lịch hẹn hôm nay'] },
            { key: 'du_lieu', name: 'Dữ liệu', description: 'Filter theo CreatedAt', defaultKeywords: ['có lịch tạo', 'dữ liệu hôm nay', 'có dữ liệu', 'có record', 'dữ liệu mới'] },
            { key: 'sdt', name: 'SĐT mới', description: 'Filter theo CreatedAt + phone', defaultKeywords: ['có sđt', 'có số điện thoại', 'sđt nào', 'số điện thoại hôm nay', 'sđt mới'] },
        ],
    },
    {
        intent: 'CAMPAIGN_CONTROL',
        title: 'Điều khiển Campaign',
        emoji: '🎯',
        description: 'Bật/tắt, xem danh sách campaigns',
        metrics: [
            { key: 'xem_chien_dich', name: 'Xem chiến dịch', description: 'Liệt kê campaigns', defaultKeywords: ['liệt kê', 'danh sách', 'hiện', 'xem', 'các', 'đang chạy', 'chiến dịch'] },
            { key: 'bat_tat', name: 'Bật/Tắt', description: 'Toggle campaign', defaultKeywords: ['tắt', 'dừng', 'pause', 'bật', 'chạy', 'kích hoạt', 'activate'] },
        ],
    },
    {
        intent: 'RULE',
        title: 'Quy tắc tự động',
        emoji: '📋',
        description: 'Tạo quy tắc automation',
        metrics: [
            { key: 'tao_quy_tac', name: 'Tạo quy tắc', description: 'Trigger tạo rule', defaultKeywords: ['tạo quy tắc', 'tạo rule', 'thiết lập quy tắc', 'đặt quy tắc', 'create rule', 'new rule'] },
            { key: 'chi_phi', name: 'Metric chi phí', description: 'Trong rule', defaultKeywords: ['tiêu', 'chi', 'spend', 'kết quả', 'result', 'cpa', 'chi phí', '100k', '50k'] },
            { key: 'hanh_dong', name: 'Action', description: 'Hành động rule', defaultKeywords: ['tắt', 'bật', 'giảm', 'tăng', 'scale', 'off', 'on'] },
        ],
    },
    {
        intent: 'GOLDEN_RULE_SET',
        title: 'Bộ quy tắc vàng',
        emoji: '🥇',
        description: 'Quy tắc multi-step (scale, cắt lỗ, ưu tiên)',
        metrics: [
            { key: 'tao_bo_quy_tac', name: 'Tạo bộ quy tắc', description: 'Multi-step rule', defaultKeywords: ['scale', 'cắt lỗ', 'ưu tiên', 'bước', 'quy tắc vàng', 'golden rule', 'bộ quy tắc'] },
        ],
    },
    {
        intent: 'CUSTOM_AUDIENCE',
        title: 'Tệp đối tượng',
        emoji: '👥',
        description: 'Chạy QC với tệp có sẵn',
        metrics: [
            {
                key: 'chay_tep', name: 'Chạy tệp', description: 'Chạy với custom audience',
                defaultKeywords: ['tệp đối tượng', 'quảng cáo tệp', 'custom audience', 'lookalike audience', 'qc tệp', 'chạy tệp', 'chạy quảng cáo tệp', 'ads tệp', 'quảng cáo đối tượng', 'target tệp']
            },
        ],
    },
    {
        intent: 'QUICK_POST',
        title: 'Chạy QC từ link bài viết',
        emoji: '🔗',
        description: 'Detect link FB và chạy quảng cáo',
        metrics: [
            { key: 'detect_link', name: 'Detect link FB', description: 'Nhận diện URL facebook', defaultKeywords: ['facebook.com', 'fb.com', 'link bài viết', 'link post', 'chạy link'] },
        ],
    },
    {
        intent: 'AUDIENCE',
        title: 'Tạo tệp đối tượng mới',
        emoji: '🎯',
        description: 'Tạo lookalike, custom audience mới',
        metrics: [
            { key: 'tao_tep', name: 'Tạo tệp', description: 'Create audience', defaultKeywords: ['tạo tệp đối tượng', 'create audience', 'tạo lookalike', 'tạo tệp mới', 'audience mới'] },
        ],
    },
    {
        intent: 'CREATIVE',
        title: 'Tạo QC tin nhắn',
        emoji: '✨',
        description: 'Tạo quảng cáo tin nhắn mới',
        metrics: [
            { key: 'tao_qc_tin_nhan', name: 'Tạo QC', description: 'Message ads', defaultKeywords: ['tạo quảng cáo tin nhắn', 'quảng cáo tin nhắn mới', 'tạo qc tin nhắn', 'message ad', 'messenger ad'] },
        ],
    },
    {
        intent: 'TEMPLATE',
        title: 'Tạo Template/Bảng đối tượng',
        emoji: '📝',
        description: 'Tạo mẫu template targeting',
        metrics: [
            { key: 'tao_template', name: 'Tạo template', description: 'Tạo bảng đối tượng mới', defaultKeywords: ['tạo bảng đối tượng', 'tạo template', 'tạo mẫu', 'thêm template', 'thêm mẫu', 'tạo đối tượng mới'] },
        ],
    },
    {
        intent: 'CLONE',
        title: 'Nhân bản',
        emoji: '📑',
        description: 'Nhân bản campaign/adset/ad',
        metrics: [
            { key: 'nhan_ban', name: 'Nhân bản', description: 'Clone campaign', defaultKeywords: ['nhân bản', 'clone', 'copy chiến dịch', 'duplicate', 'sao chép', 'nhân đôi'] },
        ],
    },
    {
        intent: 'DATE',
        title: 'Ngày tháng',
        emoji: '🗓️',
        description: 'Nhận diện thời gian',
        metrics: [
            { key: 'hom_nay', name: 'Hôm nay', description: 'Today', defaultKeywords: ['hôm nay', 'today', 'ngày hôm nay', 'bữa nay'] },
            { key: 'hom_qua', name: 'Hôm qua', description: 'Yesterday', defaultKeywords: ['hôm qua', 'yesterday', 'ngày hôm qua'] },
            { key: 'ngay_mai', name: 'Ngày mai', description: 'Tomorrow', defaultKeywords: ['mai', 'ngày mai', 'tomorrow'] },
            { key: 'tuan_nay', name: 'Tuần này', description: 'This week', defaultKeywords: ['tuần này', 'tuần nay', 'tuần qua', '7 ngày', 'tuần'] },
            { key: 'thang_nay', name: 'Tháng này', description: 'This month', defaultKeywords: ['tháng này', 'tháng nay'] },
        ],
    },
];

export default function AIKeywordsManagement() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dbKeywords, setDbKeywords] = useState<AIKeywordConfig[]>([]);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    const [customKeywords, setCustomKeywords] = useState<Record<string, string>>({});
    const [newKeywordInputs, setNewKeywordInputs] = useState<Record<string, string>>({});

    // Load keywords from DB
    const loadData = async () => {
        try {
            setLoading(true);
            const data = await getAIKeywords();
            setDbKeywords(data);

            // Build custom keywords map
            const customMap: Record<string, string> = {};
            data.forEach(item => {
                // Lấy keywords bổ sung (những từ không có trong defaultKeywords)
                const group = FUNCTION_GROUPS.find(g => g.intent === item.intent_type);
                const metric = group?.metrics.find(m => m.key === item.metric_name);
                if (metric) {
                    const defaultSet = new Set(metric.defaultKeywords.map(k => k.toLowerCase()));
                    const custom = item.keywords.filter(k => !defaultSet.has(k.toLowerCase()));
                    if (custom.length > 0) {
                        customMap[`${item.intent_type}_${item.metric_name}`] = custom.join(', ');
                    }
                }
            });
            setCustomKeywords(customMap);
        } catch (error) {
            console.error('Error loading:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Toggle expand group
    const toggleGroup = (intent: string) => {
        setExpandedGroups(prev =>
            prev.includes(intent)
                ? prev.filter(i => i !== intent)
                : [...prev, intent]
        );
    };

    // Get current keywords for a metric (from DB or default)
    const getCurrentKeywords = (intent: string, metricKey: string): string[] => {
        const dbItem = dbKeywords.find(
            k => k.intent_type === intent && k.metric_name === metricKey
        );
        return dbItem?.keywords || [];
    };

    // Get custom keywords for a metric
    const getCustomKeywords = (intent: string, metricKey: string): string => {
        return customKeywords[`${intent}_${metricKey}`] || '';
    };

    // Add new keyword
    const handleAddKeyword = async (intent: string, metricKey: string, metric: MetricDefinition) => {
        const inputKey = `${intent}_${metricKey}`;
        const newKeyword = newKeywordInputs[inputKey]?.trim();
        if (!newKeyword) return;

        try {
            setSaving(true);

            // Get current keywords
            let currentKeywords = getCurrentKeywords(intent, metricKey);
            if (currentKeywords.length === 0) {
                currentKeywords = [...metric.defaultKeywords];
            }

            // Add new keyword if not exists
            if (!currentKeywords.map(k => k.toLowerCase()).includes(newKeyword.toLowerCase())) {
                currentKeywords.push(newKeyword);
            }

            // Find existing DB record
            const dbItem = dbKeywords.find(
                k => k.intent_type === intent && k.metric_name === metricKey
            );

            if (dbItem?.Id) {
                await updateKeywords(dbItem.Id, currentKeywords);
            } else {
                await addKeywordConfig({
                    intent_type: intent,
                    category: 'custom',
                    metric_name: metricKey,
                    keywords: currentKeywords,
                    description: metric.description,
                    is_active: true,
                });
            }

            toast.success(`✅ Đã thêm "${newKeyword}"`);
            setNewKeywordInputs(prev => ({ ...prev, [inputKey]: '' }));
            await loadData();
        } catch (error) {
            console.error('Error adding keyword:', error);
            toast.error('Lỗi khi thêm từ khóa');
        } finally {
            setSaving(false);
        }
    };

    // Remove custom keyword
    const handleRemoveKeyword = async (intent: string, metricKey: string, keyword: string, metric: MetricDefinition) => {
        try {
            setSaving(true);

            let currentKeywords = getCurrentKeywords(intent, metricKey);
            currentKeywords = currentKeywords.filter(k => k.toLowerCase() !== keyword.toLowerCase());

            if (currentKeywords.length === 0) {
                currentKeywords = [...metric.defaultKeywords];
            }

            const dbItem = dbKeywords.find(
                k => k.intent_type === intent && k.metric_name === metricKey
            );

            if (dbItem?.Id) {
                await updateKeywords(dbItem.Id, currentKeywords);
                toast.success(`Đã xóa "${keyword}"`);
                await loadData();
            }
        } catch (error) {
            console.error('Error removing keyword:', error);
            toast.error('Lỗi khi xóa từ khóa');
        } finally {
            setSaving(false);
        }
    };

    // Seed all defaults
    const handleSeedDefaults = async () => {
        try {
            setSaving(true);
            toast.info('🔧 Đang tạo bảng NocoDB...');

            await supabase.functions.invoke('create-ai-keywords-table');

            toast.info('📦 Đang thêm dữ liệu mặc định...');
            const result = await seedDefaultKeywords();

            if (result.success && result.count > 0) {
                toast.success(`✅ Đã thêm ${result.count} configs`);
                await loadData();
            } else {
                toast.info('Dữ liệu đã có sẵn');
            }
        } catch (error) {
            console.error('Error seeding:', error);
            toast.error('Lỗi khi seed dữ liệu');
        } finally {
            setSaving(false);
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
        <div className="container mx-auto p-6 max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Sparkles className="h-8 w-8 text-primary" />
                        Quản lý Từ khóa AI
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Thêm từ khóa để AI nhận diện ý định người dùng chính xác hơn
                    </p>
                </div>
                {dbKeywords.length === 0 && (
                    <Button onClick={handleSeedDefaults} disabled={saving}>
                        <Plus className="mr-2 h-4 w-4" />
                        Khởi tạo dữ liệu
                    </Button>
                )}
            </div>

            {/* Function Groups */}
            <div className="space-y-4">
                {FUNCTION_GROUPS.map(group => (
                    <Card key={group.intent}>
                        <Collapsible
                            open={expandedGroups.includes(group.intent)}
                            onOpenChange={() => toggleGroup(group.intent)}
                        >
                            <CollapsibleTrigger asChild>
                                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{group.emoji}</span>
                                            <div>
                                                <CardTitle className="text-lg">{group.title}</CardTitle>
                                                <CardDescription>{group.description}</CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{group.metrics.length} metrics</Badge>
                                            {expandedGroups.includes(group.intent) ? (
                                                <ChevronDown className="h-5 w-5" />
                                            ) : (
                                                <ChevronRight className="h-5 w-5" />
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                            </CollapsibleTrigger>

                            <CollapsibleContent>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[180px]">Metric (Code)</TableHead>
                                                <TableHead className="w-[350px]">Keywords hiện tại</TableHead>
                                                <TableHead>Bổ sung</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {group.metrics.map(metric => {
                                                const inputKey = `${group.intent}_${metric.key}`;
                                                const currentKws = getCurrentKeywords(group.intent, metric.key);
                                                const hasDbData = currentKws.length > 0;

                                                // Phân loại: default vs custom
                                                const defaultSet = new Set(metric.defaultKeywords.map(k => k.toLowerCase()));
                                                const customKws = hasDbData
                                                    ? currentKws.filter(k => !defaultSet.has(k.toLowerCase()))
                                                    : [];

                                                return (
                                                    <TableRow key={metric.key}>
                                                        {/* Cột 1: Metric chuẩn */}
                                                        <TableCell>
                                                            <div>
                                                                <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                                                                    {metric.key}
                                                                </code>
                                                                <div className="text-xs text-muted-foreground mt-1">
                                                                    {metric.name}
                                                                </div>
                                                            </div>
                                                        </TableCell>

                                                        {/* Cột 2: Keywords hiện tại */}
                                                        <TableCell>
                                                            <div className="flex flex-wrap gap-1">
                                                                {metric.defaultKeywords.map((kw, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-xs">
                                                                        {kw}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </TableCell>

                                                        {/* Cột 3: Bổ sung */}
                                                        <TableCell>
                                                            <div className="space-y-2">
                                                                {/* Custom keywords */}
                                                                {customKws.length > 0 && (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {customKws.map((kw, i) => (
                                                                            <Badge
                                                                                key={i}
                                                                                variant="default"
                                                                                className="text-xs cursor-pointer hover:bg-destructive/80"
                                                                                onClick={() => handleRemoveKeyword(group.intent, metric.key, kw, metric)}
                                                                                title="Click để xóa"
                                                                            >
                                                                                {kw}
                                                                                <X className="ml-1 h-3 w-3" />
                                                                            </Badge>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Add new */}
                                                                <div className="flex gap-1">
                                                                    <Input
                                                                        placeholder="Thêm từ khóa..."
                                                                        className="h-8 text-sm"
                                                                        value={newKeywordInputs[inputKey] || ''}
                                                                        onChange={(e) => setNewKeywordInputs(prev => ({
                                                                            ...prev,
                                                                            [inputKey]: e.target.value
                                                                        }))}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                handleAddKeyword(group.intent, metric.key, metric);
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        className="h-8 px-2"
                                                                        onClick={() => handleAddKeyword(group.intent, metric.key, metric)}
                                                                        disabled={saving}
                                                                    >
                                                                        <Plus className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </CollapsibleContent>
                        </Collapsible>
                    </Card>
                ))}
            </div>
        </div>
    );
}
