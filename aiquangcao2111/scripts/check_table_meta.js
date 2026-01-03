const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mlz2jkivq3dus4x'; // ROLE_FEATURE_FLAGS

async function checkMeta() {
    console.log('🔍 Checking table metadata...');

    try {
        const url = `${NOCODB_URL}/api/v2/meta/tables/${TABLE_ID}`;
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Table Meta:', JSON.stringify(data, null, 2));

        if (data.columns) {
            console.log('📋 Columns:');
            data.columns.forEach(col => {
                console.log(`- ${col.title} (${col.column_name}) PK:${col.pk} AI:${col.ai}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkMeta();
