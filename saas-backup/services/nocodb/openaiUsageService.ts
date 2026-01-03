/**
 * OpenAI Usage Service - NocoDB
 * Track OpenAI API usage và tính coin
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.OPENAI_USAGE_LOGS;

export interface OpenAIUsageLog {
    Id?: number;
    user_id: string;
    feature: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_coins: number;
    created_at?: string;
}

// Token to Coin conversion rates
const COIN_RATES: Record<string, number> = {
    // GPT-5 series (Đắt nhất)
    'gpt-5.2-pro': 10,        // 10 tokens = 1 coin
    'gpt-5.2': 20,            // 20 tokens = 1 coin
    'gpt-5-mini': 100,        // 100 tokens = 1 coin

    // O-series (Reasoning)
    'o4-mini': 50,            // 50 tokens = 1 coin
    'o3-mini': 50,            // 50 tokens = 1 coin
    'o1': 30,                 // 30 tokens = 1 coin
    'o1-mini': 100,           // 100 tokens = 1 coin
    'o1-preview': 30,         // 30 tokens = 1 coin

    // GPT-4.1 series
    'gpt-4.1': 80,            // 80 tokens = 1 coin
    'gpt-4.1-mini': 300,      // 300 tokens = 1 coin
    'gpt-4.1-nano': 500,      // 500 tokens = 1 coin

    // GPT-4 series
    'gpt-4': 100,             // 100 tokens = 1 coin
    'gpt-4-turbo': 100,
    'gpt-4o': 100,
    'gpt-4o-mini': 500,       // 500 tokens = 1 coin

    // GPT-3.5 (Rẻ nhất)
    'gpt-3.5-turbo': 1000,    // 1000 tokens = 1 coin

    'default': 500,
};

/**
 * Tính coin từ tokens
 */
export const calculateCoinCost = (model: string, totalTokens: number): number => {
    const rate = COIN_RATES[model] || COIN_RATES['default'];
    // Ceil để làm tròn lên, tối thiểu 1 coin
    return Math.max(1, Math.ceil(totalTokens / rate));
};

/**
 * Log OpenAI usage
 */
export const logOpenAIUsage = async (
    userId: string,
    feature: string,
    model: string,
    promptTokens: number,
    completionTokens: number
): Promise<OpenAIUsageLog | null> => {
    try {
        const totalTokens = promptTokens + completionTokens;
        const costCoins = calculateCoinCost(model, totalTokens);

        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), {
            method: 'POST',
            headers,
            body: JSON.stringify({
                user_id: userId,
                feature,
                model,
                prompt_tokens: promptTokens,
                completion_tokens: completionTokens,
                total_tokens: totalTokens,
                cost_coins: costCoins,
                created_at: new Date().toISOString(),
            }),
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error('Error logging OpenAI usage:', error);
        return null;
    }
};

/**
 * Lấy usage logs của user
 */
export const getUsageLogsByUserId = async (
    userId: string,
    limit: number = 100
): Promise<OpenAIUsageLog[]> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&sort=-created_at&limit=${limit}`,
            { headers }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data.list || [];
    } catch (error) {
        console.error('Error getting usage logs:', error);
        return [];
    }
};

/**
 * Tính tổng usage trong khoảng thời gian
 */
export const getTotalUsageByDateRange = async (
    userId: string,
    startDate: string,
    endDate: string
): Promise<{ totalTokens: number; totalCoins: number }> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(
            `(user_id,eq,${userId})~and(created_at,ge,${startDate})~and(created_at,le,${endDate})`
        );
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}`,
            { headers }
        );

        if (!response.ok) return { totalTokens: 0, totalCoins: 0 };

        const data = await response.json();
        const logs: OpenAIUsageLog[] = data.list || [];

        const totalTokens = logs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
        const totalCoins = logs.reduce((sum, log) => sum + (log.cost_coins || 0), 0);

        return { totalTokens, totalCoins };
    } catch (error) {
        console.error('Error getting total usage:', error);
        return { totalTokens: 0, totalCoins: 0 };
    }
};
