import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    console.log('Starting add-cost-per-action-columns function...');

    const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
    const NOCODB_API_TOKEN = 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';
    const TABLE_ID = 'm5r2r47jw900rnx'; // facebook_insights table

    const headers = {
      'xc-token': NOCODB_API_TOKEN,
      'Content-Type': 'application/json',
    };

    // Define all cost_per_action columns to add (UI-standardized names)
    const columnsToAdd = [
      // Original 11 columns (keep for backward compatibility)
      { column_name: 'cost_per_started_7d', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_replied_7d', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_first_reply', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_messaging_connection', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_depth_2_message', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_depth_3_message', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_welcome_message_view', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_link_click', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_video_view', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_post_engagement', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_page_engagement', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },

      // Additional 6 columns with UI-standardized names
      { column_name: 'cost_per_total_messaging_connection', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_messaging_welcome_message_view', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_post_interaction_gross', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_messaging_first_reply', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_post_reaction', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
      { column_name: 'cost_per_messaging_user_depth_2', uidt: 'Decimal', dt: 'decimal', dtxp: '10,2' },
    ];

    const results = [];

    for (const column of columnsToAdd) {
      try {
        console.log(`Adding column: ${column.column_name}...`);

        const response = await fetch(
          `${NOCODB_BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(column),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          // Check if column already exists (idempotent)
          if (errorText.includes('already exists') || errorText.includes('duplicate')) {
            console.log(`Column ${column.column_name} already exists, skipping...`);
            results.push({ column: column.column_name, status: 'skipped', message: 'Already exists' });
          } else {
            console.error(`Failed to add column ${column.column_name}:`, errorText);
            results.push({ column: column.column_name, status: 'failed', error: errorText });
          }
        } else {
          const data = await response.json();
          console.log(`Successfully added column: ${column.column_name}`);
          results.push({ column: column.column_name, status: 'success', data });
        }
      } catch (error) {
        console.error(`Error adding column ${column.column_name}:`, error);
        results.push({ column: column.column_name, status: 'error', error: (error as Error).message });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cost per action columns addition completed',
        results,
        totalColumns: columnsToAdd.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status !== 'success').length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in add-cost-per-action-columns:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
