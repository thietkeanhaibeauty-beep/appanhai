import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';
import { getGlobalAISettings } from '../_shared/ai-provider.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
        JSON.stringify({ error: authError instanceof Error ? authError.message : 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { promptText } = await req.json();

    // ✅ Get OpenAI API key from NocoDB filtered by user_id
    const nocodbUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=1`;

    console.log('📥 Fetching OpenAI settings from NocoDB for user:', user.id);

    const nocodbResponse = await fetch(nocodbUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (!nocodbResponse.ok) {
      const errorText = await nocodbResponse.text();
      console.error('❌ NocoDB fetch error:', nocodbResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Không thể lấy cấu hình OpenAI. Vui lòng thử lại." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const nocodbData = await nocodbResponse.json();
    const settings = nocodbData.list && nocodbData.list.length > 0 ? nocodbData.list[0] : null;

    // ✅ Try user's key first, then fallback to global with provider_priority
    let openaiApiKey: string | null = settings?.api_key || null;
    let openaiModel = settings?.model || 'gpt-4o-mini';
    let apiEndpoint = 'https://api.openai.com/v1/chat/completions';

    if (!openaiApiKey) {
      console.log('⚠️ No user key, fetching GLOBAL AI settings with provider_priority...');
      const globalSettings = await getGlobalAISettings();
      if (globalSettings) {
        openaiApiKey = globalSettings.apiKey;
        openaiModel = globalSettings.model;
        apiEndpoint = globalSettings.endpoint;
        console.log(`✅ Using GLOBAL ${globalSettings.provider.toUpperCase()} API Key with model:`, openaiModel);
      } else {
        return new Response(
          JSON.stringify({ error: "OpenAI API key chưa được cấu hình. Vui lòng vào Settings để thêm API key." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("✅ Using USER OpenAI API key with Model:", openaiModel);
    }

    const systemPrompt = `Bạn là chuyên gia Facebook Ads. Phân tích đoạn văn bản và trích xuất thông tin chiến dịch.

Lưu ý:
- campaignName: Tên chiến dịch (sẽ được dùng cho cả campaign, ad set và ad)
- budget phải là số (VND), ví dụ: 400000 cho 400k
- ageMin và ageMax phải là số từ 18-65
- gender chỉ có 3 giá trị: "all", "male", "female"
- locations là mảng các tên địa điểm:
  + Tọa độ GPS: PHẢI giữ nguyên format "21.394125876534694, 106.62288496756234" (1 string duy nhất)
  + Tên địa điểm: "Hà Nội", "TP.HCM", etc.
- locationRadius: Bán kính targeting tính bằng km
  + LUÔN TÌM số km trong văn bản (VD: "25km", "bán kính 10km", "trong vòng 50km", "21.39, 106.62 17km")
  + Số km có thể ở CUỐI dòng vị trí hoặc ở bất kỳ đâu trong văn bản
  + Nếu KHÔNG TÌM THẤY số km RÕ RÀNG trong văn bản: ĐỂ null (hệ thống sẽ hỏi người dùng)
  + KHÔNG TỰ ĐỘNG điền giá trị mặc định
  + ⚠️ Quan trọng: Tọa độ GPS cần bán kính tối thiểu 1km, địa điểm cần 17km
- interestKeywords là mảng từ khóa sở thích tiếng Việt
- Nếu không có thông tin, dùng giá trị mặc định hợp lý`;

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_campaign_info",
              description: "Trích xuất thông tin chiến dịch Facebook Ads",
              parameters: {
                type: "object",
                properties: {
                  campaignName: {
                    type: "string",
                    description: "Tên chiến dịch (sẽ được dùng chung cho campaign, ad set và ad)"
                  },
                  budget: {
                    type: "number",
                    description: "Ngân sách hàng ngày VND (ví dụ: 400000)"
                  },
                  ageMin: {
                    type: "number",
                    description: "Tuổi tối thiểu (18-65)"
                  },
                  ageMax: {
                    type: "number",
                    description: "Tuổi tối đa (18-65)"
                  },
                  gender: {
                    type: "string",
                    enum: ["all", "male", "female"],
                    description: "Giới tính"
                  },
                  locations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Danh sách địa điểm. QUAN TRỌNG: Nếu là tọa độ GPS (VD: '21.394125876534694, 106.62288496756234'), PHẢI giữ nguyên thành 1 string duy nhất, KHÔNG TÁCH RA. Nếu là tên địa điểm thì bình thường (VD: 'Hà Nội', 'TP.HCM')"
                  },
                  locationRadius: {
                    type: "number",
                    description: "Bán kính targeting (km). LUÔN TÌM số km trong văn bản (ví dụ: '17km', 'Hà Nội 25km', '21.39, 106.62 17km'). Số km có thể ở cuối dòng vị trí. Nếu KHÔNG TÌM THẤY số km rõ ràng thì ĐỂ NULL. LƯU Ý: Tọa độ GPS yêu cầu tối thiểu 1km, địa điểm yêu cầu 17km",
                    nullable: true
                  },
                  interestKeywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Danh sách sở thích"
                  },
                  postUrl: {
                    type: "string",
                    description: "Link bài viết Facebook"
                  },
                  greetingMessage: {
                    type: "string",
                    description: "Lời chào tin nhắn (optional)"
                  },
                  headline: {
                    type: "string",
                    description: "Tiêu đề quảng cáo (optional)"
                  },
                  message: {
                    type: "string",
                    description: "Nội dung chính (optional)"
                  }
                },
                required: ["campaignName", "budget", "ageMin", "ageMax", "gender", "locations", "interestKeywords", "postUrl"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_campaign_info" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Vượt quá giới hạn yêu cầu OpenAI, vui lòng thử lại sau." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key không hợp lệ. Vui lòng kiểm tra lại trong Settings." }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("OpenAI response:", JSON.stringify(data));

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    console.log("Parsed campaign data:", JSON.stringify(parsedData));

    return new Response(
      JSON.stringify({ data: parsedData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in ai-parse-campaign function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
