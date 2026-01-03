import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getGlobalAISettings } from '../_shared/ai-provider.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOCODB_CONFIG = {
  BASE_URL: 'https://db.hpb.edu.vn',
  API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
  TABLE_ID: 'me8nzzace4omg8i', // openai_settings table
};

// =============================================================================
// 📝 VIETNAMESE NLP KEYWORDS MAPPING
// =============================================================================
const VIETNAMESE_CONTEXT = `
## TỪ ĐIỂN TIẾNG VIỆT CHUYÊN NGÀNH

### Metrics - Cấp Nhân viên Ads (Operator)
- "chi tiêu", "tiêu", "spend", "chi" → spend
- "kết quả", "result", "mess", "tin nhắn", "KQ" → results
- "chi phí/kết quả", "CPA", "giá/kết quả", "chi phí mỗi kết quả" → cost_per_result
- "tiếp cận", "reach" → reach
- "hiển thị", "impressions" → impressions
- "nhấp", "click", "lượt nhấp" → clicks
- "CPM", "chi phí 1000 hiển thị" → cpm
- "CPC", "chi phí mỗi click" → cpc
- "CTR", "tỉ lệ click" → ctr
- "tần suất" → frequency
- "số ngày", "ngày từ khi tạo" → days_since_created

### Metrics - Cấp Sale/Trưởng phòng (Manager)
- "SĐT", "số điện thoại", "phone", "điện thoại" → phone_count
- "chi phí/SĐT", "giá/SĐT", "chi phí mỗi SĐT" → cost_per_phone
- "tỉ lệ SĐT", "% SĐT", "tỉ lệ có SĐT" → sdt_rate
- "đặt lịch", "lịch hẹn", "appointment", "booking" → booking_rate
- "tỉ lệ đặt lịch", "% đặt lịch" → booking_rate
- "chi phí/đặt lịch" → cost_per_appointment
- "doanh thu dịch vụ" → cost_per_service_revenue

### Metrics - Cấp Giám đốc (Director)
- "ROI", "lợi nhuận" → roi
- "ROAS", "doanh thu/chi phí" → roas
- "chi phí MKT/doanh thu", "marketing ratio" → marketing_revenue_ratio
- "doanh thu" → marketing_revenue_ratio

### Actions
- "tắt", "dừng", "stop", "off" → turn_off
- "bật", "mở", "on", "khởi động" → turn_on
- "tăng ngân sách", "tăng budget", "scale", "tăng" → increase_budget
- "giảm ngân sách", "giảm budget", "cắt ngân sách", "giảm" → decrease_budget
- "gắn nhãn", "thêm nhãn" → add_label

### Operators
- "lớn hơn", ">", "trên", "vượt" → greater_than
- "nhỏ hơn", "<", "dưới", "thấp hơn" → less_than
- "bằng", "=", "là" → equals
- ">=", "lớn hơn hoặc bằng", "từ ... trở lên" → greater_than_or_equal
- "<=", "nhỏ hơn hoặc bằng", "từ ... trở xuống" → less_than_or_equal

### Logic & Priority
- "cắt lỗ mạnh", "ưu tiên 1", "quan trọng nhất" → Priority 1, severity high
- "cắt lỗ nhẹ", "ưu tiên 2", "cắt nhẹ" → Priority 2, severity medium
- "scale", "tăng trưởng", "ưu tiên 3" → Priority 3, type scale
- "bước 1", "bước 2", "hoặc", "HOẶC" → Multi-step rule (dùng tool golden_rule_set)
- "VÀ", "và", "AND" → condition_logic: all
- "HOẶC", "hoặc", "OR" → condition_logic: any (hoặc step logic)

### Quy đổi đơn vị
- "100k" = 100000, "1 triệu" = 1000000, "1tr" = 1000000
- "50%" = 50, "30%" = 30
`;

// =============================================================================
// 🛠️ TOOL DEFINITIONS
// =============================================================================

