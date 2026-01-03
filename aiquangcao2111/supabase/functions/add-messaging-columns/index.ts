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
    const TABLE_ID = 'mrsalktizp1cfnp'; // facebook_insights table ID

    console.log('🚀 Adding messaging columns to facebook_insights table...');

    // Step 1: Add results_messaging_replied_7d column
    const column1Config = {
      column_name: 'results_messaging_replied_7d',
      title: 'results_messaging_replied_7d',
      uidt: 'Number',
      dt: 'integer',
      dtxp: null,
      default: 0,
      rqd: false,
    };

    console.log('📋 Adding column: results_messaging_replied_7d...');

    const response1 = await fetch(
      `${NOCODB_BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`,
      {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(column1Config)
      }
    );

    const responseText1 = await response1.text();
    console.log(`Response 1 status:`, response1.status);
    console.log(`Response 1 body:`, responseText1);

    if (!response1.ok) {
      throw new Error(`Failed to add column 1: ${response1.status} ${responseText1}`);
    }

    // Step 2: Add cost_per_messaging_replied_7d column
    const column2Config = {
      column_name: 'cost_per_messaging_replied_7d',
      title: 'cost_per_messaging_replied_7d',
      uidt: 'Decimal',
      dt: 'decimal',
      dtxp: '10,2',
      default: 0,
      rqd: false,
    };

    console.log('📋 Adding column: cost_per_messaging_replied_7d...');

    const response2 = await fetch(
      `${NOCODB_BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`,
      {
        method: 'POST',
        headers: {
          'xc-token': NOCODB_API_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(column2Config)
      }
    );

    const responseText2 = await response2.text();
    console.log(`Response 2 status:`, response2.status);
    console.log(`Response 2 body:`, responseText2);

    if (!response2.ok) {
      throw new Error(`Failed to add column 2: ${response2.status} ${responseText2}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '✅ Added 2 messaging columns: results_messaging_replied_7d (Integer) and cost_per_messaging_replied_7d (Decimal)',
        columns_added: [
          'results_messaging_replied_7d',
          'cost_per_messaging_replied_7d'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error adding messaging columns:', error);
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
