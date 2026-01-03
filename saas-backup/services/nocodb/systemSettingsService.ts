/**
 * System Settings Service - NocoDB
 * Quản lý cài đặt hệ thống (Global API Keys, etc.)
 */

import { NOCODB_CONFIG, getNocoDBHeaders, getNocoDBUrl } from './config';

const TABLE_ID = NOCODB_CONFIG.TABLES.SYSTEM_SETTINGS;

// Setting keys
export const SETTING_KEYS = {
    GLOBAL_OPENAI_KEY: 'global_openai_key',
    GLOBAL_DEEPSEEK_KEY: 'global_deepseek_key',
    GLOBAL_GEMINI_KEY: 'global_gemini_key',
    ACTIVE_PROVIDER: 'active_ai_provider', // Deprecated - use PROVIDER_PRIORITY
    PROVIDER_PRIORITY: 'provider_priority', // JSON array: ["openai", "deepseek", "gemini"]
    FEATURE_NAMES: 'feature_names',
} as const;

export type AIProvider = 'openai' | 'deepseek' | 'gemini';

export interface SystemSetting {
    Id?: number;
    key: string;
    value: string;
    model?: string;
}

export interface GlobalOpenAIConfig {
    apiKey: string | null;
    model: string;
}

export interface GlobalDeepSeekConfig {
    apiKey: string | null;
    model: string;
}

export interface GlobalGeminiConfig {
    apiKey: string | null;
    model: string;
}

export interface GlobalAIConfig {
    activeProvider: AIProvider;
    openai: GlobalOpenAIConfig;
    deepseek: GlobalDeepSeekConfig;
    gemini: GlobalGeminiConfig;
}

/**
 * Lấy Global OpenAI Config (API Key + Model)
 */
export const getGlobalOpenAIConfig = async (): Promise<GlobalOpenAIConfig> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_OPENAI_KEY})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) {
            return { apiKey: null, model: 'gpt-4o' };
        }

        const data = await response.json();
        const setting = data.list?.[0];

        return {
            apiKey: setting?.value || null,
            model: setting?.model || 'gpt-4o',
        };
    } catch (error) {
        console.error('Error getting global OpenAI config:', error);
        return { apiKey: null, model: 'gpt-4o' };
    }
};

/**
 * Lưu Global OpenAI Config (API Key + Model)
 */
export const setGlobalOpenAIConfig = async (
    apiKey: string,
    model: string
): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        // Kiểm tra đã tồn tại chưa
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_OPENAI_KEY})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];

        // Handle both Id and id (NocoDB can return either)
        const recordId = existing?.Id || existing?.id;
        console.log('🔍 Existing record:', existing, 'recordId:', recordId);

        if (recordId) {
            // Update - use base URL with Id in body (like openaiSettingsService)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, value: apiKey, model }),
            });
            console.log('📝 PATCH response:', response.status, response.ok);
            return response.ok;
        } else {
            // Create
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: SETTING_KEYS.GLOBAL_OPENAI_KEY,
                    value: apiKey,
                    model
                }),
            });
            console.log('📝 POST response:', response.status, response.ok);
            return response.ok;
        }
    } catch (error) {
        console.error('Error setting global OpenAI config:', error);
        return false;
    }
};

/**
 * Chỉ cập nhật Model (không thay đổi API Key)
 */
export const updateGlobalOpenAIModel = async (model: string): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_OPENAI_KEY})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (recordId) {
            // Use Id in body, not in URL (NocoDB Proxy requirement)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, model }),
            });
            return response.ok;
        }

        return false;
    } catch (error) {
        console.error('Error updating model:', error);
        return false;
    }
};

/**
 * Xóa Global Provider Config (OpenAI hoặc Gemini)
 * Sử dụng method DELETE đúng chuẩn NocoDB
 */
