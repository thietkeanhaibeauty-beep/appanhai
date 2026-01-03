import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';
import { getGlobalAISettings } from '../_shared/ai-provider.ts';
import { logTokenUsage, extractTokenUsage } from '../_shared/tokenUsageHelper.ts';

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

    // ✅ STEP 1: Try to get User's OpenAI API key first
    let openaiApiKey: string | null = null;
    let openaiModel = 'gpt-4o-mini';
    let keySource = '';

    console.log('📥 Step 1: Fetching USER OpenAI settings from NocoDB for user:', user.id);

    const nocodbUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=1`;
    const nocodbResponse = await fetch(nocodbUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    if (nocodbResponse.ok) {
      const nocodbData = await nocodbResponse.json();
      const userSettings = nocodbData.list && nocodbData.list.length > 0 ? nocodbData.list[0] : null;

      if (userSettings?.api_key) {
        openaiApiKey = userSettings.api_key;
        openaiModel = userSettings.model || 'gpt-4o-mini';
        keySource = 'USER';
        console.log('✅ Using USER OpenAI API key with model:', openaiModel);
      } else {
        console.log('⚠️ No USER OpenAI key found. Will try GLOBAL key...');
      }
    } else {
      console.log('⚠️ Failed to fetch user settings. Will try GLOBAL key...');
    }

    // ✅ STEP 2: Fallback to Global AI settings with provider_priority (SuperAdmin)
    if (!openaiApiKey) {
      console.log('📥 Step 2: Fetching GLOBAL AI settings with provider_priority...');

      try {
        const globalSettings = await getGlobalAISettings();
        if (globalSettings) {
          openaiApiKey = globalSettings.apiKey;
          openaiModel = globalSettings.model;
          keySource = `GLOBAL-${globalSettings.provider.toUpperCase()}`;
          // Store endpoint for later use
          (globalThis as any)._aiEndpoint = globalSettings.endpoint;
          console.log(`✅ Using GLOBAL ${globalSettings.provider.toUpperCase()} API key with model:`, openaiModel);
        } else {
          console.log('❌ No GLOBAL AI key found');
        }
      } catch (e) {
        console.error('❌ Error fetching GLOBAL AI settings:', e);
      }
    }

    // ❌ If still no API key, return error
    if (!openaiApiKey) {
      console.error('❌ No OpenAI API key found (neither USER nor GLOBAL)');
      return new Response(
        JSON.stringify({ error: "OpenAI API key chưa được cấu hình. Vui lòng liên hệ Admin hoặc vào Settings để thêm API key." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`🚀 Parsing creative campaign with OpenAI [${keySource}], Model: ${openaiModel}`);

    // ✅ Get current date/time in Vietnam timezone for AI context
    const vietnamTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const now = new Date();
    const currentDateISO = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();

    const systemPrompt = `Bạn là chuyên gia Facebook Ads. Nhiệm vụ của bạn là phân tích yêu cầu người dùng để tạo nội dung quảng cáo tin nhắn (Message Ads).

⏰ **NGÀY GIỜ HIỆN TẠI: ${vietnamTime} (${currentDateISO})**
📅 **NĂM HIỆN TẠI: ${currentYear}**
Múi giờ: Vietnam (GMT+7)

YÊU CẦU XỬ LÝ NỘI DUNG (QUAN TRỌNG):
1. **Nếu user cung cấp sẵn nội dung**: Trích xuất chính xác, giữ nguyên các xuống dòng.
2. **Nếu user chỉ đưa ra ý tưởng/mục tiêu** (VD: "bán quần áo", "tuyển dụng", "quảng cáo spa"): HÃY SÁNG TẠO nội dung quảng cáo (adContent) và tiêu đề (adHeadline) thật hấp dẫn, chuyên nghiệp, có icon, chuẩn format Facebook Ads.

YÊU CẦU ĐỊNH DẠNG JSON:
- **GIỮ NGUYÊN TẤT CẢ XUỐNG DÒNG** trong adContent bằng ký tự \\n
- Khi văn bản gốc có xuống dòng, PHẢI chuyển thành \\n trong JSON
- VÍ DỤ: "Dòng 1\\nDòng 2\\nDòng 3" → đúng ✅

Lưu ý các trường khác:
- budget phải là số (VND), ví dụ: 400000 cho 400k
- ageMin và ageMax phải là số từ 18-65
- gender chỉ có 3 giá trị: "all", "male", "female"
- locations là mảng các địa điểm (ưu tiên chuẩn hóa thành Tỉnh/Thành phố hoặc Quốc gia)
- locationRadius: Bán kính (km). QUY TẮC:
  + QUỐC GIA (VN): null
  + THÀNH PHỐ/TỌA ĐỘ: Tìm số km trong văn bản (VD: "25km"), nếu KHÔNG CÓ thì để null (KHÔNG tự điền).
