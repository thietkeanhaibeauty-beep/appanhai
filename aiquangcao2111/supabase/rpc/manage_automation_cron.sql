
-- Function to manage automation cron jobs dynamically
-- This replaces the need for 'exec_sql' which is often disabled for security
create or replace function manage_automation_cron(
  job_name text,
  schedule_expression text,
  function_url text,
  auth_header text,
  payload jsonb
)
returns void
language plpgsql
security definer
as $$
begin
  -- Delete existing job if it exists
  perform cron.unschedule(job_name);

  -- Schedule new job
  perform cron.schedule(
    job_name,
    schedule_expression,
    format(
      'select net.http_post(
          url := %L,
          headers := ''{"Content-Type": "application/json", "Authorization": "%s"}''::jsonb,
          body := %L::jsonb
      ) as request_id;',
      function_url,
      auth_header,
      payload
    )
  );
end;
$$;

-- Function to delete automation cron job
create or replace function delete_automation_cron(
  job_name text
)
returns void
language plpgsql
security definer
as $$
begin
  perform cron.unschedule(job_name);
end;
$$;
