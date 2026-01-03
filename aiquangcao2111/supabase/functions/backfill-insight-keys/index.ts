import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_CONFIG = {
  API_URL: 'https://db.hpb.edu.vn/api/v2/tables',
  TOKEN: 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij',
  TABLE_ID: 'm5r2r47jw900rnx', // ✅ facebook_insights (main table)
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting insight_key backfill...');

    // Step 1: Fetch all records without insight_key or empty insight_key
    // NocoDB where syntax: (field,operator,value)
    const getUrl = `${NOCODB_CONFIG.API_URL}/${NOCODB_CONFIG.TABLE_ID}/records?limit=10000`;

    console.log('📥 Fetching records without insight_key...');
    const getRes = await fetch(getUrl, {
      headers: { 'xc-token': NOCODB_CONFIG.TOKEN },
    });

    if (!getRes.ok) {
      throw new Error(`Failed to fetch records: ${getRes.status}`);
    }

    const { list } = await getRes.json();
    console.log(`📊 Total records fetched: ${list.length}`);

    // Filter only records without insight_key
    const recordsToUpdate = list.filter((r: any) => !r.insight_key || r.insight_key === '');
    console.log(`📊 Records needing backfill: ${recordsToUpdate.length}`);

    if (recordsToUpdate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No records need backfill',
          updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Update each record with insight_key
    let updated = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const record of recordsToUpdate) {
      try {
        const insight_key = [
          record.user_id || '',
          record.account_id || '',
          (record.campaign_id || '').toString().toLowerCase(),
          (record.adset_id || '').toString().toLowerCase(),
          (record.ad_id || '').toString().toLowerCase(),
          (record.date_start || '').split('T')[0], // YYYY-MM-DD
        ].join('|');

        const recordId = record.Id || record.id;
        const updateUrl = `${NOCODB_CONFIG.API_URL}/${NOCODB_CONFIG.TABLE_ID}/records`;

        const updateRes = await fetch(updateUrl, {
          method: 'PATCH',
          headers: {
            'xc-token': NOCODB_CONFIG.TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([{
            Id: recordId,
            insight_key
          }]),
        });

        if (updateRes.ok) {
          updated++;
          if (updated % 100 === 0) {
            console.log(`✅ Updated ${updated}/${recordsToUpdate.length} records...`);
          }
        } else {
          failed++;
          const errorText = await updateRes.text();
          errors.push({
            record_id: recordId,
            error: `${updateRes.status}: ${errorText}`,
          });
        }
      } catch (error) {
        failed++;
        errors.push({
          record_id: record.Id || record.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('🎉 Backfill completed:', { updated, failed });

    return new Response(
      JSON.stringify({
        success: true,
        total_fetched: list.length,
        records_needing_backfill: recordsToUpdate.length,
        updated,
        failed,
        errors: errors.slice(0, 10), // First 10 errors only
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
