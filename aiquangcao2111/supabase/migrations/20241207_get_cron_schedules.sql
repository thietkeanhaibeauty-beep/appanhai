-- Create function to get cron schedules
CREATE OR REPLACE FUNCTION public.get_cron_schedules()
RETURNS TABLE (
  jobname text,
  schedule text,
  active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cron.job.jobname::text,
    cron.job.schedule::text,
    cron.job.active
  FROM cron.job
  WHERE cron.job.jobname LIKE '%cron%' OR cron.job.jobname LIKE '%automation%' OR cron.job.jobname LIKE '%sync%' OR cron.job.jobname LIKE '%report%';
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_cron_schedules() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_schedules() TO service_role;
