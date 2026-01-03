import { corsHeaders } from '../_shared/cors.ts';

const NOCODB_BASE_URL = Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = Deno.env.get('NOCODB_API_TOKEN') || 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';

const TABLES = {
  FEATURE_FLAGS: 'mbctnl9dbktdz9f',
  ROLE_FEATURE_FLAGS: 'mskba16vzzcofe6',
};

async function nocoDBRequest(path: string, method: string, body?: any) {
  const response = await fetch(`${NOCODB_BASE_URL}${path}`, {
    method,
    headers: {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ NocoDB request failed: ${response.status} - ${errorText}`);
    throw new Error(`NocoDB request failed: ${response.status}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting NocoDB feature flags migration...');

    // Step 1: Add category column to feature_flags table
    console.log('📝 Adding category column...');
    try {
      await nocoDBRequest(`/api/v2/meta/tables/${TABLES.FEATURE_FLAGS}/columns`, 'POST', {
        title: 'category',
        column_name: 'category',
        uidt: 'SingleLineText',
        dt: 'varchar',
        dtxp: '255',
        dtxs: '',
        un: false,
        pk: false,
        rqd: false,
        cdf: 'general',
      });
      console.log('✅ Category column added');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log('ℹ️ Category column may already exist:', errorMsg);
    }

    // Step 2: Fetch all existing feature flags
    console.log('📋 Fetching existing feature flags...');
    const flagsData = await nocoDBRequest(`/api/v2/tables/${TABLES.FEATURE_FLAGS}/records`, 'GET');
    const existingFlags = flagsData.list || [];
    console.log(`✅ Found ${existingFlags.length} existing feature flags`);

    // Step 3: Update existing AI features with category
    console.log('🤖 Updating AI features...');
    const aiFeatures = ['ai_quick_post', 'ai_creative_campaign', 'ai_audience_creator', 'ai_clone_tool', 'ai_report_analysis'];
    for (const flag of existingFlags) {
      if (aiFeatures.includes(flag.key)) {
        await nocoDBRequest(`/api/v2/tables/${TABLES.FEATURE_FLAGS}/records/${flag.Id}`, 'PATCH', {
          category: 'ai',
        });
        console.log(`✅ Updated ${flag.key} to category 'ai'`);
      }
    }

    // Step 4: Insert manual tool feature flags
    console.log('🛠️ Inserting manual tool features...');
    const manualTools = [
      { key: 'manual_create_ads', name: 'Tạo quảng cáo thủ công', description: 'Công cụ tạo chiến dịch, adset, và ad thủ công', enabled: true, category: 'manual' },
      { key: 'manual_create_message', name: 'Tạo QC tin nhắn', description: 'Công cụ tạo quảng cáo tin nhắn thủ công', enabled: true, category: 'manual' },
      { key: 'manual_audience', name: 'Tạo đối tượng', description: 'Công cụ tạo và quản lý đối tượng mục tiêu', enabled: true, category: 'manual' },
      { key: 'manual_advanced_ads', name: 'ADS nâng cao', description: 'Công cụ quản lý và nhân bản quảng cáo nâng cao', enabled: true, category: 'manual' },
      { key: 'manual_quick_ad', name: 'Bài viết sẵn nhanh', description: 'Công cụ tạo quảng cáo nhanh từ bài viết', enabled: true, category: 'manual' },
    ];

    for (const tool of manualTools) {
      const existing = existingFlags.find((f: any) => f.key === tool.key);
      if (existing) {
        await nocoDBRequest(`/api/v2/tables/${TABLES.FEATURE_FLAGS}/records/${existing.Id}`, 'PATCH', tool);
        console.log(`✅ Updated ${tool.key}`);
      } else {
        await nocoDBRequest(`/api/v2/tables/${TABLES.FEATURE_FLAGS}/records`, 'POST', tool);
        console.log(`✅ Created ${tool.key}`);
      }
    }

    // Step 5: Insert report feature flags
    console.log('📊 Inserting report features...');
    const reportFeatures = [
      { key: 'report_ads', name: 'Báo cáo Ads', description: 'Xem và phân tích báo cáo quảng cáo', enabled: true, category: 'report' },
      { key: 'report_sales', name: 'Báo cáo Sale', description: 'Xem báo cáo doanh số bán hàng', enabled: true, category: 'report' },
      { key: 'report_summary', name: 'Báo cáo Tổng', description: 'Xem báo cáo tổng quan hệ thống', enabled: true, category: 'report' },
    ];

    for (const report of reportFeatures) {
      const existing = existingFlags.find((f: any) => f.key === report.key);
      if (existing) {
        await nocoDBRequest(`/api/v2/tables/${TABLES.FEATURE_FLAGS}/records/${existing.Id}`, 'PATCH', report);
        console.log(`✅ Updated ${report.key}`);
      } else {
        await nocoDBRequest(`/api/v2/tables/${TABLES.FEATURE_FLAGS}/records`, 'POST', report);
        console.log(`✅ Created ${report.key}`);
      }
    }

    // Step 6: Assign features to roles
    console.log('👥 Assigning features to roles...');
    const roleAssignments = [
      // Manual tools for admin and super_admin
      ...manualTools.flatMap(tool => [
        { role: 'admin', feature_key: tool.key, enabled: true },
        { role: 'super_admin', feature_key: tool.key, enabled: true },
      ]),
      // Reports for all roles
      ...reportFeatures.flatMap(report => [
        { role: 'user', feature_key: report.key, enabled: true },
        { role: 'admin', feature_key: report.key, enabled: true },
        { role: 'super_admin', feature_key: report.key, enabled: true },
      ]),
    ];

    // Fetch existing role assignments
    const roleAssignmentsData = await nocoDBRequest(`/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records`, 'GET');
    const existingAssignments = roleAssignmentsData.list || [];

    for (const assignment of roleAssignments) {
      const existing = existingAssignments.find(
        (a: any) => a.role === assignment.role && a.feature_key === assignment.feature_key
      );

      if (existing) {
        await nocoDBRequest(`/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records/${existing.Id}`, 'PATCH', assignment);
        console.log(`✅ Updated role assignment: ${assignment.role} -> ${assignment.feature_key}`);
      } else {
        await nocoDBRequest(`/api/v2/tables/${TABLES.ROLE_FEATURE_FLAGS}/records`, 'POST', assignment);
        console.log(`✅ Created role assignment: ${assignment.role} -> ${assignment.feature_key}`);
      }
    }

    console.log('✅ Migration completed successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feature flags migration completed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Migration error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
