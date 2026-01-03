import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';
import { getUserFromRequest } from '../_shared/auth.ts';
import { NOCODB_CONFIG, getNocoDBHeaders } from '../_shared/nocodb-config.ts';
import { detectIntent } from './intentDetector.ts';
import { getActiveCampaigns, getAllCampaigns, getPausedCampaigns, getTodayMetrics, getCampaignsByLabel, getCampaignsByTimeframe, getCampaignsByBudget, formatCurrency, formatNumber, getCampaignSummary, getCampaignListOnly } from './reportHelpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
        JSON.stringify({ error: authError instanceof Error ? authError.message : 'Authentication failed' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { messages, accountId, userName, aiSelfPronoun, aiUserPronoun } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Missing accountId parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';

    console.log('📨 User message:', lastUserMessage);
    console.log('📊 Account ID:', accountId);

    // 🎯 DETECT INTENT
    const intent = detectIntent(lastUserMessage);
    console.log('🎯 Detected intent:', intent.type);

    let enrichedMessages = [...messages];

    // Initialize Supabase with user token for RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: req.headers.get('Authorization')!,
        },
      },
    });

    // 📊 FETCH DATA if needed
    if (intent.type !== 'general_chat') {
      let reportData: any = null;

      try {
        switch (intent.type) {
          case 'report_hourly': {
            const hoursAgo = intent.params.hoursAgo || 1;
            const hourStart = new Date(Date.now() - hoursAgo * 3600000);
            const dateOnly = hourStart.toISOString().split('T')[0];

            console.log('📊 Fetching hourly insights from NocoDB', { dateOnly, accountId });

            const TODAY_INSIGHTS_TABLE_ID = NOCODB_CONFIG.TABLES.TODAY_INSIGHTS;

            const whereClause = encodeURIComponent(
              `(user_id,eq,${user.id})~and(account_id,eq,${accountId})~and(date,eq,${dateOnly})~and(level,eq,campaign)`
            );

            const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TODAY_INSIGHTS_TABLE_ID}/records?where=${whereClause}&sort=-total_spend&limit=10`;

            const response = await fetch(url, {
              headers: getNocoDBHeaders()
            });

            const nocodbData = await response.json();

            reportData = {
              type: 'hourly_insights',
              campaigns: nocodbData.list || []
            };
            break;
          }

          case 'report_daily': {
            const today = new Date().toISOString().split('T')[0];

            console.log('📊 Fetching daily insights from NocoDB', { today, accountId });

            const TODAY_INSIGHTS_TABLE_ID = NOCODB_CONFIG.TABLES.TODAY_INSIGHTS;

            const whereClause = encodeURIComponent(
              `(user_id,eq,${user.id})~and(account_id,eq,${accountId})~and(date,eq,${today})~and(level,eq,campaign)`
            );

            const url = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${TODAY_INSIGHTS_TABLE_ID}/records?where=${whereClause}&sort=-total_spend&limit=20`;

            const response = await fetch(url, {
              headers: getNocoDBHeaders()
            });

            const nocodbData = await response.json();
            const campaigns = nocodbData.list || [];

            reportData = {
              type: 'daily_insights',
              total: campaigns.reduce((acc: any, c: any) => ({
                spend: acc.spend + Number(c.total_spend || 0),
                results: acc.results + Number(c.total_results || 0),
                impressions: acc.impressions + Number(c.total_impressions || 0),
                clicks: acc.clicks + Number(c.total_clicks || 0),
              }), { spend: 0, results: 0, impressions: 0, clicks: 0 }),
              campaigns
            };
            break;
          }

          case 'report_active':
            console.log('📊 Fetching active campaigns from NocoDB...', 'level:', intent.params.level);
            reportData = await getActiveCampaigns(user.id, accountId, intent.params.level);
            break;

          case 'report_all_campaigns':
            console.log('📊 Fetching ALL campaigns from NocoDB...', 'level:', intent.params.level);
            reportData = await getAllCampaigns(user.id, accountId, intent.params.level);
            break;

          case 'report_paused_campaigns':
            console.log('📊 Fetching PAUSED campaigns from NocoDB...', 'level:', intent.params.level);
            reportData = await getPausedCampaigns(user.id, accountId, intent.params.level);
            break;

          case 'report_today':
            console.log('📊 Fetching today metrics from NocoDB...', 'level:', intent.params.level);
            reportData = await getTodayMetrics(user.id, accountId, intent.params.level);
            break;

          case 'report_by_label':
            console.log('📊 Fetching campaigns by label:', intent.params.labelName, 'level:', intent.params.level);
            reportData = await getCampaignsByLabel(user.id, intent.params.labelName, intent.params.level);
            break;

          case 'report_by_timeframe':
            console.log('📊 Fetching campaigns by timeframe:', intent.params.days, 'days', 'level:', intent.params.level);
            reportData = await getCampaignsByTimeframe(user.id, accountId, intent.params.days, intent.params.level);
            break;

          case 'report_by_budget':
            console.log('📊 Fetching campaigns by budget:', intent.params, 'level:', intent.params.level);
            reportData = await getCampaignsByBudget(user.id, accountId, intent.params.minBudget, intent.params.maxBudget, intent.params.level);
            break;

          case 'report_performance':
            console.log('📊 Fetching performance data...', 'level:', intent.params.level);
            reportData = await getTodayMetrics(user.id, accountId, intent.params.level);
            break;
        }

        // 🎨 ENRICH PROMPT with real data
        if (reportData) {
          let dataContext = '';

          if (intent.type === 'report_hourly' && reportData.campaigns) {
            const campaigns = reportData.campaigns;
            dataContext = `
[📊 DỮ LIỆU THEO GIỜ - ${campaigns.length} chiến dịch]

${campaigns.map((c: any, idx: number) => `
${idx + 1}. **${c.name}**
   - Chi tiêu: ${formatCurrency(c.total_spend)}
   - Kết quả: ${formatNumber(c.total_results)}
   - Chi phí/kết quả: ${formatCurrency(c.avg_cost_per_result)}
   - Lượt hiển thị: ${formatNumber(c.total_impressions)}
   - Click: ${formatNumber(c.total_clicks)}
`).join('\n')}

Hãy phân tích dữ liệu theo giờ và đưa ra nhận xét.
`;
          } else if (intent.type === 'report_daily' && reportData.total) {
            const { total, campaigns } = reportData;
            dataContext = `
[📊 KẾT QUẢ HÔM NAY]

**Tổng quan:**
- 💰 Chi tiêu: ${formatCurrency(total.spend)}
- 🎯 Kết quả: ${formatNumber(total.results)}
- 👁️ Hiển thị: ${formatNumber(total.impressions)}
- 👆 Click: ${formatNumber(total.clicks)}

**Các chiến dịch (${campaigns.length}):**
${campaigns.slice(0, 5).map((c: any, idx: number) => `
${idx + 1}. ${c.name}
   - Chi tiêu: ${formatCurrency(c.total_spend)}
   - Kết quả: ${formatNumber(c.total_results)}
   - Chi phí/kết quả: ${formatCurrency(c.avg_cost_per_result)}
`).join('\n')}

Hãy phân tích và đưa ra nhận xét chi tiết.
`;
          } else if (intent.type === 'report_active' && Array.isArray(reportData)) {
            dataContext = `
[📊 DỮ LIỆU CHIẾN DỊCH ĐANG HOẠT ĐỘNG]

Tìm thấy ${reportData.length} chiến dịch:

${reportData.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Ngân sách chi tiêu: ${formatCurrency(c.spend)}
   - Số kết quả: ${formatNumber(c.results)}
   - Chi phí trên kết quả: ${c.cost_per_result !== null ? formatCurrency(c.cost_per_result) : 'Không có kết quả'}
   - Trạng thái: ${c.effective_status}
`).join('\n')}

⚠️ LƯU Ý: CHỈ SỬ DỤNG SỐ LIỆU TRÊN, KHÔNG TỰ BỊA!
`;
          } else if (intent.type === 'report_all_campaigns' && Array.isArray(reportData)) {
            dataContext = `
[📊 DỮ LIỆU TẤT CẢ CHIẾN DỊCH TRONG TÀI KHOẢN]

Tìm thấy ${reportData.length} chiến dịch:

${reportData.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Ngân sách chi tiêu: ${formatCurrency(c.spend)}
   - Số kết quả: ${formatNumber(c.results)}
   - Chi phí trên kết quả: ${c.cost_per_result !== null ? formatCurrency(c.cost_per_result) : 'Không có kết quả'}
   - Trạng thái: ${c.effective_status}
`).join('\n')}

⚠️ LƯU Ý: CHỈ SỬ DỤNG SỐ LIỆU TRÊN, KHÔNG TỰ BỊA!
`;
          } else if (intent.type === 'report_paused_campaigns' && Array.isArray(reportData)) {
            dataContext = `
[📊 DỮ LIỆU CHIẾN DỊCH ĐANG TẠM DỪNG]

Tìm thấy ${reportData.length} chiến dịch:

${reportData.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Ngân sách chi tiêu: ${formatCurrency(c.spend)}
   - Số kết quả: ${formatNumber(c.results)}
   - Chi phí trên kết quả: ${c.cost_per_result !== null ? formatCurrency(c.cost_per_result) : 'Không có kết quả'}
`).join('\n')}

