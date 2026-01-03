// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const ADSET_ID = "120237109895570772";

async function checkAccountMismatch() {
    console.log("🔍 Checking Account Mismatch...");

    // 1. Get AdSet Info (from local Insights table first)
    console.log("1. Fetching AdSet info from NocoDB...");
    const insRes = await fetch(`${NOCODB_URL}/api/v2/tables/m17gyigy8jqlaoz/records?where=(adset_id,eq,${ADSET_ID})&limit=1`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const insData = await insRes.json();
    const insight = insData.list?.[0];

    if (!insight) {
        console.error("❌ AdSet not found in NocoDB Insights.");
    } else {
        console.log(`✅ AdSet Found. Account Name: ${insight.account_name}, ID: ${insight.account_id}`);
    }

    // 2. Get All Active Ad Accounts
    console.log("2. Fetching All Active Ad Accounts...");
    const accRes = await fetch(`${NOCODB_URL}/api/v2/tables/ms3iubpejoynr9a/records?where=(is_active,eq,1)`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const accData = await accRes.json();

    console.log(`Found ${accData.list.length} active accounts.`);
    accData.list.forEach(acc => {
        console.log(`   - Account: ${acc.account_name} (ID: ${acc.account_id})`);
        console.log(`     Token: ${acc.access_token.substring(0, 10)}...`);
    });

    // 3. Check if AdSet info matches "First" account (which the current code uses)
    const codeUsedAccount = accData.list[0];
    if (insight && codeUsedAccount) {
        if (insight.account_id == codeUsedAccount.account_id) {
            console.log("✅ Code IS using the correct account token (by luck). Issue must be Permissions/Scope.");
        } else {
            console.log("❌ CRITICAL: Code used Account " + codeUsedAccount.account_id + " but AdSet belongs to " + insight.account_id);
            console.log("   -> This explains the 'Object does not exist/Permission' error.");
        }
    }
}

checkAccountMismatch();
