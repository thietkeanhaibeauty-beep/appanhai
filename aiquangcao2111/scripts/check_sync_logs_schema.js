const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm9j1kt8ml62g5r5'; // TABLE_SYNC_LOGS

async function checkSchema() {
    try {
        console.log(`Fetching records from table ${TABLE_ID} without sort...`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?limit=1`;

        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_API_TOKEN
            }
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${text}`);
        }

        const data = await response.json();
        if (data.list.length > 0) {
            console.log('Record keys:', Object.keys(data.list[0]));
        } else {
            console.log('Table is empty.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

checkSchema();