⚠️ LƯU Ý: CHỈ SỬ DỤNG SỐ LIỆU TRÊN, KHÔNG TỰ BỊA!
`;
          } else if (intent.type === 'report_today' && reportData.total) {
            dataContext = `
[📊 BÁO CÁO KẾT QUẢ HÔM NAY - ${new Date().toISOString().split('T')[0]}]

**💰 CHI TIÊU & KẾT QUẢ:**
- Tổng chi tiêu: ${formatCurrency(reportData.total.spend)}
- Tổng kết quả: ${formatNumber(reportData.total.results)}
- Chi phí/kết quả: ${reportData.total.results > 0 ? formatCurrency(reportData.total.spend / reportData.total.results) : 'N/A'}

**👥 TIẾP CẬN & HIỂN THỊ:**
- Lượt hiển thị (Impressions): ${formatNumber(reportData.total.impressions)}
- Tiếp cận (Reach): ${formatNumber(reportData.total.reach)}
- Lượt click: ${formatNumber(reportData.total.clicks)}
- CTR (Click-through rate): ${reportData.total.ctr.toFixed(2)}%
- CPC (Cost per click): ${formatCurrency(reportData.total.cpc)}

**💬 TƯƠNG TÁC:**
- Số bình luận: ${formatNumber(reportData.total.comments)}
- Số chia sẻ: ${formatNumber(reportData.total.shares)}
- Số reactions (thích, yêu thích): ${formatNumber(reportData.total.reactions)}
- Tổng tương tác bài viết: ${formatNumber(reportData.total.post_engagement)}
- Lượt xem video: ${formatNumber(reportData.total.video_views)}

