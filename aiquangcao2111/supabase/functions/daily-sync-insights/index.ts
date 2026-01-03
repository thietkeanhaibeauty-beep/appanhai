import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('[INFO] 🕐 Daily sync job started');

    // Get today's date
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Check if sync already ran today
    const { data: existingSync } = await supabase
      .from('daily_sync_log')
      .select('*')
      .eq('sync_date', today)
      .single();

    if (existingSync && existingSync.status === 'completed') {
      console.log('[INFO] ✅ Sync already completed for today');
      return new Response(
        JSON.stringify({ message: 'Sync already completed for today', date: today }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update sync log entry
    const { error: logError } = await supabase
      .from('daily_sync_log')
      .upsert({
        sync_date: today,
        started_at: new Date().toISOString(),
        status: 'running',
      }, {
        onConflict: 'sync_date'
      });

    if (logError) {
      console.error('[ERROR] Failed to create sync log:', logError);
    }

    // Get all active ad accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('facebook_ad_accounts')
      .select('*')
      .eq('is_active', true);

    if (accountsError) {
      throw new Error(`Failed to fetch ad accounts: ${accountsError.message}`);
    }

    if (!accounts || accounts.length === 0) {
      console.log('[WARN] No active ad accounts found');
      await supabase
        .from('daily_sync_log')
        .update({
          completed_at: new Date().toISOString(),
          status: 'completed',
          insights_count: 0,
        })
        .eq('sync_date', today);

      return new Response(
        JSON.stringify({ message: 'No active ad accounts to sync' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[INFO] Found ${accounts.length} active ad account(s)`);

    // Calculate yesterday's date once
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    let totalInsights = 0;
    const errors: string[] = [];

    // Sync each account
    for (const account of accounts) {
      try {
        console.log(`[INFO] Syncing account: ${account.account_name} (${account.account_id})`);

        // Call sync-fb-insights function
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-fb-insights', {
          body: {
            accountId: account.account_id,
            accessToken: account.access_token,
            since: dateStr,
            until: dateStr,
            userId: 'system-daily-sync',
          },
        });

        if (syncError) {
          const errorMsg = `Failed to sync ${account.account_name}: ${syncError.message}`;
          console.error(`[ERROR] ${errorMsg}`);
          errors.push(errorMsg);
          continue;
        }

        // Update sync_date for newly synced insights
        const insightCount = syncData?.totalInsights || 0;
        if (insightCount > 0) {
          await supabase
            .from('facebook_insights')
            .update({ sync_date: today })
            .eq('user_id', 'system-daily-sync')
            .eq('date_start', dateStr);
        }

        totalInsights += insightCount;
        console.log(`[SUCCESS] ✅ Synced ${insightCount} insights for ${account.account_name}`);

      } catch (error) {
        const errorMsg = `Error syncing ${account.account_name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`[ERROR] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Aggregate monthly data if it's the last day of the month
    const isLastDayOfMonth = yesterday.getDate() === new Date(yesterday.getFullYear(), yesterday.getMonth() + 1, 0).getDate();
    
    if (isLastDayOfMonth) {
      console.log('[INFO] 📊 Last day of month - triggering monthly aggregation');
      const year = yesterday.getFullYear();
      const month = yesterday.getMonth() + 1;

      // Get unique users from synced data
      const { data: insights } = await supabase
        .from('facebook_insights')
        .select('user_id')
        .eq('sync_date', today);

      const uniqueUsers = [...new Set(insights?.map(i => i.user_id) || [])];
      console.log(`[INFO] Found ${uniqueUsers.length} users to aggregate`);

      for (const userId of uniqueUsers) {
        try {
          const { error: aggError } = await supabase.rpc('aggregate_monthly_insights', {
            p_user_id: userId,
            p_year: year,
            p_month: month,
          });
          
          if (aggError) {
            console.error(`[ERROR] Error aggregating for user ${userId}:`, aggError);
          } else {
            console.log(`[SUCCESS] ✅ Aggregated monthly data for user ${userId}`);
          }
        } catch (aggError: any) {
          console.error(`[ERROR] Error aggregating for user ${userId}:`, aggError);
        }
      }
    }

    // Refresh summary materialized view
    try {
      await supabase.rpc('refresh_insights_summary');
      console.log('[SUCCESS] ✅ Refreshed summary view');
    } catch (refreshError: any) {
      console.error('[ERROR] Error refreshing summary:', refreshError);
      errors.push(`Refresh summary error: ${refreshError.message}`);
    }

    // Update sync log with results
    await supabase
      .from('daily_sync_log')
      .update({
        completed_at: new Date().toISOString(),
        status: errors.length > 0 ? 'failed' : 'completed',
        insights_count: totalInsights,
        error_message: errors.length > 0 ? errors.join('; ') : null,
      })
      .eq('sync_date', today);

    console.log(`[INFO] ✅ Daily sync completed: ${totalInsights} insights, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        totalInsights,
        accountsProcessed: accounts.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ERROR] Fatal error in daily sync:', error);
    
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('daily_sync_log')
      .update({
        completed_at: new Date().toISOString(),
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('sync_date', today);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
