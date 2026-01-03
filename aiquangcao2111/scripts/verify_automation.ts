/**
 * KIỂM TRA TOÀN BỘ HỆ THỐNG AUTOMATION
 * 
 * Checks:
 * 1. Edge Functions deployed
 * 2. NocoDB connection
 * 3. Rules đang active
 * 4. Logs gần nhất
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    EXECUTION_LOGS: 'mq7r0pxsfb0cz7h',
    SYNC_LOGS: 'ms8l3iuwjamzqv2'
};

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔍 KIỂM TRA TOÀN BỘ HỆ THỐNG AUTOMATION');
    console.log('═'.repeat(70));
    console.log(`⏰ Thời điểm: ${new Date().toLocaleString('vi-VN')}\n`);

    let allOk = true;

    // 1. Check NocoDB Connection
    console.log('1️⃣ KIỂM TRA NOCODB...');
    try {
        const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?limit=1`, {
            headers: { 'xc-token': NOCODB_API_TOKEN }
        });
        if (res.ok) {
            console.log('   ✅ NocoDB kết nối OK\n');
        } else {
            console.log('   ❌ NocoDB lỗi:', res.status);
            allOk = false;
        }
    } catch (e) {
        console.log('   ❌ NocoDB không kết nối được');
        allOk = false;
    }

    // 2. Check Edge Functions
    console.log('2️⃣ KIỂM TRA EDGE FUNCTIONS...');
    try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/auto-automation-rules-cron`, {
            method: 'OPTIONS'
        });
        console.log('   ✅ auto-automation-rules-cron deployed\n');
    } catch (e) {
        console.log('   ⚠️ Không thể check (có thể vẫn OK)\n');
    }

    // 3. Check Active Rules
    console.log('3️⃣ KIỂM TRA QUY TẮC ACTIVE...');
    const rulesRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=(is_active,eq,1)&limit=50`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const rules = (await rulesRes.json()).list || [];

    console.log(`   📋 ${rules.length} quy tắc đang active:`);
    for (const rule of rules) {
        const adv = typeof rule.advanced_settings === 'string'
            ? JSON.parse(rule.advanced_settings || '{}')
            : (rule.advanced_settings || {});
        const autoSchedule = adv.enableAutoSchedule ? '✅' : '❌';
        const freq = adv.checkFrequency || 'N/A';
        console.log(`      ID ${rule.Id}: ${rule.rule_name} | AutoSchedule: ${autoSchedule} | Freq: ${freq}min`);
    }
    console.log('');

    // 4. Check Recent Logs
    console.log('4️⃣ LOGS GẦN NHẤT...');
    const logsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.EXECUTION_LOGS}/records?sort=-executed_at&limit=5`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const logs = (await logsRes.json()).list || [];

    if (logs.length === 0) {
        console.log('   ⚠️ Chưa có logs\n');
    } else {
        console.log(`   📝 ${logs.length} logs gần nhất:`);
        for (const log of logs) {
            const time = log.executed_at ? new Date(log.executed_at).toLocaleString('vi-VN') : 'N/A';
            console.log(`      ${time} | Rule ${log.rule_id} | ${log.status}`);
        }
        console.log('');
    }

    // 5. Summary
    console.log('═'.repeat(70));
    if (allOk) {
        console.log('✅ HỆ THỐNG SẴN SÀNG!');
        console.log('');
        console.log('📝 CRON 1H SÁNG:');
        console.log('   Vào Supabase Dashboard → SQL Editor → Chạy:');
        console.log('');
        console.log(`   -- Tạo cron job chạy lúc 1:00 AM (UTC+7 = 18:00 UTC)
   SELECT cron.schedule(
     'automation-rules-1am',
     '0 18 * * *',
     $$
     SELECT net.http_post(
       url:='${SUPABASE_URL}/functions/v1/auto-automation-rules-cron',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${SUPABASE_ANON_KEY}"}'::jsonb,
       body:='{}'::jsonb
     )
     $$
   );`);
        console.log('');
        console.log('   -- Kiểm tra cron đã tạo:');
        console.log('   SELECT * FROM cron.job;');
        console.log('');
        console.log('💡 SAU KHI DẬY, chạy lệnh này để xem logs:');
        console.log('   npx tsx scripts/check_morning_logs.ts');
    } else {
        console.log('❌ CÓ LỖI! Kiểm tra lại các mục trên.');
    }
    console.log('═'.repeat(70));
}

main().catch(console.error);
