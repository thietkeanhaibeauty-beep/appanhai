select 
  runid,
  jobid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
from cron.job_run_details 
where jobid = (select jobid from cron.job where jobname = 'sync-ads-every-5-minutes') 
order by start_time desc 
limit 10;
