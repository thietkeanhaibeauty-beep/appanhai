const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

async function checkHierarchy() {
    console.log(`\n🔍 Checking AdSet -> Campaign Hierarchy...`);
    const today = '2025-12-11';

    // Fetch AdSets
    // key parts: user_account_campaign_adset_ad_date
    // Level = adset
    const where = encodeURIComponent(`(level,eq,adset)~and(date_start,eq,${today})`);
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=20`;

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    const data = await res.json();
    const list = data.list || [];

    console.log(`Found ${list.length} AdSets.`);

    list.forEach(r => {
        console.log(`--- AdSet: ${r.adset_name} (${r.adset_id}) ---`);
        console.log(`    Parent Campaign ID in DB: ${r.campaign_id}`);
        console.log(`    Parent Campaign Name in DB: ${r.campaign_name}`);

        // Extract Campaign ID from Key to verify consistency
        // Key format: user_account_camp_adset_ad_date
        const parts = r.insight_key.split('_');
        // parts[0] = user
        // parts[1] + parts[2] = account (act_ID) ? No, account_id is likely act_... so just one part if no underscores in ID.
        // Wait, account_id usually has NO underscores if it's just raw number, but I used `act_...`?
        // Let's check key structure from output.
        console.log(`    Key: ${r.insight_key}`);

        // Verify mismatch
        // If campaign_id is 0 or mismatched with key part?
    });
}

checkHierarchy();
