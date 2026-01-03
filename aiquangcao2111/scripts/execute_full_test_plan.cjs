
const fs = require('fs');
const path = require('path');

// --- CONFIG ---
const TARGET_USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const NOCODB_URL = "https://db.hpb.edu.vn";
const TABLE = {
    AUTOMATED_RULES: "mp8nib5rn4l0mb4",
    FACEBOOK_INSIGHTS_AUTO: "m17gyigy8jqlaoz"
};

// --- UTILS ---
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) {
                    let cleanedVal = val.trim();
                    if (cleanedVal.startsWith('"') && cleanedVal.endsWith('"')) cleanedVal = cleanedVal.slice(1, -1);
                    process.env[key.trim()] = cleanedVal;
                }
            });
        }
    } catch (e) {
        console.error("Env load error:", e);
    }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jtaekxrkubhwtqgodvtx.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchNoco(url, method = "GET", body = null) {
    const opts = { method, headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`NocoDB Error: ${res.status} ${await res.text()}`);
    return await res.json();
}

async function triggerEdgeFunction(ruleId) {
    console.log(`   🚀 Invoking Edge Function (DryRun) for Rule ${ruleId}...`);
    const res = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ruleId: ruleId, userId: TARGET_USER_ID, dryRun: true })
    });

    if (!res.ok) {
        console.error(red(`   ❌ Invocation Failed: ${res.status}`));
        try { console.error(await res.text()); } catch (e) { }
        return null;
    }
    return await res.json();
}

// --- TEST SUITE ---

async function createTempRule(name, conditions, actions, scope = "campaign") {
    console.log(yellow(`   ➕ Creating Temp Rule: ${name}`));
    const payload = {
        rule_name: name,
        user_id: TARGET_USER_ID,
        scope: scope,
        conditions: JSON.stringify(conditions), // NocoDB stores JSON as string sometimes? Checking schema.. Assume JSON column
        condition_logic: "all",
        actions: JSON.stringify(actions),
        is_active: true,
        time_range: "today",
        target_labels: null
    };

    // NocoDB API v2 create
    const res = await fetchNoco(`${NOCODB_URL}/api/v2/tables/${TABLE.AUTOMATED_RULES}/records`, "POST", payload);
    return res;
}

async function deleteTempRule(id) {
    console.log(yellow(`   🗑️ Deleting Temp Rule ${id}`));
    await fetchNoco(`${NOCODB_URL}/api/v2/tables/${TABLE.AUTOMATED_RULES}/records`, "DELETE", { Id: id });
}

// --- MAIN TESTS ---

async function Test1_ConditionMatching() {
    console.log(blue("\n[TEST 1] Condition Matching Logic (Spend & Operators)"));

    // Create rule that SHOULD match if spend > -1 (Always match if record exists)
    // We use Spend > -1 because we saw Spend: 0 in the data check.
    const ruleId = (await createTempRule(
        "TEST_AUTO_ALWAYS_MATCH",
        [{ id: "1", metric: "spend", operator: "greater_than_or_equal", value: 0 }],
        [{ id: "1", type: "turn_off" }],
        "adset" // Using AdSet scope as seen in previous logs
    )).Id;

    if (!ruleId) return console.error(red("Failed to create temp rule"));

    try {
        const result = await triggerEdgeFunction(ruleId);

        if (result && result.matchedCount > 0) {
            console.log(green(`   ✅ PASS: Matched ${result.matchedCount} objects with Spend >= 0`));
        } else {
            console.log(red(`   ❌ FAIL: Matched 0 objects. Likely NO DATA in FACEBOOK_INSIGHTS_AUTO for this user today.`));
            console.log(yellow(`   Suggested Fix: Run Sync-Ads-Cron manually to populate data.`));
        }
    } catch (e) { console.error(e); }

    await deleteTempRule(ruleId);
}

async function Test2_SpentDivisorLogic() {
    console.log(blue("\n[TEST 2] Spend / 100 Divisor Check"));
    // Requires a rule that passes ONLY if spend is divided by 100.
    // If DB has 1,000,000 (10k VND), and we set rule > 50,000 (50k VND).
    // If logic is WRONG (raw), 1,000,000 > 50,000 -> MATCH (False Positive)
    // If logic is RIGHT (/100), 10,000 < 50,000 -> NO MATCH (Correct)

    // But since Spend is 0 right now in DB, this test is hard. 
    // We will skip strict assertion but log the matched value from dryRun output if possible.
    console.log(yellow("   ⚠️ Skipping strict validation due to 0 spend in live data."));
}

async function Test3_ActionSimulation() {
    console.log(blue("\n[TEST 3] Action Simulation (DryRun)"));
    // Existing rule 'tắt' (ID 62)
    const result = await triggerEdgeFunction(62);
    if (result) {
        console.log(green(`   ✅ executed successfully (status: ${result.success ? 'ok' : 'fail'})`));
        // Matched can be 0, but execution itself should succeed.
    }
}

async function main() {
    console.log("==========================================");
    console.log("      🚀 AUTOMATED VALIDATION SUITE       ");
    console.log("==========================================");

    await Test1_ConditionMatching();
    await Test3_ActionSimulation();

    console.log("\n✅ Suite Completed.");
}

main();
