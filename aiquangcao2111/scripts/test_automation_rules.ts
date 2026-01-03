/**
 * Test Script for Automation Rules - Debug Version
 * Run with: npx tsx scripts/test_automation_rules.ts
 */

// Use correct config from backend
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    AUTOMATION_RULE_EXECUTION_LOGS: 'masstbinn3h8hkr'
};

function parseJSON(str: string | any, fallback: any = null) {
    if (typeof str === 'object') return str;
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('              AUTOMATION RULES FIELD AUDIT TEST                 ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. Fetch rules
    console.log('📋 Fetching rules from NocoDB...\n');
    const rulesUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?limit=50`;
    console.log(`URL: ${rulesUrl}\n`);

    const rulesResponse = await fetch(rulesUrl, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    console.log(`Response status: ${rulesResponse.status}`);

    if (!rulesResponse.ok) {
        console.error('Failed to fetch rules:', await rulesResponse.text());
        return;
    }

    const rulesData = await rulesResponse.json();
    console.log(`Total rules fetched: ${rulesData.list?.length || 0}\n`);

    if (!rulesData.list || rulesData.list.length === 0) {
        console.log('⚠️ No rules found in database');
        return;
    }

    // 2. Analyze each rule
    for (const rule of rulesData.list) {
        console.log('\n' + '─'.repeat(60));
        console.log(`📌 Rule: "${rule.rule_name}" (ID: ${rule.Id})`);
        console.log('─'.repeat(60));
        console.log(`   Active: ${rule.is_active ? '✅ Yes' : '❌ No'}`);
        console.log(`   Scope: ${rule.scope}`);
        console.log(`   Time Range: ${rule.time_range}`);
        console.log(`   Target Labels: ${rule.target_labels}`);

        // Parse and check actions
        const actions = parseJSON(rule.actions, []);
        console.log(`\n   📦 Actions (${actions.length}):`);

        if (actions.length === 0) {
            console.log('   ⚠️ No actions defined!');
        }

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            console.log(`\n   [${i + 1}] Type: ${action.type}`);

            // Show all fields
            console.log(`       Raw action object:`);
            for (const [key, value] of Object.entries(action)) {
                console.log(`       - ${key}: ${JSON.stringify(value)} (${typeof value})`);
            }

            if (action.type === 'increase_budget' || action.type === 'decrease_budget') {
                const hasValueType = 'valueType' in action;
                const hasBudgetMode = 'budgetMode' in action;

                console.log(`\n       🔍 Budget Mode Analysis:`);
                console.log(`       - valueType present: ${hasValueType ? '✅' : '❌'} (value: ${action.valueType})`);
                console.log(`       - budgetMode present: ${hasBudgetMode ? '✅' : '❌'} (value: ${action.budgetMode})`);

                // Effective mode (matching backend logic)
                const effectiveMode = action.budgetMode || action.valueType || 'percentage';
                console.log(`       - Effective mode: ${effectiveMode}`);

                // Simulate calculation
                const testBudget = 200000;
                const value = Number(action.value) || 0;
                let newBudget = 0;

                if (effectiveMode === 'percentage') {
                    if (action.type === 'increase_budget') {
                        newBudget = testBudget * (1 + value / 100);
                    } else {
                        newBudget = testBudget * (1 - value / 100);
                    }
                    console.log(`       🧮 Simulation (${effectiveMode}):`);
                    console.log(`          ${testBudget.toLocaleString()}₫ × (1 ${action.type === 'increase_budget' ? '+' : '-'} ${value}/100)`);
                    console.log(`          = ${testBudget.toLocaleString()}₫ × ${(1 + (action.type === 'increase_budget' ? 1 : -1) * value / 100).toFixed(2)}`);
                    console.log(`          = ${Math.round(newBudget).toLocaleString()}₫`);
                } else {
                    if (action.type === 'increase_budget') {
                        newBudget = testBudget + value;
                    } else {
                        newBudget = testBudget - value;
                    }
                    console.log(`       🧮 Simulation (${effectiveMode}):`);
                    console.log(`          ${testBudget.toLocaleString()}₫ ${action.type === 'increase_budget' ? '+' : '-'} ${value.toLocaleString()}₫`);
                    console.log(`          = ${Math.round(newBudget).toLocaleString()}₫`);
                }

                // Check for issues
                if (!hasValueType && !hasBudgetMode) {
                    console.log(`       ⚠️ WARNING: Neither valueType nor budgetMode is set!`);
                    console.log(`       → Backend will default to 'percentage' mode`);
                }
            }
        }

        // Parse and check conditions
        const conditions = parseJSON(rule.conditions, []);
        console.log(`\n   📊 Conditions (${conditions.length}):`);

        for (const condition of conditions) {
            console.log(`   - ${condition.metric} ${condition.operator} ${condition.value}`);
        }
    }

    // 3. Fetch recent logs
    console.log('\n\n' + '═'.repeat(60));
    console.log('📊 RECENT EXECUTION LOGS');
    console.log('═'.repeat(60) + '\n');

    const logsUrl = `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records?limit=5&sort=-executed_at`;
    const logsResponse = await fetch(logsUrl, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    if (!logsResponse.ok) {
        console.error('Failed to fetch logs:', await logsResponse.text());
        return;
    }

    const logsData = await logsResponse.json();
    console.log(`Found ${logsData.list?.length || 0} recent logs\n`);

    for (const log of logsData.list || []) {
        console.log('─'.repeat(60));
        console.log(`📅 ${log.executed_at}`);
        console.log(`   Rule ID: ${log.rule_id}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Matched: ${log.matched_objects_count} | Executed: ${log.executed_actions_count}`);

        const details = parseJSON(log.details, []);
        if (Array.isArray(details) && details.length > 0) {
            for (const result of details.slice(0, 2)) {
                if (result.details?.budgetBefore && result.details?.budgetAfter) {
                    const before = result.details.budgetBefore;
                    const after = result.details.budgetAfter;
                    const changePercent = ((after - before) / before * 100).toFixed(1);
                    console.log(`\n   💰 ${result.objectName}:`);
                    console.log(`      ${before.toLocaleString()}₫ → ${after.toLocaleString()}₫ (${changePercent}%)`);

                    if (Math.abs(Number(changePercent)) < 1) {
                        console.log(`      ⚠️ ISSUE: Change is less than 1% - possibly using wrong mode!`);
                    }
                }
            }
        }
    }

    // 4. Summary
    console.log('\n\n' + '═'.repeat(60));
    console.log('📋 FIELD MAPPING SUMMARY');
    console.log('═'.repeat(60));
    console.log(`
Frontend → Backend Field Mapping:

┌────────────────────┬────────────────────┬──────────────┐
│ Frontend Field     │ Backend Field      │ Status       │
├────────────────────┼────────────────────┼──────────────┤
│ valueType          │ budgetMode         │ ✅ Fixed     │
│ 'percentage'       │ 'percentage'       │ ✅ Match     │
│ 'amount'           │ 'absolute'         │ ⚠️ Works*    │
│ revertAfterHours   │ revertAfterHours   │ ✅ Match     │
│ executeAt          │ executeAt          │ ✅ Match     │
│ autoRevert         │ autoRevert         │ ✅ Match     │
└────────────────────┴────────────────────┴──────────────┘

* 'amount' works because backend treats anything != 'percentage' as absolute
`);
}

main().catch(console.error);
