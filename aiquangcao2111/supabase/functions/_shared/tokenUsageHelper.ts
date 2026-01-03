/**
 * Token Usage Helper - Log OpenAI token usage to NocoDB
 * 
 * Use this helper in Edge Functions after calling OpenAI API
 * to track token consumption per user.
 */

import { NOCODB_CONFIG, getNocoDBHeaders } from './nocodb-config.ts';

// Table IDs
const OPENAI_USAGE_LOGS_TABLE_ID = 'magb5ls8j82lp27';
const USER_BALANCES_TABLE_ID = 'mbpatk8hctj9u1o';

export interface TokenUsageData {
    user_id: string;
    feature: string;  // e.g., 'ai-chat', 'ai-parse-creative'
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

// Minimum tokens required to use AI features
const MINIMUM_BALANCE_REQUIRED = 1000; // ~1k tokens minimum

/**
 * Check if user has enough balance before calling AI
 * Returns balance info or throws error if insufficient
 */
export const checkBalanceBeforeAI = async (userId: string): Promise<{
    hasEnough: boolean;
    currentBalance: number;
    minimumRequired: number;
    errorMessage?: string;
}> => {
    try {
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const response = await fetch(
            `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records?where=${whereClause}&limit=1`,
            { headers: getNocoDBHeaders() }
        );

        if (!response.ok) {
            console.error('❌ Failed to check user balance');
            return { hasEnough: true, currentBalance: 0, minimumRequired: MINIMUM_BALANCE_REQUIRED }; // Fallback: allow
        }

        const data = await response.json();
        const balance = data.list?.[0];
        const currentBalance = balance?.balance || 0;

        if (currentBalance < MINIMUM_BALANCE_REQUIRED) {
            console.warn(`⚠️ Insufficient balance: ${currentBalance} < ${MINIMUM_BALANCE_REQUIRED}`);
            return {
                hasEnough: false,
                currentBalance,
                minimumRequired: MINIMUM_BALANCE_REQUIRED,
                errorMessage: `Số dư của bạn không đủ, vui lòng nạp tiền.`
            };
        }

        console.log(`✅ Balance check passed: ${currentBalance} >= ${MINIMUM_BALANCE_REQUIRED}`);
        return { hasEnough: true, currentBalance, minimumRequired: MINIMUM_BALANCE_REQUIRED };
    } catch (error) {
        console.error('❌ Error checking balance:', error);
        return { hasEnough: true, currentBalance: 0, minimumRequired: MINIMUM_BALANCE_REQUIRED }; // Fallback: allow
    }
};

/**
 * Deduct tokens from user balance
 */
const deductTokensFromBalance = async (userId: string, tokensUsed: number): Promise<boolean> => {
    try {
        // 1. Get current balance
        const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
        const getResponse = await fetch(
            `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records?where=${whereClause}&limit=1`,
            { headers: getNocoDBHeaders() }
        );

        if (!getResponse.ok) {
            console.error('❌ Failed to get user balance');
            return false;
        }

        const data = await getResponse.json();
        const balance = data.list?.[0];

        if (!balance?.Id) {
            console.warn('⚠️ No balance record for user:', userId);
            return false;
        }

        // 2. Calculate new balance
        const currentBalance = balance.balance || 0;
        const currentSpent = balance.total_spent || 0;
        const newBalance = Math.max(0, currentBalance - tokensUsed);
        const newSpent = currentSpent + tokensUsed;

        // 3. Update balance (NocoDB v2 API - array format)
        const updateResponse = await fetch(
            `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
            {
                method: 'PATCH',
                headers: getNocoDBHeaders(),
                body: JSON.stringify([{
                    Id: balance.Id,
                    balance: newBalance,
                    total_spent: newSpent,
                }]),
            }
        );

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('❌ Failed to deduct tokens:', updateResponse.status, errorText);
            return false;
        }

        console.log(`✅ Deducted ${tokensUsed} tokens. Balance: ${currentBalance} → ${newBalance}`);
        return true;
    } catch (error) {
        console.error('❌ Error deducting tokens:', error);
        return false;
    }
};

/**
 * Log token usage to NocoDB openai_usage_logs table AND deduct from balance
 */
export const logTokenUsage = async (data: TokenUsageData): Promise<boolean> => {
    try {
        // 1. Log to openai_usage_logs
        const response = await fetch(
            `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${OPENAI_USAGE_LOGS_TABLE_ID}/records`,
            {
                method: 'POST',
                headers: getNocoDBHeaders(),
                body: JSON.stringify({
                    user_id: data.user_id,
                    feature: data.feature,
                    model: data.model,
                    prompt_tokens: data.prompt_tokens,
                    completion_tokens: data.completion_tokens,
                    total_tokens: data.total_tokens,
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to log token usage:', response.status, errorText);
            return false;
        }

        console.log('✅ Token usage logged:', data.total_tokens, 'tokens for', data.feature);

        // 2. Deduct from user balance
        await deductTokensFromBalance(data.user_id, data.total_tokens);

        return true;
    } catch (error) {
        console.error('❌ Error logging token usage:', error);
        return false;
    }
};

/**
 * Extract usage data from OpenAI response
 */
export const extractTokenUsage = (
    openaiResponse: any,
    userId: string,
    feature: string
): TokenUsageData | null => {
    const usage = openaiResponse?.usage;
    if (!usage) {
        console.warn('⚠️ No usage data in OpenAI response');
        return null;
    }

    return {
        user_id: userId,
        feature,
        model: openaiResponse.model || 'unknown',
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0,
    };
};
