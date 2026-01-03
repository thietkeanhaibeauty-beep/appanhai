
// Config
const NOCODB_URL = "https://db.hpb.edu.vn";
// Using the token directly as in the previous script
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

// We need the Supabase URL/Key to trigger the function. 
// Since process.env might not be populated in this shell context without dotenv,
// I will attempt to read them or assume they are set. 
// If not, I'll log a warning. The user might need to provide them or I can hardcode 
// if I found them in previous file views (I saw them in index.ts).
// I will use placeholders that need to be filled if missing.
// Actually, I can get them from the user's project info if available, 
// but for now let's try to find them in the environment or use the ones from the edge function code I saw earlier? 
// The edge function code had NOCODB keys but Supabase keys are injected.
// I will try to use the ones from the `.env` file if I can read it, or just ask the user/hardcode for test.
// Wait, I can read .env file.
// Let's read .env first? No, I'll just write the script to use standard fetch and assume keys are needed.
// Actually, I can use the `supaabse-js` logic if I want, but raw fetch is easier.
// I will hardcode the URL from the deployment log!
// Deployment log said: "Deployed Functions on project jtaekxrkubhwtqgodvtx"
// URL should be: https://jtaekxrkubhwtqgodvtx.supabase.co/functions/v1/execute-automation-rule
// I need the SERVICE_ROLE_KEY to trigger it bypass RLS/Auth if needed, or Anon key.
// Edge function usually verifies Authorization header. 
// I will try to read .env in the next step or I can just peek at it now?
// I see `.env` in the file list.
// I'll assume the script runs in the root where .env is. 
// I'll add a simple .env parser.

const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) process.env[key.trim()] = val.trim();
            });
        }
    } catch (e) {
        console.log("Could not load .env file", e.message);
    }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || "https://jtaekxrkubhwtqgodvtx.supabase.co"; // Fallback from log
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES = {
    AUTOMATED_RULES: "mp8nib5rn4l0mb4",
};

const TARGET_USER_ID = "3b69c215-aba9-4b73-bbaa-3795b8ed38df";

// Colors
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const blue = (s) => `\x1b[34m${s}\x1b[0m`;

async function fetchInternal(url, options = {}) {
    const finalOptions = {
        ...options,
        headers: { ...options.headers, "xc-token": NOCODB_TOKEN, "Content-Type": "application/json" }
    };
    const res = await fetch(url, finalOptions);
    if (!res.ok) throw new Error(`Fetch error: ${res.status} ${await res.text()}`);
    return await res.json();
}

async function triggerEdgeFunction(payload) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error(red("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env"));
        return { matchedCount: 0, error: "Missing config" };
    }

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
        return { error: txt, status: res.status, matchedCount: 0 };
    }

    return await res.json();
}

async function main() {
    console.log("🤖 STARTING REAL ACCOUNT AUTOMATION TEST SUITE (Node.js)");
    console.log("========================================================");
    console.log(`👤 Target User ID: ${TARGET_USER_ID}`);

    // 1. Fetch ALL active rules
    const whereClause = `(user_id,eq,${TARGET_USER_ID})~and(is_active,eq,true)`;
    const url = `${NOCODB_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=${encodeURIComponent(whereClause)}&limit=100`;

    let rules;
    try {
        rules = await fetchInternal(url);
    } catch (e) {
        console.error(red(`❌ Failed to fetch rules: ${e.message}`));
        return;
    }

    if (!rules.list || rules.list.length === 0) {
        console.log(red("❌ No active rules found for this user."));
        return;
    }

    console.log(green(`✅ Found ${rules.list.length} active rules for user.`));

    for (const rule of rules.list) {
        console.log(blue(`\n🔍 Testing Rule: "${rule.rule_name}" (ID: ${rule.Id}, Scope: ${rule.scope})`));

        const result = await triggerEdgeFunction({ ruleId: rule.Id, userId: TARGET_USER_ID });

        console.log(`   👉 Matched Objects: ${result.matchedCount}`);

        if (result.matchedCount === 0) {
            console.log(red(`      ⚠️ No objects matched conditions.`));
        } else {
            console.log(green(`      ✅ Matched ${result.matchedCount} objects!`));
            if (result.results) {
                result.results.forEach((r) => {
                    console.log(`      - [${r.objectName}] Action: ${r.action} -> ${r.result}`);
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
