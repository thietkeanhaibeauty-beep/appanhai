import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, accountId, dayStart } = await req.json();

    if (!userId || !accountId || !dayStart) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, accountId, dayStart' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📊 Aggregating daily insights', { userId, accountId, dayStart });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const nocodbToken = Deno.env.get('NOCODB_TOKEN') || 'u_Xjxcxs5Wcian3t0mznhXh5H1Ad_eIstADtTyij';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const dayDate = new Date(dayStart);
    const dayEnd = new Date(dayDate.getTime() + 86400000).toISOString().split('T')[0];

    console.log('🔍 Fetching raw data from NocoDB', { dayStart, dayEnd });

    const whereClause = encodeURIComponent(
      `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(date_start,gte,${dayStart})~and(date_start,lt,${dayEnd})`
    );

    const nocodbUrl = `https://db.hpb.edu.vn/api/v2/tables/m5r2r47jw900rnx/records?where=${whereClause}&limit=10000`;

    const nocodbResponse = await fetch(nocodbUrl, {
      headers: { 'xc-token': nocodbToken }
    });

    if (!nocodbResponse.ok) {
      throw new Error(`NocoDB API error: ${nocodbResponse.status}`);
    }

    const rawData = await nocodbResponse.json();
    const records: NocoDBInsight[] = rawData.list || [];

    console.log(`✅ Fetched ${records.length} raw records from NocoDB`);

    if (records.length === 0) {
      console.log('⚠️ No data found for this day');
      return new Response(
        JSON.stringify({ success: true, aggregated: 0, message: 'No data for this day' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aggregated = aggregateByLevel(records);

    console.log(`📈 Aggregated into ${aggregated.length} records`);

    let upsertedCount = 0;
    for (const record of aggregated) {
      const { error } = await supabase.from('daily_insights').upsert({
        user_id: userId,
        account_id: accountId,
        campaign_id: record.campaign_id,
        adset_id: record.adset_id,
        ad_id: record.ad_id,
        level: record.level,
        name: record.name,
        day_start: dayStart,
        day_end: dayEnd,
        year: dayDate.getFullYear(),
        month: dayDate.getMonth() + 1,
        day: dayDate.getDate(),
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
      }, {
        onConflict: 'user_id,account_id,campaign_id,adset_id,ad_id,day_start',
        ignoreDuplicates: false
      });

      if (error) {
        console.error('❌ Upsert error:', error);
      } else {
        upsertedCount++;
      }
    }

    console.log(`✅ Upserted ${upsertedCount}/${aggregated.length} records to Supabase`);

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
