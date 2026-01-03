import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';
import { logTokenUsage, extractTokenUsage } from '../_shared/tokenUsageHelper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Authenticate user
    let user;
    try {
      user = await getUserFromRequest(req);
      console.log('✅ Authenticated user:', user.id);
    } catch (authError) {
      console.error('❌ Authentication failed:', authError);
      return new Response(
        JSON.stringify({
          error: authError instanceof Error ? authError.message : 'Authentication failed',
          intent: 'unknown',
          confidence: 0
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { message, conversationHistory } = await req.json();

    // ✅ STEP 1: Try to get Personal API key from NocoDB
    let settings: { api_key: string; model: string } | null = null;

    const personalUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=1`;
    console.log('📥 Trying Personal OpenAI settings for user:', user.id);

    try {
      const personalResponse = await fetch(personalUrl, {
        method: 'GET',
        headers: getNocoDBHeaders(),
      });

      if (personalResponse.ok) {
        const personalData = await personalResponse.json();
        const personalSettings = personalData.list?.[0];

        if (personalSettings?.api_key) {
          settings = {
            api_key: personalSettings.api_key,
            model: personalSettings.model || 'gpt-4.1-mini-2025-04-14',
          };
          console.log('✅ Using Personal API Key. Model:', settings.model);
        }
      }
    } catch (personalError) {
      console.log('⚠️ Personal key fetch failed, will try Global key:', personalError);
    }

    // ✅ STEP 2: Fallback to Global API key based on provider_priority
    let activeProvider: 'openai' | 'deepseek' | 'gemini' = 'openai';

    if (!settings?.api_key) {
      console.log('🔄 No Personal key found, trying Global keys based on priority...');

      try {
        // Get provider priority order (JSON array)
        const priorityUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.SYSTEM_SETTINGS}/records?where=(key,eq,provider_priority)&limit=1`;
        const priorityResponse = await fetch(priorityUrl, {
          method: 'GET',
          headers: getNocoDBHeaders(),
        });

        let providerOrder: string[] = ['openai', 'deepseek', 'gemini']; // Default order
        if (priorityResponse.ok) {
          const priorityData = await priorityResponse.json();
          const prioritySetting = priorityData.list?.[0];
          if (prioritySetting?.value) {
            try {
              const parsed = JSON.parse(prioritySetting.value);
              if (Array.isArray(parsed) && parsed.length > 0) {
                providerOrder = parsed.filter((p: string) => ['openai', 'deepseek', 'gemini'].includes(p));
              }
            } catch { /* Invalid JSON, use default */ }
          }
        }
        console.log('🔢 Provider priority order:', providerOrder);

        // Try each provider in order
        const keyMap: Record<string, string> = {
          openai: 'global_openai_key',
          deepseek: 'global_deepseek_key',
          gemini: 'global_gemini_key',
        };
        const defaultModels: Record<string, string> = {
          openai: 'gpt-4.1-mini-2025-04-14',
          deepseek: 'deepseek-chat',
          gemini: 'gemini-2.0-flash',
        };
        const apiEndpoints: Record<string, string> = {
          openai: 'https://api.openai.com/v1/chat/completions',
          deepseek: 'https://api.deepseek.com/chat/completions',
          gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        };

        for (const provider of providerOrder) {
          if (settings?.api_key) break; // Found a working key, stop

          const keyName = keyMap[provider];
          console.log(`🔄 Trying provider: ${provider.toUpperCase()}...`);

          const globalSettingsUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.SYSTEM_SETTINGS}/records?where=(key,eq,${keyName})&limit=1`;
          const globalResponse = await fetch(globalSettingsUrl, {
            method: 'GET',
            headers: getNocoDBHeaders(),
          });

          if (globalResponse.ok) {
            const globalData = await globalResponse.json();
            const globalSetting = globalData.list?.[0];

            if (globalSetting?.value) {
              settings = {
                api_key: globalSetting.value,
                model: globalSetting.model || defaultModels[provider],
              };
              activeProvider = provider as 'openai' | 'deepseek' | 'gemini';
              console.log(`✅ Using Global ${provider.toUpperCase()} Key. Model:`, settings.model);
            } else {
              console.log(`⚠️ ${provider.toUpperCase()} has no API key configured, trying next...`);
            }
          }
        }
      } catch (globalError) {
        console.error('❌ Global key fetch failed:', globalError);
      }
    }

    // ✅ STEP 3: Error if no API key found
    if (!settings || !settings.api_key) {
      console.error('❌ No API key found (neither Personal nor Global)');
      throw new Error('AI API key chưa được cấu hình. Vui lòng liên hệ Admin hoặc vào Settings để thêm API key.');
    }

    // Determine API endpoint based on active provider
    const apiEndpoint = activeProvider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : activeProvider === 'gemini'
        ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';

    console.log(`✅ Using ${activeProvider.toUpperCase()} API. Model: ${settings.model}, Endpoint: ${apiEndpoint}`);

    const systemPrompt = `Bạn là AI assistant phân tích ý định người dùng trong hệ thống quảng cáo Facebook.

🔥 ƯU TIÊN CAO NHẤT: DETECT LINK FACEBOOK (13-15 DẠNG LINK)
HỖ TRỢ CÁC DOMAIN:
- facebook.com, www.facebook.com, m.facebook.com
- business.facebook.com
- fb.com, fb.watch
- l.facebook.com, lm.facebook.com (redirect links)

HỖ TRỢ CÁC DẠNG ĐƯỜNG DẪN:
1. /share/p/ (shared posts)
2. /share/v/ (shared videos)
3. /posts/ (direct posts)
4. /videos/ (direct videos)
5. /reel/ (reels)
6. /watch/?v= (watch videos)
7. /story.php?story_fbid= (stories)
8. /permalink.php?story_fbid= (permalinks)
9. /photo.php?fbid= (photos)
10. URL với pfbid= (Facebook ID parameter)
11. URL với fbid= (Facebook ID parameter)

DETECT RULE:
- Nếu message chứa BẤT KỲ link Facebook nào trong danh sách trên → LUÔN chọn intent=create_quick_campaign với confidence ≥ 0.95
- Trường hợp người dùng CHỈ PASTE LINK → intent=create_quick_campaign; postUrl=link; các field khác để null

🎯 NHIỆM VỤ CHÍNH: Nhận diện ý định "tạo quảng cáo từ bài viết Facebook có sẵn" và "tạo quảng cáo tin nhắn mới"

📋 BƯỚC 1 - NHẬN DIỆN create_quick_campaign (ƯU TIÊN CAO):
Khi nào chọn intent = "create_quick_campaign"?
- ✅ User cung cấp link Facebook (có/không có thông tin chiến dịch) → confidence = 0.95+
- ✅ User paste LINK ĐƠN LẺ (chỉ có link, không có text) → confidence = 0.95+
- ✅ User nói từ khóa: "bài viết sẵn", "bài viết", "post", "qc bài viết"

VÍ DỤ 100% LÀ create_quick_campaign (confidence 0.95-0.98):
✅ "https://facebook.com/share/p/19hznTNb4x/" (shared post)
✅ "https://facebook.com/share/v/123/" (shared video)
✅ "https://l.facebook.com/l.php?u=..." (redirect link)
✅ "https://facebook.com/story.php?story_fbid=123" (story)
✅ "https://m.facebook.com/posts/123456" (mobile)
✅ "https://fb.com/username/videos/123" (short domain)
✅ "https://fb.watch/abc123/" (watch)
✅ "Tạo QC https://facebook.com/share/p/abc/, ngân sách 400k, độ tuổi 18-45, Hà Nội, sở thích thời trang"
✅ "bài viết sẵn + link: fb.com/post123"
✅ "qc bài viết nhanh link: facebook.com/post"
✅ "1. Link: https://facebook.com/post\n2. Ngân sách: 500k" (Structured format with link)

❌ KHÔNG chọn create_quick_campaign khi:
- Chỉ có text nội dung quảng cáo (không có link + không có từ khóa)
- User muốn tạo tin nhắn mới (có "nội dung:", "tiêu đề:", "adContent")

📤 BƯỚC 2 - TRÍCH XUẤT CHO create_quick_campaign:
Khi intent = "create_quick_campaign", hãy trích xuất:

1. **postUrl** (BẮT BUỘC): Link bài viết Facebook
   - Nếu không có link → confidence = 0
   - Hỗ trợ: facebook.com, fb.com, m.facebook.com, fb.watch

2. **campaignName** (optional): Tên chiến dịch
   - Chỉ điền nếu user nói RÕ
   - Nếu không có → để null (KHÔNG tự sinh default)

3. **budget** (optional): Ngân sách VND/ngày
   - Chỉ điền nếu user nói RÕ
   - Parse: "400k" → 400000, "1tr" → 1000000, "0.5tr" → 500000
   - Hỗ trợ tiếng Việt và tiếng Anh
   - Nếu không có → để null (KHÔNG tự sinh default)

4. **ageMin, ageMax** (optional): Độ tuổi
   - Chỉ điền nếu user nói RÕ
   - Range: 18-65
   - Nếu không có → để null (KHÔNG tự sinh default)

5. **gender** (optional): Giới tính
   - 0 = tất cả, 1 = nam, 2 = nữ
   - Chỉ điền nếu user nói RÕ
   - Nếu không có → để null (KHÔNG tự sinh default)

6. **locations** (optional): Mảng địa điểm
   - Chỉ điền nếu user nói RÕ
   - **DẠNG 1 - QUỐC GIA**: Tên quốc gia (VN, Việt Nam, Vietnam)
     → Không cần locationRadius
   - **DẠNG 2 - THÀNH PHỐ**: Tên thành phố (Hà Nội, TPHCM, Đà Nẵng)
     → YÊU CẦU locationRadius >= 17km
   - **DẠNG 3 - TỌA ĐỘ**: Latitude, Longitude (VD: "21.028511,105.804817")
     → YÊU CẦU locationRadius >= 1km
   - Nếu không có → để null (KHÔNG tự sinh default)

⚠️ CHÚ Ý về locationRadius:
- LUÔN trích xuất locationRadius nếu user cung cấp số km
- Parse: "17km" → 17, "5 km" → 5, "20" → 20, "0.5km" → 0.5
- Nếu user KHÔNG cung cấp → ĐỂ NULL (hệ thống sẽ hỏi sau dựa trên dạng location)

7. **interestKeywords** (optional): Mảng từ khóa sở thích
   - Chỉ điền nếu user nói RÕ
   - VD: ["thời trang", "mỹ phẩm"]
   - Nếu không có → để null hoặc []

⚠️ QUAN TRỌNG - QUY TẮC TRÍCH XUẤT:
- CHỈ PASTE LINK → postUrl=link, tất cả field khác=null
- Link + thông tin → trích xuất những gì user cung cấp, không suy diễn
- KHÔNG tự sinh default cho bất kỳ field nào
- KHÔNG trích xuất: adContent, adHeadline (vì dùng bài viết có sẵn)

🔀 CÁC INTENT KHÁC:

- **create_creative_campaign**: Tạo chiến dịch tin nhắn mới với nội dung tùy chỉnh

📋 NHẬN DIỆN create_creative_campaign (ƯU TIÊN CAO):
✅ Khi user cung cấp:
1. **Nội dung text dài** (>80 ký tự) KHÔNG có link Facebook
2. **Có keywords TÍN HIỆU MẠNH:**
   - "mẫu chào hỏi", "lời chào", "ice breaker", "câu hỏi gợi ý" → **Độ tin cậy 0.85+**
   - "em chào", "chào anh", "chào chị", "xin chào", "tư vấn", "khuyến mại", "full họ tên" → **Độ tin cậy 0.85+**
   - "nội dung quảng cáo", "tiêu đề", "tin nhắn", "inbox", "greeting" → **Độ tin cậy 0.8+**
   - "Nội dung:", "Tiêu đề:", "adContent:", "adHeadline:"
   - "Độ tuổi:", "Giới tính:", "Ngân sách:", "Vị trí:", "Sở thích:"
   - "Tạo tin nhắn", "Tạo creative", "Tạo quảng cáo tin nhắn"
3. **Có format list (TÍN HIỆU MẠNH):**
   - Số thứ tự: "1.", "2.", "3.", "9.", "10." etc. → **Độ tin cậy 0.85+**
   - Số thứ tự với dấu hai chấm: "1:", "2:", "3:", "1-", "2-" etc. → **Độ tin cậy 0.85+**
   - Thông tin chiến dịch được liệt kê theo số hoặc dòng
4. **Có thông tin chiến dịch đầy đủ:**
   - Tên chiến dịch, ngân sách, độ tuổi, vị trí, sở thích
   - Nội dung quảng cáo (text dài, không phải link)
   - Tiêu đề quảng cáo
   - Mẫu chào hỏi / Câu hỏi gợi ý (tùy chọn)
5. **Kịch bản chào hỏi ngắn (TÍN HIỆU MẠNH):**
   - Text >20 ký tự có: "em chào", "chào anh", "xin chào", "tư vấn", "khuyến mại", "full họ tên", "ib", "inbox", "hỗ trợ"
   - KHÔNG có link Facebook → **Độ tin cậy 0.85+**

VÍ DỤ ĐIỂN HÌNH (Confidence 0.85-0.95):
✅ "9. Mẫu chào hỏi:\\nChào bạn! Bạn có mong muốn...\\n10. Câu hỏi gợi ý:\\n1. Bạn có muốn...\\nNgân sách 400k, Độ tuổi 25-50"
✅ "Em chào + full họ tên + tư vấn miễn phí về sản phẩm" (kịch bản chào ngắn)
✅ "1. Tên chiến dịch: Test\\n2. Độ tuổi: 20-40\\n3. Nội dung: [Long text over 100 chars]\\n4. Tiêu đề: ABC"
✅ "1: Tên chiến dịch: Anh tuấn\n2: Độ tuổi: 20 40t\n3: Giới tính: Nữ" (Structured with colon)
✅ "Tạo tin nhắn mới:\\nTiêu đề: ABC\\nNội dung: [Long text]\\nMẫu chào: Xin chào\\nNgân sách: 500k"
✅ "Nội dung quảng cáo: [Long detailed text], Tiêu đề: [Text], Độ tuổi: 18-45, Vị trí: Hà Nội, Sở thích: kinh doanh"
✅ "Chào anh chị, em là chuyên viên tư vấn..." (greeting script short form)

VÍ DỤ TRUNG BÌNH (Confidence 0.7-0.8):
✅ Message dài có thông tin chiến dịch + không có link Facebook
✅ Có một số keywords nhưng không đầy đủ

❌ KHÔNG chọn create_creative_campaign khi:
- Có link Facebook (facebook.com, fb.com, etc.) → LUÔN chọn "create_quick_campaign"
- Message ngắn (<50 ký tự) + không có thông tin → "unknown"
- Chỉ có câu hỏi về báo cáo/insights → "unknown"
- Chỉ có "Xin chào", "Hi", "Hello" đơn thuần → "unknown"

⚠️ QUAN TRỌNG - QUY TẮC ĐỘ TIN CẬY:
- Có "mẫu chào hỏi" / "ice breaker" / "câu hỏi gợi ý" → **confidence = 0.85-0.95**
- Có danh sách số (1., 2., 3. hoặc 1:, 2:, 3:) + nội dung dài → **confidence = 0.85-0.9**
- Nội dung dài (>100 ký tự) + keywords creative + targeting info → **confidence = 0.8-0.85**
- Nội dung dài + một vài keywords → **confidence = 0.7-0.8**

⚠️ TRÍCH XUẤT CHO create_creative_campaign:
- Khi detect create_creative_campaign, LUÔN ĐẶT postUrl = null
- Trích xuất: campaignName, budget, ageMin, ageMax, gender, locations, locationRadius (nếu có), interestKeywords, adContent, adHeadline, greetingText, iceBreakerQuestions (nếu có)
- **locations**: Phân biệt 3 dạng:
  • DẠNG 1 - QUỐC GIA: "VN", "Việt Nam", "Vietnam" → locationRadius = null (không cần)
  • DẠNG 2 - THÀNH PHỐ: "Hà Nội", "TPHCM", "Đà Nẵng" → trích xuất locationRadius nếu có, nếu không → null (sẽ hỏi sau, min 17km)
  • DẠNG 3 - TỌA ĐỘ: "21.028511,105.804817" → trích xuất locationRadius nếu có, nếu không → null (sẽ hỏi sau, min 1km)
- hasMedia: true nếu user nhắc đến "ảnh", "video", "media", "hình", "clip", "image"

- **create_audience**: Tạo đối tượng (VD: "Tạo đối tượng", "Tạo tệp SĐT")
- **clone_campaign**: Nhân bản chiến dịch/nhóm/quảng cáo
  
  📋 NHẬN DIỆN clone_campaign:
  ✅ Khi user nói:
  - "nhân bản", "clone", "copy", "sao chép"
  - "tạo chiến dịch" (nhưng không có nội dung quảng cáo, không có link Facebook)
  - "nhân bản chiến dịch", "nhân bản camp", "clone campaign"
  - "nhân bản nhóm", "clone adset", "nhân bản quảng cáo"
  
  ⚠️ QUY TẮC TRÍCH XUẤT campaignName:
  - CHỈ trích xuất khi user cung cấp TÊN RÕ RÀNG (VD: "nhân bản chiến dịch ABC", "clone Test Campaign")
  - KHÔNG trích xuất số thứ tự (VD: "số 1", "1", "chiến dịch 1", "camp 1") → để campaignName = null
  - KHÔNG trích xuất khi chỉ có từ khóa đơn thuần như "nhân bản", "clone" → để campaignName = null
  - Nếu không chắc chắn → để null, hệ thống sẽ hỏi lại để xác nhận ý định
  
  ⚠️ ƯU TIÊN THẤP HƠN:
  - clone_campaign có độ ưu tiên THẤP HƠN create_quick_campaign và create_creative_campaign
  - Nếu có link Facebook → LUÔN chọn create_quick_campaign
  - Nếu có nội dung quảng cáo dài → chọn create_creative_campaign
  - Nếu không chắc chắn (VD: chỉ "tạo chiến dịch" không rõ ràng) → confidence thấp (0.5-0.6), hệ thống sẽ hỏi lại

- **view_effective_campaigns**: Xem chiến dịch hiệu quả
- **view_effective_adsets**: Xem nhóm quảng cáo hiệu quả
- **provide_missing_info**: Trả lời câu hỏi (VD: chỉ "5", "25km", "Hà Nội") - khi context có câu hỏi từ assistant
- **edit_info**: Sửa thông tin (VD: "Sửa ngân sách thành 500k", "Đổi vị trí", "Thay đổi độ tuổi")
- **confirm**: Xác nhận (VD: "Có", "OK", "Đồng ý", "Tạo đi")
- **cancel**: Hủy (VD: "Không", "Hủy", "Thôi")
- **unknown**: Không rõ ý định

📊 PHÂN TÍCH CONTEXT:
- Nếu history có câu hỏi "bán kính bao nhiêu?" → user đang trả lời → provide_missing_info
- Nếu message ngắn (1-2 từ) có số/địa danh/thông tin đơn giản → provide_missing_info
- Nếu có "sửa", "đổi", "thay", "thay đổi" + thông tin → edit_info
- Nếu user đang trong flow thu thập thông tin và trả lời → provide_missing_info hoặc extractedData phù hợp

📤 OUTPUT FORMAT:
Return ONLY valid JSON (no markdown):
{
  "intent": "create_quick_campaign" | "create_creative_campaign" | "create_audience" | "clone_campaign" | "view_effective_campaigns" | "view_effective_adsets" | "provide_missing_info" | "edit_info" | "confirm" | "cancel" | "unknown",
  "confidence": 0.0-1.0,
  "extractedData": {
    "postUrl": "string or null",
    "campaignName": "string or null",
    "budget": number or null,
    "ageMin": number or null,
    "ageMax": number or null,
    "gender": number or null,
    "locations": ["string"] or null (DẠNG 1: quốc gia / DẠNG 2: thành phố / DẠNG 3: tọa độ),
    "locationRadius": number or null (chỉ trích xuất nếu user cung cấp, nếu không → null),
    "interestKeywords": ["string"] or null,
    "adContent": "string or null (CHỈ cho create_creative_campaign)",
    "adHeadline": "string or null (CHỈ cho create_creative_campaign)",
    "greetingText": "string or null (CHỈ cho create_creative_campaign)",
    "iceBreakerQuestions": ["string"] or null (max 4 items, CHỈ cho create_creative_campaign)",
    "hasMedia": boolean or null (true nếu user nhắc đến ảnh/video, CHỈ cho create_creative_campaign)
  },
  "missingFieldValue": "string or number or null (chỉ dùng khi intent = provide_missing_info)"
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(conversationHistory || []).slice(-6).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: message }
    ];

    console.log('[Analyze Intent] Processing:', message);

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
      console.error('[Analyze Intent] AI Error:', response.status, errorText);
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    // ✅ LOG TOKEN USAGE
    const usageData = extractTokenUsage(data, user.id, 'analyze-intent');
    if (usageData) {
      await logTokenUsage(usageData);
    }

    console.log('[Analyze Intent] Result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Analyze Intent] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        intent: 'unknown',
        confidence: 0
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
