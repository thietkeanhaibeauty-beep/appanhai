const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_AD_ACCOUNTS = 'ms3iubpejoynr9a';

async function testFbApi() {
    console.log('🔍 Fetching Ad Account Access Token...');
    const res = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_AD_ACCOUNTS}/records?limit=1&where=(is_active,eq,1)`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const data = await res.json();
    const account = data.list?.[0];

    if (!account || !account.access_token) {
        console.error('❌ No active ad account or token found!');
        return;
    }

    const accountId = account.account_id.startsWith('act_') ? account.account_id : `act_${account.account_id}`;
    const token = account.access_token;

    console.log(`✅ Found Account: ${accountId}`);

    // Construct the URL exactly as in sync-ads-cron
    const insightFields = [
        "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
        "date_start", "date_stop", "impressions", "clicks", "spend", "reach", "frequency",
        "ctr", "cpc", "cpm", "cpp", "cost_per_unique_click", "actions", "action_values",
        "cost_per_action_type", "objective",
        "video_p25_watched_actions", "video_p50_watched_actions", "video_p75_watched_actions", "video_p100_watched_actions"
    ].join(",");

    const url = `https://graph.facebook.com/v21.0/${accountId}/insights?level=campaign&date_preset=today&fields=${insightFields}&limit=5&access_token=${token}`;

    console.log(`\n🔄 Calling FB API: ${url}`);

    const fbRes = await fetch(url);
    if (!fbRes.ok) {
        const txt = await fbRes.text();
        console.error(`❌ FB API Error: ${fbRes.status}`, txt);
    } else {
        const fbData = await fbRes.json();
        console.log(`✅ FB API Success! Records: ${fbData.data?.length}`);
        if (fbData.data?.length > 0) {
            console.log('Sample Record:', JSON.stringify(fbData.data[0], null, 2));
        } else {
            console.log('⚠️ No records returned from FB for today.');
        }
    }
}

testFbApi();
