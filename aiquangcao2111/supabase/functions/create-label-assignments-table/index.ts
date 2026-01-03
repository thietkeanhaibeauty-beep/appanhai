// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'p0lvt22fuj3opkl';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Creating campaign_label_assignments table in NocoDB...');

    const tableConfig = {
      table_name: 'campaign_label_assignments',
      title: 'Campaign Label Assignments',
      columns: [
        { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
        { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
        { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },
        { column_name: 'uuid', title: 'uuid', uidt: 'SingleLineText' },
        { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText', rqd: false },
        { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText', rqd: false },
        { column_name: 'ad_id', title: 'ad_id', uidt: 'SingleLineText', rqd: false },
        { column_name: 'label_id', title: 'label_id', uidt: 'Number', rqd: true },
      ]
    };

    const response = await fetch(
      `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
      {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableConfig)
      }
    );

    const responseText = await response.text();
    console.log('Response status:', response.status);
    console.log('Response body:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to create table: ${response.status} ${responseText}`);
    }

    const result = JSON.parse(responseText);

    console.log('✅ Table created successfully!');
    console.log('📋 Table ID:', result.id);
    console.log('⚠️ IMPORTANT: Update src/services/nocodb/config.ts with new table ID:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: '✅ Successfully created campaign_label_assignments table',
        table_id: result.id,
        note: `Update CAMPAIGN_LABEL_ASSIGNMENTS in config.ts to: '${result.id}'`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error creating table:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
