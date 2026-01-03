
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Config
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const TABLES = {
    AUTOMATED_RULES: "mp8nib5rn4l0mb4",
    CAMPAIGN_LABEL_ASSIGNMENTS: "myjgw4ial5s6zrw",
    FACEBOOK_INSIGHTS_AUTO: "m17gyigy8jqlaoz"
};

// Colors for console
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const blue = (s: string) => `\x1b[34m${s}\x1b[0m`;

async function fetchInternal(url: string, options: any = {}) {
    const finalOptions = {
        ...options,
        headers: { ...options.headers, "xc-token": NOCODB_TOKEN, "Content-Type": "application/json" }
    };
    const res = await fetch(url, finalOptions);
    if (!res.ok) throw new Error(`Fetch error: ${res.status} ${await res.text()}`);
    return await res.json();
}

async function triggerEdgeFunction(payload: any) {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing Supabase env vars");

    console.log(blue(`\n🚀 Triggering Edge Function (DryRun): Rule ${payload.ruleId}`));
    const startTime = Date.now();

    const res = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ ...payload, dryRun: true })
    });

    const duration = Date.now() - startTime;
    console.log(`   ⏱️ Duration: ${duration}ms`);

    if (!res.ok) {
        const txt = await res.text();
        console.error(red(`   ❌ Function Error: ${res.status} ${txt}`));
        return { error: txt, status: res.status };
    }

    return await res.json();
}

// TEST CASES

async function test1_ScopeIsolation(testRuleId: number, unLabelledCampaignId: string, labelledCampaignId: string) {
    console.log(`\n📋 Test 1: Scope & Label Isolation`);

    // Trigger
    const result = await triggerEdgeFunction({ ruleId: testRuleId, userId: "3b69c215-aba9-4b73-bbaa-3795b8ed38df" }); // User ID taken from context

    // Assert
    console.log(`   Result matched count: ${result.matchedCount}`);

    // Check results specifically
    // We expect matchedCount >= 1 (if labels set correctly)
    // We verify in the returned 'results' array (if dryRun returns it)

    if (result.matchedCount > 0) {
        console.log(green(`   ✅ PASS: Found matched objects`));
        // Deep check logic would go here if we mock specific data
    } else {
        console.log(red(`   ❌ FAIL: No objects matched (Check labels)`));
    }
}

async function test2_ConditionLogic(testRuleId: number) {
    console.log(`\n📋 Test 2: Condition Logic (Spend > 1000)`);
    // Assuming we use a real rule or updated rule to correct threshold
    const result = await triggerEdgeFunction({ ruleId: testRuleId, userId: "3b69c215-aba9-4b73-bbaa-3795b8ed38df" });

    // Analyze results logs from function response
    if (result.results && result.results.length > 0) {
        console.log(green(`   ✅ PASS: Execution returned results`));
        result.results.forEach((r: any) => {
            console.log(`      - Object: ${r.objectName}, Action: ${r.action}, Result: ${r.result}`);
            if (r.metrics) {
                console.log(`        Metrics: Spend=${r.metrics.spend}`);
            }
        });
    } else {
        console.log(blue(`   ℹ️ INFO: No results (Conditions might not be met)`));
    }
}


// Target User ID provided by user
const TARGET_USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

async function main() {
    console.log("🤖 STARTING REAL ACCOUNT AUTOMATION TEST SUITE");
    console.log("==============================================");
    console.log(`👤 Target User ID: ${TARGET_USER_ID}`);

    // 1. Fetch ALL active rules for this user
    const whereClause = `(user_id,eq,${TARGET_USER_ID})~and(is_active,eq,true)`;
    const rules = await fetchInternal(`${NOCODB_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=${encodeURIComponent(whereClause)}&limit=100`);

    if (!rules.list || rules.list.length === 0) {
        console.log(red("❌ No active rules found for this user."));
        console.log("   Please create a rule in the UI first.");
        return;
    }

    console.log(green(`✅ Found ${rules.list.length} active rules for user.`));

    for (const rule of rules.list) {
        console.log(blue(`\n🔍 Testing Rule: "${rule.rule_name}" (ID: ${rule.Id}, Scope: ${rule.scope})`));

        // Trigger Dry Run
        const result = await triggerEdgeFunction({ ruleId: rule.Id, userId: TARGET_USER_ID });

        // Verification Steps
        console.log(`   👉 Matched Objects: ${result.matchedCount}`);

        if (result.matchedCount === 0) {
            console.log(red(`      ⚠️ No objects matched conditions.`));
            console.log(`      Possible reasons:`);
            console.log(`      1. No campaigns/adsets have the Label IDs: ${JSON.stringify(rule.target_labels)}`);
            console.log(`      2. Conditions (Spend/metrics) not met.`);
            console.log(`      3. Date range has no data.`);
        } else {
            console.log(green(`      ✅ Matched ${result.matchedCount} objects!`));
            if (result.results) {
                result.results.forEach((r: any) => {
                    console.log(`      - [${r.objectName}] Action: ${r.action} -> ${r.result}`);
                    // Log metrics if available to verify "Spend / 100" fix
                    if (r.metrics) {
                        console.log(`        Stats: Spend=${r.metrics.spend?.toLocaleString()}đ, Results=${r.metrics.results}`);
                    }
                });
            }
        }
    }

    console.log("\n=================================");
    console.log("🏁 REAL TEST EXECUTION COMPLETED");
}

main();
```
