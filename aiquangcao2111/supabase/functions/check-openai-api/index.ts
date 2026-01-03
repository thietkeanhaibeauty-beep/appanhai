/**
 * check-openai-api - Multi-Provider API Key Validation
 * Supports: OpenAI, DeepSeek, Gemini (each with separate check logic)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { apiKey, model, provider = 'openai' } = await req.json();

        if (!apiKey) {
            return new Response(
                JSON.stringify({ success: false, error: 'API key is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`🔍 Checking ${provider.toUpperCase()} API key...`);

        let result;
        switch (provider) {
            case 'openai':
                result = await checkOpenAI(apiKey, model);
                break;
            case 'deepseek':
                result = await checkDeepSeek(apiKey, model);
                break;
            case 'gemini':
                result = await checkGemini(apiKey, model);
                break;
            default:
                result = { success: false, error: 'Unknown provider' };
        }

        return new Response(
            JSON.stringify(result),
            {
                status: result.success ? 200 : 200, // Always 200, success in body
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        console.error('❌ Error checking API:', error);
        return new Response(
            JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

// =============================================
// OpenAI Check
// =============================================
async function checkOpenAI(apiKey: string, model?: string): Promise<{ success: boolean; error?: string; model?: string }> {
    const selectedModel = model || 'gpt-4o-mini';
    console.log(`📡 OpenAI: Testing with model ${selectedModel}`);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ OpenAI error:', data);
            return {
                success: false,
                error: data.error?.message || 'Invalid OpenAI API key'
            };
        }

        console.log('✅ OpenAI API key valid');
        return { success: true, model: selectedModel };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// =============================================
// DeepSeek Check
// =============================================
async function checkDeepSeek(apiKey: string, model?: string): Promise<{ success: boolean; error?: string; model?: string }> {
    const selectedModel = model || 'deepseek-chat';
    console.log(`📡 DeepSeek: Testing with model ${selectedModel}`);

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ DeepSeek error:', data);
            return {
                success: false,
                error: data.error?.message || 'Invalid DeepSeek API key'
            };
        }

        console.log('✅ DeepSeek API key valid');
        return { success: true, model: selectedModel };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// =============================================
// Gemini Check (Google AI Studio API)
// =============================================
async function checkGemini(apiKey: string, model?: string): Promise<{ success: boolean; error?: string; model?: string; warning?: string }> {
    const selectedModel = model || 'gemini-2.0-flash';
    console.log(`📡 Gemini: Testing with model ${selectedModel}`);

    try {
        // Use native Gemini API endpoint with ?key= format
        console.log('🔄 Testing native Gemini endpoint...');

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: 'Hi' }] }],
                    generationConfig: { maxOutputTokens: 5 }
                })
            }
        );

        console.log('📥 Gemini response status:', response.status);

        // Success!
        if (response.ok) {
            console.log('✅ Gemini API key valid');
            return { success: true, model: selectedModel };
        }

        // Not OK - parse error
        const data = await response.json();
        const errorMessage = data.error?.message || '';
        const errorStatus = data.error?.status || '';

        console.log('⚠️ Gemini error:', response.status, errorStatus, errorMessage);

        // 429 = Rate limit / Quota exceeded = KEY IS VALID, just quota issue
        if (response.status === 429 ||
            errorMessage.toLowerCase().includes('quota') ||
            errorStatus === 'RESOURCE_EXHAUSTED') {
            console.log('✅ Gemini API key VALID (quota exceeded - but key works!)');
            return {
                success: true,
                model: selectedModel,
                warning: 'API Key hợp lệ nhưng đã hết quota. Vui lòng upgrade hoặc đợi reset quota.'
            };
        }

        // 400 with API_KEY_INVALID = Invalid key
        if (errorMessage.includes('API_KEY_INVALID') ||
            errorMessage.includes('API key not valid') ||
            errorStatus === 'INVALID_ARGUMENT') {
            console.error('❌ Gemini API key invalid');
            return { success: false, error: 'API Key không hợp lệ. Vui lòng kiểm tra lại.' };
        }

        // 403 = Permission denied
        if (response.status === 403 || errorStatus === 'PERMISSION_DENIED') {
            console.error('❌ Gemini permission denied');
            return { success: false, error: 'Không có quyền truy cập. Kiểm tra API key đã bật Gemini API chưa.' };
        }

        // Other errors
        return {
            success: false,
            error: errorMessage || `Lỗi Gemini API (${response.status})`
        };

    } catch (error: any) {
        console.error('❌ Gemini check error:', error);
        return { success: false, error: error.message };
    }
}
