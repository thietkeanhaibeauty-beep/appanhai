import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
    const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
    const BASE_ID = 'p0lvt22fuj3opkl';

    console.log('🚀 Starting NocoDB table creation...');

    // Table definitions
    const tables = [
      {
        name: 'facebook_campaigns',
        title: 'Facebook Campaigns',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'uuid', title: 'uuid', uidt: 'SingleLineText' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_name', title: 'campaign_name', uidt: 'SingleLineText' },
          { column_name: 'status', title: 'status', uidt: 'SingleLineText' },
          { column_name: 'effective_status', title: 'effective_status', uidt: 'SingleLineText' },
          { column_name: 'daily_budget', title: 'daily_budget', uidt: 'SingleLineText' },
          { column_name: 'lifetime_budget', title: 'lifetime_budget', uidt: 'SingleLineText' },
          { column_name: 'objective', title: 'objective', uidt: 'SingleLineText' },
        ]
      },
      {
        name: 'facebook_adsets',
        title: 'Facebook Adsets',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'uuid', title: 'uuid', uidt: 'SingleLineText' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'adset_name', title: 'adset_name', uidt: 'SingleLineText' },
          { column_name: 'status', title: 'status', uidt: 'SingleLineText' },
          { column_name: 'effective_status', title: 'effective_status', uidt: 'SingleLineText' },
          { column_name: 'daily_budget', title: 'daily_budget', uidt: 'SingleLineText' },
          { column_name: 'lifetime_budget', title: 'lifetime_budget', uidt: 'SingleLineText' },
        ]
      },
      {
        name: 'facebook_ads',
        title: 'Facebook Ads',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'uuid', title: 'uuid', uidt: 'SingleLineText' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'ad_id', title: 'ad_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'ad_name', title: 'ad_name', uidt: 'SingleLineText' },
          { column_name: 'status', title: 'status', uidt: 'SingleLineText' },
          { column_name: 'effective_status', title: 'effective_status', uidt: 'SingleLineText' },
        ]
      }
    ];

    const results = [];

    // Create each table
    for (const tableConfig of tables) {
      console.log(`📋 Creating table: ${tableConfig.name}...`);

      try {
        const response = await fetch(
          `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
          {
            method: 'POST',
            headers: {
              'xc-token': NOCODB_API_TOKEN,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              table_name: tableConfig.name,
              title: tableConfig.title,
              columns: tableConfig.columns
            })
          }
        );

        const responseText = await response.text();
        console.log(`Response status for ${tableConfig.name}:`, response.status);
        console.log(`Response body:`, responseText);

        if (!response.ok) {
          throw new Error(`Failed to create ${tableConfig.name}: ${response.status} ${responseText}`);
        }

        const result = JSON.parse(responseText);
        results.push({
          table: tableConfig.name,
          success: true,
          table_id: result.id,
          message: `✅ Created ${tableConfig.name} with ID: ${result.id}`
        });

        console.log(`✅ Successfully created ${tableConfig.name} (ID: ${result.id})`);
      } catch (error) {
        console.error(`❌ Error creating ${tableConfig.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          table: tableConfig.name,
          success: false,
          error: errorMessage
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Table creation process completed',
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in create-nocodb-tables function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: errorDetails
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
