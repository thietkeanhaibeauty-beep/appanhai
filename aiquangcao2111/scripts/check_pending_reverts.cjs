/**
 * Check pending reverts in NocoDB
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const PENDING_REVERTS_TABLE = 'mwfp1d1542ab4ok';

async function checkPendingReverts() {
    console.log('🔍 Checking PENDING_REVERTS table...\n');

    const response = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${PENDING_REVERTS_TABLE}/records?limit=20&sort=-CreatedAt`,
        {
            headers: {
                'xc-token': NOCODB_API_TOKEN,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        console.error('❌ Error:', response.status, await response.text());
        return;
    }

    const data = await response.json();
    const records = data.list || [];

    console.log(`📋 Found ${records.length} records:\n`);

    const now = new Date();
    console.log(`⏰ Current time: ${now.toISOString()}\n`);

    records.forEach((r, i) => {
        const revertAt = new Date(r.revert_at);
        const isPast = revertAt <= now;
        console.log(`--- Record ${i + 1} ---`);
        console.log(`  ID: ${r.Id}`);
        console.log(`  Rule ID: ${r.rule_id}`);
        console.log(`  Object ID: ${r.object_id}`);
        console.log(`  Revert Action: ${r.revert_action}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Executed At: ${r.executed_at}`);
        console.log(`  Revert At: ${r.revert_at} ${isPast ? '✅ (PAST - should execute)' : '⏳ (FUTURE)'}`);
        console.log('');
    });
}

checkPendingReverts().catch(console.error);