// Tool 1: Single Rule (Quy tắc đơn)
const SINGLE_RULE_TOOL = {
  type: "function",
  function: {
    name: "create_automation_rule",
    description: "Tạo MỘT quy tắc tự động hóa Facebook Ads đơn giản, không có nhiều bước",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tên quy tắc (ngắn gọn, dễ hiểu)" },
        scope: {
          type: "string",
          enum: ["campaign", "adset", "ad"],
          description: "Phạm vi: campaign=Chiến dịch, adset=Nhóm quảng cáo, ad=Quảng cáo",
        },
        timeRange: {
          type: "string",
          enum: ["today", "yesterday", "7_days", "14_days", "30_days", "lifetime"],
          description: "Khung thời gian đánh giá",
        },
        conditionLogic: {
          type: "string",
          enum: ["all", "any"],
          description: "all=TẤT CẢ điều kiện (VÀ), any=BẤT KỲ điều kiện (HOẶC)",
        },
        conditions: {
          type: "array",
          description: "Danh sách điều kiện",
          items: {
            type: "object",
            properties: {
              metric: {
                type: "string",
                enum: [
                  // Operator metrics
                  "spend", "results", "cpm", "cpc", "ctr", "reach", "impressions", "clicks", "cost_per_result", "frequency", "days_since_created",
                  // Manager metrics
                  "phone_count", "cost_per_phone", "sdt_rate", "booking_rate", "cost_per_appointment", "cost_per_service_revenue",
                  // Director metrics
                  "marketing_revenue_ratio", "marketing_service_ratio", "marketing_daily_ratio", "roi", "roas"
                ],
                description: "Chỉ số đo lường"
              },
              operator: {
                type: "string",
                enum: ["greater_than", "less_than", "equals", "greater_than_or_equal", "less_than_or_equal", "not_equals"],
              },
              value: { type: "number" },
            },
            required: ["metric", "operator", "value"],
          },
        },
        actions: {
          type: "array",
          description: "Danh sách hành động",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["turn_off", "turn_on", "increase_budget", "decrease_budget", "add_label", "send_notification"],
              },
              value: { type: "number", description: "Giá trị % cho budget hoặc label ID" },
              executeAt: { type: "string", description: "Thời gian thực hiện (HH:mm)" },
            },
            required: ["type"],
          },
        },
        explanation: { type: "string", description: "Giải thích quy tắc bằng tiếng Việt" },
      },
      required: ["name", "scope", "timeRange", "conditionLogic", "conditions", "actions", "explanation"],
    },
  },
};

// Tool 2: Golden Rule Set (Bộ quy tắc vàng - nhiều bước)
const GOLDEN_RULE_SET_TOOL = {
  type: "function",
  function: {
    name: "create_golden_rule_set",
    description: "Tạo BỘ QUY TẮC VÀNG với NHIỀU BƯỚC (multi-step). Dùng khi user yêu cầu: cắt lỗ mạnh + cắt lỗ nhẹ + scale, hoặc có từ 'bước 1', 'bước 2', 'ưu tiên', 'HOẶC'",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tên bộ quy tắc" },
        description: { type: "string", description: "Mô tả ngắn gọn" },
        scope: {
          type: "string",
          enum: ["campaign", "adset", "ad"],
        },
        timeRange: {
          type: "string",
          enum: ["today", "yesterday", "7_days", "14_days", "30_days", "lifetime"],
        },
        basicRules: {
          type: "array",
          description: "Danh sách các quy tắc cơ bản trong bộ, theo thứ tự ưu tiên",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Tên bước (VD: Cắt lỗ mạnh)" },
              priority: { type: "number", description: "Thứ tự ưu tiên (1 = cao nhất)" },
              conditions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    metric: {
                      type: "string",
                      enum: [
                        "spend", "results", "cpm", "cpc", "ctr", "reach", "impressions", "clicks", "cost_per_result", "frequency", "days_since_created",
                        "phone_count", "cost_per_phone", "sdt_rate", "booking_rate", "cost_per_appointment", "cost_per_service_revenue",
                        "marketing_revenue_ratio", "marketing_service_ratio", "marketing_daily_ratio", "roi", "roas"
                      ],
                    },
                    operator: {
                      type: "string",
                      enum: ["greater_than", "less_than", "equals", "greater_than_or_equal", "less_than_or_equal", "not_equals"],
                    },
                    value: { type: "number" },
                  },
                  required: ["metric", "operator", "value"],
                },
              },
              conditionLogic: { type: "string", enum: ["all", "any"] },
              action: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["turn_off", "turn_on", "increase_budget", "decrease_budget", "add_label"] },
                  value: { type: "number" },
                },
                required: ["type"],
              },
            },
            required: ["name", "priority", "conditions", "conditionLogic", "action"],
          },
        },
        advancedOverrides: {
          type: "array",
          description: "Override từ cấp cao (Sale/GĐ) - chặn action nếu match",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              conditions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    metric: { type: "string" },
                    operator: { type: "string" },
                    value: { type: "number" },
                  },
                },
              },
              conditionLogic: { type: "string", enum: ["all", "any"] },
              blocksActions: {
                type: "array",
                items: { type: "string", enum: ["turn_off", "decrease_budget"] },
                description: "Actions sẽ bị chặn nếu override match"
              },
              reason: { type: "string", description: "Lý do chặn" },
            },
          },
        },
        explanation: { type: "string", description: "Giải thích bộ quy tắc bằng tiếng Việt" },
      },
      required: ["name", "scope", "timeRange", "basicRules", "explanation"],
    },
  },
};

