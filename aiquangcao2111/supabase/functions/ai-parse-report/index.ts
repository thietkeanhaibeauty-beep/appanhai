import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getGlobalAISettings } from '../_shared/ai-provider.ts';

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ParseReportRequest {
    userMessage: string;
    openaiApiKey?: string;
    model?: string;
}

interface ParseReportResponse {
    success: boolean;
    reportType: 'marketing' | 'sales' | 'summary';
    dateRange: {
        startDate: string;  // YYYY-MM-DD
        endDate: string;    // YYYY-MM-DD
    };
    metrics?: string[];  // Specific metrics requested
    error?: string;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { userMessage, openaiApiKey, model = "gpt-4o-mini" } = await req.json() as ParseReportRequest;

        if (!userMessage) {
            return new Response(
                JSON.stringify({ success: false, error: "userMessage is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get today's date for context
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const systemPrompt = `Bạn là AI phân tích yêu cầu báo cáo quảng cáo.
Hôm nay là: ${todayStr}

Phân tích tin nhắn người dùng và trả về JSON:
{
  "reportType": "marketing" | "sales" | "summary",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "metrics": ["spend", "results", ...] // optional
}

Quy tắc:
- "tuần qua" = 7 ngày gần nhất
- "tháng này" = từ ngày 1 tháng này đến hôm nay
- "tháng trước" / "tháng 11" = full tháng đó
- "năm nay" = từ 01/01 đến hôm nay
- Nếu có từ "chi tiêu", "marketing", "ads" → reportType = "marketing"
- Nếu có từ "doanh thu", "sales", "bán hàng" → reportType = "sales"  
- Nếu có cả hai hoặc "tổng kết" → reportType = "summary"

Chỉ trả về JSON, không giải thích.`;

        // Use OpenAI to parse - check user key or global settings
        let apiKey = openaiApiKey || Deno.env.get("OPENAI_API_KEY");
        let apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        let aiModel = model;

        if (!apiKey) {
            console.log('⚠️ No user key, fetching GLOBAL AI settings with provider_priority...');
            const globalSettings = await getGlobalAISettings();
            if (globalSettings) {
                apiKey = globalSettings.apiKey;
                apiEndpoint = globalSettings.endpoint;
                aiModel = globalSettings.model;
                console.log(`✅ Using GLOBAL ${globalSettings.provider.toUpperCase()} with model:`, aiModel);
            }
        }

        if (!apiKey) {
            // Fallback: heuristic parsing
            return new Response(
                JSON.stringify(parseWithHeuristics(userMessage, today)),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const openaiResponse = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: aiModel,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.1,
                max_tokens: 200,
            }),
        });

        if (!openaiResponse.ok) {
            console.error("OpenAI API error:", await openaiResponse.text());
            return new Response(
                JSON.stringify(parseWithHeuristics(userMessage, today)),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const openaiData = await openaiResponse.json();
        const content = openaiData.choices[0]?.message?.content;

        if (!content) {
            return new Response(
                JSON.stringify(parseWithHeuristics(userMessage, today)),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Parse JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            return new Response(
                JSON.stringify(parseWithHeuristics(userMessage, today)),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const parsed = JSON.parse(jsonMatch[0]);

        const response: ParseReportResponse = {
            success: true,
            reportType: parsed.reportType || 'marketing',
            dateRange: {
                startDate: parsed.startDate,
                endDate: parsed.endDate,
            },
            metrics: parsed.metrics,
        };

        return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        console.error("Error in ai-parse-report:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

/**
 * Fallback heuristic parsing when no OpenAI key
 */
function parseWithHeuristics(message: string, today: Date): ParseReportResponse {
    const lower = message.toLowerCase();

    // Determine report type - check in order of specificity
    let reportType: 'marketing' | 'sales' | 'summary' = 'marketing';

    // === SALES keywords (check first - most specific) ===
    const salesKeywords = [
        // Revenue
        'doanh thu', 'revenue', 'sale', 'sales', 'bán hàng', 'tiền',
        // Appointments
        'lịch hẹn', 'đặt lịch', 'lịch', 'hẹn', 'appointment',
        // Phone
        'sđt', 'số điện thoại', 'điện thoại', 'phone', 'số phone',
        // Customers
        'khách hàng', 'khách', 'customer',
        // Conversion rates
        'tỉ lệ chuyển đổi', 'tỷ lệ chuyển đổi', 'chuyển đổi', 'conversion',
        'tỉ lệ đặt lịch', 'tỷ lệ đặt lịch', 'tỉ lệ sđt', 'tỷ lệ sđt'
    ];

    if (salesKeywords.some(kw => lower.includes(kw))) {
        reportType = 'sales';
    }

    // === ADS/Marketing keywords (override if specifically asking for ads) ===
    const adsKeywords = ['ads', 'quảng cáo', 'chi tiêu', 'mkt', 'marketing', 'fb ads', 'facebook ads'];
    if (adsKeywords.some(kw => lower.includes(kw))) {
        reportType = 'marketing';
    }

    // === SUMMARY keywords (final override - combines both) ===
    const summaryKeywords = ['tổng hợp', 'summary', 'all', 'tất cả', 'toàn bộ', 'đầy đủ'];
    if (summaryKeywords.some(kw => lower.includes(kw))) {
        reportType = 'summary';
    }

    // Determine date range
    let startDate: Date;
    let endDate: Date = new Date(today);

    // === TODAY ===
    if (lower.includes('hôm nay') || lower.includes('today') || lower.includes('ngày hôm nay')) {
        startDate = new Date(today);
        endDate = new Date(today);
    }
    // === YESTERDAY ===
    else if (lower.includes('hôm qua') || lower.includes('yesterday') || lower.includes('ngày hôm qua')) {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 1);
        endDate = new Date(startDate);
    }
    // === WEEK ===
    else if (lower.includes('tuần qua') || lower.includes('tuần này') ||
        lower.includes('7 ngày') || lower.includes('tuần')) {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 7);
    }
    // === THIS MONTH ===
    else if (lower.includes('tháng này')) {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    // === LAST MONTH ===
    else if (lower.includes('tháng trước')) {
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    }
    // === THIS YEAR ===
    else if (lower.includes('năm nay') || lower.includes('năm này')) {
        startDate = new Date(today.getFullYear(), 0, 1);
    }
    // === SPECIFIC MONTH: "tháng 11", "tháng 12" ===
    else {
        const monthMatch = lower.match(/tháng\s*(\d{1,2})/);
        if (monthMatch) {
            const month = parseInt(monthMatch[1]) - 1; // 0-indexed
            const year = today.getFullYear();
            startDate = new Date(year, month, 1);
            endDate = new Date(year, month + 1, 0); // Last day of month
        }
        // === SPECIFIC DATE RANGE: "12/12 - 18/12" ===
        else {
            const dateRangeMatch = lower.match(/(\d{1,2})\/(\d{1,2})\s*[-–]\s*(\d{1,2})\/(\d{1,2})/);
            if (dateRangeMatch) {
                const startDay = parseInt(dateRangeMatch[1]);
                const startMonth = parseInt(dateRangeMatch[2]) - 1;
                const endDay = parseInt(dateRangeMatch[3]);
                const endMonth = parseInt(dateRangeMatch[4]) - 1;
                const year = today.getFullYear();
                startDate = new Date(year, startMonth, startDay);
                endDate = new Date(year, endMonth, endDay);
            }
            // === LAST N DAYS: "3 ngày qua", "5 ngày" ===
            else {
                const daysMatch = lower.match(/(\d+)\s*ngày/);
                if (daysMatch) {
                    const days = parseInt(daysMatch[1]);
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - days);
                } else {
                    // Default: last 7 days (tuần)
                    startDate = new Date(today);
                    startDate.setDate(startDate.getDate() - 7);
                }
            }
        }
    }

    return {
        success: true,
        reportType,
        dateRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
        },
    };
}
