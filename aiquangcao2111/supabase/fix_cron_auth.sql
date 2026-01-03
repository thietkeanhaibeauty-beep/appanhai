-- Bước 1: Thay thế 'YOUR_SERVICE_ROLE_KEY' bằng Service Role Key thật của bạn (lấy trong Dashboard > Project Settings > API)
-- Bước 2: Chạy toàn bộ lệnh bên dưới trong SQL Editor

select
  cron.schedule(
    'sync-ads-every-5-minutes',
    '*/5 * * * *',
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
