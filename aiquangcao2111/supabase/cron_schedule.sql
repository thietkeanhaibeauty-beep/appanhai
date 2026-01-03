select
  cron.schedule(
    'sync-ads-every-5-minutes', -- name of the cron job
    '*/5 * * * *', -- every 5 minutes
    $$
    select
      net.http_post(
          url:='https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/sync-ads-cron',
          headers:=jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || (select role_key from vault.decrypted_secrets where name = 'service_role_key' limit 1)
          ),
          body:='{"limit": 5000}'::jsonb
      ) as request_id;
    $$
  );
