// Native fetch used in Node 18+
require('dotenv').config({ path: 'i:/aiquangcao2111/.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const LOGS_TABLE_ID = "masstbinn3h8hkr";
const RULES_TABLE_ID = "mp8nib5rn4l0mb4";
// Use the ID of the user who is reporting the issue
const TEST_USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

async function testManualRun() {
    console.log("🛠️ Creating Temporary Test Rule in NocoDB...");

    // 1. Create Test Rule
    const createRes = await fetch(`${NOCODB_URL}/api/v2/tables/${RULES_TABLE_ID}/records`, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            rule_name: "TEST_MANUAL_LOG_FIX_" + Date.now(),
            user_id: TEST_USER_ID,
            scope: "campaign",
            is_active: true,
            condition_logic: "all",
            conditions: [],
            actions: [],
            labels: [],
            target_labels: [], // Global rule
            time_range: "today"
        })
    });

    const createData = await createRes.json();
    const ruleId = createData.Id;

    if (!ruleId) {
        console.error("❌ Failed to create test rule:", createData);
        return;
    }
    console.log(`✅ Created Test Rule ID: ${ruleId}`);

    try {
        console.log(`🚀 Triggering execute-automation-rule for Rule ${ruleId} (Manual Run)...`);

        const url = `${SUPABASE_URL}/functions/v1/execute-automation-rule`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({
                ruleId: ruleId,
                userId: TEST_USER_ID,
                manualRun: true
            })
        });

        const data = await response.json();
        console.log("✅ Function Response:", data);

        // Check Logs - List latest 10
        console.log("🔍 Listing Latest 10 Execution Logs in NocoDB...");
        await new Promise(r => setTimeout(r, 4000));

        // Use correct sort field 'CreatedAt'
        const logUrl = `${NOCODB_URL}/api/v2/tables/${LOGS_TABLE_ID}/records?sort=-CreatedAt&limit=10`;
        const logRes = await fetch(logUrl, {
            headers: {
                'xc-token': NOCODB_TOKEN
            }
        });

        const logData = await logRes.json();
        console.log(`Found ${logData.list?.length || 0} logs.`);

        const foundLog = logData.list?.find(l => {
            const rId = typeof l.rule_id === 'object' ? l.rule_id?.Id : l.rule_id;
            return rId == ruleId;
        });

        if (foundLog) {
            console.log("📝 Log Entry FOUND for Rule " + ruleId + " (SUCCESS):");
            console.log(`   - ID: ${foundLog.Id}`);
            console.log(`   - Status: ${foundLog.status}`);
            console.log(`   - details: ${foundLog.details}`);
        } else {
            console.error("❌ No log entry found for this rule in recent logs!");
            if (logData.list?.length > 0) {
                console.log("Recent log IDs:", logData.list.map(l => l.Id));
                console.log("Recent log RuleIDs:", logData.list.map(l => typeof l.rule_id === 'object' ? l.rule_id?.Id : l.rule_id));
            }
        }

    } catch (e) {
        console.error("Error during test:", e);
    } finally {
        // Cleanup
        console.log("🧹 Cleaning up Test Rule...");
        await fetch(`${NOCODB_URL}/api/v2/tables/${RULES_TABLE_ID}/records`, {
            method: 'DELETE',
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Id: ruleId })
        });
        console.log("✅ Cleanup complete.");
    }
}

testManualRun();
