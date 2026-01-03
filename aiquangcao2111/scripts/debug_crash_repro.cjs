// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Use service role if available, else anon
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

const RULE_ID = 68; // Inferred from screenshot showing pending log 14
const USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

// We will Invoke the Edge Function directly to see the error in the response
// The issue is that the function might crash *before* returning valid JSON, or return 500
async function reproCrash() {
    console.log(`🚀 Simulating run for Rule ${RULE_ID}...`);

    try {
        const url = `${SUPABASE_URL}/functions/v1/execute-automation-rule`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                ruleId: RULE_ID,
                userId: USER_ID,
                manualRun: true
            })
        });

        const text = await response.text();
        console.log(`Response Status: ${response.status}`);
        console.log(`Response Body: ${text}`);

        if (response.status !== 200) {
            console.error("❌ Function returned non-200 status. Likely crashed.");
        } else {
            console.log("✅ Function returned 200. Check properties.");
        }

    } catch (e) {
        console.error("Error invoking function:", e);
    }
}

reproCrash();
