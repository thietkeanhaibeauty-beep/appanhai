const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mlz2jkivq3dus4x'; // ROLE_FEATURE_FLAGS

async function testPatchWhere() {
    console.log('🧪 Testing PATCH with where clause...');

    // Target feature: manual_create_ads
    const featureKey = 'manual_create_ads';

    try {
        const whereClause = encodeURIComponent(`(feature_key,eq,${featureKey})`);
        const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}`;

        // Try to toggle User to false (or true)
        const body = {
            User: false // Set to false for test
        };

        console.log(`Sending PATCH to ${url}`);
        console.log('Body:', body);

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed: ${response.status} ${text}`);
        }

        const result = await response.json();
        console.log('✅ Success:', JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testPatchWhere();
