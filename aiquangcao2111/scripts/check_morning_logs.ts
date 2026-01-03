/**
 * KIỂM TRA LOGS SAU KHI DẬY
 * Xem cron 1h sáng có chạy không
 */

import { NOCODB_BASE_URL, NOCODB_API_TOKEN, TABLES } from './config';

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('☀️ KIỂM TRA LOGS SAU KHI DẬY');
    console.log('═'.repeat(70));
    console.log(`⏰ Hiện tại: ${new Date().toLocaleString('vi-VN')}\n`);

    // Get logs since 1 AM today
    const today = new Date();
    const oneAM = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 1, 0, 0);
    const oneAMStr = oneAM.toISOString();

    console.log(`📋 Logs từ 1:00 AM hôm nay (${oneAM.toLocaleString('vi-VN')}):\n`);

    // 1. Execution Logs
    console.log('─'.repeat(70));
    console.log('📊 AUTOMATION EXECUTION LOGS:');
    const execLogsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.EXECUTION_LOGS}/records?sort=-executed_at&limit=20`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const execLogs = (await execLogsRes.json()).list || [];

    const recentExecLogs = execLogs.filter((l: any) =>
        l.executed_at && new Date(l.executed_at) >= oneAM
    );

    if (recentExecLogs.length === 0) {
        console.log('   ❌ Không có execution logs từ 1h sáng!');
        console.log('   → Có thể cron chưa được cài hoặc không có rules ready\n');
    } else {
        console.log(`   ✅ Có ${recentExecLogs.length} logs từ 1h sáng:\n`);
        for (const log of recentExecLogs) {
            const time = new Date(log.executed_at).toLocaleString('vi-VN');
            const icon = log.status === 'success' ? '✅' : '❌';
            console.log(`   ${icon} ${time} | Rule ${log.rule_id} | ${log.status}`);
            if (log.details) {
                const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                if (Array.isArray(details)) {
                    for (const d of details) {
                        console.log(`      └─ ${d.objectName}: ${d.action} → ${d.status || d.result}`);
                    }
                }
            }
        }
        console.log('');
    }

    // 2. Sync Logs (cron summary)
    console.log('─'.repeat(70));
    console.log('📊 CRON SYNC LOGS:');
    const syncLogsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.SYNC_LOGS}/records?sort=-CreatedAt&limit=10`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const syncLogs = (await syncLogsRes.json()).list || [];

    const cronLogs = syncLogs.filter((l: any) =>
        l.type === 'automation_rules_cron' || l.source === 'auto-automation-rules-cron'
    );

    if (cronLogs.length === 0) {
        console.log('   ⚠️ Không có cron logs\n');
    } else {
        console.log(`   📝 ${cronLogs.length} cron logs gần nhất:\n`);
        for (const log of cronLogs.slice(0, 5)) {
            const time = log.CreatedAt ? new Date(log.CreatedAt).toLocaleString('vi-VN') : 'N/A';
            console.log(`   ${time} | ${log.message || log.details || 'N/A'}`);
        }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('📝 TÓM TẮT:');
    if (recentExecLogs.length > 0) {
        const success = recentExecLogs.filter((l: any) => l.status === 'success').length;
        console.log(`   ✅ Cron đã chạy! ${success}/${recentExecLogs.length} thành công`);
    } else {
        console.log('   ❌ Cron chưa chạy hoặc không có rules sẵn sàng');
        console.log('   → Kiểm tra: SELECT * FROM cron.job; trong Supabase SQL Editor');
    }
    console.log('═'.repeat(70));
}

main().catch(console.error);
