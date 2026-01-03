const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mlz2jkivq3dus4x'; // ROLE_FEATURE_FLAGS

async function checkColumns() {
    console.log('🔍 Checking columns for ROLE_FEATURE_FLAGS...');

    try {
        const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/columns`;
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const columns = data.list || [];

        console.log(`✅ Found ${columns.length} columns.`);
        columns.forEach(col => {
            console.log(`- ${col.title} (${col.column_name}) [${col.uidt}] PK:${col.pk}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkColumns();
