-- Cron Job: Xử lý lệnh bật lại (Pending Reverts)
-- Chạy mỗi 1 phút để kiểm tra và bật lại các chiến dịch đã hẹn giờ

-- Xóa job cũ nếu có (bỏ qua nếu chưa tồn tại)
DO $$
BEGIN
  PERFORM cron.unschedule('process-pending-reverts-cron');
EXCEPTION WHEN OTHERS THEN
  -- Bỏ qua lỗi nếu job không tồn tại
  NULL;
END $$;

-- Tạo job mới
select cron.schedule(
  'process-pending-reverts-cron', -- Tên job
  '*/1 * * * *',                  -- Mỗi 1 phút
  $$
  select
    net.http_post(
      url:='https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/process-pending-reverts',
      headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select role_key from vault.decrypted_secrets where name = 'service_role_key' limit 1)
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Kiểm tra job đã được tạo
select * from cron.job where jobname = 'process-pending-reverts-cron';
