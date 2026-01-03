const fetch = require('node-fetch');

const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    AUTOMATED_RULES: "mlsshti794grsvf",
    FACEBOOK_AD_ACCOUNTS: "ms3iubpejoynr9a"
};

async function check() {
    try {
        // 1. Get Rule 5 to find User ID
        console.log("Fetching Rule 5...");
        const ruleRes = await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=(Id,eq,5)`, {
            headers: { 'xc-token': NOCODB_API_TOKEN }
        });
        const ruleData = await ruleRes.json();
        const rule = ruleData.list[0];

        if (!rule) {
            console.error("Rule 5 not found!");
            return;
        }

        const userId = rule.user_id;
        console.log(`Rule 5 belongs to User ID: ${userId}`);

        // 2. Get Ad Accounts for User
        console.log(`Fetching Ad Accounts for User ${userId}...`);
        const accRes = await fetch(`${NOCODB_API_URL}/api/v2/tables/${TABLES.FACEBOOK_AD_ACCOUNTS}/records?where=(user_id,eq,${userId})`, {
            headers: { 'xc-token': NOCODB_API_TOKEN }
        });
        const accData = await accRes.json();

        console.log("\n--- AD ACCOUNTS ---");
        accData.list.forEach(acc => {
            console.log(`ID: ${acc.id} | Account ID: ${acc.account_id} | Name: ${acc.account_name} | Currency: [${acc.currency}] | Active: ${acc.is_active}`);
        });
        console.log("-------------------");

    } catch (error) {
        console.error("Error:", error);
    }
}

check();
