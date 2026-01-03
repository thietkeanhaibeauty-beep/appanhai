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

    console.log('🚀 Creating facebook_insights table in NocoDB...');

    const tableConfig = {
      table_name: 'facebook_insights_v2',
      title: 'Facebook Insights V2',
      columns: [
        { column_name: 'Id', title: 'Id', uidt: 'ID', pk: true, ai: true },
        { column_name: 'CreatedAt', title: 'CreatedAt', uidt: 'DateTime', default: 'now()' },
        { column_name: 'UpdatedAt', title: 'UpdatedAt', uidt: 'DateTime', default: 'now()' },

        // Identifiers
        { column_name: 'user_id', title: 'user_id', uidt: 'SingleLineText', rqd: true },
        { column_name: 'account_id', title: 'account_id', uidt: 'SingleLineText', rqd: true },
        { column_name: 'account_name', title: 'account_name', uidt: 'SingleLineText' },
        { column_name: 'campaign_id', title: 'campaign_id', uidt: 'SingleLineText' },
        { column_name: 'campaign_name', title: 'campaign_name', uidt: 'SingleLineText' },
        { column_name: 'adset_id', title: 'adset_id', uidt: 'SingleLineText' },
        { column_name: 'adset_name', title: 'adset_name', uidt: 'SingleLineText' },
        { column_name: 'ad_id', title: 'ad_id', uidt: 'SingleLineText' },
        { column_name: 'ad_name', title: 'ad_name', uidt: 'SingleLineText' },

        // Level indicator - CRITICAL
        { column_name: 'level', title: 'level', uidt: 'SingleLineText' },

        // Dates
        { column_name: 'date_start', title: 'date_start', uidt: 'Date' },
        { column_name: 'date_stop', title: 'date_stop', uidt: 'Date' },
        { column_name: 'sync_date', title: 'sync_date', uidt: 'Date' },

        // Core Metrics (Numbers)
        { column_name: 'spend', title: 'spend', uidt: 'Number' },
        { column_name: 'impressions', title: 'impressions', uidt: 'Number' },
        { column_name: 'clicks', title: 'clicks', uidt: 'Number' },
        { column_name: 'reach', title: 'reach', uidt: 'Number' },
        { column_name: 'frequency', title: 'frequency', uidt: 'Number' },
        { column_name: 'ctr', title: 'ctr', uidt: 'Number' },
        { column_name: 'cpc', title: 'cpc', uidt: 'Number' },
        { column_name: 'cpm', title: 'cpm', uidt: 'Number' },
        { column_name: 'cpp', title: 'cpp', uidt: 'Number' },
        { column_name: 'cost_per_unique_click', title: 'cost_per_unique_click', uidt: 'Number' },

        // Results
        { column_name: 'results', title: 'results', uidt: 'Number' },
        { column_name: 'cost_per_result', title: 'cost_per_result', uidt: 'Number' },
        { column_name: 'result_label', title: 'result_label', uidt: 'SingleLineText' },
        { column_name: 'action_type_used', title: 'action_type_used', uidt: 'SingleLineText' },

        // Status
        { column_name: 'status', title: 'status', uidt: 'SingleLineText' },
        { column_name: 'effective_status', title: 'effective_status', uidt: 'SingleLineText' },
        { column_name: 'budget', title: 'budget', uidt: 'Number' },
        { column_name: 'objective', title: 'objective', uidt: 'SingleLineText' },

        // JSON fields
        { column_name: 'actions', title: 'actions', uidt: 'LongText' },
        { column_name: 'action_values', title: 'action_values', uidt: 'LongText' },
        { column_name: 'cost_per_action_type', title: 'cost_per_action_type', uidt: 'LongText' },

        // Video metrics
        { column_name: 'video_p25_watched_actions', title: 'video_p25_watched_actions', uidt: 'LongText' },
        { column_name: 'video_p50_watched_actions', title: 'video_p50_watched_actions', uidt: 'LongText' },
        { column_name: 'video_p75_watched_actions', title: 'video_p75_watched_actions', uidt: 'LongText' },
        { column_name: 'video_p100_watched_actions', title: 'video_p100_watched_actions', uidt: 'LongText' },
        { column_name: 'video_play_actions', title: 'video_play_actions', uidt: 'LongText' },
        { column_name: 'cost_per_thruplay', title: 'cost_per_thruplay', uidt: 'Number' },

        // Rankings
        { column_name: 'quality_ranking', title: 'quality_ranking', uidt: 'SingleLineText' },
        { column_name: 'engagement_rate_ranking', title: 'engagement_rate_ranking', uidt: 'SingleLineText' },
        { column_name: 'conversion_rate_ranking', title: 'conversion_rate_ranking', uidt: 'SingleLineText' },
        { column_name: 'purchase_roas', title: 'purchase_roas', uidt: 'LongText' },
      ]
    };

    console.log(`📋 Creating table: facebook_insights_v2...`);

    const response = await fetch(
      `${NOCODB_BASE_URL}/api/v2/meta/bases/${BASE_ID}/tables`,
      {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tableConfig)
      }
    );

    const responseText = await response.text();
    console.log(`Response status:`, response.status);
    console.log(`Response body:`, responseText);

    if (!response.ok) {
      throw new Error(`Failed to create table: ${response.status} ${responseText}`);
    }

    const result = JSON.parse(responseText);

    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ Created facebook_insights_v2 table with ID: ${result.id}`,
        table_id: result.id,
        table_name: 'facebook_insights_v2'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error creating facebook_insights table:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
