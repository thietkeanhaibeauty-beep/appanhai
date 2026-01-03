import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if cron job exists in pg_cron.job table
    const { data, error } = await supabase
      .from('cron.job')
      .select('jobid, jobname, schedule, active')
      .limit(50);

    if (error) {
      console.error('❌ Error checking cron status:', error);
      // If table doesn't exist or query fails, assume cron not setup
      return new Response(
        JSON.stringify({
          exists: false,
          error: error.message,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const exists = data && data.length > 0;
    const cronJobs = data || [];

    console.log('✅ Cron status:', { exists, cronJobs });

    return new Response(
      JSON.stringify({
        exists,
        cronJobs,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('❌ Error in check-cron-status:', error);
    return new Response(
      JSON.stringify({
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
