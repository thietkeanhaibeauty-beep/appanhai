const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const AD_ACCOUNTS_TABLE = 'ms3iubpejoynr9a';
const INSIGHTS_AUTO_TABLE = 'm17gyigy8jqlaoz';

async function checkTable(tableId, name) {
    console.log(`\n🔍 Checking ${name} (${tableId})...`);
    try {
        const res = await fetch(`${NOCODB_URL}/api/v2/tables/${tableId}/records?limit=1`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await res.json();
        const item = data.list?.[0];

        if (item) {
            console.log('✅ Found record. Keys:', Object.keys(item).join(', '));
            if (name === 'AD_ACCOUNTS') {
                console.log('   user_id value:', item.user_id);
            }
            if (name === 'INSIGHTS_AUTO') {
                console.log('   user_id value:', item.user_id);
                console.log('   insight_key value:', item.insight_key);
            }
        } else {
            console.log('❌ No records found.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

async function main() {
    await checkTable(AD_ACCOUNTS_TABLE, 'AD_ACCOUNTS');
    await checkTable(INSIGHTS_AUTO_TABLE, 'INSIGHTS_AUTO');
}

main();
