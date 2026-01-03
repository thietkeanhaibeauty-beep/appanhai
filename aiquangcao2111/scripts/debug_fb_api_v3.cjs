const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_AD_ACCOUNTS = 'ms3iubpejoynr9a'; // Found in nocodb-config.ts

async function run() {
    console.log(`fetching token from table ${TABLE_AD_ACCOUNTS}...`);

    const accRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_AD_ACCOUNTS}/records?where=(is_active,eq,1)&limit=1`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const accounts = await accRes.json();
    const account = accounts.list?.[0];

    if (!account) {
        console.error('No active account found');
        return;
    }

    const ACCESS_TOKEN = account.access_token;
    const AD_ACCOUNT_ID = account.account_id;

    console.log(`Using Account: ${AD_ACCOUNT_ID}`);
    // console.log(`Token: ${ACCESS_TOKEN.substring(0, 5)}...`);

    const DATE_PRESET = "today";
    const FACEBOOK_BASE_URL = "https://graph.facebook.com/v21.0";

    console.log(`\n🔍 Fetching Insights (Preset: ${DATE_PRESET})`);

    const insightFields = [
        "campaign_id", "campaign_name", "spend", "impressions"
    ].join(",");

    const normalizedAccountId = AD_ACCOUNT_ID.startsWith('act_') ? AD_ACCOUNT_ID : `act_${AD_ACCOUNT_ID}`;
    const url = `${FACEBOOK_BASE_URL}/${normalizedAccountId}/insights?level=campaign&date_preset=${DATE_PRESET}&fields=${insightFields}&limit=100&access_token=${ACCESS_TOKEN}`;

    console.log(`URL: ${url}`);

    const res = await fetch(url);
    const json = await res.json();

    if (json.error) {
        console.error('❌ API Error:', json.error);
        return;
    }

    console.log(`Found ${json.data.length} records.`);

    let foundTarget = false;
    json.data.forEach(item => {
        const isTarget = item.campaign_name && item.campaign_name.includes("Feedback Sáng 9/12");
        if (isTarget) foundTarget = true;
        console.log(`Camp: ${item.campaign_name} | Spend: ${item.spend}${isTarget ? ' <--- TARGET' : ''}`);
    });

    if (foundTarget) {
        console.log(`\n✅ FOUND "Feedback Sáng 9/12". API is returning it.`);
    } else {
        console.log(`\n❌ TARGET "Feedback Sáng 9/12" NOT FOUND in API response.`);
    }
}

run();
