/**
 * Check detailed execution log for rule 12
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    // Get rule 12 logs
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/masstbinn3h8hkr/records?where=(rule_id,eq,12)&limit=5&sort=-executed_at`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const data = await res.json();

    console.log('Rule 12 (TEST-GIAM-20%) Execution Logs:');
    console.log('═'.repeat(80));

    for (const log of data.list || []) {
        const time = new Date(log.executed_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        console.log(`\n📅 ${time}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Matched: ${log.matched_count}`);
        console.log(`   Executed: ${log.executed_count}`);

        // Parse details if available
        if (log.details) {
            try {
                const details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
                console.log(`   Details:`, JSON.stringify(details, null, 2).substring(0, 500));
            } catch (e) {
                console.log(`   Details (raw): ${String(log.details).substring(0, 200)}`);
            }
        }
    }

    // Also check current budget of the adset
    console.log('\n\n📊 Current Adset Budget:');
    console.log('═'.repeat(80));
    const adsetRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/m17gyigy8jqlaoz/records?where=(adset_id,eq,120237109526540772)&limit=1`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const adsetData = await adsetRes.json();
    if (adsetData.list && adsetData.list[0]) {
        const adset = adsetData.list[0];
        console.log(`   Adset: ${adset.adset_name || adset.object_name}`);
        console.log(`   Daily Budget: ${(adset.daily_budget || 0).toLocaleString()}₫`);
        console.log(`   Status: ${adset.status}`);
        console.log(`   Spend: ${(adset.spend || 0).toLocaleString()}₫`);
    }
}

main().catch(console.error);
