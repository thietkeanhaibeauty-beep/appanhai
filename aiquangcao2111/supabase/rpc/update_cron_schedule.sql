-- Function to update a cron job's schedule while preserving its command
create or replace function update_cron_schedule(
  job_name text,
  new_schedule text
)
returns jsonb
language plpgsql
security definer
as $$
declare
  existing_command text;
begin
  -- Check if the job exists and get its command
  select command into existing_command
  from cron.job
  where jobname = job_name;

  if existing_command is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Job not found'
    );
  end if;

  -- Reschedule with the new schedule and existing command
  perform cron.schedule(job_name, new_schedule, existing_command);

  return jsonb_build_object(
    'success', true,
    'message', 'Schedule updated successfully',
    'job_name', job_name,
    'new_schedule', new_schedule
  );
exception when others then
  return jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;
