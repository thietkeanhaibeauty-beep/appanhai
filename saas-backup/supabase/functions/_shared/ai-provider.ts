/**
 * Shared AI Provider Helper
 * 
 * Đọc provider_priority từ NocoDB và trả về API key + endpoint đúng
 * Dùng chung cho TẤT CẢ Edge Functions cần gọi AI
 */

import { NOCODB_CONFIG, getNocoDBHeaders } from './nocodb-config.ts';

export type AIProvider = 'openai' | 'deepseek' | 'gemini';

export interface AISettings {
    apiKey: string;
    model: string;
    provider: AIProvider;
    endpoint: string;
}

const ENDPOINTS: Record<AIProvider, string> = {
    openai: 'https://api.openai.com/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/v1/chat/completions',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
};

const DEFAULT_MODELS: Record<AIProvider, string> = {
    openai: 'gpt-4.1-mini',
    deepseek: 'deepseek-chat',
    gemini: 'gemini-2.0-flash',
};

const KEY_NAMES: Record<AIProvider, string> = {
    openai: 'global_openai_key',
    deepseek: 'global_deepseek_key',
    gemini: 'global_gemini_key',
};

/**
 * Lấy AI settings theo provider_priority từ SuperAdmin
 * 
 * Logic:
 * 1. Đọc provider_priority (mảng JSON) từ NocoDB
 * 2. Thử từng provider theo thứ tự
 * 3. Trả về provider đầu tiên có API key hợp lệ
 */
export async function getGlobalAISettings(): Promise<AISettings | null> {
    try {
        const headers = getNocoDBHeaders();
        const tableId = NOCODB_CONFIG.TABLES.SYSTEM_SETTINGS;

        // Step 1: Get provider priority order
        const priorityUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records?where=(key,eq,provider_priority)&limit=1`;
        const priorityResponse = await fetch(priorityUrl, { headers });

        let providerOrder: AIProvider[] = ['deepseek', 'openai', 'gemini']; // Default order (DeepSeek first - rẻ nhất)

        if (priorityResponse.ok) {
            const priorityData = await priorityResponse.json();
            const prioritySetting = priorityData.list?.[0];
            if (prioritySetting?.value) {
                try {
                    const parsed = JSON.parse(prioritySetting.value);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        providerOrder = parsed.filter((p: string) =>
                            ['openai', 'deepseek', 'gemini'].includes(p)
                        ) as AIProvider[];
                    }
                } catch { /* Invalid JSON, use default */ }
            }
        }

        console.log('🔢 Provider priority order:', providerOrder);

        // Step 2: Try each provider in order
        for (const provider of providerOrder) {
            const keyName = KEY_NAMES[provider];
            console.log(`🔄 Trying provider: ${provider.toUpperCase()}...`);

            const keyUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records?where=(key,eq,${keyName})&limit=1`;
            const keyResponse = await fetch(keyUrl, { headers });

            if (keyResponse.ok) {
                const keyData = await keyResponse.json();
                const keySetting = keyData.list?.[0];

                if (keySetting?.value) {
                    console.log(`✅ Using Global ${provider.toUpperCase()} Key. Model:`, keySetting.model || DEFAULT_MODELS[provider]);

                    return {
                        apiKey: keySetting.value,
                        model: keySetting.model || DEFAULT_MODELS[provider],
                        provider,
                        endpoint: ENDPOINTS[provider],
                    };
                } else {
                    console.log(`⚠️ ${provider.toUpperCase()} has no API key configured, trying next...`);
                }
            }
        }

        console.error('❌ No AI provider has API key configured');
        return null;
    } catch (error) {
        console.error('❌ Error getting global AI settings:', error);
        return null;
    }
}

/**
 * Shortcut: Lấy AI settings hoặc throw error
 */
export async function requireGlobalAISettings(): Promise<AISettings> {
    const settings = await getGlobalAISettings();
    if (!settings) {
        throw new Error('AI API key chưa được cấu hình. Vui lòng liên hệ Admin.');
    }
    return settings;
}
