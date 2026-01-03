// Check FACEBOOK_INSIGHTS_AUTO table directly
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FACEBOOK_INSIGHTS_AUTO = 'm17gyigy8jqlaoz';

async function checkInsights() {
    console.log('🔍 Checking FACEBOOK_INSIGHTS_AUTO table...');

    const adsetId = '120240709129460334'; // The ad set from user's screenshot
    const today = '2025-12-11';

    // Query for this specific adset
    const whereClause = encodeURIComponent(`(adset_id,eq,${adsetId})`);
    const url = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?where=${whereClause}&limit=100`;

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

        console.log(`\n📊 Found ${records.length} records for adset ${adsetId}:`);

        records.forEach((r, i) => {
            console.log(`\n--- Record ${i + 1} ---`);
            console.log('  date_start:', r.date_start);
            console.log('  adset_name:', r.adset_name || r.name);
            console.log('  spend:', r.spend, '(raw value)');
            console.log('  impressions:', r.impressions);
            console.log('  clicks:', r.clicks);
            console.log('  results:', r.results);
        });

        // Also check today's data specifically
        console.log('\n\n📅 Checking records for TODAY (2025-12-11)...');
        const todayWhere = encodeURIComponent(`(date_start,gte,${today})`);
        const todayUrl = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?where=${todayWhere}&limit=20&sort=-date_start`;

        const todayRes = await fetch(todayUrl, {
            headers: {
                'xc-token': NOCODB_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        const todayData = await todayRes.json();
        console.log(`Found ${todayData.list?.length || 0} records for today.`);

        if (todayData.list?.length > 0) {
            todayData.list.slice(0, 5).forEach((r, i) => {
                console.log(`\n--- Today Record ${i + 1} ---`);
                console.log('  adset_id:', r.adset_id);
                console.log('  adset_name:', r.adset_name);
                console.log('  date_start:', r.date_start);
                console.log('  spend:', r.spend);
                console.log('  results:', r.results);
            });
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkInsights();
