import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from '../_shared/auth.ts';
import { getGlobalAISettings } from '../_shared/ai-provider.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_CONFIG = {
  BASE_URL: 'https://db.hpb.edu.vn',
  API_TOKEN: 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij',
  TABLE_ID: 'mdemuc9wbwdkq1j', // openai_settings table
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Authenticate user using helper
    let user;
    try {
      user = await getUserFromRequest(req);
      console.log('✅ Authenticated user:', user.id);
    } catch (authError) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({
          error: authError instanceof Error ? authError.message : 'Authentication failed',
          audienceName: null,
          description: null,
          retentionDays: null,
          country: null,
          ratio: null,
          hasFile: null
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userMessage, currentStage, currentData } = await req.json();

    // ✅ Get OpenAI API key from NocoDB filtered by user_id
    const nocodbUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLE_ID}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=1`;

    console.log('📥 Fetching OpenAI settings from NocoDB for user:', user.id);

    const nocodbResponse = await fetch(nocodbUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_CONFIG.API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!nocodbResponse.ok) {
      const errorText = await nocodbResponse.text();
      console.error('❌ NocoDB fetch error:', nocodbResponse.status, errorText);
      throw new Error('Cannot fetch OpenAI configuration');
    }

    const nocodbData = await nocodbResponse.json();
    let settings = nocodbData.list && nocodbData.list.length > 0 ? nocodbData.list[0] : null;

    if (!settings || !settings.api_key) {
      console.log('⚠️ No user key, fetching GLOBAL AI settings with provider_priority...');
      const globalSettings = await getGlobalAISettings();
      if (globalSettings) {
        settings = { api_key: globalSettings.apiKey, model: globalSettings.model };
        (globalThis as any)._aiEndpoint = globalSettings.endpoint;
        console.log(`✅ Using GLOBAL ${globalSettings.provider.toUpperCase()} with model:`, globalSettings.model);
      } else {
        console.error('❌ No AI API key found');
        throw new Error('OPENAI_API_KEY is not configured');
      }
    }

    const systemPrompt = `Bạn là AI assistant trích xuất thông tin tạo đối tượng quảng cáo Facebook.

Dựa vào stage hiện tại và user message, hãy trích xuất thông tin:

- audienceName: Tên đối tượng (string)
- description: Mô tả (string, optional)
- retentionDays: Số ngày giữ lại (1-365, cho Page Messengers)
- country: Quốc gia (VN, US, TH, SG, MY - cho Lookalike)
- ratio: Quy mô % (1-20, cho Lookalike) - QUAN TRỌNG: Luôn trả về số nguyên, không phải decimal
- hasFile: User có nhắc đến hoặc đính kèm file không (boolean)

QUAN TRỌNG: 
- Nếu user message CHỈ là 1 từ hoặc cụm từ ngắn và stage là "collecting_lookalike", đó là tên đối tượng
- Ví dụ: "tao tép" → audienceName: "tao tép"
- Ví dụ: "abc" → audienceName: "abc"  
- Ví dụ: "avmb" → audienceName: "avmb"

Ví dụ input:
- "Khách hàng tiềm năng Q1" → audienceName: "Khách hàng tiềm năng Q1"
- "90 ngày" hoặc "90" → retentionDays: 90
- "Việt Nam" hoặc "VN" → country: "VN"
- "3%" hoặc "3" → ratio: 3 (số nguyên, không phải 0.03)
- "1%" hoặc "1" → ratio: 1 (số nguyên, không phải 0.01)
- "tôi có file SĐT" → hasFile: true

QUAN TRỌNG: ratio luôn là số nguyên từ 1-20 (không phải 0.01-0.20)

Return ONLY valid JSON (no markdown):
{
  "audienceName": "string or null",
  "description": "string or null",
  "retentionDays": number or null,
  "country": "string or null",
  "ratio": number or null,
  "hasFile": boolean or null
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Stage: ${currentStage}\nCurrent Data: ${JSON.stringify(currentData)}\nUser Message: ${userMessage}` }
    ];

    console.log('[Parse Audience] Processing:', userMessage, 'Stage:', currentStage);

    const apiEndpoint = (globalThis as any)._aiEndpoint || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.model || 'gpt-4o-mini',
        messages,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Parse Audience] AI Error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    console.log('[Parse Audience] Result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Parse Audience] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        audienceName: null,
        description: null,
        retentionDays: null,
        country: null,
        ratio: null,
        hasFile: null
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
