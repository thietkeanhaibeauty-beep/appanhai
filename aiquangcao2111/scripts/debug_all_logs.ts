/**
 * DEBUG: Check all execution logs from last night
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    console.log('═'.repeat(60));
    console.log('🔍 TẤT CẢ LOGS TỐI QUA + SÁNG NAY');
    console.log('═'.repeat(60));

    // Get ALL execution logs from last 24 hours
    const logsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/masstbinn3h8hkr/records?sort=-executed_at&limit=30`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const logs = (await logsRes.json()).list || [];

    console.log(`\n📋 ${logs.length} logs gần nhất:\n`);

    for (const l of logs.slice(0, 3)) { // Only show top 3
        const time = l.executed_at ? new Date(l.executed_at).toLocaleString('vi-VN') : 'N/A';
        console.log(`${time} | Rule ${l.rule_id} | ${l.status}`);
        console.log(`   Matched: ${l.matched_objects_count} | Actions: ${l.executed_actions_count}`);

        if (l.details) {
            console.log('   DETAILS RAW:', l.details);
            try {
                const details = JSON.parse(l.details);
                console.log('   DETAILS JSON:', JSON.stringify(details, null, 2));
            } catch (e) { }
        }
    }
}

main().catch(console.error);