**📈 CHIẾN DỊCH:**
- Tổng số chiến dịch đang chạy: ${reportData.campaigns.length}
- Số chiến dịch có kết quả: ${reportData.campaigns.filter((c: any) => c.results > 0).length}

${reportData.top_performers.length > 0 ? `
**🏆 TOP CHIẾN DỊCH HIỆU QUẢ NHẤT (chi phí/kết quả thấp nhất):**
${reportData.top_performers.map((c: any, idx: number) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Chi phí/kết quả: ${formatCurrency(c.cost_per_result)}
   - Kết quả: ${formatNumber(c.results)}
   - Chi tiêu: ${formatCurrency(c.spend)}
   - Bình luận: ${formatNumber(c.comments || 0)}
`).join('\n')}
` : '⚠️ Chưa có chiến dịch nào có kết quả hôm nay'}

⚠️ **LƯU Ý QUAN TRỌNG:**
- CHỈ SỬ DỤNG CÁC SỐ LIỆU TRÊN
- NẾU SỐ LIỆU = 0 → Nói rõ "Hôm nay chưa có dữ liệu" hoặc "Chưa có [metric name]"
- KHÔNG TỰ BỊA hoặc ước đoán số liệu
`;
          } else if (intent.type === 'report_by_label' && Array.isArray(reportData)) {
            dataContext = `
[📊 CHIẾN DỊCH CÓ LABEL: ${intent.params.labelName}]

Tìm thấy ${reportData.length} chiến dịch:

${reportData.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Trạng thái: ${c.effective_status}
   - Chi tiêu: ${formatCurrency(c.spend)}
   - Kết quả: ${formatNumber(c.results)}
   - Chi phí/kết quả: ${formatCurrency(c.cost_per_result)}
`).join('\n')}

