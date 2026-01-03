/**
 * Quick check of execution logs
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/masstbinn3h8hkr/records?limit=15&sort=-executed_at`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const data = await res.json();
    console.log('Latest Automation Rule Execution Logs:');
    console.log('═'.repeat(80));

    for (const log of data.list || []) {
        const time = new Date(log.executed_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        console.log(`${time} | Rule: ${log.rule_id} | Status: ${log.status} | Matched: ${log.matched_count} | Executed: ${log.executed_count}`);
    }
}

main().catch(console.error);
