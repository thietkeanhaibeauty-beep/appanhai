const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function checkRuleSchema() {
    try {
        console.log(`Fetching records from table ${TABLE_ID} limit 1...`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?limit=1`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list.length > 0) {
            console.log('Record keys:', Object.keys(data.list[0]));
            console.log('Sample Record:', JSON.stringify(data.list[0], null, 2));
        } else {
            console.log('Table is empty.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkRuleSchema();
