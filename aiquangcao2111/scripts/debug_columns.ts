/**
 * Debug: Check actual column names in CAMPAIGN_LABEL_ASSIGNMENTS table
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    console.log('Fetching sample record to check column names...\n');

    const url = `${NOCODB_BASE_URL}/api/v2/tables/myjgw4ial5s6zrw/records?limit=5`;
    const response = await fetch(url, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await response.json();

    if (data.list && data.list.length > 0) {
        console.log('Sample records with ALL columns:');
        console.log('─'.repeat(60));

        data.list.forEach((record: any, i: number) => {
            console.log(`\nRecord ${i + 1}:`);
            for (const [key, value] of Object.entries(record)) {
                console.log(`  ${key}: ${JSON.stringify(value)}`);
            }
        });
    } else {
        console.log('No records found');
    }
}

main().catch(console.error);
