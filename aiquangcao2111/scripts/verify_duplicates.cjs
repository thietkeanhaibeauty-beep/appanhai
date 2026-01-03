const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

async function checkDuplicates() {
    console.log(`🔍 Checking for duplicates in FACEBOOK_INSIGHTS_AUTO (${TABLE_ID})...`);
    // Fetch all records for today
    const today = '2025-12-11';
    const res = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=(date_start,eq,${today})&limit=1000`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const data = await res.json();
    const list = data.list || [];

    console.log(`Found ${list.length} records for ${today}.`);

    const countMap = {};
    let dupes = 0;

    list.forEach(r => {
        // key = level_entityId
        const key = `${r.level}_${r.campaign_id || ''}_${r.adset_id || ''}_${r.ad_id || ''}`;
        if (countMap[key]) {
            countMap[key]++;
            dupes++;
        } else {
            countMap[key] = 1;
        }
    });

    if (dupes > 0) {
        console.log(`❌ Found ${dupes} duplicate records!`);
        // List some examples
        Object.entries(countMap).forEach(([k, v]) => {
            if (v > 1) console.log(`   Dup: ${k} (Count: ${v})`);
        });
    } else {
        console.log('✅ No duplicates found! Data is clean.');
    }
}

checkDuplicates();
