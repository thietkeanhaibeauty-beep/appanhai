const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mkwf350maoivd0r'; // NEW ROLE_FEATURE_FLAGS

async function fetchSample() {
    console.log('🔍 Fetching sample record...');

    try {
        const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?limit=1`;
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const item = data.list?.[0];

        if (item) {
            console.log('✅ Found record. Keys:', Object.keys(item));
            console.log('📄 Sample record:', JSON.stringify(item, null, 2));
        } else {
            console.log('⚠️ No records found.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fetchSample();
