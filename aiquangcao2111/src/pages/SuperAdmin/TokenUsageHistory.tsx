/**
 * Token Usage History - SuperAdmin
 * Xem lịch sử sử dụng tokens của tất cả users
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Loader2, RefreshCw, Coins, TrendingUp } from 'lucide-react';
import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from '@/services/nocodb/config';

interface UsageLog {
    Id: number;
    user_id: string;
    feature: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_coins: number;
    CreatedAt: string;
}

const TokenUsageHistory: React.FC = () => {
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalTokens: 0,
        totalRequests: 0,
        uniqueUsers: 0,
    });
    const [providerStats, setProviderStats] = useState<{
        openai: { tokens: number; requests: number; cost: number };
        deepseek: { tokens: number; requests: number; cost: number };
        gemini: { tokens: number; requests: number; cost: number };
    }>({
        openai: { tokens: 0, requests: 0, cost: 0 },
        deepseek: { tokens: 0, requests: 0, cost: 0 },
        gemini: { tokens: 0, requests: 0, cost: 0 },
    });

    // Estimated costs in USD per 1M tokens (Average of Input/Output)
    // Updated based on current market rates (approximate for blended usage)
    const PRICING = {
        OPENAI: {
            GPT4: 10.0,      // ~$10/1M (blended)
            GPT4O: 5.0,      // ~$5/1M (blended)
            GPT4O_MINI: 0.5, // ~$0.50/1M (blended)
            DEFAULT: 1.0     // Fallback
        },
        DEEPSEEK: {
            CHAT: 0.20,      // ~$0.20/1M (DeepSeek V3)
            REASONER: 0.55,  // ~$0.55/1M (DeepSeek R1)
            DEFAULT: 0.20
        },
        GEMINI: {
            PRO: 1.25,      // ~$1.25/1M (blended)
            FLASH: 0.15,    // ~$0.15/1M (blended)
            DEFAULT: 0.5
        }
    };

    const calculateCost = (model: string, tokens: number): number => {
        const m = model.toLowerCase();
        const millionTokens = tokens / 1000000;

        if (m.includes('gpt')) {
            if (m.includes('gpt-4o-mini')) return millionTokens * PRICING.OPENAI.GPT4O_MINI;
            if (m.includes('gpt-4o')) return millionTokens * PRICING.OPENAI.GPT4O;
            if (m.includes('gpt-4')) return millionTokens * PRICING.OPENAI.GPT4;
            return millionTokens * PRICING.OPENAI.DEFAULT;
        }

        if (m.includes('deepseek')) {
            if (m.includes('reasoner')) return millionTokens * PRICING.DEEPSEEK.REASONER;
            return millionTokens * PRICING.DEEPSEEK.CHAT;
        }

        if (m.includes('gemini')) {
            if (m.includes('flash')) return millionTokens * PRICING.GEMINI.FLASH;
            return millionTokens * PRICING.GEMINI.DEFAULT;
        }

        return 0;
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const headers = await getNocoDBHeaders();
            const response = await fetch(
                `${getNocoDBUrl(NOCODB_CONFIG.TABLES.OPENAI_USAGE_LOGS)}?sort=-CreatedAt&limit=200`,
                { headers }
            );

            if (response.ok) {
                const data = await response.json();
                const logList: UsageLog[] = data.list || [];
                setLogs(logList);

                // Calculate stats
                const uniqueUsers = new Set(logList.map(l => l.user_id));
                setStats({
                    totalTokens: logList.reduce((sum, l) => sum + (l.total_tokens || 0), 0),
                    totalRequests: logList.length,
                    uniqueUsers: uniqueUsers.size,
                });

                // Calculate provider stats
                const pStats = {
                    openai: { tokens: 0, requests: 0, cost: 0 },
                    deepseek: { tokens: 0, requests: 0, cost: 0 },
                    gemini: { tokens: 0, requests: 0, cost: 0 },
                };

                logList.forEach(log => {
                    const model = (log.model || '').toLowerCase();
                    const tokens = log.total_tokens || 0;
                    const estimatedCost = calculateCost(model, tokens);

                    if (model.includes('gpt') || model.includes('o1') || model.includes('o3')) {
                        pStats.openai.tokens += tokens;
                        pStats.openai.requests += 1;
                        pStats.openai.cost += estimatedCost;
                    } else if (model.includes('deepseek')) {
                        pStats.deepseek.tokens += tokens;
                        pStats.deepseek.requests += 1;
                        pStats.deepseek.cost += estimatedCost;
                    } else if (model.includes('gemini')) {
                        pStats.gemini.tokens += tokens;
                        pStats.gemini.requests += 1;
                        pStats.gemini.cost += estimatedCost;
                    }
                });
                setProviderStats(pStats);
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('vi-VN');
    };

    const formatCurrency = (amount: number) => {
        // Show extremely small numbers with more precision
        if (amount === 0) return '$0.00';
        if (amount < 0.01) return `$${amount.toFixed(4)}`;
        return `$${amount.toFixed(2)}`;
    };

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Pagination logic
    const totalPages = Math.ceil(logs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentLogs = logs.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Lịch sử sử dụng Tokens</h2>
                    <p className="text-muted-foreground">
                        Xem chi tiết tokens usage của tất cả users
                    </p>
                </div>
                <Button onClick={loadLogs} disabled={loading} variant="outline">
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Làm mới
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Tổng Tokens
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            {stats.totalTokens.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Tổng Requests
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalRequests.toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Users sử dụng
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.uniqueUsers}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Provider Breakdown Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                            OpenAI
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-blue-600">
                            {providerStats.openai.tokens.toLocaleString()} tokens
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">
                                {providerStats.openai.requests} requests
                            </p>
                            <span className="text-sm font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                                {formatCurrency(providerStats.openai.cost)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-green-500"></span>
                            DeepSeek
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-green-600">
                            {providerStats.deepseek.tokens.toLocaleString()} tokens
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">
                                {providerStats.deepseek.requests} requests
                            </p>
                            <span className="text-sm font-semibold text-green-700 bg-green-100 dark:bg-green-900 px-2 py-0.5 rounded">
                                {formatCurrency(providerStats.deepseek.cost)}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-purple-200 dark:border-purple-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                            Google Gemini
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-purple-600">
                            {providerStats.gemini.tokens.toLocaleString()} tokens
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-muted-foreground">
                                {providerStats.gemini.requests} requests
                            </p>
                            <span className="text-sm font-semibold text-purple-700 bg-purple-100 dark:bg-purple-900 px-2 py-0.5 rounded">
                                {formatCurrency(providerStats.gemini.cost)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Usage Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Chi tiết Logs</CardTitle>
                    <CardDescription>
                        200 logs gần nhất (Trang {currentPage}/{totalPages})
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Chưa có dữ liệu sử dụng
                        </div>
                    ) : (
                        <div>
                            <div className="overflow-x-auto mb-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Thời gian</TableHead>
                                            <TableHead>User ID</TableHead>
                                            <TableHead>Feature</TableHead>
                                            <TableHead>Model</TableHead>
                                            <TableHead className="text-right">Prompt</TableHead>
                                            <TableHead className="text-right">Completion</TableHead>
                                            <TableHead className="text-right">Total Tokens</TableHead>
                                            <TableHead className="text-right">Chi phí</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {currentLogs.map((log) => (
                                            <TableRow key={log.Id}>
                                                <TableCell className="text-xs">
                                                    {formatDate(log.CreatedAt)}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {log.user_id?.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{log.feature}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{log.model}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {log.prompt_tokens?.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {log.completion_tokens?.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-bold">
                                                    {log.total_tokens?.toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                    {formatCurrency(calculateCost(log.model || '', log.total_tokens || 0))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-end space-x-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        Trước
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            // Simple logic to show pages around current page could be added,
                                            // but for now showing first 5 or simpler logic is fine.
                                            // Let's implement a sliding window logic.
                                            let pageNum = i + 1;
                                            if (totalPages > 5) {
                                                if (currentPage > 3) {
                                                    pageNum = currentPage - 3 + i + 1;
                                                }
                                                if (pageNum > totalPages) return null;
                                            }

                                            // Simplified: Just 1,2,3,4,5 logic for max 5 pages, 
                                            // or show current-2 to current+2

                                            // Better logic for array generation:
                                            let startPage = Math.max(1, currentPage - 2);
                                            let endPage = Math.min(totalPages, startPage + 4);
                                            if (endPage - startPage < 4) {
                                                startPage = Math.max(1, endPage - 4);
                                            }

                                            const p = startPage + i;
                                            if (p > endPage) return null;

                                            return (
                                                <Button
                                                    key={p}
                                                    variant={currentPage === p ? 'default' : 'ghost'}
                                                    size="sm"
                                                    className="w-8 h-8 p-0"
                                                    onClick={() => handlePageChange(p)}
                                                >
                                                    {p}
                                                </Button>
                                            );
                                        })}
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        Sau
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TokenUsageHistory;
