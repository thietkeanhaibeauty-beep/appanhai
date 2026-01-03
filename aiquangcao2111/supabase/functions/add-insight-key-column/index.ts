/**
 * Add insight_key column to NocoDB insights table
 * This column will be used as a unique constraint for upsert operations
 * Format: user_id|account_id|campaign_id|adset_id|ad_id|YYYY-MM-DD
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOCODB_URL = Deno.env.get('NOCODB_URL');
    const NOCODB_TOKEN = Deno.env.get('NOCODB_TOKEN');
    const NOCODB_PROJECT = Deno.env.get('NOCODB_PROJECT_ID');
    const NOCODB_TABLE = Deno.env.get('NOCODB_INSIGHTS_TABLE_ID');

    if (!NOCODB_URL || !NOCODB_TOKEN || !NOCODB_PROJECT || !NOCODB_TABLE) {
      throw new Error('Missing NocoDB configuration');
    }

    const headers = {
      'xc-token': NOCODB_TOKEN,
      'Content-Type': 'application/json',
    };

    console.log('Adding insight_key column to insights table...');

    // Get current table schema
    const tableUrl = `${NOCODB_URL}/api/v2/meta/tables/${NOCODB_TABLE}`;
    const tableRes = await fetch(tableUrl, { headers });

    if (!tableRes.ok) {
      throw new Error(`Failed to get table schema: ${tableRes.status}`);
    }

    const tableData = await tableRes.json();
    
    // Check if insight_key column already exists
    const hasInsightKey = tableData.columns?.some(
      (col: any) => col.column_name === 'insight_key'
    );

    if (hasInsightKey) {
      console.log('insight_key column already exists');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'insight_key column already exists',
          action: 'none',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add insight_key column
    const addColumnUrl = `${NOCODB_URL}/api/v2/meta/tables/${NOCODB_TABLE}/columns`;
    const columnPayload = {
      column_name: 'insight_key',
      title: 'Insight Key',
      uidt: 'SingleLineText', // Text column
      dt: 'varchar',
      dtxp: '255', // Length
      dtxs: '',
      un: false,
      unique: true, // UNIQUE constraint
      ai: false,
      pk: false,
      rqd: true, // Required
      cdf: null,
      system: false,
    };

    const addColumnRes = await fetch(addColumnUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(columnPayload),
    });

    if (!addColumnRes.ok) {
      const errorText = await addColumnRes.text();
      throw new Error(`Failed to add column: ${addColumnRes.status} - ${errorText}`);
    }

    console.log('✅ Successfully added insight_key column with UNIQUE constraint');

    // IMPORTANT: Create indexes manually in PostgreSQL for performance:
    // CREATE INDEX idx_insights_user_id ON insights(user_id);
    // CREATE INDEX idx_insights_date_start ON insights(date_start);
    // (NocoDB API doesn't support creating indexes directly)

    // Populate existing records with insight_key
    console.log('Populating existing records with insight_key...');
    
    // Import helpers
    const { buildInsightKey } = await import('../_shared/insightHelpers.ts');

    // Fetch all existing records (in batches)
    let offset = 0;
    const limit = 100;
    let updatedCount = 0;

    while (true) {
      const recordsUrl = `${NOCODB_URL}/api/v2/tables/${NOCODB_PROJECT}/${NOCODB_TABLE}/records?limit=${limit}&offset=${offset}`;
      const recordsRes = await fetch(recordsUrl, { headers });

      if (!recordsRes.ok) {
        console.error(`Failed to fetch records: ${recordsRes.status}`);
        break;
      }

      const recordsData = await recordsRes.json();
      const records = recordsData.list || [];

      if (records.length === 0) {
        break;
      }

      // Update each record with insight_key
      for (const record of records) {
        try {
          const insightKey = buildInsightKey({
            user_id: record.user_id,
            account_id: record.account_id,
            campaign_id: record.campaign_id,
            adset_id: record.adset_id,
            ad_id: record.ad_id,
            date_start: record.date_start,
          });

          const recordId = record.Id || record.id;
          const updateUrl = `${NOCODB_URL}/api/v2/tables/${NOCODB_PROJECT}/${NOCODB_TABLE}/records/${recordId}`;
          
          const updateRes = await fetch(updateUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ insight_key: insightKey }),
          });

          if (updateRes.ok) {
            updatedCount++;
          }
        } catch (error) {
          console.error('Error updating record:', error);
        }
      }

      offset += limit;
      console.log(`Updated ${updatedCount} records so far...`);
    }

    console.log(`✅ Populated ${updatedCount} existing records with insight_key`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'insight_key column added and existing records populated',
        action: 'created',
        recordsUpdated: updatedCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
