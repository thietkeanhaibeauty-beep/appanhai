const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
  FEATURE_FLAGS: 'mphouxrbh4hqaw8',
  ROLE_FEATURE_FLAGS: 'mzg5rbcu8slheho',
  USER_ROLES: 'm7fkz8rlwuizquy',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Populating NocoDB with feature flags');

    const results: any = {
      features: [],
      roleAssignments: [],
      userRoles: [],
    };

    // 1. Create feature flags
    const features = [
      // Manual tools - 5 features
      { key: 'manual_create_ads', name: '🎨 Tạo quảng cáo thủ công', description: 'Tạo quảng cáo cơ bản', category: 'manual', enabled: true },
      { key: 'manual_create_message', name: '💬 Tạo QC tin nhắn', description: 'Tạo quảng cáo tin nhắn', category: 'manual', enabled: true },
      { key: 'manual_audience', name: '👥 Tạo đối tượng', description: 'Tạo đối tượng quảng cáo', category: 'manual', enabled: true },
      { key: 'manual_advanced_ads', name: '⚡ ADS nâng cao', description: 'Quản lý quảng cáo nâng cao', category: 'manual', enabled: true },
      { key: 'manual_quick_ad', name: '⚡ Bài viết sẵn nhanh', description: 'Tạo quảng cáo từ bài viết nhanh', category: 'manual', enabled: true },

      // Reports - 3 features
      { key: 'report_ads', name: '📊 Báo cáo ads', description: 'Xem báo cáo quảng cáo', category: 'report', enabled: true },
      { key: 'report_sales', name: '📄 Báo cáo sale', description: 'Xem báo cáo bán hàng', category: 'report', enabled: true },
      { key: 'report_summary', name: '📈 Báo cáo tổng', description: 'Xem báo cáo tổng hợp', category: 'report', enabled: true },

      // AI features - 5 features
      { key: 'ai_quick_post', name: '📱 Quick Post - Tạo QC từ bài viết', description: 'Tạo quảng cáo tự động từ bài viết Facebook', category: 'ai', enabled: true },
      { key: 'ai_creative_campaign', name: '🎨 Creative Campaign - Tạo QC với media', description: 'Tạo chiến dịch quảng cáo từ hình ảnh/video', category: 'ai', enabled: true },
      { key: 'ai_audience_creator', name: '👥 Audience Creator - Tạo đối tượng', description: 'Tạo đối tượng quảng cáo tự động bằng AI', category: 'ai', enabled: true },
      { key: 'ai_clone_tool', name: '📋 Clone Tool - Nhân bản', description: 'Nhân bản và tối ưu chiến dịch quảng cáo', category: 'ai', enabled: true },
      { key: 'ai_report_analysis', name: '📊 Report Analysis - Phân tích báo cáo', description: 'Phân tích và đề xuất tối ưu từ báo cáo', category: 'ai', enabled: true },
    ];

    for (const feature of features) {
      try {
        const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FEATURE_FLAGS}/records`, {
          method: 'POST',
          headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feature),
        });

        if (response.ok) {
          const data = await response.json();
          results.features.push({ key: feature.key, status: 'created', data });
        } else {
          const error = await response.text();
          results.features.push({ key: feature.key, status: 'failed', error });
        }
      } catch (error) {
        results.features.push({ key: feature.key, status: 'error', error: String(error) });
      }
    }

    // 2. Assign features to roles
    const manualTools = ['manual_create_ads', 'manual_create_message', 'manual_audience', 'manual_advanced_ads', 'manual_quick_ad'];
    const reports = ['report_ads', 'report_sales', 'report_summary'];
    const aiFeatures = ['ai_quick_post', 'ai_creative_campaign', 'ai_audience_creator', 'ai_clone_tool', 'ai_report_analysis'];

    // All users get manual tools and reports
    const roleAssignments = [
      { role: 'user', features: [...manualTools, ...reports] },
      { role: 'admin', features: [...manualTools, ...reports, ...aiFeatures] },
      { role: 'super_admin', features: [...manualTools, ...reports, ...aiFeatures] },
    ];

    for (const { role, features: roleFeatures } of roleAssignments) {
      for (const featureKey of roleFeatures) {
        try {
          const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records`, {
            method: 'POST',
            headers: {
              'xc-token': NOCODB_API_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role,
              feature_key: featureKey,
              enabled: true,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            results.roleAssignments.push({ role, featureKey, status: 'created', data });
          } else {
            const error = await response.text();
            results.roleAssignments.push({ role, featureKey, status: 'failed', error });
          }
        } catch (error) {
          results.roleAssignments.push({ role, featureKey, status: 'error', error: String(error) });
        }
      }
    }

    // 3. Assign user role to new user (aaanthanhdtx)
    const newUserId = 'ec8e2ad5-108e-4efe-9ec9-53786a93058c';
    try {
      const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.USER_ROLES}/records`, {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: newUserId,
          role: 'user',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        results.userRoles.push({ userId: newUserId, status: 'created', data });
      } else {
        const error = await response.text();
        results.userRoles.push({ userId: newUserId, status: 'failed', error });
      }
    } catch (error) {
      results.userRoles.push({ userId: newUserId, status: 'error', error: String(error) });
    }

    console.log('✅ NocoDB population complete');

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
