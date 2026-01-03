// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const ADSET_ID = "120237109895570772"; // Target AdSet from user report
const USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

async function debugAction() {
    console.log(`🚀 Debugging Action Execution for AdSet ${ADSET_ID}...`);

    // 1. Get Access Token
    console.log("1. Fetching Ad Account...");
    const accRes = await fetch(`${NOCODB_URL}/api/v2/tables/ms3iubpejoynr9a/records?where=(is_active,eq,1)&limit=1`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const accData = await accRes.json();
    const account = accData.list?.[0];
    if (!account) { console.error("❌ No active ad account"); return; }
    const token = account.access_token;
    console.log(`✅ Got token: ${token.substring(0, 10)}...`);

    // 2. Execute Turn Off
    console.log("2. Executing TURN OFF (PAUSE)...");
    const url = `https://graph.facebook.com/v18.0/${ADSET_ID}?access_token=${token}`;

    const payload = {
        status: 'PAUSED',
        access_token: token
    };

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await resp.json();
        console.log("3. Facebook Response:");
        console.log(JSON.stringify(data, null, 2));

        if (data.error) {
            console.error("❌ Action Failed with Facebook Error!");
        } else if (data.success) {
            console.log("✅ Action Reported Success by Facebook.");

            // Check current status verification
            console.log("4. Verifying status...");
            const verResp = await fetch(`https://graph.facebook.com/v18.0/${ADSET_ID}?fields=status&access_token=${token}`);
            const verData = await verResp.json();
            console.log("   Current Status:", verData.status);
        }
    } catch (e) {
        console.error("❌ Network/Script Error:", e);
    }
}

debugAction();
