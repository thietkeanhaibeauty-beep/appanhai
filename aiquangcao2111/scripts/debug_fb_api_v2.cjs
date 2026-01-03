const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_AD_ACCOUNTS = 'm92025345781283'; // Usually finding via API is safer but let's assume valid from environment

async function run() {
    // 1. Get Token from NocoDB
    console.log('Fetching Access Token...');
    // We need to list tables to find ID? No, assuming I can find it. 
    // In sync-ads-cron/index.ts: TABLE_AD_ACCOUNTS = NOCODB_CONFIG.TABLES.FACEBOOK_AD_ACCOUNTS
    // which is likely 'm9...'?
    // Let's rely on finding table by name if possible, or listing active accounts from a known table ID.
    // Actually, I can just use the ID from `check_column_type.cjs` which accessed `FACEBOOK_INSIGHTS_AUTO`.
    // Let's try to list all tables to find FACEBOOK_AD_ACCOUNTS first to be sure.
    // Or just look at `nocodb-config.ts` if I can?

    // Hardcoding the Table ID for Ad Accounts from my knowledge of typical setup or just listing them.
    // Wait, I can read `_shared/nocodb-config.ts`.

    const config = await import('../_shared/nocodb-config.ts').catch(() => null);
    // Cannot import in CJS easily without dynamic import and path mess.

    // Let's just list tables.
    const tablesRes = await fetch(`${NOCODB_URL}/api/v2/meta/bases/p7m12789/tables`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const tables = await tablesRes.json().catch(() => ({ list: [] }));
    const accTable = tables.list?.find(t => t.title === 'FACEBOOK_AD_ACCOUNTS');

    if (!accTable) {
        console.error('Could not find FACEBOOK_AD_ACCOUNTS table');
        return;
    }

    const accRes = await fetch(`${NOCODB_URL}/api/v2/tables/${accTable.id}/records?where=(is_active,eq,1)&limit=1`, {
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
    // console.log(`Token: ${ACCESS_TOKEN.substring(0, 10)}...`);

    // 2. Test FB API
    const DATE_PRESET = "today";
    const FACEBOOK_BASE_URL = "https://graph.facebook.com/v21.0";

    console.log(`\n🔍 Fetching Insights (Preset: ${DATE_PRESET})`);

    const insightFields = [
        "campaign_id", "campaign_name", "spend", "impressions"
    ].join(",");

    const url = `${FACEBOOK_BASE_URL}/act_${AD_ACCOUNT_ID}/insights?level=campaign&date_preset=${DATE_PRESET}&fields=${insightFields}&limit=100&access_token=${ACCESS_TOKEN}`;

    console.log(`URL: ${url}`);

    const res = await fetch(url);
    const json = await res.json();

    if (json.error) {
        console.error('❌ API Error:', json.error);
        return;
    }

    console.log(`Found ${json.data.length} records.`);
    json.data.forEach(item => {
        console.log(`Camp: ${item.campaign_name} | Spend: ${item.spend}`);
    });

    const targetName = "Feedback Sáng 9/12";
    const target = json.data.find(i => i.campaign_name && i.campaign_name.includes(targetName));
    if (target) {
        console.log(`\n✅ FOUND TARGET: ${target.campaign_name} - Spend: ${target.spend}`);
    } else {
        console.log(`\n❌ TARGET "${targetName}" NOT FOUND in response.`);
    }
}

run();
