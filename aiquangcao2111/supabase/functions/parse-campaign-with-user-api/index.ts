import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { getUserFromRequest } from '../_shared/auth.ts';
import { getGlobalAISettings } from '../_shared/ai-provider.ts';
import { logTokenUsage, extractTokenUsage, checkBalanceBeforeAI } from '../_shared/tokenUsageHelper.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch with timeout helper to avoid 504s when upstream hangs

// Fetch with timeout helper to avoid 504s when upstream hangs
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 20000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Get userId from JWT token and auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const user = await getUserFromRequest(req);
    const userId = user.id;

    // Initialize Supabase client with user token for authenticated function invocations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Create client with user auth token to pass to other functions
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { text } = await req.json();

    if (!text) {
      throw new Error('text is required');
    }

    console.log('✅ Parsing campaign text for user:', userId);

    // ✅ CHECK BALANCE BEFORE CALLING AI
    const balanceCheck = await checkBalanceBeforeAI(userId);
    if (!balanceCheck.hasEnough) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'INSUFFICIENT_BALANCE',
          message: balanceCheck.errorMessage,
          currentBalance: balanceCheck.currentBalance,
          minimumRequired: balanceCheck.minimumRequired
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Load user settings from NocoDB to get API keys
    const NOCODB_API_URL = 'https://db.hpb.edu.vn';
    const NOCODB_API_TOKEN = 'cI1OLygyyscr3s_tH9SLqg8qNpEUtGCM6fgx55jP'; // ✅ Synced with nocodb-config.ts
    const TABLE_ID = 'me8nzzace4omg8i'; // ✅ FIXED: Correct OPENAI_SETTINGS from config.ts

    console.log('📥 Loading user OpenAI settings from NocoDB...');

    const nocoResponse = await fetchWithTimeout(
      `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=(user_id,eq,${userId})`,
      { headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' } },
      12000
    );

    if (!nocoResponse.ok) {
      throw new Error('Failed to load user settings');
    }

    const nocoData = await nocoResponse.json();
    const userSettings = nocoData.list?.[0];

    console.log('📊 NocoDB response:', JSON.stringify(nocoData, null, 2));

    // ⭐ KHÔNG BẮT BUỘC userSettings - fallback sang Lovable AI
    if (!userSettings) {
      console.log('⚠️ User settings not found in NocoDB. Will fallback to Lovable AI (Gemini).');
    } else {
      console.log('✅ User settings found:', {
        hasOpenAI: !!userSettings?.api_key,
        model: userSettings?.model
      });
    }

    // Load Facebook tokens from NocoDB
    let adsToken = null;
    let pageToken = null;

    let pageIdSetting = null; // Fallback pageId từ Settings

    try {
      const fbAdAccountsUrl = `${NOCODB_API_URL}/api/v2/tables/ms3iubpejoynr9a/records?where=(user_id,eq,${userId})&limit=1`; // ✅ FACEBOOK_AD_ACCOUNTS (synced with nocodb-config.ts)
      const fbAdAccountsResponse = await fetchWithTimeout(fbAdAccountsUrl, {
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' }
      }, 12000);

      if (fbAdAccountsResponse.ok) {
        const fbData = await fbAdAccountsResponse.json();
        console.log('✓ Ad accounts response:', fbData);
        if (fbData.list?.[0]) {
          adsToken = fbData.list[0].access_token;
          console.log('✓ Loaded Facebook Ads token');
        }
      }
    } catch (e) {
      console.error('Failed to load Facebook Ads token:', e);
    }

    try {
      const fbPagesUrl = `${NOCODB_API_URL}/api/v2/tables/mae9h6b25kenk7j/records?where=(user_id,eq,${userId})&limit=1`; // ✅ FACEBOOK_PAGES (synced with nocodb-config.ts)
      const fbPagesResponse = await fetchWithTimeout(fbPagesUrl, {
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' }
      }, 12000);

      if (fbPagesResponse.ok) {
        const fbData = await fbPagesResponse.json();
        console.log('✓ Pages response:', fbData);
        if (fbData.list?.[0]) {
          pageToken = fbData.list[0].access_token;
          pageIdSetting = fbData.list[0].page_id; // Store pageId từ settings để fallback
          console.log('✓ Loaded Facebook Page token và pageId:', pageIdSetting);
        }
      }
    } catch (e) {
      console.error('Failed to load Facebook Page token:', e);
    }

    // Determine which AI provider to use - Remove extra quotes from API keys
    let openaiApiKey = userSettings?.api_key as string | undefined;

    // Clean API keys (remove quotes if present)
    if (openaiApiKey) {
      openaiApiKey = openaiApiKey.replace(/^["']|["']$/g, '');
    }

    const openaiModel = userSettings?.model || 'gpt-4o-mini';

    let aiResponse;

    // Get current date in Vietnam timezone for AI context
    const vietnamTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const currentDateISO = new Date().toISOString().split('T')[0];
    const currentYear = new Date().getFullYear();

    const systemPrompt = `Bạn là chuyên gia phân tích văn bản quảng cáo Facebook tại thị trường Việt Nam.

⏰ **NGÀY GIỜ HIỆN TẠI: ${vietnamTime} (${currentDateISO})**
📅 **NĂM HIỆN TẠI: ${currentYear}**
Múi giờ: Vietnam (GMT+7)

=== QUY TẮC PHÂN TÍCH TUẦN TỰ TỪ TRÊN XUỐNG ===

**BƯỚC 1: TÊN CHIẾN DỊCH** (campaignName)
- Tìm sau tiền tố: "1:" hoặc "Tên chiến dịch:"
- Lấy nội dung từ sau tiền tố đến khi gặp tiền tố tiếp theo (2:, 3:, v.v.)
- Ví dụ: "1: Tên chiến dịch: Anh tuấn" → "Anh tuấn"

**BƯỚC 2: ĐỘ TUỔI** (ageMin, ageMax)
- Tìm sau: "2:" hoặc "Độ tuổi:"
- Format: "20 40t", "20-40", "18-65"
- Trích xuất 2 số → ageMin & ageMax
- Giới hạn: 18-65 tuổi, mặc định: 18-65

**BƯỚC 3: GIỚI TÍNH** (gender)
- Tìm sau: "3:" hoặc "Giới tính:"
- "Nữ" → "female", "Nam" → "male", khác → "all"

**BƯỚC 4: NGÂN SÁCH** (budget, budgetType, startTime, endTime)
- Tìm sau: "4:" hoặc "Ngân sách:"
- Giữ nguyên: "400k", "1tr", "500.000"
- Đơn vị: "k"=nghìn, "tr"/"m"=triệu

**QUAN TRỌNG - PHÂN LOẠI NGÂN SÁCH:**
- **LIFETIME** (trọn đời): Nhận diện từ khóa: "trọn đời", "lifetime", "tổng ngân sách", "tổng"
  + Ví dụ: "10 triệu trọn đời", "ngân sách trọn đời: 2000k", "trọn đời: 5tr"
  + → budgetType="lifetime", budget=<số tiền>
- **DAILY** (hàng ngày): Mặc định nếu không có từ khóa trên
  + Ví dụ: "400k", "500k/ngày", "ngân sách 200k"
  + → budgetType="daily", budget=<số tiền>

**THỜI GIAN (cho lifetime) - CỰC KỲ QUAN TRỌNG:**
- Nhận diện: "từ DD/MM đến DD/MM", "15/12 - 15/1", "15/12/2024 đến 15/1/2025"
- **Format input**: DD/MM hoặc DD/MM/YYYY (ngày/tháng hoặc ngày/tháng/năm)
- **Format output**: YYYY-MM-DDTHH:mm
- ⚠️ **QUY TẮC PARSE NGÀY/THÁNG (BẮT BUỘC)**:
  + "15/12" = ngày 15 tháng 12 (December 15)
  + "15/1" = ngày 15 tháng 1 (January 15) - KHÔNG PHẢI 31/12!
  + "1/2" = ngày 1 tháng 2 (February 1)
  + "15/12/2024" = ngày 15 tháng 12 năm 2024
  + "15/1/2025" = ngày 15 tháng 1 năm 2025 - KHÔNG PHẢI 31/12/2025!
- ⚠️ **QUY TẮC NĂM** (dựa trên NĂM HIỆN TẠI ở trên):
  + Nếu có năm rõ ràng (VD: 15/12/2025) → dùng năm đó
  + Nếu KHÔNG có năm (VD: "15/12 đến 15/1"):
    * startMonth > endMonth → startYear = currentYear, endYear = currentYear + 1
    * VD: "từ 15/12 đến 15/1" với năm hiện tại 2025 → 15/12/2025 đến 15/1/2026
  + Nếu ngày đã qua trong năm hiện tại → dùng năm sau
- ⚠️ **VALIDATE**: startTime PHẢI >= ngày hôm nay, endTime PHẢI > startTime

**LỊCH PHÂN PHỐI (cho lifetime):**
- Nhận diện: "9h-17h hàng ngày", "8h-20h T2-T6", "cuối tuần"
- "hàng ngày" = [0,1,2,3,4,5,6]
- "T2-T6" hoặc "thứ 2 đến thứ 6" = [1,2,3,4,5]
- "cuối tuần" hoặc "T7-CN" = [0,6]
- → enableSchedule=true, scheduleSlots=[{days:[], startHour:X, endHour:Y}]

**BƯỚC 5: VỊ TRÍ** (location) - QUAN TRỌNG: BẮT BUỘC PHẢI PARSE ĐÚNG
- Tìm sau: "5:" hoặc "Vị trí:" hoặc "Location:"
- **QUY TẮC TRÍCH XUẤT TÊN THÀNH PHỐ** (ƯU TIÊN CAO NHẤT):
  * Format: "Vị trí: [Tên thành phố] [số]km"
  * Ví dụ: "Vị trí: Hà nội 17km" → cityName="Hà nội", radiusKm=17
  * Ví dụ: "Vị trí: Bắc Ninh 25km" → cityName="Bắc Ninh", radiusKm=25
  * Ví dụ: "Hồ Chí Minh" → cityName="Hồ Chí Minh", radiusKm=undefined
  * **BẮT BUỘC**: Giữ nguyên dấu thanh của tên thành phố (Hà nội, Đà Nẵng, v.v.)
  * **BẮT BUỘC**: Nếu có số km theo sau → gán radiusKm
  
- **QUY TẮC ƯU TIÊN**:
  1. **NẾU có TÊN địa lý** (Hà Nội, Bắc Ninh, TP.HCM, v.v.): 
     → locationType="city", cityName="<tên chính xác>", country="Việt Nam"
     → Nếu có số km theo sau → radiusKm=<số>
  2. **CHỈ KHI không có tên, MỚI dùng tọa độ**: 
     → locationType="coordinate", latitude=X, longitude=Y
     → Nếu có số km → radiusKm=<số>
  3. **CHỈ tên quốc gia**: 
     → locationType="country", country="<tên>"
     
- **QUAN TRỌNG**: 
  * LUÔN LUÔN trích xuất cityName nếu có tên địa lý
  * KHÔNG đặt radiusKm mặc định nếu user không nói
  * Tên thành phố phải chính xác, giữ nguyên dấu

**BƯỚC 6: SỞ THÍCH** (interestKeywords)
- Tìm sau: "6:" hoặc "Sở thích:"
- Tách bằng dấu phẩy thành array
- Ví dụ: "làm đẹp, spa, thẩm mỹ viện" → ["làm đẹp", "spa", "thẩm mỹ viện"]

**BƯỚC 7: NỘI DUNG CONTENT** (adContent) - Cho quảng cáo POST
- Tìm sau: "7:" hoặc "Nội dung content:"
- Lấy TOÀN BỘ nội dung từ sau nhãn đến khi gặp nhãn tiếp theo (8: hoặc "Tiêu đề:")
- **GIỮ NGUYÊN** tất cả xuống dòng (\n) và format
- Ví dụ:
  7: Nội dung content: Chỉ cần sai một lựa chọn...
  🎉 Ngoan đã từng như thế.
  → Giữ nguyên tất cả dòng

**BƯỚC 8: TIÊU ĐỀ** (adHeadline) - Cho quảng cáo POST
- Tìm sau: "8:" hoặc "Tiêu đề:"
- Lấy nội dung đến khi gặp nhãn tiếp theo
- Ví dụ: "8: Tiêu đề: Anh tuấn đẹp trai" → "Anh tuấn đẹp trai"

**BƯỚC 9: MẪU CÂU CHÀO** (greetingTemplate) - QUAN TRỌNG
- **NHẬN DIỆN TỪ KHÓA** (có hoặc không dấu):
  * "mau cau chao" (không dấu)
  * "mẫu câu chào"
  * "mau chao hoi" (không dấu)
  * "mẫu chào hỏi"
  * "Mẫu chào:"
  * "Lời chào:"
  
- **QUY TẮC TRÍCH XUẤT**:
  1. Tìm dòng có từ khóa trên (bỏ qua text mô tả thêm sau từ khóa)
  2. **Dòng NGAY SAU** từ khóa đó chính là greetingTemplate
  3. **Thay placeholder tên** theo quy tắc:
     * Nếu có "họ tên", "họ và tên", "full name", "+ full họ tên" → **{{user_full_name}}**
     * Nếu chỉ có "tên", "[tên]", "+ tên" → **{{user_first_name}}**
     * Nếu có "họ", "+ họ" → **{{user_last_name}}**
  
- Ví dụ 1 (tên đầy đủ):
  "Mẫu chào hỏi
  
  Em chào + full họ tên chị cần tư vấn dịch vụ nào ạ
  
  Còn xuất khuyến mại không?"
  
  → greetingTemplate: "Em chào {{user_full_name}} chị cần tư vấn dịch vụ nào ạ"

- Ví dụ 2 (chỉ tên):
  "Mẫu chào hỏi
  
  Chào [tên]! Bạn cần tư vấn gì ạ?"
  
  → greetingTemplate: "Chào {{user_first_name}}! Bạn cần tư vấn gì ạ?"

**BƯỚC 10: CÂU HỎI THƯỜNG GẶP** (frequentQuestions)
- Nằm sau greetingTemplate (thường cách 1 dòng trống)
- Mỗi dòng là 1 câu hỏi → tách thành array
- Bỏ qua dòng trống
- Loại bỏ ký hiệu đầu dòng nếu có
- Lấy 3-5 câu
- Ví dụ: Các dòng sau mẫu chào → array câu hỏi

**BƯỚC 11: LINK BÀI VIẾT** - Cho quảng cáo POST
- URL Facebook: "https://www.facebook.com/..."
- Hỗ trợ: /posts/, /videos/, /watch/, /reel/, /share/

=== PHÂN LOẠI CHIẾN DỊCH (QUAN TRỌNG) ===

✅ **Quảng cáo BÀI VIẾT CÓ SẴN (post)**: 
   - BẮT BUỘC phải có link Facebook (https://facebook.com/...)
   - campaignType = "post"
   - Nếu KHÔNG có link → KHÔNG PHẢI quảng cáo post!

✅ **Quảng cáo TIN NHẮN MỚI (message)**:
   - KHÔNG CÓ link Facebook
   - Có thể có: ảnh đính kèm, nội dung (content), tiêu đề (headline), câu chào hỏi (greetingTemplate)
   - campaignType = "message"
   - Đây là loại quảng cáo mặc định nếu không có link bài viết

⚠️ **QUY TẮC VÀNG**: 
   - Có link Facebook → "post"
   - KHÔNG có link Facebook → "message" (dù có content, headline, greeting...)

=== KẾT QUẢ JSON ===
{
  "campaignType": "message" | "post",
  "campaignName": "string",
  "ageMin": number,
  "ageMax": number,
  "gender": "male" | "female" | "all",
  "budget": number,
  "budgetType": "daily" | "lifetime",
  "latitude": number | undefined,
  "longitude": number | undefined,
  "cityName": "string" | undefined,
  "country": "string" | undefined,
  "radiusKm": number | undefined,
  "interestKeywords": ["string"],
  "postUrl": "string" | undefined,
  "content": "string" | undefined,
  "headline": "string" | undefined,
  "greetingTemplate": "string" | undefined,
  "frequentQuestions": ["string"] | undefined
}

**Giá trị mặc định**:
- ageMin: 18, ageMax: 65
- gender: "all"
- budget: 200000
- budgetType: "daily"
- locationType: "country" (nếu không xác định được)
- country: "Việt Nam" (nếu locationType=city hoặc country)
- radiusKm: KHÔNG ĐẶT MẶC ĐỊNH - để undefined nếu user không chỉ định`;

    // ⭐ Dùng OpenAI nếu có key, không thì fallback Lovable AI (Gemini)
    let aiApiUrl: string;
    let aiApiKey: string;
    let aiModel: string;

    if (openaiApiKey) {
      // Use user's OpenAI key
      // Check if user has a custom base URL
      const customBaseUrl = userSettings?.base_url;
      if (customBaseUrl && customBaseUrl.trim().length > 0) {
        let baseUrl = customBaseUrl.trim();
        // Remove trailing slash if present
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
        }
        // Append /chat/completions if not present
        if (!baseUrl.includes('/chat/completions')) {
          // If it ends with /v1, append /chat/completions
          if (baseUrl.endsWith('/v1')) {
            aiApiUrl = `${baseUrl}/chat/completions`;
          } else {
            // Otherwise assume it's the root and append /v1/chat/completions
            aiApiUrl = `${baseUrl}/v1/chat/completions`;
          }
        } else {
          aiApiUrl = baseUrl;
        }
        console.log('🔗 Using custom OpenAI Base URL:', aiApiUrl);
      } else {
        aiApiUrl = 'https://api.openai.com/v1/chat/completions';
      }

      aiApiKey = openaiApiKey;

      // ✅ Validate model name to prevent 400 errors
      const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      if (!validModels.includes(openaiModel)) {
        console.warn(`⚠️ Invalid model name found in settings: ${openaiModel}. Falling back to gpt-4o-mini.`);
        aiModel = 'gpt-4o-mini';
      } else {
        aiModel = openaiModel;
      }

      console.log('🔑 Using user OpenAI API with model:', aiModel);
    } else {
      // 🌍 Fallback: Get GLOBAL AI settings respecting provider_priority
      console.log('⚠️ No user OpenAI key found. Fetching GLOBAL AI settings with provider_priority...');

      try {
        const globalSettings = await getGlobalAISettings();

        if (globalSettings) {
          aiApiKey = globalSettings.apiKey;
          aiApiUrl = globalSettings.endpoint;
          aiModel = globalSettings.model;
          console.log(`🌍 Using GLOBAL ${globalSettings.provider.toUpperCase()} API Key with model: ${aiModel}`);
        } else {
          console.error('❌ No GLOBAL AI key found in System Settings');
          throw new Error('Chưa cấu hình API Key AI. Vui lòng vào Cài đặt → OpenAI API để thêm API key.');
        }
      } catch (err) {
        console.error('❌ Error fetching global AI settings:', err);
        throw new Error('Chưa cấu hình API Key AI. Vui lòng vào Cài đặt → OpenAI API để thêm API key.');
      }
    }

    console.log('🚀 Sending request to OpenAI...');
    console.log('Model:', aiModel);

    const requestBody = {
      model: aiModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      tool_choice: { type: 'function', function: { name: 'parse_campaign_data' } }, // ✅ Force function call (Parallel: True default)
      tools: [
        {
          type: 'function',
          function: {
            name: 'parse_campaign_data',
            description: 'Parse campaign data from natural language text (Vietnamese context)',
            parameters: {
              type: 'object',
              properties: {
                campaignType: { type: 'string', enum: ['message', 'post'], description: 'IMPORTANT: post = ONLY if has Facebook link. message = NO Facebook link (default, even if has content/headline/greeting)' },
                campaignName: { type: 'string', description: 'Product/service name, usually first line' },
                ageMin: { type: 'number', description: 'Min age (18-65)' },
                ageMax: { type: 'number', description: 'Max age (18-65)' },
                gender: { type: 'string', enum: ['male', 'female', 'all'] },
                budget: { type: 'number', description: 'Budget in VND (k=x1000, tr/m=x1000000)' },
                budgetType: { type: 'string', enum: ['daily', 'lifetime'], description: 'Daily or lifetime budget' },
                locationType: { type: 'string', enum: ['country', 'city', 'coordinate'], description: 'Type of location targeting' },
                latitude: { type: 'number', description: 'Latitude from coordinates (only for locationType=coordinate)' },
                longitude: { type: 'number', description: 'Longitude from coordinates (only for locationType=coordinate)' },
                cityName: { type: 'string', description: 'Vietnamese city name (only for locationType=city)' },
                country: { type: 'string', description: 'Country name (default: Việt Nam for city, required for locationType=country)' },
                radiusKm: { type: 'number', description: 'Radius in km - leave undefined if not specified by user (will be validated later)' },
                interestKeywords: { type: 'array', items: { type: 'string' }, description: 'Keywords for Facebook interest API search' },
                postUrl: { type: 'string', description: 'Facebook post URL (for post campaigns only)' },
                content: { type: 'string', description: 'Long post content (for post campaigns only)' },
                headline: { type: 'string', description: 'Short headline (for post campaigns only)' },
                greetingTemplate: { type: 'string', description: 'Greeting template with {{user_full_name}}, {{user_first_name}}, or {{user_last_name}} placeholder (for message campaigns only)' },
                frequentQuestions: { type: 'array', items: { type: 'string' }, description: '3-5 frequent customer questions (for message campaigns only)' },
                // NEW: Lifetime budget fields
                startTime: { type: 'string', description: 'Start date (format: YYYY-MM-DDTHH:mm). Required for lifetime budget' },
                endTime: { type: 'string', description: 'End date (format: YYYY-MM-DDTHH:mm). Required for lifetime budget' },
                enableSchedule: { type: 'boolean', description: 'True if user specifies schedule like "9h-17h hàng ngày"' },
                scheduleSlots: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      days: { type: 'array', items: { type: 'number' }, description: 'Days: 0=Sunday, 1=Monday, ..., 6=Saturday' },
                      startHour: { type: 'number', description: 'Start hour 0-23' },
                      endHour: { type: 'number', description: 'End hour 1-24' }
                    }
                  },
                  description: 'Schedule slots for lifetime budget. Example: 9h-17h hàng ngày → [{days:[0,1,2,3,4,5,6], startHour:9, endHour:17}]'
                }
              },
              required: ['campaignType', 'campaignName', 'ageMin', 'ageMax', 'gender', 'budget']
            }
          }
        }
      ]
    };

    console.log('📦 OpenAI Request Payload:', JSON.stringify(requestBody, null, 2));

    try {
      const aiRequestResponse = await fetchWithTimeout(
        aiApiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${aiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        },
        25000
      );

      if (!aiRequestResponse.ok) {
        const errorText = await aiRequestResponse.text();
        console.error('❌ OpenAI API Error:', errorText);
        throw new Error(`OpenAI API error: ${aiRequestResponse.status} - ${errorText}`);
      }

      if (!aiRequestResponse.ok) {
        const errorText = await aiRequestResponse.text();
        console.error('AI API error:', aiRequestResponse.status, errorText);
        throw new Error(`AI API lỗi (${aiRequestResponse.status}): ${errorText.substring(0, 200)}`);
      }

      const aiData = await aiRequestResponse.json();

      // ✅ LOG TOKEN USAGE
      const usageData = extractTokenUsage(aiData, userId, 'parse-campaign-with-user-api');
      if (usageData) {
        await logTokenUsage(usageData);
      }

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        throw new Error('AI không trả về dữ liệu phân tích.');
      }

      aiResponse = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('AI request failed:', e);
      throw new Error(e instanceof Error ? e.message : 'Không thể kết nối tới AI API.');
    }

    if (!aiResponse) {
      throw new Error('Không thể phân tích văn bản từ AI.');
    }

    console.log('Parsed campaign data:', aiResponse);

    // ✅ HEURISTIC: Force budgetType=lifetime nếu text chứa từ khóa "trọn đời", "lifetime", "tổng ngân sách"
    try {
      const lowerText = (text || '').toLowerCase();
      const hasLifetimeKeyword =
        lowerText.includes('trọn đời') ||
        lowerText.includes('tron doi') ||
        lowerText.includes('lifetime') ||
        lowerText.includes('tổng ngân sách') ||
        lowerText.includes('tong ngan sach');

      if (hasLifetimeKeyword && aiResponse.budgetType !== 'lifetime') {
        console.log('🔄 Heuristic override: budgetType → lifetime (detected keyword in text)');
        aiResponse.budgetType = 'lifetime';
      }

      // ✅ ALWAYS ensure lifetimeBudget is set when budgetType is lifetime
      // (Regardless of whether AI parsed it or heuristic detected it)
      if (aiResponse.budgetType === 'lifetime' && !aiResponse.lifetimeBudget && aiResponse.budget) {
        aiResponse.lifetimeBudget = aiResponse.budget;
        console.log('🔄 Auto-set lifetimeBudget from budget:', aiResponse.lifetimeBudget);
      }

      // ✅ HEURISTIC: Parse date range "từ DD/MM/YYYY đến DD/MM/YYYY"
      // BẮT BUỘC NHẬP NĂM ĐẦY ĐỦ để tránh nhầm lẫn
      if (aiResponse.budgetType === 'lifetime') {
        const dateRangeMatch = text.match(/(?:từ|tu)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(?:đến|den|-|–)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i);
        if (dateRangeMatch) {
          const startDay = parseInt(dateRangeMatch[1]);
          const startMonth = parseInt(dateRangeMatch[2]);
          const startYearExplicit = dateRangeMatch[3] ? parseInt(dateRangeMatch[3]) : null;

          const endDay = parseInt(dateRangeMatch[4]);
          const endMonth = parseInt(dateRangeMatch[5]);
          const endYearExplicit = dateRangeMatch[6] ? parseInt(dateRangeMatch[6]) : null;

          console.log('📅 Date parsing:', { startDay, startMonth, startYearExplicit, endDay, endMonth, endYearExplicit });

          // ✅ AUTO-INFER MISSING YEARS (thay vì yêu cầu nhập lại)
          const currentYear = new Date().getFullYear();

          let startYear: number;
          let endYear: number;

          if (startYearExplicit && endYearExplicit) {
            // Có đầy đủ năm
            startYear = startYearExplicit;
            endYear = endYearExplicit;
          } else if (endYearExplicit && !startYearExplicit) {
            // Chỉ có năm kết thúc (VD: "15/12 đến 15/1/2025")
            endYear = endYearExplicit;
            startYear = startMonth > endMonth ? endYear - 1 : endYear;
            console.log(`🔄 Auto-inferred startYear: ${startYear} (from endYear=${endYear})`);
          } else if (startYearExplicit && !endYearExplicit) {
            // Chỉ có năm bắt đầu (VD: "15/12/2025 đến 15/1")
            startYear = startYearExplicit;
            endYear = endMonth < startMonth ? startYear + 1 : startYear;
            console.log(`🔄 Auto-inferred endYear: ${endYear} (from startYear=${startYear})`);
          } else {
            // Không có năm nào → dùng năm hiện tại
            startYear = currentYear;
            endYear = endMonth < startMonth ? currentYear + 1 : currentYear;
            console.log(`🔄 Auto-inferred both years: startYear=${startYear}, endYear=${endYear}`);
          }

          // Get current time for comparison
          const now = new Date();

          // Create dates with proper time
          let startDate = new Date(startYear, startMonth - 1, startDay, 0, 0);
          const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59);

          // ✅ FIX: Nếu ngày bắt đầu là HÔM NAY → set giờ = hiện tại + 30 phút buffer
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const isStartToday = startDate.getTime() === todayStart.getTime();

          if (isStartToday) {
            // Set start time to current hour + 30 min buffer
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const bufferMinutes = 30; // 30 minute buffer for safety

            let startHour = currentHour;
            let startMinute = currentMinute + bufferMinutes;

            if (startMinute >= 60) {
              startHour += 1;
              startMinute -= 60;
            }

            // Nếu quá 23h30 → báo lỗi vì không còn đủ thời gian trong ngày
            if (startHour >= 24) {
              aiResponse._dateError = `⚠️ Đã quá muộn để bắt đầu chiến dịch hôm nay!\n\nVui lòng chọn ngày mai hoặc sau.`;
              console.log('⚠️ Too late in the day for today start');
            } else {
              startDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
              console.log('📅 Start date is TODAY - added time buffer:', { startHour, startMinute });
            }
          }

          console.log('📅 Parsed dates with auto-inferred years:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isStartToday
          });

          // Validate không phải quá khứ (skip if already has error)
          if (!aiResponse._dateError) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // ✅ AUTO-FIX: Nếu ngày bắt đầu là quá khứ → tự động sửa thành bây giờ + 30 phút
            if (startDate < now && !isStartToday) {
              console.log('⚠️ startDate is in the past, auto-correcting to now + 30 min');

              const bufferMinutes = 30;
              const newStartTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

              // Kiểm tra nếu endDate cũng đã qua hoặc quá gần
              if (newStartTime >= endDate) {
                aiResponse._dateError = `⚠️ Thời gian kết thúc (${endDay}/${endMonth}/${endYear}) đã qua hoặc quá gần!\\n\\nVui lòng chọn khoảng thời gian trong tương lai.`;
                console.log('⚠️ Cannot auto-fix: endDate is also in past or too close');
              } else {
                // ✅ Tự động sửa startDate thành thời gian hiện tại + buffer
                startDate = newStartTime;
                console.log('✅ Auto-corrected startDate to:', startDate.toISOString());
              }
            } else if (endDate < today) {
              aiResponse._dateError = `⚠️ Ngày kết thúc **${endDay}/${endMonth}/${endYear}** đã là quá khứ!\\n\\n💡 Vui lòng nhập lại với ngày trong tương lai.`;
            } else if (endDate <= startDate) {
              aiResponse._dateError = `⚠️ Ngày kết thúc (${endDay}/${endMonth}/${endYear}) phải **sau** ngày bắt đầu (${startDay}/${startMonth}/${startYear})!\\n\\n💡 Vui lòng nhập lại đúng thứ tự:\\n📝 Ví dụ: từ **${startDay}/${startMonth}/${startYear}** đến **DD/MM/YYYY** (sau ngày bắt đầu)`;
            }

            // ✅ Nếu không có lỗi (hoặc đã auto-fix) → set dates
            if (!aiResponse._dateError) {
              aiResponse.startTime = startDate.toISOString().slice(0, 16);
              aiResponse.endTime = endDate.toISOString().slice(0, 16);
              console.log('✅ Valid dates set:', { startTime: aiResponse.startTime, endTime: aiResponse.endTime });
            }
          }
        }
      }




      // ✅ HEURISTIC: Parse multiple schedules "9h-17h, 20h-22h, 23h-0h" 
      // Also handles "T2-T6", "cuối tuần" day modifiers
      // IMPORTANT: Require 'h' after first number to avoid matching dates like "7/12"
      const allScheduleMatches = [...text.matchAll(/(\d{1,2})h\s*[-–]\s*(\d{1,2})h?/gi)];

      if (allScheduleMatches.length > 0 && !aiResponse.enableSchedule) {
        // Detect day pattern from text
        let days = [0, 1, 2, 3, 4, 5, 6]; // Default: all days
        const lowerText = text.toLowerCase();
        if (lowerText.includes('t2-t6') || lowerText.includes('thứ 2 đến thứ 6') || lowerText.includes('thu 2 den thu 6')) {
          days = [1, 2, 3, 4, 5];
        } else if (lowerText.includes('cuối tuần') || lowerText.includes('cuoi tuan') || lowerText.includes('t7-cn') || lowerText.includes('t7 cn')) {
          days = [0, 6];
        }

        const scheduleSlots: any[] = [];

        for (const match of allScheduleMatches) {
          const startHour = parseInt(match[1]);
          let endHour = parseInt(match[2]);

          // Handle midnight crossing: 23h-0h means run until midnight (endHour = 24)
          if (endHour === 0) {
            endHour = 24;
          }

          // Skip invalid hours or duplicate date patterns (like 15/12 which would match)
          if (startHour >= 0 && startHour <= 23 && endHour >= 1 && endHour <= 24 && startHour < endHour) {
            scheduleSlots.push({ days, startHour, endHour });
          }
        }

        if (scheduleSlots.length > 0) {
          aiResponse.enableSchedule = true;
          aiResponse.scheduleSlots = scheduleSlots;
          console.log('⏰ Heuristic parsed multiple schedules:', scheduleSlots);
        }
      }
    } catch (e) {
      console.error('Lifetime budget heuristic failed:', e);
    }

    // Fallback cứng: bắt buộc nhận từ khóa "mẫu câu chào hỏi" (không dấu/ có dấu)
    try {
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const rawLines = (text || '').split(/\r?\n/);
      const lines = rawLines.map((l: string) => l.replace(/\s+$/, '')).map((l: string) => l);
      const normalized = lines.map((l: string) => norm(l.trim()));
      const isGreetingKey = (s: string) => (
        s.includes('mau chao hoi') ||
        s.includes('mau cau chao hoi') ||
        s.includes('mau chao') ||
        s.includes('mau cau chao') ||
        s.includes('loi chao') ||
        s.includes('cau chao')
      );
      const keywordIndex = normalized.findIndex((l: string) => isGreetingKey(l));
      if (keywordIndex !== -1) {
        // Lấy dòng NGAY SAU làm greeting (bỏ qua dòng trống)
        let gIdx = keywordIndex + 1;
        while (gIdx < lines.length && lines[gIdx].trim() === '') gIdx++;
        if (gIdx < lines.length) {
          let greet = lines[gIdx].trim();
          // Chuẩn hóa placeholder tên - thứ tự quan trọng: từ specific → general
          greet = greet
            // Full name patterns (xử lý TRƯỚC)
            .replace(/\+\s*(full\s+)?h[oọ]?\s*(và\s+)?tên/giu, '{{user_full_name}}')
            .replace(/h[oọ]?\s*tên\s+khách/giu, '{{user_full_name}}')
            .replace(/h[oọ]?\s*tên\s+đầy\s+đủ/giu, '{{user_full_name}}')
            .replace(/full\s+name/gi, '{{user_full_name}}')

            // First name only patterns (phải check TRƯỚC khi replace "tên" chung chung)
            .replace(/\+\s*tên\b/giu, '{{user_first_name}}')
            .replace(/\[tên\]/giu, '{{user_first_name}}')
            .replace(/\btên\s+khách\b/giu, '{{user_first_name}}')

            // Last name patterns
            .replace(/\+\s*h[oọ]\b/giu, '{{user_last_name}}')
            .replace(/\[h[oọ]\]/giu, '{{user_last_name}}');
          if (!aiResponse.greetingTemplate) aiResponse.greetingTemplate = greet;

          // Các dòng SAU greeting → frequentQuestions (1-5 câu)
          const qs: string[] = [];
          let emptyCount = 0;
          for (let i = gIdx + 1; i < lines.length && qs.length < 5; i++) {
            const t = lines[i].trim();

            // Dừng khi gặp 2 dòng trống liên tiếp
            if (!t) {
              emptyCount++;
              if (emptyCount >= 2) break;
              continue;
            }

            // Reset đếm dòng trống khi gặp dòng có text
            emptyCount = 0;

            // Loại bỏ ký hiệu đầu dòng và thêm vào danh sách
            const cleaned = t.replace(/^[\-–—•\u2022>→*\d+\.]+\s*/u, '');
            if (cleaned) {
              qs.push(cleaned);
            }
          }

          if ((!aiResponse.frequentQuestions || aiResponse.frequentQuestions.length === 0) && qs.length > 0) {
            aiResponse.frequentQuestions = qs;
          }
        }
      }
    } catch (e) {
      console.error('Greeting fallback failed:', e);
    }

    // LOCATION HEURISTICS OVERRIDE: Nhận biết vị trí ổn định (city/coordinate/country)
    try {
      const raw = (text || '');
      const linesStr = raw; // keep original
      const tryMatch = (re: RegExp) => {
        const m = linesStr.match(re);
        return m && m[1] ? m[1].trim() : null;
      };

      let locRaw =
        tryMatch(/(?:^|\n)\s*5\s*:\s*([^\n]+)/i) ||
        tryMatch(/(?:^|\n)\s*V[ịi]\s*tr[íi]\s*:\s*([^\n]+)/i) ||
        tryMatch(/(?:^|\n)\s*V[ịi]\s*tr[íi]\s*\s*([^\n]+)/i);

      if (locRaw) {
        // Extract optional radius in km
        const radiusMatch = locRaw.match(/(\d+(?:[\.,]\d+)?)\s*km/i);
        const radiusKm = radiusMatch ? parseFloat(radiusMatch[1].replace(',', '.')) : undefined;
        // Clean trailing radius text
        let locText = locRaw.replace(/,?\s*(\d+(?:[\.,]\d+)?)\s*km/i, '').trim();

        const hasCountryVN = /\b(vi[eệ]t\s*nam|viet\s*nam|vn)\b/i.test(locText);
        const hasCoordinateHints = /(kinh\s*độ|vi\s*độ|kinh\s*do|vi\s*do)/i.test(locRaw);
        const nums = locRaw.match(/-?\d{1,3}[\.,]\d+/g) || [];

        if (!/country|city|coordinate/.test(aiResponse.locationType || '')) {
          aiResponse.locationType = undefined; // ensure we can override
        }

        if (hasCoordinateHints || nums.length >= 2) {
          // Coordinate mode
          let latitude: number | undefined;
          let longitude: number | undefined;
          // If labels exist, extract both values first
          const vidoMatch = locRaw.match(/v[ĩi]\s*độ[^\d-]*(-?\d{1,3}[\.,]\d+)/i);
          const kinhdoMatch = locRaw.match(/kinh\s*độ[^\d-]*(-?\d{1,3}[\.,]\d+)/i);

          if (vidoMatch && kinhdoMatch) {
            const viDoValue = parseFloat(vidoMatch[1].replace(',', '.'));
            const kinhDoValue = parseFloat(kinhdoMatch[1].replace(',', '.'));

            // ✅ AUTO-FIX: Assign based on NUMERICAL VALUE, not Vietnamese terms
            // Latitude must be -90 to +90, Longitude -180 to +180
            if (Math.abs(viDoValue) <= 90 && Math.abs(kinhDoValue) > 90) {
              // User wrote correctly: vĩ độ = latitude, kinh độ = longitude
              latitude = viDoValue;
              longitude = kinhDoValue;
            } else if (Math.abs(kinhDoValue) <= 90 && Math.abs(viDoValue) > 90) {
              // User swapped terms: kinh độ value is actually latitude
              latitude = kinhDoValue;
              longitude = viDoValue;
              console.log('Auto-fixed: user swapped vĩ độ/kinh độ terms');
            } else {
              // Both <= 90 or both > 90: use smaller for latitude, larger for longitude
              latitude = Math.abs(viDoValue) < Math.abs(kinhDoValue) ? viDoValue : kinhDoValue;
              longitude = Math.abs(viDoValue) >= Math.abs(kinhDoValue) ? viDoValue : kinhDoValue;
            }
          } else {
            const n1 = parseFloat(nums[0].replace(',', '.'));
            const n2 = parseFloat(nums[1].replace(',', '.'));
            // Heuristic: latitude is the number with absolute value <= 90
            if (Math.abs(n1) <= 90 && Math.abs(n2) > 90) {
              latitude = n1; longitude = n2;
            } else if (Math.abs(n2) <= 90 && Math.abs(n1) > 90) {
              latitude = n2; longitude = n1;
            } else {
              // fallback order
              latitude = n1; longitude = n2;
            }
          }

          aiResponse.locationType = 'coordinate';
          aiResponse.latitude = latitude;
          aiResponse.longitude = longitude;
          if (radiusKm && !aiResponse.radiusKm) aiResponse.radiusKm = radiusKm;
          aiResponse.cityName = undefined; // clear city override
          console.log('Heuristic location: coordinate', { latitude: aiResponse.latitude, longitude: aiResponse.longitude, radiusKm: aiResponse.radiusKm });
        } else if (hasCountryVN) {
          // Country mode (Vietnam)
          aiResponse.locationType = 'country';
          aiResponse.country = 'Việt Nam';
          aiResponse.cityName = undefined;
          aiResponse.latitude = undefined;
          aiResponse.longitude = undefined;
          aiResponse.radiusKm = undefined;
          console.log('Heuristic location: country=Việt Nam');
        } else {
          // City name mode
          aiResponse.locationType = 'city';
          aiResponse.cityName = locText;
          aiResponse.country = 'Việt Nam';
          aiResponse.latitude = undefined;
          aiResponse.longitude = undefined;
          if (radiusKm && !aiResponse.radiusKm) aiResponse.radiusKm = radiusKm;
          console.log('Heuristic location: city', { cityName: aiResponse.cityName, radiusKm: aiResponse.radiusKm });
        }
      }
    } catch (e) {
      console.error('Location heuristic failed:', e);
    }

    // SEARCH INTERESTS: Tìm kiếm sở thích/hành vi trên Facebook API
    const resolvedInterests: any[] = [];
    if (aiResponse.interestKeywords?.length > 0) {
      console.log('Searching interests for keywords:', aiResponse.interestKeywords);

      const token = adsToken;

      if (token) {
        console.log('Found ads token, searching interests...');

        for (const keyword of aiResponse.interestKeywords) {
          try {
            const interestUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/search-facebook-interests`;
            const interestResponse = await fetch(interestUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader, // ✅ FIX: Truyền Authorization header
                'apikey': Deno.env.get('SUPABASE_ANON_KEY') || ''
              },
              body: JSON.stringify({
                query: keyword,
                adsToken: token
              })
            });

            console.log(`📡 Interest API response status for "${keyword}": ${interestResponse.status}`);

            if (interestResponse.ok) {
              const interestData = await interestResponse.json();
              console.log(`✓ Interest result for "${keyword}":`, interestData);

              if (interestData.success && interestData.interests?.length > 0) {
                resolvedInterests.push(interestData.interests[0]);
                console.log(`  → Best match: ${interestData.interests[0].name}`);
              } else {
                console.warn(`⚠️ No interests found for "${keyword}" - success: ${interestData.success}, count: ${interestData.interests?.length || 0}`);
              }
            } else {
              const errorText = await interestResponse.text();
              console.error(`❌ Interest API failed for "${keyword}": ${errorText}`);
            }
          } catch (e) {
            console.error(`Error searching "${keyword}":`, e);
          }
        }
      } else {
        console.log('No Facebook Ads token found, skipping interest search');
      }
    }

    console.log(`Final resolved interests: ${resolvedInterests.length}`);

    // VALIDATE & SEARCH LOCATION: Tìm kiếm location trên Facebook API
    let resolvedLocation: any = null;
    let locationSearchQuery: string | null = null;

    // ✅ Ưu tiên: Nếu AI đã parse ra cityName
    if (aiResponse.cityName) {
      locationSearchQuery = aiResponse.cityName;
    }
    // ✅ Fallback: Extract city name từ text nếu AI không parse được
    else if (text) {
      // Tìm pattern "Vị trí:" hoặc "Location:" trong text
      const locationMatch = text.match(/(?:vị trí|location|địa điểm)[:：]\s*([^\n,]+?)(?:\s+\d+\s*km)?(?:\n|,|$)/i);
      if (locationMatch) {
        locationSearchQuery = locationMatch[1].trim();
        console.log('📍 Extracted location from text:', locationSearchQuery);
      }
    }

    // Nếu có query location → Gọi API search
    if (locationSearchQuery && adsToken) {
      console.log('🔍 Searching Facebook location for:', locationSearchQuery);

      try {
        const { data: locationData, error: locationError } = await supabase.functions.invoke('search-facebook-locations', {
          body: {
            query: locationSearchQuery,
            locationType: aiResponse.locationType || 'city', // Dùng AI parse result
            adsToken: adsToken
          }
        });

        if (!locationError && locationData) {
          console.log(`✅ Location API response for "${locationSearchQuery}":`, locationData);

          if (locationData.success && locationData.locations?.length > 0) {
            // Ưu tiên type "city" > "region" > bất kỳ
            let bestMatch = locationData.locations.find((loc: any) => loc.type === 'city');

            if (!bestMatch) {
              bestMatch = locationData.locations.find((loc: any) => loc.type === 'region');
            }

            if (!bestMatch) {
              bestMatch = locationData.locations[0];
            }

            resolvedLocation = {
              key: bestMatch.key,
              name: bestMatch.name,
              type: bestMatch.type,
              country_code: bestMatch.country_code,
              country_name: bestMatch.country_name,
              minRadiusKm: 17 // Facebook minimum for cities
            };
            console.log(`✅ Best location match: ${bestMatch.name} (type: ${bestMatch.type}, key: ${bestMatch.key})`);
          } else {
            console.warn(`⚠️ No location results found for "${locationSearchQuery}"`);
          }
        } else {
          console.log('❌ Location search API error:', locationError);
        }
      } catch (err) {
        console.error('❌ Location search failed:', err);
      }
    } else {
      if (!locationSearchQuery) {
        console.log('ℹ️ No location query detected in input');
      }
      if (!adsToken) {
        console.warn('⚠️ Missing adsToken, skipping location search');
      }
    }

    // RESOLVE POST: Validate và lấy Post ID từ Facebook URL
    let resolvedPost: any = null;
    if (aiResponse.postUrl) {
      console.log('Resolving Facebook post URL:', aiResponse.postUrl);

      try {
        // ✅ EXACT SAME AS SETTINGS - Call facebook-post-extractor
        const validatePostUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/facebook-post-extractor`;

        console.log('🚀 Calling facebook-post-extractor (SAME AS SETTINGS):', {
          facebook_post_input: aiResponse.postUrl,
          has_access_token: !!adsToken
        });

        // ✅ EXACT SAME PARAMS AS SETTINGS:
        // body: { facebook_post_input, access_token }
        // NO page_id - let extractor auto-detect from URL
        // ✅ Use pageToken first (needed for video API), fallback to adsToken
        const validateResponse = await fetchWithTimeout(validatePostUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            facebook_post_input: aiResponse.postUrl,
            access_token: pageToken || adsToken // ✅ pageToken first for video API
            // ✅ NO page_id - EXACT SAME AS SETTINGS
          })
        }, 15000);

        if (validateResponse.ok) {
          const validateData = await validateResponse.json();

          if (validateData.success) {
            // ✅ Get post_id from extractor (already resolved from pfbid)
            const extractedPostId = validateData.post_id;

            console.log('✓ Extractor returned:', {
              post_id: extractedPostId,
              page_id_from_url: validateData.page_id,
              full_content_id: validateData.full_content_id
            });

            // ✅ Construct fullPostId with pageIdSetting (user's page)
            resolvedPost = {
              pageId: pageIdSetting,
              postId: extractedPostId,
              fullPostId: `${pageIdSetting}_${extractedPostId}`,
              contentType: validateData.content_type,
              videoResolved: validateData.video_resolved,
              originalVideoId: validateData.original_video_id
            };

            console.log('✓ Final resolved post:', resolvedPost);

          } else {
            console.error('❌ Post validation failed:', validateData.error);
          }
        } else {
          const errorText = await validateResponse.text();
          console.error('❌ facebook-post-extractor function error:', errorText);
        }
      } catch (e) {
        console.error('Error calling facebook-post-extractor:', e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...aiResponse,
          resolvedInterests: resolvedInterests.length > 0 ? resolvedInterests : undefined,
          resolvedLocation: resolvedLocation || undefined,
          resolvedPost: resolvedPost || undefined
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in parse-campaign-text:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
