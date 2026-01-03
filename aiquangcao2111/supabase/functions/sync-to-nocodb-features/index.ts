import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

// New NocoDB table IDs from user
const NOCODB_TABLES = {
  FEATURE_FLAGS: 'mphouxrbh4hqaw8',
  ROLE_FEATURE_FLAGS: 'mzg5rbcu8slheho',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {


    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = {
      feature_flags: { synced: 0, errors: 0 },
      role_feature_flags: { synced: 0, errors: 0 },
    };

    // 1. Sync feature_flags

    const { data: featureFlags, error: ffError } = await supabase
      .from('feature_flags')
      .select('*')
      .order('id');

    if (ffError) {
      console.error('❌ Error fetching feature_flags:', ffError);
    } else if (featureFlags && featureFlags.length > 0) {


      for (const flag of featureFlags) {
        try {
          const nocoRecord = {
            key: flag.key,
            name: flag.name,
            description: flag.description || '',
            enabled: flag.enabled || false,
            category: flag.category || '',
          };

          const response = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${NOCODB_TABLES.FEATURE_FLAGS}/records`,
            {
              method: 'POST',
              headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(nocoRecord),
            }
          );

          if (response.ok) {
            results.feature_flags.synced++;

          } else {
            const errorText = await response.text();
            console.error(`❌ Failed to sync ${flag.key}:`, errorText);
            results.feature_flags.errors++;
          }
        } catch (error) {
          console.error(`❌ Error syncing feature flag ${flag.key}:`, error);
          results.feature_flags.errors++;
        }
      }
    }

    // 2. Sync role_feature_flags

    const { data: roleFlags, error: rfError } = await supabase
      .from('role_feature_flags')
      .select('*')
      .order('role, feature_key');

    if (rfError) {
      console.error('❌ Error fetching role_feature_flags:', rfError);
    } else if (roleFlags && roleFlags.length > 0) {


      for (const roleFlag of roleFlags) {
        try {
          const nocoRecord = {
            role: roleFlag.role,
            feature_key: roleFlag.feature_key,
            enabled: roleFlag.enabled !== false, // default to true
          };

          const response = await fetch(
            `${NOCODB_BASE_URL}/api/v2/tables/${NOCODB_TABLES.ROLE_FEATURE_FLAGS}/records`,
            {
              method: 'POST',
              headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(nocoRecord),
            }
          );

          if (response.ok) {
            results.role_feature_flags.synced++;

          } else {
            const errorText = await response.text();
            console.error(`❌ Failed to sync ${roleFlag.role}:${roleFlag.feature_key}:`, errorText);
            results.role_feature_flags.errors++;
          }
        } catch (error) {
          console.error(`❌ Error syncing role flag ${roleFlag.role}:${roleFlag.feature_key}:`, error);
          results.role_feature_flags.errors++;
        }
      }
    }



    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sync completed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in sync:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