export const deleteGlobalProviderConfig = async (settingKey: string): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        // Tìm record theo key
        const whereClause = encodeURIComponent(`(key,eq,${settingKey})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) {
            console.error('❌ Failed to find record for delete');
            return false;
        }

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (!recordId) {
            console.log('⚠️ No record found to delete');
            return true; // Already not exists = success
        }

        console.log('🗑️ Deleting record Id:', recordId);

        // Construct Proxy Command
        const fullUrl = getNocoDBUrl(TABLE_ID);
        const proxyBaseUrl = fullUrl.split('/api/v2')[0];
        const path = `/api/v2/tables/${TABLE_ID}/records`;

        const response = await fetch(proxyBaseUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                path: path,
                method: 'DELETE',
                data: [{ Id: recordId }]
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ DELETE failed:', response.status, errorText);
            return false;
        }

        console.log('✅ Delete success');
        return true;
    } catch (error) {
        console.error('Error deleting global provider config:', error);
        return false;
    }
};

// Legacy functions - keep for compatibility
export const getGlobalOpenAIKey = async (): Promise<string | null> => {
    const config = await getGlobalOpenAIConfig();
    return config.apiKey;
};

export const setGlobalOpenAIKey = async (apiKey: string): Promise<boolean> => {
    const config = await getGlobalOpenAIConfig();
    return setGlobalOpenAIConfig(apiKey, config.model);
};

export const getSetting = async (key: string): Promise<string | null> => {
    if (key === 'global_openai_model') {
        const config = await getGlobalOpenAIConfig();
        return config.model;
    }
    return null;
};

export const setSetting = async (key: string, value: string): Promise<boolean> => {
    if (key === 'global_openai_model') {
        return updateGlobalOpenAIModel(value);
    }
    return false;
};

// ============================================
// Feature Names Functions
// ============================================

/**
 * Lấy custom feature names từ NocoDB
 */
export const getFeatureNames = async (): Promise<Record<string, string>> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.FEATURE_NAMES})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) return {};

        const data = await response.json();
        const setting = data.list?.[0];

        if (setting?.value) {
            try {
                return JSON.parse(setting.value);
            } catch {
                return {};
            }
        }
        return {};
    } catch (error) {
        console.error('Error getting feature names:', error);
        return {};
    }
};

/**
 * Lưu custom feature names vào NocoDB
 */
export const saveFeatureNames = async (names: Record<string, string>): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        const valueStr = JSON.stringify(names);

        // Kiểm tra đã tồn tại chưa
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.FEATURE_NAMES})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (recordId) {
            // Update - use Id in body, not in URL (NocoDB Proxy requirement)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, value: valueStr }),
            });
            return response.ok;
        } else {
            // Create
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: SETTING_KEYS.FEATURE_NAMES,
                    value: valueStr,
                }),
            });
            return response.ok;
        }
    } catch (error) {
        console.error('Error saving feature names:', error);
        return false;
    }
};

/**
 * Lấy tất cả settings
 */
export const getAllSettings = async (): Promise<SystemSetting[]> => {
    try {
        const headers = await getNocoDBHeaders();
        const response = await fetch(getNocoDBUrl(TABLE_ID), { headers });

        if (!response.ok) return [];

        const data = await response.json();
        return data.list || [];
    } catch (error) {
        console.error('Error getting all settings:', error);
        return [];
    }
};

// ============================================
// DeepSeek Config Functions
// ============================================

/**
 * Lấy Global DeepSeek Config (API Key + Model)
 */
export const getGlobalDeepSeekConfig = async (): Promise<GlobalDeepSeekConfig> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_DEEPSEEK_KEY})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) {
            return { apiKey: null, model: 'deepseek-chat' };
        }

        const data = await response.json();
        const setting = data.list?.[0];

        return {
            apiKey: setting?.value || null,
            model: setting?.model || 'deepseek-chat',
        };
    } catch (error) {
        console.error('Error getting global DeepSeek config:', error);
        return { apiKey: null, model: 'deepseek-chat' };
    }
};

/**
 * Lưu Global DeepSeek Config (API Key + Model)
 */
export const setGlobalDeepSeekConfig = async (
    apiKey: string,
    model: string
): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_DEEPSEEK_KEY})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (recordId) {
            // Use Id in body, not in URL (NocoDB Proxy requirement)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, value: apiKey, model }),
            });
            return response.ok;
        } else {
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: SETTING_KEYS.GLOBAL_DEEPSEEK_KEY,
                    value: apiKey,
                    model
                }),
            });
            return response.ok;
        }
    } catch (error) {
        console.error('Error setting global DeepSeek config:', error);
        return false;
    }
};

// ============================================
// Gemini Config Functions
// ============================================

/**
 * Lấy Global Gemini Config (API Key + Model)
 */
export const getGlobalGeminiConfig = async (): Promise<GlobalGeminiConfig> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_GEMINI_KEY})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) {
            return { apiKey: null, model: 'gemini-2.0-flash' };
        }

        const data = await response.json();
        const setting = data.list?.[0];

        return {
            apiKey: setting?.value || null,
            model: setting?.model || 'gemini-2.0-flash',
        };
    } catch (error) {
        console.error('Error getting global Gemini config:', error);
        return { apiKey: null, model: 'gemini-2.0-flash' };
    }
};

/**
 * Lưu Global Gemini Config (API Key + Model)
 */
export const setGlobalGeminiConfig = async (
    apiKey: string,
    model: string
): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.GLOBAL_GEMINI_KEY})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (recordId) {
            // Use Id in body, not in URL (NocoDB Proxy requirement)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, value: apiKey, model }),
            });
            return response.ok;
        } else {
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: SETTING_KEYS.GLOBAL_GEMINI_KEY,
                    value: apiKey,
                    model
                }),
            });
            return response.ok;
        }
    } catch (error) {
        console.error('Error setting global Gemini config:', error);
        return false;
    }
};

// ============================================
// Active Provider Functions
// ============================================

/**
 * Lấy Active AI Provider (mặc định: openai)
 */
export const getActiveProvider = async (): Promise<AIProvider> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.ACTIVE_PROVIDER})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) return 'openai';

        const data = await response.json();
        const setting = data.list?.[0];

        const provider = setting?.value as AIProvider;
        if (provider === 'openai' || provider === 'gemini') {
            return provider;
        }
        return 'openai';
    } catch (error) {
        console.error('Error getting active provider:', error);
        return 'openai';
    }
};

/**
 * Lưu Active AI Provider
 */
export const setActiveProvider = async (provider: AIProvider): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();

        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.ACTIVE_PROVIDER})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (recordId) {
            // Use Id in body, not in URL (NocoDB Proxy requirement)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, value: provider }),
            });
            return response.ok;
        } else {
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: SETTING_KEYS.ACTIVE_PROVIDER,
                    value: provider
                }),
            });
            return response.ok;
        }
    } catch (error) {
        console.error('Error setting active provider:', error);
        return false;
    }
};

/**
 * Lấy tất cả Global AI Configs (OpenAI + DeepSeek + Gemini + Active Provider)
 */
export const getAllGlobalAIConfigs = async (): Promise<GlobalAIConfig> => {
    const [openai, deepseek, gemini, activeProvider] = await Promise.all([
        getGlobalOpenAIConfig(),
        getGlobalDeepSeekConfig(),
        getGlobalGeminiConfig(),
        getActiveProvider(),
    ]);

    return {
        activeProvider,
        openai,
        deepseek,
        gemini,
    };
};

// ============================================
// Provider Priority Functions (Fallback Chain)
// ============================================

/**
 * Lấy thứ tự ưu tiên Provider (mặc định: ["openai", "deepseek", "gemini"])
 */
export const getProviderPriority = async (): Promise<AIProvider[]> => {
    try {
        const headers = await getNocoDBHeaders();
        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.PROVIDER_PRIORITY})`);
        const response = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!response.ok) return ['openai', 'deepseek', 'gemini'];

        const data = await response.json();
        const setting = data.list?.[0];

        if (setting?.value) {
            try {
                const parsed = JSON.parse(setting.value);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Validate each item is a valid provider
                    const validProviders = parsed.filter((p: string) =>
                        ['openai', 'deepseek', 'gemini'].includes(p)
                    );
                    if (validProviders.length > 0) {
                        return validProviders as AIProvider[];
                    }
                }
            } catch {
                // Invalid JSON
            }
        }
        return ['openai', 'deepseek', 'gemini'];
    } catch (error) {
        console.error('Error getting provider priority:', error);
        return ['openai', 'deepseek', 'gemini'];
    }
};

/**
 * Lưu thứ tự ưu tiên Provider
 */
export const setProviderPriority = async (priority: AIProvider[]): Promise<boolean> => {
    try {
        const headers = await getNocoDBHeaders();
        const valueStr = JSON.stringify(priority);

        const whereClause = encodeURIComponent(`(key,eq,${SETTING_KEYS.PROVIDER_PRIORITY})`);
        const checkResponse = await fetch(
            `${getNocoDBUrl(TABLE_ID)}?where=${whereClause}&limit=1`,
            { headers }
        );

        if (!checkResponse.ok) return false;

        const checkData = await checkResponse.json();
        const existing = checkData.list?.[0];
        const recordId = existing?.Id || existing?.id;

        if (recordId) {
            // Use Id in body, not in URL (NocoDB Proxy requirement)
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ Id: recordId, value: valueStr }),
            });
            return response.ok;
        } else {
            const response = await fetch(getNocoDBUrl(TABLE_ID), {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    key: SETTING_KEYS.PROVIDER_PRIORITY,
                    value: valueStr
                }),
            });
            return response.ok;
        }
    } catch (error) {
        console.error('Error setting provider priority:', error);
        return false;
    }
};
