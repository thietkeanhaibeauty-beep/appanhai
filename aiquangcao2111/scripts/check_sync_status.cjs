const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const SYNC_LOGS_TABLE = 'mtrjomtzrv1wwix';
const INSIGHTS_AUTO_TABLE = 'm17gyigy8jqlaoz';

async function checkById(tableId) {
    console.log(`Checking table ${tableId}...`);
    try {
        const res = await fetch(`${NOCODB_URL}/api/v2/tables/${tableId}/records?limit=5&sort=-CreatedAt`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await res.json();
        return data.list || [];
    } catch (e) {
        console.error(`Error checking ${tableId}:`, e.message);
        return [];
    }
}

async function main() {
    console.log('🔍 Checking SYNC_LOGS...');
    const logs = await checkById(SYNC_LOGS_TABLE);
    if (logs.length > 0) {
        console.log('Last 3 sync logs:');
        logs.slice(0, 3).forEach(l => {
            console.log(`- [${l.CreatedAt}] Status: ${l.status}, Processed: ${l.records_processed}, Error: ${l.error_message || 'None'}`);
        });
    } else {
        console.log('❌ No sync logs found.');
    }

    console.log('\n🔍 Checking FACEBOOK_INSIGHTS_AUTO...');
    const insights = await checkById(INSIGHTS_AUTO_TABLE);
    console.log(`Found ${insights.length} records in auto table.`);
}

main();
