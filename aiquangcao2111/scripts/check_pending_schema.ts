/**
 * Check PENDING_REVERTS schema - exact column names
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mwfp1d1542ab4ok';

async function main() {
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLE_ID}/records?limit=5`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await res.json();

    if (data.list && data.list.length > 0) {
        console.log('PENDING_REVERTS Schema (all columns):');
        console.log('─'.repeat(60));

        const record = data.list[data.list.length - 1]; // Get latest record
        for (const [key, value] of Object.entries(record)) {
            console.log(`  ${key}: ${JSON.stringify(value)}`);
        }
    }
}

main().catch(console.error);
