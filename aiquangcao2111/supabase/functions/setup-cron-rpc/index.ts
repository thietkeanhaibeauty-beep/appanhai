import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL");
    if (!dbUrl) {
      throw new Error("Server Error: Missing Database Configuration");
    }

    // Create a database client
    const client = new Client(dbUrl);
    await client.connect();

    // Parse request body for schedule (default to 2 mins if not provided)
    let body = {};
    try { body = await req.json(); } catch { }
    const { schedule = '*/2 * * * *' } = body;

    // Execute SQL to setup RPCs and Schedule the Job
    await client.queryArray(`
      -- Schedule Reports Job (Auto-run)
      DO $$
      BEGIN
        -- Unschedule if exists (Safely)
        BEGIN
          PERFORM cron.unschedule('process-reports-every-5-minutes');
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
        
        -- Schedule new job with dynamic schedule
        -- Schedule new job with dynamic schedule
        PERFORM cron.schedule(
          'process-reports-every-5-minutes',
          '${schedule}',
          $cron$
          select
            net.http_post(
                url:='https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/process-scheduled-reports',
                headers:=jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwNzExNiwiZXhwIjoyMDc5MjgzMTE2fQ.Q9JMtFUC53PslgX5kZe6UAKeaMwrk0aaG35mrEqapbY'
                ),
                body:='{}'::jsonb
            ) as request_id;
          $cron$
        );

        -- Schedule Automation Rules Job (Every 5 minutes)
        -- Unschedule if exists
        BEGIN
          PERFORM cron.unschedule('auto-automation-rules-cron');
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;

        PERFORM cron.schedule(
          'auto-automation-rules-cron',
          '*/5 * * * *',
          $cron$
          select
            net.http_post(
                url:='https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/auto-automation-rules-cron',
                headers:=jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwNzExNiwiZXhwIjoyMDc5MjgzMTE2fQ.Q9JMtFUC53PslgX5kZe6UAKeaMwrk0aaG35mrEqapbY'
                ),
                body:='{}'::jsonb
            ) as request_id;
          $cron$
        );
      END
      $$;
    `);

    // Debug: Fetch all cron jobs
    const { rows: jobs } = await client.queryArray(
      `select jobname, schedule, active, command from cron.job`
    );

    await client.end();

    return new Response(JSON.stringify({
      success: true,
      message: "Cron job updated successfully",
      jobs: jobs
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
