const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

async function checkCampaignIds() {
    console.log(`\n🔍 Checking Campaign IDs...`);
    // Format: user_account_campaign_adset_ad_date
    // Level = campaign
    const where = encodeURIComponent(`(level,eq,campaign)`);
    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=50&sort=-date_start`;

    const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
    const data = await res.json();
    const list = data.list || [];

    console.log(`Found ${list.length} Campaigns.`);

    list.forEach(r => {
        console.log(`Camp: ${r.campaign_name} | ID: ${r.campaign_id} | Key: ${r.insight_key}`);
        if (r.campaign_id === '0' || r.campaign_id === 0 || r.campaign_id === 'undefined') {
            console.error('⚠️ INVALID CAMPAIGN ID FOUND!');
        }
    });
}

checkCampaignIds();
