
// Config
const NOCODB_URL = "https://db.hpb.edu.vn";
const NOCODB_TOKEN = "8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_";

const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '../.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf8');
            content.split('\n').forEach(line => {
                const [key, val] = line.split('=');
                if (key && val) {
                    let cleanedVal = val.trim();
                    if (cleanedVal.startsWith('"') && cleanedVal.endsWith('"')) {
                        cleanedVal = cleanedVal.slice(1, -1);
                    }
                    process.env[key.trim()] = cleanedVal;
                }
            });
        }
    } catch (e) {
        console.log("Could not load .env file", e.message);
    }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jtaekxrkubhwtqgodvtx.supabase.co";
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

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
