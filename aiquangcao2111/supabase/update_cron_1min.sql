-- Unschedule old job if exists to avoid duplicates
select cron.unschedule('auto-automation-rules-cron');

-- Schedule the job to run every 1 minute
select cron.schedule(
  'auto-automation-rules-cron', -- Job name
  '*/1 * * * *',                -- Every 1 minute
  $$
  select
    net.http_post(
      url:='https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/auto-automation-rules-cron',
      headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select role_key from vault.decrypted_secrets where name = 'service_role_key' limit 1)
      )
    ) as request_id;
  $$
);

-- Verify
select * from cron.job where jobname = 'auto-automation-rules-cron';
