// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = Deno.env.get('NOCODB_API_URL') || 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';
const TABLE_ID = 'm4lohjtes32lbau'; // campaign_label_assignments

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔧 Starting to add entity columns to campaign_label_assignments...');

    const headers = {
      'xc-token': NOCODB_TOKEN,
      'Content-Type': 'application/json',
    };

    // Add adset_id column
    console.log('📝 Adding adset_id column...');
    const adsetResponse = await fetch(
      `${NOCODB_BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          column_name: 'adset_id',
          title: 'adset_id',
          uidt: 'SingleLineText',
          dt: 'text',
          dtxp: null,
          dtxs: null,
          pk: false,
          pv: false,
          rqd: false,
          un: false,
          ai: false,
          cdf: null,
          unique: false,
        }),
      }
    );

    const adsetResult = await adsetResponse.json();
    console.log('adset_id response:', adsetResult);

    if (!adsetResponse.ok) {
      // Check if column already exists
      if (adsetResult.msg && adsetResult.msg.includes('already exists')) {
        console.log('⚠️ adset_id column already exists');
      } else {
        throw new Error(`Failed to add adset_id: ${JSON.stringify(adsetResult)}`);
      }
    } else {
      console.log('✅ adset_id column added successfully');
    }

    // Add ad_id column
    console.log('📝 Adding ad_id column...');
    const adResponse = await fetch(
      `${NOCODB_BASE_URL}/api/v2/meta/tables/${TABLE_ID}/columns`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          column_name: 'ad_id',
          title: 'ad_id',
          uidt: 'SingleLineText',
          dt: 'text',
          dtxp: null,
          dtxs: null,
          pk: false,
          pv: false,
          rqd: false,
          un: false,
          ai: false,
          cdf: null,
          unique: false,
        }),
      }
    );

    const adResult = await adResponse.json();
    console.log('ad_id response:', adResult);

    if (!adResponse.ok) {
      // Check if column already exists
      if (adResult.msg && adResult.msg.includes('already exists')) {
        console.log('⚠️ ad_id column already exists');
      } else {
        throw new Error(`Failed to add ad_id: ${JSON.stringify(adResult)}`);
      }
    } else {
      console.log('✅ ad_id column added successfully');
    }

    console.log('🎉 Columns added successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Successfully added adset_id and ad_id columns',
        details: {
          adset_id: adsetResult,
          ad_id: adResult,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error adding columns:', error);
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
