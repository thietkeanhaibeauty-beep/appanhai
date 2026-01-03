import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Received request to create insights tables');
    console.log('Method:', req.method);
    console.log('URL:', req.url);
    const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
    const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
    const BASE_ID = 'p0lvt22fuj3opkl';

    console.log('🚀 Starting insights tables creation in NocoDB...');

    // Table definitions based on Supabase schemas
    const tables = [
      {
        name: 'automation_rule_object_executions',
        title: 'Automation Rule Object Executions',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'rule_id', title: 'rule_id', uidt: 'Number', rqd: true },
          { column_name: 'object_type', title: 'object_type', uidt: 'SingleLineText', rqd: true },
          { column_name: 'object_id', title: 'object_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'last_action_type', title: 'last_action_type', uidt: 'SingleLineText' },
          { column_name: 'execution_count', title: 'execution_count', uidt: 'Number', default: '1' },
          { column_name: 'last_executed_at', title: 'last_executed_at', uidt: 'DateTime' },
          { column_name: 'last_budget_before', title: 'last_budget_before', uidt: 'Decimal' },
          { column_name: 'last_budget_after', title: 'last_budget_after', uidt: 'Decimal' },
          { column_name: 'metadata', title: 'metadata', uidt: 'LongText' },
        ]
      },
      {
        name: 'today_insights',
        title: 'Today Insights',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText' },
          { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText' },
          { column_name: 'ad_id', title: 'ad_id', uidt: 'SingleLineText' },
          { column_name: 'level', title: 'level', uidt: 'SingleLineText', rqd: true },
          { column_name: 'name', title: 'name', uidt: 'SingleLineText', rqd: true },
          { column_name: 'date_start', title: 'date_start', uidt: 'Date', rqd: true },
          { column_name: 'sync_time', title: 'sync_time', uidt: 'DateTime', default: 'now()' },
          { column_name: 'objective', title: 'objective', uidt: 'SingleLineText' },
          { column_name: 'effective_status', title: 'effective_status', uidt: 'SingleLineText' },
          { column_name: 'configured_status', title: 'configured_status', uidt: 'SingleLineText' },
          { column_name: 'impressions', title: 'impressions', uidt: 'Number', default: '0' },
          { column_name: 'clicks', title: 'clicks', uidt: 'Number', default: '0' },
          { column_name: 'spend', title: 'spend', uidt: 'Decimal', default: '0' },
          { column_name: 'reach', title: 'reach', uidt: 'Number', default: '0' },
          { column_name: 'frequency', title: 'frequency', uidt: 'Decimal', default: '0' },
          { column_name: 'results', title: 'results', uidt: 'Number', default: '0' },
          { column_name: 'cost_per_result', title: 'cost_per_result', uidt: 'Decimal', default: '0' },
          { column_name: 'ctr', title: 'ctr', uidt: 'Decimal', default: '0' },
          { column_name: 'cpm', title: 'cpm', uidt: 'Decimal', default: '0' },
          { column_name: 'cpc', title: 'cpc', uidt: 'Decimal', default: '0' },
          { column_name: 'issues_info', title: 'issues_info', uidt: 'LongText' },
        ]
      },
      {
        name: 'weekly_insights',
        title: 'Weekly Insights',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText' },
          { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText' },
          { column_name: 'ad_id', title: 'ad_id', uidt: 'SingleLineText' },
          { column_name: 'level', title: 'level', uidt: 'SingleLineText', rqd: true },
          { column_name: 'name', title: 'name', uidt: 'SingleLineText', rqd: true },
          { column_name: 'week_start', title: 'week_start', uidt: 'Date', rqd: true },
          { column_name: 'week_end', title: 'week_end', uidt: 'Date', rqd: true },
          { column_name: 'year', title: 'year', uidt: 'Number', rqd: true },
          { column_name: 'week_number', title: 'week_number', uidt: 'Number', rqd: true },
          { column_name: 'objective', title: 'objective', uidt: 'SingleLineText' },
          { column_name: 'total_spend', title: 'total_spend', uidt: 'Decimal', default: '0' },
          { column_name: 'total_impressions', title: 'total_impressions', uidt: 'Number', default: '0' },
          { column_name: 'total_clicks', title: 'total_clicks', uidt: 'Number', default: '0' },
          { column_name: 'total_results', title: 'total_results', uidt: 'Number', default: '0' },
          { column_name: 'total_reach', title: 'total_reach', uidt: 'Number', default: '0' },
          { column_name: 'avg_cost_per_result', title: 'avg_cost_per_result', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_ctr', title: 'avg_ctr', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_cpm', title: 'avg_cpm', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_cpc', title: 'avg_cpc', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_frequency', title: 'avg_frequency', uidt: 'Decimal', default: '0' },
          { column_name: 'days_active', title: 'days_active', uidt: 'Number', default: '0' },
          { column_name: 'aggregated_at', title: 'aggregated_at', uidt: 'DateTime' },
        ]
      },
      {
        name: 'monthly_insights',
        title: 'Monthly Insights',
        columns: [
          { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
          { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
          { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
          { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText' },
          { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText' },
          { column_name: 'ad_id', title: 'ad_id', uidt: 'SingleLineText' },
          { column_name: 'level', title: 'level', uidt: 'SingleLineText', rqd: true },
          { column_name: 'name', title: 'name', uidt: 'SingleLineText', rqd: true },
          { column_name: 'month_start', title: 'month_start', uidt: 'Date', rqd: true },
          { column_name: 'month_end', title: 'month_end', uidt: 'Date', rqd: true },
          { column_name: 'year', title: 'year', uidt: 'Number', rqd: true },
          { column_name: 'month_number', title: 'month_number', uidt: 'Number', rqd: true },
          { column_name: 'objective', title: 'objective', uidt: 'SingleLineText' },
          { column_name: 'total_spend', title: 'total_spend', uidt: 'Decimal', default: '0' },
          { column_name: 'total_impressions', title: 'total_impressions', uidt: 'Number', default: '0' },
          { column_name: 'total_clicks', title: 'total_clicks', uidt: 'Number', default: '0' },
          { column_name: 'total_results', title: 'total_results', uidt: 'Number', default: '0' },
          { column_name: 'total_reach', title: 'total_reach', uidt: 'Number', default: '0' },
          { column_name: 'avg_cost_per_result', title: 'avg_cost_per_result', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_ctr', title: 'avg_ctr', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_cpm', title: 'avg_cpm', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_cpc', title: 'avg_cpc', uidt: 'Decimal', default: '0' },
          { column_name: 'avg_frequency', title: 'avg_frequency', uidt: 'Decimal', default: '0' },
          { column_name: 'days_active', title: 'days_active', uidt: 'Number', default: '0' },
          { column_name: 'aggregated_at', title: 'aggregated_at', uidt: 'DateTime' },
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
        console.log(`🔗 Update config.ts with: ${tableConfig.name.toUpperCase()}: '${result.id}'`);
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
        message: 'Insights tables creation process completed',
        results: results,
        note: 'Remember to update src/services/nocodb/config.ts with the new table IDs'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in create-insights-tables function:', error);
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
