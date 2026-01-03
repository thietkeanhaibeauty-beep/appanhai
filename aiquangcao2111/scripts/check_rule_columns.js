const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mp8nib5rn4l0mb4'; // AUTOMATED_RULES

async function checkRuleColumns() {
    try {
        console.log(`Fetching columns for table ${TABLE_ID}...`);
        const url = `${NOCODB_API_URL}/api/v1/db/meta/tables/${TABLE_ID}/columns`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list) {
            console.log('Columns:');
            data.list.forEach(col => {
                console.log(`- ${col.title} (${col.uidt})`);
            });
        } else {
            console.log('No columns found or API error.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkRuleColumns();
