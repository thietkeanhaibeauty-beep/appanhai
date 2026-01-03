// Script to check the actual action value stored in NocoDB for automation rules
import 'dotenv/config';

const NOCODB_BASE_URL = 'https://nocodata.proai.vn';
const NOCODB_API_TOKEN = 'tZ36F-hxuvgQmAHQEfv8KIvX-qC5YPXBF-bSidx5';
const TABLES = {
    AUTOMATED_RULES: 'mj4y800fnsnfi08'
};

async function checkRuleValue() {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?limit=10`, {
        headers: {
            'xc-token': NOCODB_API_TOKEN
        }
    });

    const data = await response.json();

    console.log('=== AUTOMATION RULES ===\n');

    for (const rule of data.list || []) {
        console.log(`📋 Rule: ${rule.rule_name} (ID: ${rule.Id})`);
        console.log(`   Status: ${rule.is_active ? 'Active' : 'Inactive'}`);

        // Parse actions
        let actions = rule.actions;
        if (typeof actions === 'string') {
            try {
                actions = JSON.parse(actions);
            } catch (e) {
                console.log(`   Actions (raw string): ${actions}`);
                continue;
            }
        }

        console.log(`   Actions type: ${typeof actions}`);
        console.log(`   Actions isArray: ${Array.isArray(actions)}`);

        if (Array.isArray(actions)) {
            for (const action of actions) {
                console.log(`\n   🎯 Action: ${action.type}`);
                console.log(`      value: ${action.value} (type: ${typeof action.value})`);
                console.log(`      budgetMode: ${action.budgetMode}`);
                console.log(`      Full action object:`, JSON.stringify(action, null, 2));

                // Simulate calculation
                if (action.type === 'increase_budget' && action.budgetMode === 'percentage') {
                    const testBudget = 200000;
                    const value = Number(action.value);
                    const multiplier = 1 + (value / 100);
                    const newBudget = testBudget * multiplier;
                    console.log(`\n      🧮 Simulation with 200,000₫ budget:`);
                    console.log(`         value = ${value}`);
                    console.log(`         multiplier = 1 + (${value}/100) = ${multiplier}`);
                    console.log(`         newBudget = ${testBudget} * ${multiplier} = ${newBudget}`);
                }
            }
        }

        console.log('\n' + '='.repeat(50) + '\n');
    }
}

checkRuleValue().catch(console.error);