Hãy phân tích nhóm chiến dịch này và đưa ra nhận xét.
`;
          } else if (intent.type === 'report_by_timeframe' && Array.isArray(reportData)) {
            dataContext = `
[📊 CHIẾN DỊCH TRONG ${intent.params.days} NGÀY GẦN NHẤT]

Tìm thấy ${reportData.length} chiến dịch:

${reportData.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Ngân sách chi tiêu: ${formatCurrency(c.spend)}
   - Số kết quả: ${formatNumber(c.results)}
   - Chi phí trên kết quả: ${c.cost_per_result !== null ? formatCurrency(c.cost_per_result) : 'Không có kết quả'}
   - Trạng thái: ${c.effective_status}
`).join('\n')}

⚠️ LƯU Ý: Dữ liệu tổng hợp từ ${intent.params.days} ngày gần nhất. CHỈ SỬ DỤNG SỐ LIỆU TRÊN!
`;
          } else if (intent.type === 'report_by_budget' && Array.isArray(reportData)) {
            const minBudget = intent.params.minBudget;
            const maxBudget = intent.params.maxBudget;
            let budgetDesc = '';

            if (minBudget && maxBudget) {
              budgetDesc = `từ ${formatCurrency(minBudget)} đến ${formatCurrency(maxBudget)}`;
            } else if (minBudget) {
              budgetDesc = `trên ${formatCurrency(minBudget)}`;
            } else if (maxBudget) {
              budgetDesc = `dưới ${formatCurrency(maxBudget)}`;
            }

            dataContext = `
[📊 CHIẾN DỊCH VỚI NGÂN SÁCH ${budgetDesc}]

Tìm thấy ${reportData.length} chiến dịch:

${reportData.map((c, idx) => `
${idx + 1}. **${c.campaign_name || 'Không có tên'}**
   - Ngân sách chi tiêu: ${formatCurrency(c.spend)}
   - Số kết quả: ${formatNumber(c.results)}
   - Chi phí trên kết quả: ${c.cost_per_result !== null ? formatCurrency(c.cost_per_result) : 'Không có kết quả'}
   - Trạng thái: ${c.effective_status}
`).join('\n')}

⚠️ LƯU Ý: Chỉ hiển thị chiến dịch có ngân sách ${budgetDesc}. CHỈ SỬ DỤNG SỐ LIỆU TRÊN!
`;
          } else {
            dataContext = `
[📊 DỮ LIỆU THỰC TẾ]
${JSON.stringify(reportData, null, 2)}

Hãy phân tích dữ liệu trên và trả lời câu hỏi một cách chi tiết, dễ hiểu.
`;
          }

          // Replace last user message with enriched version
          enrichedMessages = [
            ...messages.slice(0, -1),
            { role: 'user', content: dataContext + '\n\n' + lastUserMessage }
          ];

          console.log('✅ Data enriched successfully');
          console.log('📊 Data context length:', dataContext.length);
          console.log('📊 Data preview:', dataContext.substring(0, 500));
        } else {
          console.log('⚠️ No data found for intent:', intent.type);
        }
      } catch (dataError) {
        console.error('❌ Error fetching report data:', dataError);
        // Continue with original message if data fetch fails
      }
    }

    // ✅ Get OpenAI API key from NocoDB filtered by user_id
    const nocodbUrl = `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${NOCODB_CONFIG.TABLES.OPENAI_SETTINGS}/records?where=(user_id,eq,${user.id})~and(is_active,eq,1)&limit=1`;

    console.log('📥 Fetching OpenAI settings from NocoDB for user:', user.id);

    const nocodbResponse = await fetch(nocodbUrl, {
      method: 'GET',
      headers: getNocoDBHeaders(),
    });

    let settings: { api_key: string; model: string } | null = null;
    let usingGlobalKey = false;
    let activeProvider: 'openai' | 'deepseek' | 'gemini' = 'openai';

    if (nocodbResponse.ok) {
      const nocodbData = await nocodbResponse.json();
      settings = nocodbData.list && nocodbData.list.length > 0 ? nocodbData.list[0] : null;
    }

    // ✅ FALLBACK: If user has no API key, try Global Keys based on provider_priority
    if (!settings || !settings.api_key) {
      console.log('⚠️ User has no API key, trying Global AI Keys from SuperAdmin...');

      try {
        // Step 1: Get provider priority order (JSON array)
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

        // Step 2: Try each provider in order
        const keyMap: Record<string, string> = {
          openai: 'global_openai_key',
          deepseek: 'global_deepseek_key',
          gemini: 'global_gemini_key',
        };
        const defaultModels: Record<string, string> = {
          openai: 'gpt-4.1-mini',
          deepseek: 'deepseek-chat',
          gemini: 'gemini-2.0-flash',
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
              usingGlobalKey = true;
              console.log(`✅ Using Global ${provider.toUpperCase()} Key. Model:`, settings.model);
            } else {
              console.log(`⚠️ ${provider.toUpperCase()} has no API key configured, trying next...`);
            }
          }
        }
      } catch (globalError) {
        console.error('❌ Error fetching global AI key:', globalError);
      }
    }

    // If still no API key, return error
    if (!settings || !settings.api_key) {
      console.error('❌ No AI settings found (neither user nor global)');
      return new Response(
        JSON.stringify({ error: "AI API key chưa được cấu hình. Vui lòng liên hệ Admin hoặc vào Settings để thêm API key." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine endpoint based on provider
    const endpoints = {
      openai: 'https://api.openai.com/v1/chat/completions',
      deepseek: 'https://api.deepseek.com/v1/chat/completions',
      gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    };
    const apiEndpoint = usingGlobalKey ? endpoints[activeProvider] : 'https://api.openai.com/v1/chat/completions';

    console.log(`✅ AI settings loaded. Provider: ${usingGlobalKey ? activeProvider : 'user-openai'}, Model: ${settings.model}, Endpoint: ${apiEndpoint}`);

    // 🤖 CALL AI API with enriched context
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
            content: `Bạn là trợ lý AI chuyên phân tích quảng cáo Facebook cho doanh nghiệp Việt Nam.${userName ? `\n\nTÊN NGƯỜI DÙNG: ${userName}` : ''}${aiSelfPronoun || aiUserPronoun ? `\n\n⭐ CÁCH XƯNG HÔ (BẮT BUỘC):\n- Luôn tự xưng là "${aiSelfPronoun || 'Em'}"\n- Luôn gọi người dùng là "${aiUserPronoun || 'Anh'}"\n- Ví dụ: "${aiSelfPronoun || 'Em'} sẽ giúp ${aiUserPronoun || 'Anh'}...", "${aiUserPronoun || 'Anh'} ơi, ${aiSelfPronoun || 'em'} thấy rằng..."` : `\n\nHãy xưng hô thân thiện và gọi tên người dùng khi phù hợp (ví dụ: "Chào anh ${userName}", "Anh ${userName} ơi").`}

⚠️ QUY TẮC NGHIÊM NGẶT NHẤT - ĐỌC KỸ:
1. **CHỈ SỬ DỤNG DỮ LIỆU** được cung cấp trong [📊 BÁO CÁO...] hoặc [📊 DỮ LIỆU...]
2. **KHÔNG BAO GIỜ** tự bịa, đoán, hoặc thêm số liệu không có trong data
3. **NẾU KHÔNG CÓ DỮ LIỆU** → Trả lời: "❌ Không tìm thấy dữ liệu cho [yêu cầu]. Có thể dữ liệu chưa được đồng bộ hoặc chưa có hoạt động hôm nay."
4. **NẾU DỮ LIỆU = 0** → Nói rõ: "Hôm nay [metric] = 0" (KHÔNG nói "chưa có" nếu data = 0)
5. **NẾU DỮ LIỆU = null** → Nói: "Không có dữ liệu [metric]" hoặc "N/A"

📊 **CÁC CHỈ SỐ QUAN TRỌNG CẦN BÁO CÁO:**

**Nhóm CHI TIÊU:**
- Tổng chi tiêu (spend)
- Kết quả (results) 
- Chi phí/kết quả (cost per result)
- CPC (cost per click)

**Nhóm TIẾP CẬN:**
- Lượt hiển thị (impressions)
- Tiếp cận (reach)
- Lượt click (clicks)
- CTR % (click-through rate)

**Nhóm TƯƠNG TÁC:**
- Bình luận (comments) ⭐
- Chia sẻ (shares)
- Reactions (thích, yêu thích)
- Tương tác bài viết (post_engagement)
- Lượt xem video (video_views)

📋 **FORMAT TRẢ LỜI THEO YÊU CẦU:**

**Khi hỏi "HÔM NAY" hoặc "KẾT QUẢ HÔM NAY":**
\`\`\`
📊 **BÁO CÁO HÔM NAY** (${new Date().toISOString().split('T')[0]})

💰 **Chi tiêu & Kết quả:**
- Chi tiêu: [số tiền]đ
- Kết quả: [số]
- Chi phí/kết quả: [số tiền]đ

👥 **Tiếp cận:**
- Hiển thị: [số]
- Click: [số] 
- CTR: [%]

💬 **Tương tác:**
- Bình luận: [số]
- Chia sẻ: [số]
- Reactions: [số]

🎯 **Nhận xét:** [phân tích ngắn gọn]
\`\`\`

**Khi hỏi CHỈ SỐ CỤ THỂ:**
- "Hôm nay chi tiêu bao nhiêu?" → CHỈ trả lời số tiền chi tiêu
- "Bao nhiêu kết quả?" → CHỈ trả lời số kết quả
- "Số bình luận?" → CHỈ trả lời số bình luận
- "Chi phí trên mỗi kết quả?" → CHỈ trả lời cost per result

**Khi hỏi CHỈ TÊN chiến dịch:**
- Câu hỏi: "chiến dịch nào", "list campaign", "các chiến dịch là gì"
- Trả lời: CHỈ liệt kê danh sách tên, KHÔNG thêm số liệu

**Khi hỏi CHI TIẾT số liệu:**
- Câu hỏi: "ngân sách bao nhiêu", "kết quả", "chi phí", "hiệu quả", "báo cáo chi tiết"
- Trả lời: TÊN + CHI TIẾT số liệu từ data

**Khi hỏi SO SÁNH hoặc PHÂN TÍCH:**
- Đưa ra insights về hiệu quả
- So sánh giữa các chiến dịch
- Khuyến nghị tối ưu

⚠️ **XỬ LÝ DỮ LIỆU ĐẶC BIỆT:**
- Nếu data = 0 → Viết: "0đ" hoặc "0" (KHÔNG viết "chưa có")
- Nếu data = null → Viết: "Không có dữ liệu" hoặc "N/A"
- Nếu không tìm thấy data → Viết: "❌ Không tìm thấy dữ liệu. Vui lòng kiểm tra..."

PHONG CÁCH:
- Thân thiện, dễ hiểu, chuyên nghiệp
- Sử dụng emoji phù hợp (📊 💰 🎯 💬 👥 📈 ⚠️ ✅ ❌ 🏆)
- Format số liệu rõ ràng (1,234,567đ)
- TÔN TRỌNG chính xác yêu cầu của user`
          },
          ...enrichedMessages,
        ],
        stream: true,
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

    // ✅ TOKEN TRACKING: Wrap stream to count tokens when using Global Key
    if (usingGlobalKey && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let completionText = '';

      // Estimate prompt tokens (rough: ~4 chars = 1 token)
      // Include: 1) System prompt (~2000 tokens estimated), 2) User messages
      const userMessagesText = JSON.stringify(enrichedMessages);
      const userMessagesTokens = Math.ceil(userMessagesText.length / 4);
      const systemPromptEstimate = 2000; // System prompt is ~8000 chars = ~2000 tokens
      const estimatedPromptTokens = systemPromptEstimate + userMessagesTokens;

      // Create a new readable stream that passes through all data
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                // Stream finished - log token usage (fire and forget)
                const estimatedCompletionTokens = Math.ceil(completionText.length / 4);
                const totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

                console.log(`📊 Token usage (estimated): prompt=${estimatedPromptTokens}, completion=${estimatedCompletionTokens}, total=${totalTokens}`);

                // Log to NocoDB (fire and forget - don't await)
                logTokenUsageFireAndForget(user.id, settings.model, totalTokens, estimatedPromptTokens, estimatedCompletionTokens);

                controller.close();
                break;
              }

              // Parse SSE data to extract completion text
              const text = decoder.decode(value, { stream: true });
              const lines = text.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const json = JSON.parse(line.slice(6));
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                      completionText += content;
                    }
                  } catch {
                    // Ignore parse errors
                  }
                }
              }

              // Pass through to client
              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Normal response (user has their own key - no tracking needed)
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Error in ai-chat function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// =============================================
// Token Usage Logging (Fire and Forget)
// =============================================
const OPENAI_USAGE_LOGS_TABLE_ID = 'magb5ls8j82lp27';
const USER_BALANCES_TABLE_ID = 'mbpatk8hctj9u1o';

