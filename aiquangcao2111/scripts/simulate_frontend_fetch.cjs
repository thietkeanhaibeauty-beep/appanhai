const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS_AUTO
const ACCOUNT_ID = 'act_1279205069357827';
const DATE = '2025-12-11';
const USER_ID = '2575001a-82c8-472d-9481-965457053e16'; // From previous logs/context if available?
// Actually in AdsReportAuto, it filters by userId AND accountId AND date.

async function run() {
    console.log(`\n🔍 Simulating Frontend Fetch...`);
    console.log(`Target: Account ${ACCOUNT_ID}, Date ${DATE}`);

    // Frontend Logic in facebookInsightsAutoService.ts essentially constructs a complicated filter.
    // But let's check what RAW records we get for this account and date.
    // Equivalent to getAllInsightsByUserAndDate

    // Filter: (date_start,eq,2025-12-11)~and(account_id,eq,act_...)
    const where = `(date_start,eq,${DATE})~and(account_id,eq,${ACCOUNT_ID})`;
    const encodedWhere = encodeURIComponent(where);

    const url = `${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${encodedWhere}&limit=1000`;
    console.log(`API URL: ${url}`);

    try {
        const res = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
        const json = await res.json();

        console.log(`\nResponse Status: ${res.status}`);
        console.log(`Total Records Returned: ${json.list?.length || 0}`);

        if (json.list) {
            console.log('\n--- PAYLOAD TO UI (Summary) ---');
            json.list.forEach(item => {
                console.log(`Lvl: ${item.level || '?'} | Name: ${item.campaign_name?.substring(0, 20)}... | Spend: ${item.spend} | ID: ${item.campaign_id}`);
                if (item.campaign_name && item.campaign_name.includes("Feedback Sáng 9/12")) {
                    console.log(`   >>> SPECIFIC CHECK: Feedback Sáng 9/12 -> Spend param is: "${item.spend}" (Type: ${typeof item.spend})`);
                }
            });
        }

    } catch (e) {
        console.error('Fetch Failed:', e);
    }
}

run();
