import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NocoDBInsight {
  user_id: string;
  account_id: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  level: 'campaign' | 'adset' | 'ad';
  spend: string;
  impressions: string;
  clicks: string;
  results: string;
  reach: string;
  objective?: string;
  date_start: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, accountId, hourStart } = await req.json();

    if (!userId || !accountId || !hourStart) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, accountId, hourStart' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Aggregating hourly insights', { userId, accountId, hourStart });

    const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
    const NOCODB_TOKEN = Deno.env.get('NOCODB_TOKEN') || 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';
    const FACEBOOK_INSIGHTS_TABLE_ID = 'm5r2r47jw900rnx';
    const TODAY_INSIGHTS_TABLE_ID = Deno.env.get('TODAY_INSIGHTS_TABLE_ID') || 'PLACEHOLDER';

    // Calculate hour_end
    const hourEnd = new Date(new Date(hourStart).getTime() + 3600000).toISOString();
    const hourDate = new Date(hourStart);
    const dateOnly = hourStart.split('T')[0];

    console.log('🔍 Fetching raw data from NocoDB', { hourStart, hourEnd });

    // Fetch raw data from NocoDB facebook_insights
    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,gte,${hourStart})~and(date_start,lt,${hourEnd})`
    );

    const nocodbUrl = `${NOCODB_BASE_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_TABLE_ID}/records?where=${whereClause}&limit=5000`;

    const nocodbResponse = await fetch(nocodbUrl, {
      headers: { 'xc-token': NOCODB_TOKEN }
    });

    if (!nocodbResponse.ok) {
      throw new Error(`NocoDB API error: ${nocodbResponse.status}`);
    }

    const rawData = await nocodbResponse.json();
    const records: NocoDBInsight[] = rawData.list || [];

    console.log(`✅ Fetched ${records.length} raw records from NocoDB`);

    if (records.length === 0) {
      console.log('⚠️ No data found for this hour');
      return new Response(
        JSON.stringify({ success: true, aggregated: 0, message: 'No data for this hour' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate by level (campaign, adset, ad)
    const aggregated = aggregateByLevel(records);

    console.log(`📈 Aggregated into ${aggregated.length} records`);

    // UPSERT into NocoDB today_insights
    let upsertedCount = 0;
    for (const record of aggregated) {
      // Check if record exists
      const checkWhere = encodeURIComponent(
        `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(campaign_id,eq,${record.campaign_id || ''})~and(adset_id,eq,${record.adset_id || ''})~and(ad_id,eq,${record.ad_id || ''})~and(hour_start,eq,${hourStart})`
      );

      const checkUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TODAY_INSIGHTS_TABLE_ID}/records?where=${checkWhere}&limit=1`;
      const checkResponse = await fetch(checkUrl, {
        headers: { 'xc-token': NOCODB_TOKEN }
      });

      const existingData = await checkResponse.json();
      const existing = existingData.list || [];

      const payload = {
        user_id: userId,
        account_id: accountId,
        campaign_id: record.campaign_id || null,
        adset_id: record.adset_id || null,
        ad_id: record.ad_id || null,
        level: record.level,
        name: record.name,
        hour_start: hourStart,
        hour_end: hourEnd,
        date: dateOnly,
        hour: hourDate.getHours(),
        total_spend: record.total_spend,
        total_impressions: record.total_impressions,
        total_clicks: record.total_clicks,
        total_results: record.total_results,
        total_reach: record.total_reach,
        avg_cost_per_result: record.avg_cost_per_result,
        avg_ctr: record.avg_ctr,
        avg_cpm: record.avg_cpm,
        avg_cpc: record.avg_cpc,
        objective: record.objective,
        aggregated_at: new Date().toISOString(),
      };

      try {
        if (existing.length > 0) {
          // UPDATE
          const updateUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TODAY_INSIGHTS_TABLE_ID}/records`;
          await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'xc-token': NOCODB_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              Id: existing[0].Id,
              ...payload
            })
          });
        } else {
          // INSERT
          const insertUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TODAY_INSIGHTS_TABLE_ID}/records`;
          await fetch(insertUrl, {
            method: 'POST',
            headers: {
              'xc-token': NOCODB_TOKEN,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        }
        upsertedCount++;
      } catch (error) {
        console.error('❌ Upsert error:', error);
      }
    }

    console.log(`✅ Upserted ${upsertedCount}/${aggregated.length} records to NocoDB`);

    return new Response(
      JSON.stringify({ success: true, aggregated: upsertedCount }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Aggregation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function aggregateByLevel(records: NocoDBInsight[]) {
  const grouped = new Map<string, any>();

  for (const record of records) {
    const key = `${record.campaign_id || ''}|${record.adset_id || ''}|${record.ad_id || ''}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        campaign_id: record.campaign_id || null,
        adset_id: record.adset_id || null,
        ad_id: record.ad_id || null,
        level: record.level,
        name: record.campaign_name || record.adset_name || record.ad_name || 'Unknown',
        objective: record.objective,
        total_spend: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_results: 0,
        total_reach: 0,
      });
    }

    const agg = grouped.get(key);
    agg.total_spend += parseFloat(record.spend || '0');
    agg.total_impressions += parseInt(record.impressions || '0');
    agg.total_clicks += parseInt(record.clicks || '0');
    agg.total_results += parseInt(record.results || '0');
    agg.total_reach += parseInt(record.reach || '0');
  }

  return Array.from(grouped.values()).map(agg => ({
    ...agg,
    avg_cost_per_result: agg.total_results > 0 ? agg.total_spend / agg.total_results : null,
    avg_ctr: agg.total_impressions > 0 ? agg.total_clicks / agg.total_impressions : null,
    avg_cpm: agg.total_impressions > 0 ? (agg.total_spend / agg.total_impressions) * 1000 : null,
    avg_cpc: agg.total_clicks > 0 ? agg.total_spend / agg.total_clicks : null,
  }));
}