async function logTokenUsageFireAndForget(
  userId: string,
  model: string,
  totalTokens: number,
  promptTokens: number,
  completionTokens: number
) {
  try {
    // 1. Log to openai_usage_logs
    await fetch(
      `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${OPENAI_USAGE_LOGS_TABLE_ID}/records`,
      {
        method: 'POST',
        headers: getNocoDBHeaders(),
        body: JSON.stringify({
          user_id: userId,
          feature: 'ai-chat',
          model: model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          total_tokens: totalTokens,
          created_at: new Date().toISOString(),
        }),
      }
    );
    console.log(`✅ Token usage logged: ${totalTokens} tokens for user ${userId}`);

    // 2. Deduct from user balance
    const whereClause = encodeURIComponent(`(user_id,eq,${userId})`);
    const balanceResponse = await fetch(
      `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records?where=${whereClause}&limit=1`,
      { headers: getNocoDBHeaders() }
    );

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      const balance = balanceData.list?.[0];

      if (balance?.Id) {
        const currentBalance = balance.balance || 0;
        const currentSpent = balance.total_spent || 0;
        const newBalance = Math.max(0, currentBalance - totalTokens);
        const newSpent = currentSpent + totalTokens;

        await fetch(
          `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${USER_BALANCES_TABLE_ID}/records`,
          {
            method: 'PATCH',
            headers: getNocoDBHeaders(),
            body: JSON.stringify([{
              Id: balance.Id,
              balance: newBalance,
              total_spent: newSpent,
            }]),
          }
        );
        console.log(`✅ Deducted ${totalTokens} tokens. Balance: ${currentBalance} → ${newBalance}`);
      }
    }
  } catch (error) {
    console.error('❌ Error logging token usage:', error);
  }
}
