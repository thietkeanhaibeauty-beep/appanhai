// Check label 24 assignments
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const CAMPAIGN_LABEL_ASSIGNMENTS = 'myjgw4ial5s6zrw';

async function checkLabel24() {
    console.log('🔍 Checking label 24 assignments...');

    const whereClause = encodeURIComponent(`(label_id,eq,24)`);
    const url = `${NOCODB_URL}/api/v2/tables/${CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=${whereClause}&limit=100`;

    try {
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        const records = data.list || [];

        console.log(`\n📊 Found ${records.length} assignments for label_id 24:\n`);

        if (records.length === 0) {
            console.log('❌ NO ASSIGNMENTS FOUND FOR LABEL 24!');
            console.log('This is why the rule finds no matching objects.');
        } else {
            records.forEach((r, i) => {
                console.log(`--- Assignment ${i + 1} ---`);
                console.log('  label_id:', r.label_id);
                console.log('  campaign_id:', r.campaign_id);
                console.log('  adset_id:', r.adset_id);
                console.log('  ad_id:', r.ad_id);
            });
        }

        // Also check what labels the target adset HAS
        console.log('\n\n🎯 Checking what labels adset 120240709129460334 has...');
        const adsetWhere = encodeURIComponent(`(adset_id,eq,120240709129460334)`);
        const adsetUrl = `${NOCODB_URL}/api/v2/tables/${CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=${adsetWhere}&limit=100`;

        const adsetRes = await fetch(adsetUrl, {
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        const adsetData = await adsetRes.json();
        console.log(`Adset has ${adsetData.list?.length || 0} labels assigned:`);
        adsetData.list?.forEach((r, i) => {
            console.log(`  Label ${i + 1}: label_id = ${r.label_id}`);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkLabel24();
