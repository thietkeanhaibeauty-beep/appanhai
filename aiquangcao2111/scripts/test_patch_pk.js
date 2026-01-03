const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mlz2jkivq3dus4x'; // ROLE_FEATURE_FLAGS

async function testPatchPK() {
    console.log('🧪 Testing PATCH with PK in body...');

    const featureKey = 'manual_create_ads';

    // 1. Get current value
    const getFeature = async () => {
        const where = encodeURIComponent(`(feature_key,eq,${featureKey})`);
        const res = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await res.json();
        return data.list?.[0];
    };

    const initial = await getFeature();
    console.log(`Initial User: ${initial?.User}`);

    const newValue = !initial.User;
    console.log(`Setting to: ${newValue}`);

    // 2. Update using PK in body
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`;
    const body = {
        feature_key: featureKey, // PK
        User: newValue
    };

    console.log('Sending PATCH to:', url);
    console.log('Body:', body);

    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'xc-token': NOCODB_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body) // NocoDB v2 expects object or array? Usually object for single, but docs say array for bulk. Let's try object first.
    });

    if (!response.ok) {
        const text = await response.text();
        console.error(`Failed: ${response.status} ${text}`);
    } else {
        const result = await response.json();
        console.log('✅ Success:', JSON.stringify(result, null, 2));
    }

    // 3. Verify
    const final = await getFeature();
    console.log(`Final User: ${final?.User}`);

    if (final.User === newValue) {
        console.log('✅ Update verified!');
    } else {
        console.error('❌ Update failed to persist.');
    }
}

testPatchPK();