- interestKeywords: từ khóa sở thích tiếng Việt
- adContent: Nội dung quảng cáo (Được user cung cấp HOẶC bạn tự sáng tạo nếu thiếu). Cần có cấu trúc: Hook -> Body -> CTA.
- adHeadline: Tiêu đề quảng cáo (Chat trong Messenger).
- greetingText: Lời chào (optional).
- iceBreakerQuestions: Câu hỏi gợi ý (optional).
- KHÔNG CẦN postUrl`;

    // Use endpoint from global settings or default to OpenAI
    const apiEndpoint = (globalThis as any)._aiEndpoint || 'https://api.openai.com/v1/chat/completions';

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
              name: "extract_creative_campaign_info",
              description: "Trích xuất thông tin chiến dịch quảng cáo tin nhắn mới",
              parameters: {
                type: "object",
                properties: {
                  campaignName: {
                    type: "string",
                    description: "Tên chiến dịch"
                  },
                  budget: {
                    type: "number",
                    description: "Ngân sách hàng ngày VND (ví dụ: 400000)"
                  },
                  budgetType: {
                    type: "string",
                    enum: ["DAILY", "LIFETIME"],
                    description: "Loại ngân sách: DAILY (hàng ngày) hoặc LIFETIME (trọn đời). Mặc định là DAILY nếu không nói rõ trọn đời."
                  },
                  lifetimeBudget: {
                    type: "number",
                    description: "Ngân sách trọn đời VND (chỉ khi budgetType = LIFETIME)"
                  },
                  startTime: {
                    type: "string",
                    description: "Thời gian bắt đầu (format: YYYY-MM-DDTHH:mm). Nếu user nói 'ngày mai', 'tuần sau' thì tự tính dựa trên NGÀY GIỜ HIỆN TẠI."
                  },
                  endTime: {
                    type: "string",
                    description: "Thời gian kết thúc (format: YYYY-MM-DDTHH:mm)"
                  },
                  enableSchedule: {
                    type: "boolean",
                    description: "Có bật lịch phân phối (schedule) không. True nếu user yêu cầu giờ cụ thể (vd: 7h-9h)."
                  },
                  scheduleSlots: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        days: { type: "array", items: { type: "number" }, description: "0=CN, 1=T2...6=T7" },
                        startHour: { type: "number" },
                        endHour: { type: "number" }
                      }
                    },
                    description: "Danh sách khung giờ phân phối (chỉ khi enableSchedule=true)"
                  },
                  _dateError: {
                    type: "string",
                    description: "Thông báo lỗi nếu ngày không hợp lệ (ví dụ: thiếu năm, ngày bắt đầu > ngày kết thúc)"
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
                    description: "Danh sách địa điểm (tên quốc gia, tên thành phố, hoặc tọa độ kinh độ vĩ độ)"
                  },
                  locationRadius: {
                    type: "number",
                    description: "Bán kính targeting (km). QUY TẮC: 1) QUỐC GIA (Việt Nam/Vietnam/VN) → LUÔN null. 2) THÀNH PHỐ → TÌM số km trong văn bản (VD: 'Hà Nội 25km'), nếu KHÔNG TÌM THẤY thì ĐỂ null. 3) TỌA ĐỘ → TÌM số km SAU tọa độ (VD: '21.39,106.62 3km'), nếu KHÔNG TÌM THẤY thì ĐỂ null. TUYỆT ĐỐI KHÔNG tự suy diễn hoặc đặt mặc định",
                    nullable: true
                  },
                  interestKeywords: {
                    type: "array",
                    items: { type: "string" },
                    description: "Danh sách sở thích"
                  },
                  adContent: {
                    type: "string",
                    description: "Nội dung chính của quảng cáo. QUAN TRỌNG: GIỮ NGUYÊN TẤT CẢ XUỐNG DÒNG bằng ký tự \\n. Khi văn bản có xuống dòng, phải chuyển thành \\n trong JSON. Ví dụ: 'Dòng 1\\nDòng 2\\nDòng 3'"
                  },
                  adHeadline: {
                    type: "string",
                    description: "Tiêu đề quảng cáo"
                  },
                  greetingText: {
                    type: "string",
                    description: "Lời chào tin nhắn tự động (optional)"
                  },
                  iceBreakerQuestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Các câu hỏi gợi ý (optional, tối đa 4 câu)"
                  }
                },
                required: ["campaignName", "budget", "ageMin", "ageMax", "gender", "locations", "interestKeywords", "adContent", "adHeadline"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_creative_campaign_info" } },
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
    console.log("OpenAI creative response:", JSON.stringify(data));

    // ✅ LOG TOKEN USAGE
    const usageData = extractTokenUsage(data, user.id, 'ai-parse-creative');
    if (usageData) {
      await logTokenUsage(usageData);
    }

    // Extract tool call arguments
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error("Không nhận được phản hồi từ AI");
    }

    const parsedData = JSON.parse(toolCall.function.arguments);
    console.log("Parsed creative campaign data:", JSON.stringify(parsedData));

    // ✅ HEURISTIC: Parse date range "từ DD/MM/YYYY đến DD/MM/YYYY" nếu AI bỏ sót năm
    if (parsedData.budgetType === 'LIFETIME') {
      const dateRangeMatch = promptText.match(
        /(?:từ|tu)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\s*(?:đến|den|-|–)\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/i
      );

      if (dateRangeMatch) {
        const startDay = parseInt(dateRangeMatch[1]);
        const startMonth = parseInt(dateRangeMatch[2]);
        const startYearExplicit = dateRangeMatch[3] ? parseInt(dateRangeMatch[3]) : null;

        const endDay = parseInt(dateRangeMatch[4]);
        const endMonth = parseInt(dateRangeMatch[5]);
        const endYearExplicit = dateRangeMatch[6] ? parseInt(dateRangeMatch[6]) : null;

        console.log('📅 Date parsing:', { startDay, startMonth, startYearExplicit, endDay, endMonth, endYearExplicit });

        // ✅ AUTO-INFER MISSING YEARS (thay vì yêu cầu nhập lại)
        const currentYearVal = new Date().getFullYear();

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
          startYear = currentYearVal;
          endYear = endMonth < startMonth ? currentYearVal + 1 : currentYearVal;
          console.log(`🔄 Auto-inferred both years: startYear=${startYear}, endYear=${endYear}`);
        }

        // Create dates with proper time
        const nowTime = new Date();
        let startDate = new Date(startYear, startMonth - 1, startDay, 0, 0);
        const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59);


        // ✅ AUTO-FIX: Nếu ngày bắt đầu là QUÁ KHỨ → tự động sửa thành bây giờ + 30 phút
        const now = new Date();
        const bufferMinutes = 30;
        const todayStartDate = new Date();
        todayStartDate.setHours(0, 0, 0, 0);
        const isStartToday = startDate.getTime() === todayStartDate.getTime();

        if (startDate < now && !isStartToday) {
          // Ngày bắt đầu là quá khứ (không phải hôm nay) → auto-fix
          console.log('⚠️ startDate is in the past, auto-correcting to now + 30 min');

          const newStartTime = new Date(now.getTime() + bufferMinutes * 60 * 1000);

          if (newStartTime >= endDate) {
            parsedData._dateError = `⚠️ Thời gian kết thúc (${endDay}/${endMonth}) đã qua hoặc quá gần!\\n\\nVui lòng chọn khoảng thời gian trong tương lai.`;
            console.log('⚠️ Cannot auto-fix: endDate is also in past or too close');
          } else {
            startDate = newStartTime;
            console.log('✅ Auto-corrected startDate to:', startDate.toISOString());
          }
        } else if (isStartToday) {
          // Ngày bắt đầu là HÔM NAY → thêm buffer 30 phút
          const currentHour = nowTime.getHours();
          const currentMinute = nowTime.getMinutes();

          let startHour = currentHour;
          let startMinute = currentMinute + bufferMinutes;

          if (startMinute >= 60) {
            startHour += 1;
            startMinute -= 60;
          }

          if (startHour >= 24) {
            parsedData._dateError = `⚠️ Đã quá muộn để bắt đầu chiến dịch hôm nay!\\n\\nVui lòng chọn ngày mai hoặc sau.`;
            console.log('⚠️ Too late in the day for today start');
          } else {
            startDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
            console.log('📅 Start date is TODAY - added time buffer:', { startHour, startMinute });
          }
        }

        // Set startTime and endTime in ISO format (only if no error)
        if (!parsedData._dateError) {
          const formatDateTime = (d: Date) => {
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, '0');
            const dy = String(d.getDate()).padStart(2, '0');
            const hr = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            return `${yr}-${mo}-${dy}T${hr}:${mi}`;
          };

          parsedData.startTime = formatDateTime(startDate);
          parsedData.endTime = formatDateTime(endDate);

          console.log('📅 Final dates with auto-inferred years:', {
            startTime: parsedData.startTime,
            endTime: parsedData.endTime
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ data: parsedData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in ai-parse-creative function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
