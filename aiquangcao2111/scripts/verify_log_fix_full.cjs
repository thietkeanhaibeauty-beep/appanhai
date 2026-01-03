// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const RULES_TABLE = "mp8nib5rn4l0mb4";
const LOGS_TABLE = "masstbinn3h8hkr";
const USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

async function runEndToEndTest() {
    console.log("🚀 Starting End-to-End Log Verification...");

    // 1. Create Temporary Rule
    console.log("1. Creating Temporary Rule...");
    const rulePayload = {
        rule_name: "TEMP_DEBUG_RULE_" + Date.now(),
        user_id: USER_ID,
        is_active: true,
        scope: "adset",
        conditions: JSON.stringify([{ metric: "spend", operator: ">", value: 999999999 }]), // Won't match anything
        actions: JSON.stringify([{ type: "turn_off" }]),
        target_labels: "",
        check_frequency: 1440
    };

    const createRes = await fetch(`${NOCODB_URL}/api/v2/tables/${RULES_TABLE}/records`, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(rulePayload)
    });
    const createData = await createRes.json();
    const ruleId = createData.Id;

    if (!ruleId) {
        console.error("❌ Failed to create temp rule:", createData);
        return;
    }
    console.log(`✅ Created Temp Rule ID: ${ruleId}`);

    // 2. Trigger Rule
    console.log(`2. Triggering Rule ${ruleId}...`);
    try {
        const triggerRes = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
            body: JSON.stringify({ ruleId: ruleId, userId: USER_ID, manualRun: true })
        });
        console.log(`Trigger Status: ${triggerRes.status}`);
        const triggerText = await triggerRes.text();
        console.log("Trigger Response:", triggerText);

        // 3. Verify Log
        console.log("3. Verifying Log Status...");
        await new Promise(r => setTimeout(r, 5000)); // Wait for async logging

        const logRes = await fetch(`${NOCODB_URL}/api/v2/tables/${LOGS_TABLE}/records?where=(rule_id,eq,${ruleId})&limit=1&sort=-created_at`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const logData = await logRes.json();
        const log = logData.list?.[0];

        if (!log) {
            console.error("❌ No log found!");
        } else {
            console.log(`📝 Log ID: ${log.Id}, Status: "${log.status}"`);
            if (log.status === 'success' || log.status === 'failed') {
                console.log("✅ VERIFIED: Log transitioned out of pending!");
            } else {
                console.log("❌ FAILED: Log is still pending.");
            }
        }

    } catch (e) {
        console.error("❌ Execution Error:", e);
    } finally {
        // 4. Cleanup
        console.log("4. Cleaning up Temp Rule...");
        await fetch(`${NOCODB_URL}/api/v2/tables/${RULES_TABLE}/records`, {
            method: 'DELETE',
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Id: ruleId })
        });
        console.log("✅ Cleanup Done.");
    }
}

runEndToEndTest();