// Tool 3: Ask clarification (Hỏi lại user)
const ASK_CLARIFICATION_TOOL = {
  type: "function",
  function: {
    name: "ask_clarification",
    description: "Hỏi lại user để làm rõ yêu cầu (khi không chắc user muốn quy tắc đơn hay bộ quy tắc)",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "Câu hỏi clarification" },
        suggestedOptions: {
          type: "array",
          items: { type: "string" },
          description: "Các lựa chọn gợi ý cho user"
        },
      },
      required: ["question", "suggestedOptions"],
    },
  },
};

// =============================================================================
// 🚀 MAIN HANDLER
// =============================================================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Parse request body FIRST to get userId
    let userRequest: string = '';
    let conversationHistory: any[] = [];
    let userId: string = '';

    try {
      const body = await req.json();
      userRequest = body.userRequest || '';
      conversationHistory = body.conversationHistory || [];
      userId = body.userId || '';
    } catch (parseError) {
      console.error('[create-automation-rule-with-ai] JSON parse error:', parseError);
      return new Response(JSON.stringify({ success: false, error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to get userId from auth header if not in body
    if (!userId) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        try {
          const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
          );
          const { data: { user } } = await supabase.auth.getUser();
          if (user) userId = user.id;
        } catch (authError) {
          console.log('[create-automation-rule-with-ai] Auth fallback failed:', authError);
        }
      }
    }

    console.log('✅ Processing request for user:', userId || 'anonymous');

    if (!userRequest || userRequest.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: "userRequest is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default userId if none available
    if (!userId) userId = 'default';

    // ✅ Get OpenAI API key from NocoDB
    const nocodbUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLE_ID}/records?where=(user_id,eq,${userId})~and(is_active,eq,1)&limit=1`;


    const nocodbResponse = await fetch(nocodbUrl, {
      method: 'GET',
      headers: {
        'xc-token': NOCODB_CONFIG.API_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!nocodbResponse.ok) {
      return new Response(JSON.stringify({ error: "Cannot fetch OpenAI configuration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nocodbData = await nocodbResponse.json();
    let settings = nocodbData.list?.[0];
    let apiEndpoint = 'https://api.openai.com/v1/chat/completions';

    if (!settings?.api_key) {
      console.log('⚠️ No user key, fetching GLOBAL AI settings with provider_priority...');
      const globalSettings = await getGlobalAISettings();
      if (globalSettings) {
        settings = { api_key: globalSettings.apiKey, model: globalSettings.model };
        apiEndpoint = globalSettings.endpoint;
        console.log(`✅ Using GLOBAL ${globalSettings.provider.toUpperCase()} with model:`, globalSettings.model);
      } else {
        return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log("[create-automation-rule-with-ai] Processing request:", userRequest);

    // ✅ Build system prompt with Vietnamese NLP
    const systemPrompt = `Bạn là chuyên gia Facebook Ads automation nói tiếng Việt. Nhiệm vụ:
1. Phân tích yêu cầu người dùng
2. Chọn tool phù hợp để tạo quy tắc

${VIETNAMESE_CONTEXT}

## HƯỚNG DẪN CHỌN TOOL:

### Dùng "create_automation_rule" khi:
- User yêu cầu TẠO 1 QUY TẮC ĐƠN GIẢN
- Chỉ có 1 nhóm điều kiện và 1 hành động
- KHÔNG CÓ từ "HOẶC" giữa các nhóm điều kiện
- Ví dụ: "Tắt nếu tiêu trên 100k mà 0 kết quả"

### Dùng "create_golden_rule_set" khi (ƯU TIÊN KIỂM TRA):
- ⚠️ QUAN TRỌNG: Nếu có từ "HOẶC" giữa các nhóm điều kiện/hành động → DÙNG TOOL NÀY
- User yêu cầu NHIỀU BƯỚC hoặc NHIỀU ƯU TIÊN
- Có từ khóa: "bước 1", "bước 2", "ưu tiên", "cắt lỗ mạnh + cắt lỗ nhẹ", "scale"
- Mỗi nhóm điều kiện có hành động riêng
- Ví dụ: "Tiêu 100k tắt HOẶC tiêu 80k giảm 20%"
- Ví dụ: "Cắt lỗ mạnh 100k, cắt nhẹ 80k, scale nếu tốt"

### Dùng "ask_clarification" khi:
- Không chắc user muốn loại nào
- Thiếu thông tin quan trọng (scope, ngưỡng giá trị...)
- Yêu cầu mơ hồ

## VÍ DỤ PARSE:

Input: "Tiêu 100k không kết quả thì tắt"
→ create_automation_rule (đơn)

Input: "Cắt lỗ mạnh 100k tắt, cắt nhẹ 80k giảm 20%, scale nếu CPA < 40k"
→ create_golden_rule_set (bộ 3 bước)

Input: "Tạo quy tắc tối ưu quảng cáo"
→ ask_clarification (thiếu chi tiết)

## LƯU Ý QUAN TRỌNG:
- Giá trị tiền VNĐ: 100k = 100000, 1 triệu = 1000000
- Phần trăm: 30% = 30
- Mặc định scope = "adset" nếu không nói rõ
- Mặc định timeRange = "today" nếu không nói rõ
`;

    // Build messages array with history if available
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory.slice(-5)); // Last 5 messages for context
    }

    messages.push({ role: "user", content: userRequest });

    // ✅ Call OpenAI with all tools
    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${settings.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model || "gpt-4o-mini",
        messages,
        tools: [SINGLE_RULE_TOOL, GOLDEN_RULE_SET_TOOL, ASK_CLARIFICATION_TOOL],
        tool_choice: "auto", // Let AI choose the best tool
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[create-automation-rule-with-ai] OpenAI error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices[0].message.tool_calls?.[0];
    const textResponse = data.choices[0].message.content;

    // ✅ Handle case: AI responded with text (no tool call)
    if (!toolCall && textResponse) {
      return new Response(
        JSON.stringify({
          success: true,
          type: "message",
          message: textResponse,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No tool call or response from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);

    console.log(`[create-automation-rule-with-ai] Tool: ${toolName}`);

    // ✅ Handle different tools
    switch (toolName) {
      case "create_automation_rule": {
        const processedRule = {
          rule_name: toolArgs.name,
          scope: toolArgs.scope || "adset",
          time_range: toolArgs.timeRange || "today",
          condition_logic: toolArgs.conditionLogic || "all",
          conditions: (toolArgs.conditions || []).map((c: any) => ({ ...c, id: crypto.randomUUID() })),
          actions: (toolArgs.actions || []).map((a: any) => ({ ...a, id: crypto.randomUUID() })),
          advanced_settings: {},
          labels: [],
          target_labels: [],
          is_active: true,
          explanation: toolArgs.explanation,
        };

        return new Response(
          JSON.stringify({
            success: true,
            type: "single_rule",
            rule: processedRule,
            explanation: toolArgs.explanation,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "create_golden_rule_set": {
        const processedGoldenRuleSet = {
          name: toolArgs.name,
          description: toolArgs.description || "",
          scope: toolArgs.scope || "adset",
          time_range: toolArgs.timeRange || "today",
          basic_rules: (toolArgs.basicRules || []).map((rule: any, index: number) => ({
            id: crypto.randomUUID(),
            name: rule.name,
            priority: rule.priority || index + 1,
            conditions: (rule.conditions || []).map((c: any) => ({ ...c, id: crypto.randomUUID() })),
            condition_logic: rule.conditionLogic || "all",
            action: { ...rule.action, id: crypto.randomUUID() },
          })),
          advanced_overrides: (toolArgs.advancedOverrides || []).map((override: any) => ({
            id: crypto.randomUUID(),
            name: override.name,
            conditions: (override.conditions || []).map((c: any) => ({ ...c, id: crypto.randomUUID() })),
            condition_logic: override.conditionLogic || "all",
            blocks_actions: override.blocksActions || [],
            reason: override.reason,
          })),
          target_labels: [],
          is_active: true,
          explanation: toolArgs.explanation,
        };

        return new Response(
          JSON.stringify({
            success: true,
            type: "golden_rule_set",
            goldenRuleSet: processedGoldenRuleSet,
            explanation: toolArgs.explanation,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      case "ask_clarification": {
        return new Response(
          JSON.stringify({
            success: true,
            type: "clarification",
            question: toolArgs.question,
            suggestedOptions: toolArgs.suggestedOptions || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown tool: ${toolName}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("[create-automation-rule-with-ai] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
