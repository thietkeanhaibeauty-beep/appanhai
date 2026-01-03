-- Function to get current cron status
create or replace function get_ads_cron_status()
returns json
language plpgsql
security definer
as $$
declare
  job_record record;
begin
  select * into job_record from cron.job where jobname = 'sync-ads-every-5-minutes';
  
  if found then
    return json_build_object(
      'active', true,
      'schedule', job_record.schedule
    );
  else
    return json_build_object(
      'active', false,
      'schedule', null
    );
  end if;
end;
$$;

-- Function to update cron schedule
create or replace function update_ads_cron_schedule(
  is_active boolean,
  schedule_expression text
)
returns void
language plpgsql
security definer
as $$
begin
  -- Always unschedule first to avoid duplicates or to disable
  perform cron.unschedule('sync-ads-every-5-minutes');
  
  -- If active, schedule it
  if is_active then
    perform cron.schedule(
      'sync-ads-every-5-minutes',
      schedule_expression,
      $$
      select
        net.http_post(
            url:='https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/sync-ads-cron',
            headers:=jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzcwNzExNiwiZXhwIjoyMDc5MjgzMTE2fQ.Q9JMtFUC53PslgX5kZe6UAKeaMwrk0aaG35mrEqapbY'
            ),
            body:='{"limit": 5000}'::jsonb
        ) as request_id;
      $$
    );
  end if;
end;
$$;
