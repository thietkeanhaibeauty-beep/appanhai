import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Cron job to expire old subscriptions
 * Should be run daily via pg_cron
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log('🔍 Checking for expired subscriptions...');

    const now = new Date().toISOString();

    // Find all active/trial subscriptions that have passed end_date
    const { data: expiredSubs, error: fetchError } = await supabaseClient
      .from('user_subscriptions')
      .select('*')
      .in('status', ['active', 'trial'])
      .lt('end_date', now);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredSubs || expiredSubs.length === 0) {
      console.log('✅ No expired subscriptions found');
      return new Response(
        JSON.stringify({
          success: true,
          expired: 0,
          message: 'No expired subscriptions found',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`⚠️ Found ${expiredSubs.length} expired subscriptions`);

    // Update each to expired status
    const expiredIds = expiredSubs.map(sub => sub.id);
    const { error: updateError } = await supabaseClient
      .from('user_subscriptions')
      .update({ status: 'expired' })
      .in('id', expiredIds);

    if (updateError) {
      throw updateError;
    }

    // Sync to NocoDB
    for (const sub of expiredSubs) {
      try {
        const nocodbResponse = await fetch(
          `${Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn'}/api/v2/tables/${Deno.env.get('NOCODB_USER_SUBSCRIPTIONS_TABLE') || 'm1i0c7r17slnb5g'}/records`,
          {
            method: 'GET',
            headers: {
              'xc-token': Deno.env.get('NOCODB_API_TOKEN') || '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
              'Content-Type': 'application/json',
            },
          }
        );

        if (nocodbResponse.ok) {
          const data = await nocodbResponse.json();
          const nocodbRecord = data.list?.find((r: any) => r.user_id === sub.user_id);

          if (nocodbRecord) {
            await fetch(
              `${Deno.env.get('NOCODB_BASE_URL') || 'https://db.hpb.edu.vn'}/api/v2/tables/${Deno.env.get('NOCODB_USER_SUBSCRIPTIONS_TABLE') || 'm1i0c7r17slnb5g'}/records/${nocodbRecord.Id}`,
              {
                method: 'PATCH',
                headers: {
                  'xc-token': Deno.env.get('NOCODB_API_TOKEN') || '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'expired' }),
              }
            );
          }
        }
      } catch (nocodbError) {
        console.warn('⚠️ NocoDB sync error (non-critical):', nocodbError);
      }
    }

    console.log(`✅ Expired ${expiredSubs.length} subscriptions`);

    return new Response(
      JSON.stringify({
        success: true,
        expired: expiredSubs.length,
        message: `Expired ${expiredSubs.length} subscriptions`,
        subscriptions: expiredSubs.map(s => ({
          user_id: s.user_id,
          package_id: s.package_id,
          end_date: s.end_date,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error expiring subscriptions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
