/**
 * Check table schema and find correct column names
 * Run with: npx tsx scripts/check_table_schema.ts
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLES = {
    FACEBOOK_INSIGHTS_AUTO: 'm17gyigy8jqlaoz'
};

async function main() {
    console.log('Fetching sample record to check column names...\n');

    const url = `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FACEBOOK_INSIGHTS_AUTO}/records?limit=1`;
    const response = await fetch(url, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await response.json();

    if (data.list && data.list.length > 0) {
        console.log('Sample record columns:');
        console.log('─'.repeat(50));

        const record = data.list[0];
        for (const [key, value] of Object.entries(record)) {
            console.log(`${key}: ${JSON.stringify(value)?.substring(0, 50)}`);
        }
    } else {
        console.log('No records found');
    }
}

main().catch(console.error);
