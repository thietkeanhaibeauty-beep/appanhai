import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const BASE_ID = 'p0lvt22fuj3opkl';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📊 Creating today_insights table in NocoDB...');

    const tableConfig = {
      table_name: 'today_insights',
      title: 'Today Insights (Hourly)',
      columns: [
        { column_name: 'Id', uidt: 'ID', pk: true, ai: true },
        { column_name: 'user_id', uidt: 'SingleLineText', rqd: true },
        { column_name: 'account_id', uidt: 'SingleLineText', rqd: true },

        // Hierarchy
        { column_name: 'campaign_id', uidt: 'SingleLineText' },
        { column_name: 'adset_id', uidt: 'SingleLineText' },
        { column_name: 'ad_id', uidt: 'SingleLineText' },
        { column_name: 'level', uidt: 'SingleLineText', rqd: true },
        { column_name: 'name', uidt: 'SingleLineText', rqd: true },

        // Time dimensions
        { column_name: 'hour_start', uidt: 'DateTime', rqd: true },
        { column_name: 'hour_end', uidt: 'DateTime', rqd: true },
        { column_name: 'date', uidt: 'Date', rqd: true },
        { column_name: 'hour', uidt: 'Number', rqd: true },

        // Metrics
        { column_name: 'total_spend', uidt: 'Number' },
        { column_name: 'total_impressions', uidt: 'Number' },
        { column_name: 'total_clicks', uidt: 'Number' },
        { column_name: 'total_results', uidt: 'Number' },
        { column_name: 'total_reach', uidt: 'Number' },
        { column_name: 'avg_ctr', uidt: 'Number' },
        { column_name: 'avg_cpm', uidt: 'Number' },
        { column_name: 'avg_cpc', uidt: 'Number' },
        { column_name: 'avg_cost_per_result', uidt: 'Number' },
        { column_name: 'avg_frequency', uidt: 'Number' },

        { column_name: 'objective', uidt: 'SingleLineText' },
        { column_name: 'aggregated_at', uidt: 'DateTime' },
      ]
    };

    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`, {
      method: 'POST',
      headers: {
        'xc-token': NOCODB_API_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tableConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ NocoDB API error:', response.status, errorText);
      throw new Error(`NocoDB API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Table created successfully:', result.id);

    return new Response(
      JSON.stringify({
        success: true,
        table_id: result.id,
        message: 'Add this ID to src/services/nocodb/config.ts as TODAY_INSIGHTS'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error creating table:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
