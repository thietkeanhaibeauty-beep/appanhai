import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
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
    // ✅ Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Authenticated user:', user.id);

    const { creativeData } = await req.json();

    if (!creativeData) {
      return new Response(
        JSON.stringify({ error: 'creativeData is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, hasImage, hasVideo } = creativeData;

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
      return new Response(
        JSON.stringify({ error: "Cannot fetch OpenAI configuration" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const nocodbData = await nocodbResponse.json();
    let settings = nocodbData.list && nocodbData.list.length > 0 ? nocodbData.list[0] : null;
    let apiEndpoint = 'https://api.openai.com/v1/chat/completions';

    if (!settings || !settings.api_key) {
      console.log('⚠️ No user key, fetching GLOBAL AI settings with provider_priority...');
      const globalSettings = await getGlobalAISettings();
      if (globalSettings) {
        settings = { api_key: globalSettings.apiKey, model: globalSettings.model };
        apiEndpoint = globalSettings.endpoint;
        console.log(`✅ Using GLOBAL ${globalSettings.provider.toUpperCase()} with model:`, globalSettings.model);
      } else {
        console.error('❌ No AI API key found');
        return new Response(
          JSON.stringify({ error: "OpenAI API key not configured" }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (!settings || !settings.api_key) {
      console.error('❌ No active OpenAI settings found');
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing ad creative with OpenAI:', creativeData);

    const mediaType = hasVideo ? 'video' : hasImage ? 'image' : 'text only';

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${settings.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: "system",
            content: `You are a Facebook Ads creative expert. Analyze ad creative and provide:
1. Brief analysis (2-3 sentences) of the creative quality and effectiveness
2. 3-5 specific, actionable suggestions to improve ad performance
3. A score from 0-100 (0=very poor, 100=excellent)

Focus on:
- Message clarity and call-to-action
- Emotional appeal and persuasiveness
- Visual element appropriateness
- Compliance with Facebook ad policies
- Mobile-friendliness

Be concise and practical. Consider Vietnamese market preferences when relevant.`
          },
          {
            role: "user",
            content: `Analyze this Facebook Ad creative:

**Message:**
${message || '(No message provided)'}

**Media Type:** ${mediaType}
**Has Image:** ${hasImage ? 'Yes' : 'No'}
**Has Video:** ${hasVideo ? 'Yes' : 'No'}

Provide analysis, suggestions, and score.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_creative",
              description: "Provide ad creative analysis with score and suggestions",
              parameters: {
                type: "object",
                properties: {
                  analysis: {
                    type: "string",
                    description: "Brief analysis of creative quality (2-3 sentences)"
                  },
                  suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 actionable suggestions to improve the creative"
                  },
                  score: {
                    type: "number",
                    description: "Score from 0-100 representing creative quality"
                  }
                },
                required: ["analysis", "suggestions", "score"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_creative" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Invalid OpenAI API key." }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No tool call response from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);

    console.log('Analysis result:', result);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in ai-analyze-creative:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        analysis: 'Unable to analyze ad creative.',
        suggestions: ['Please try again later.'],
        score: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
