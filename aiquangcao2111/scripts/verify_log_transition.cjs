// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

const RULE_ID = 68;
const USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";
const LOGS_TABLE_ID = "masstbinn3h8hkr";

async function verifyLog() {
    console.log(`🚀 Triggering Rule ${RULE_ID}...`);

    // 1. Trigger
    const triggerRes = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
        body: JSON.stringify({ ruleId: RULE_ID, userId: USER_ID, manualRun: true })
    });
    console.log(`Trigger Status: ${triggerRes.status}`);
    const triggerData = await triggerRes.json();
    console.log("Trigger Response:", triggerData);

    // 2. Wait for async processing (although my function is synchronous, network latency to NocoDB applies)
    console.log("⏳ Waiting 3s for logs to sync...");
    await new Promise(r => setTimeout(r, 3000));

    // 3. Check Latest Log
    console.log("🔍 Checking Latest Log...");
    const logRes = await fetch(`${NOCODB_URL}/api/v2/tables/${LOGS_TABLE_ID}/records?where=(rule_id,eq,${RULE_ID})&limit=1&sort=-created_at`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const logData = await logRes.json();

    if (!logData.list || logData.list.length === 0) {
        console.error("❌ No logs found!");
        return;
    }

    const latestLog = logData.list[0];
    console.log("📝 Latest Log Entry:");
    console.log(`   - ID: ${latestLog.Id}`);
    console.log(`   - Status: ${latestLog.status}`);
    console.log(`   - Actions: ${latestLog.executed_actions_count}`);
    console.log(`   - Timestamp: ${latestLog.created_at}`);

    if (latestLog.status === 'success') {
        console.log("✅ VERIFIED: Log status is SUCCESS.");
    } else {
        console.error("❌ FAILED: Log status is still " + latestLog.status);
    }
}

verifyLog();
