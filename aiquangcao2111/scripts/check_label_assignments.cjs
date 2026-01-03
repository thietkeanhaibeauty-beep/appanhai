// Check CAMPAIGN_LABEL_ASSIGNMENTS table directly
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const CAMPAIGN_LABEL_ASSIGNMENTS = 'myjgw4ial5s6zrw';

async function checkLabelAssignments() {
    console.log('🔍 Checking CAMPAIGN_LABEL_ASSIGNMENTS table...');

    const labelId = 23; // Target label for rule "80k 1 kết quả tắt"

    // Query for this specific label
    const whereClause = encodeURIComponent(`(label_id,eq,${labelId})`);
    const url = `${NOCODB_URL}/api/v2/tables/${CAMPAIGN_LABEL_ASSIGNMENTS}/records?where=${whereClause}&limit=100`;

    console.log('📡 Fetching from:', url);

    try {
        const response = await fetch(url, {
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('❌ Error:', response.status, await response.text());
            return;
        }

        const data = await response.json();
        const records = data.list || [];

        console.log(`\n📊 Found ${records.length} records for label_id ${labelId}:`);

        records.forEach((r, i) => {
            console.log(`\n--- Assignment ${i + 1} ---`);
            console.log('  label_id:', r.label_id);
            console.log('  campaign_id:', r.campaign_id);
            console.log('  adset_id:', r.adset_id);
            console.log('  ad_id:', r.ad_id);
            console.log('  user_id:', r.user_id);
        });

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkLabelAssignments();
