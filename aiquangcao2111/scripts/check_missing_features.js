const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FEATURE_FLAGS_TABLE = 'm4vhdk99vpso26v';
const ROLE_FEATURE_FLAGS_TABLE = 'mkwf350maoivd0r';

async function checkMissingFeatures() {
    console.log('🔍 Checking for missing features...');

    try {
        // 1. Fetch all Feature Flags
        const ffUrl = `${NOCODB_URL}/api/v2/tables/${FEATURE_FLAGS_TABLE}/records?limit=1000`;
        const ffResponse = await fetch(ffUrl, { headers: { 'xc-token': NOCODB_TOKEN } });
        const ffData = await ffResponse.json();
        const allFeatures = ffData.list || [];

        // 2. Fetch all Role Feature Flags
        const rffUrl = `${NOCODB_URL}/api/v2/tables/${ROLE_FEATURE_FLAGS_TABLE}/records?limit=1000`;
        const rffResponse = await fetch(rffUrl, { headers: { 'xc-token': NOCODB_TOKEN } });
        const rffData = await rffResponse.json();
        const managedFeatures = rffData.list || [];

        // 3. Compare
        const managedKeys = new Set(managedFeatures.map(f => f.feature_key));
        const missingFeatures = allFeatures.filter(f => !managedKeys.has(f.key));

        console.log(`\n📊 Summary:`);
        console.log(`- Total Features defined: ${allFeatures.length}`);
        console.log(`- Features in Management UI: ${managedFeatures.length}`);

        if (missingFeatures.length > 0) {
            console.log(`\n⚠️ Found ${missingFeatures.length} missing features in Management UI:`);
            missingFeatures.forEach(f => {
                console.log(`- [${f.key}] ${f.name} (${f.category || 'no category'})`);
            });
        } else {
            console.log('\n✅ All features are present in the Management UI.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkMissingFeatures();
