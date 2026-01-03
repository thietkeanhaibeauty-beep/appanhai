// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const RULES_TABLE = "mp8nib5rn4l0mb4";
const LOGS_TABLE = "masstbinn3h8hkr";
const USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

async function runTest() {
    console.log("🚀 Starting Inspectable Test...");

    // 1. Create Temporary Rule
    const rulePayload = {
        rule_name: "DEBUG_LOG_TEST_" + Date.now(),
        user_id: USER_ID,
        is_active: true,
        scope: "adset",
        conditions: JSON.stringify([{ metric: "spend", operator: ">", value: 999999999 }]),
        actions: JSON.stringify([{ type: "turn_off" }]),
        target_labels: null // Ensure no labels to trigger broad search/skip
    };

    const createRes = await fetch(`${NOCODB_URL}/api/v2/tables/${RULES_TABLE}/records`, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(rulePayload)
    });
    const createData = await createRes.json();
    const ruleId = createData.Id;
    console.log(`✅ Created Temp Rule ID: ${ruleId}`);

    // 2. Trigger Rule
    console.log(`Triggering Rule ${ruleId}...`);
    const triggerRes = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ ruleId: ruleId, userId: USER_ID, manualRun: true })
    });
    console.log(`Trigger Status: ${triggerRes.status}`);
    console.log("Trigger Response:", await triggerRes.text());

    // 3. List ALL Logs for this Rule (Raw)
    console.log("WAITING 5s...");
    await new Promise(r => setTimeout(r, 5000));

    const logUrl = `${NOCODB_URL}/api/v2/tables/${LOGS_TABLE}/records?where=(rule_id,eq,${ruleId})`;
    console.log("Fetching Logs from:", logUrl);

    const logRes = await fetch(logUrl, { headers: { 'xc-token': NOCODB_TOKEN } });
    const logData = await logRes.json();

    console.log(`Found ${logData.list ? logData.list.length : 0} logs.`);
    if (logData.list) {
        logData.list.forEach(l => {
            console.log(`Log [${l.Id}] Status: "${l.status}" | CreatedAt: ${l.CreatedAt}`);
        });
    }
}

runTest();
