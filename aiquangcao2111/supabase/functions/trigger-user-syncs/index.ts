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

  try {


    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current timestamp
    const now = new Date();


    // Fetch all users with auto_sync_enabled = true from NocoDB
    const nocodbSettingsUrl = 'https://db.hpb.edu.vn/api/v2/tables/mcgp6vh9lh19zhc/records';
    const nocodbToken = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

    const settingsResponse = await fetch(
      `${nocodbSettingsUrl}?where=(auto_sync_enabled,eq,1)&limit=1000`,
      {
        headers: {
          'xc-token': nocodbToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!settingsResponse.ok) {
      console.error('❌ Error fetching sync settings from NocoDB:', settingsResponse.statusText);
      throw new Error('Failed to fetch sync settings');
    }

    const settingsData = await settingsResponse.json();
    const syncSettings = settingsData.list || [];

    if (!syncSettings || syncSettings.length === 0) {

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No users with auto-sync enabled',
          synced: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }



    const syncResults = [];
    let syncedCount = 0;
    let skippedCount = 0;

    // Process each user
    for (const setting of syncSettings) {
      const { user_id, sync_interval_seconds, last_sync_at } = setting;

      // Check if enough time has passed since last sync
      let shouldSync = true;
      if (last_sync_at) {
        const lastSyncTime = new Date(last_sync_at);
        const secondsSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / 1000;
        shouldSync = secondsSinceLastSync >= sync_interval_seconds;

        if (!shouldSync) {

          skippedCount++;
          continue;
        }
      }



      try {
        // Get user's active ad account from NocoDB
        // ✅ Updated to use correct Facebook Ad Accounts table ID (m85j7noglexpeh3)
        const nocodbAccountsUrl = 'https://db.hpb.edu.vn/api/v2/tables/m85j7noglexpeh3/records';
        const nocodbAccountsToken = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

        const accountsResponse = await fetch(
          `${nocodbAccountsUrl}?where=(user_id,eq,${user_id})~and(is_active,eq,true)`,
          {
            headers: {
              'xc-token': nocodbAccountsToken,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!accountsResponse.ok) {
          console.error(`❌ Failed to fetch ad accounts for user ${user_id}`);
          continue;
        }

        const accountsData = await accountsResponse.json();
        const accounts = accountsData.list || [];

        if (accounts.length === 0) {

          continue;
        }

        const activeAccount = accounts[0];


        // Call sync-fb-insights for today's data
        // ✅ FIX: Use Vietnam Time (UTC+7) for "today"
        // If we use UTC, "today" might be "yesterday" in Vietnam during early morning (00:00 - 07:00)
        const nowUTC = new Date();
        const vietnamTime = new Date(nowUTC.getTime() + 7 * 60 * 60 * 1000);
        const today = vietnamTime.toISOString().split('T')[0];

        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-fb-insights', {
          body: {
            accountId: activeAccount.account_id.replace('act_', ''),
            accessToken: activeAccount.access_token,
            since: today,
            until: today,
          },
        });

        if (syncError) {
          console.error(`❌ Sync error for user ${user_id}:`, syncError);
          syncResults.push({
            user_id,
            success: false,
            error: syncError.message,
          });
          continue;
        }

        // Update last_sync_at timestamp in NocoDB
        const recordId = setting.Id;
        const updateResponse = await fetch(
          `${nocodbSettingsUrl}/${recordId}`,
          {
            method: 'PATCH',
            headers: {
              'xc-token': nocodbToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              last_sync_at: now.toISOString(),
            }),
          }
        );

        if (!updateResponse.ok) {
          console.error(`⚠️ Failed to update last_sync_at for user ${user_id}:`, updateResponse.statusText);
        }

        syncedCount++;
        syncResults.push({
          user_id,
          success: true,
          insights_count: syncData?.totalSynced || 0,
        });


      } catch (error) {
        console.error(`❌ Error syncing user ${user_id}:`, error);
        syncResults.push({
          user_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }



    return new Response(
      JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        total: syncSettings.length,
        results: syncResults,
        timestamp: now.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Fatal error in trigger-user-syncs:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
