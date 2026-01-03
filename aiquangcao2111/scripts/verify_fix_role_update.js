const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'mkwf350maoivd0r'; // NEW ROLE_FEATURE_FLAGS

async function verifyFix() {
    console.log('🧪 Verifying fix for role update (ID based)...');

    // 1. Get initial state of two features
    const f1 = 'manual_create_ads';
    const f2 = 'ai_creative_campaign';

    const getFeature = async (key) => {
        const where = encodeURIComponent(`(feature_key,eq,${key})`);
        const res = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await res.json();
        return data.list?.[0];
    };

    const initialF1 = await getFeature(f1);
    const initialF2 = await getFeature(f2);

    console.log(`Initial State:`);
    console.log(`- ${f1} (ID: ${initialF1?.Id}): User=${initialF1?.User}`);
    console.log(`- ${f2} (ID: ${initialF2?.Id}): User=${initialF2?.User}`);

    if (!initialF1 || !initialF1.Id) {
        console.error('❌ Could not find feature 1 or ID is missing');
        return;
    }

    // 2. Update F1 ONLY (Toggle User) using ID
    const newUserValue = !initialF1.User;
    console.log(`🔄 Updating ${f1} User to ${newUserValue}...`);

    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`;

    const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id: initialF1.Id,
            User: newUserValue
        })
    });

    if (!response.ok) {
        console.error(`❌ Update failed: ${response.status} ${await response.text()}`);
        return;
    }

    // 3. Verify F2 is UNCHANGED
    const finalF1 = await getFeature(f1);
    const finalF2 = await getFeature(f2);

    console.log(`Final State:`);
    console.log(`- ${f1}: User=${finalF1?.User} (Expected: ${newUserValue})`);
    console.log(`- ${f2}: User=${finalF2?.User} (Expected: ${initialF2?.User})`);

    if (finalF1.User === newUserValue && finalF2.User === initialF2.User) {
        console.log('✅ TEST PASSED: Only target feature was updated.');
    } else {
        console.error('❌ TEST FAILED: Other features were affected!');
    }

    // Restore F1
    await fetch(url, {
        method: 'PATCH',
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Id: initialF1.Id,
            User: initialF1.User
        })
    });
}

verifyFix();
