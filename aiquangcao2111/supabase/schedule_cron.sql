-- Enable the pg_cron extension if not already enabled
create extension if not exists pg_cron;

-- Schedule the central automation rules cron job
-- Runs every 15 minutes
select cron.schedule(
  'auto-automation-rules-cron', -- Job name
  '*/15 * * * *',               -- Schedule (every 15 mins)
  $$
  select
    net.http_post(
      -- ⚠️ REPLACE WITH YOUR PROJECT URL
      url:='https://p0lvt22fuj3opkl.supabase.co/functions/v1/auto-automation-rules-cron',
      
      -- ⚠️ REPLACE WITH YOUR SERVICE ROLE KEY
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
    ) as request_id;
  $$
);

-- Verify the job was created
select * from cron.job where jobname = 'auto-automation-rules-cron';
