/**
 * Test runner cho các quy tắc FIX-TEST
 * Usage: npx tsx scripts/test_fix_rules.ts <rule_id>
 */

const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

const RULES = {
    14: { name: 'FIX-TEST-1: maxExecutions=1', field: 'maxExecutionsPerObject', expected: 'Lần 2 sẽ skip' },
    15: { name: 'FIX-TEST-2: cooldown=1min', field: 'cooldownHours', expected: 'Lần 2 trong 1 phút sẽ skip' },
    16: { name: 'FIX-TEST-3: maxBudget=300K', field: 'maxBudgetDailySpend', expected: 'Budget bị cap ở 300K' },
    17: { name: 'FIX-TEST-4: minROAS=1.5', field: 'minRoasThreshold', expected: 'Skip nếu ROAS < 1.5' },
    18: { name: 'FIX-TEST-5: autoRevert=3min', field: 'autoRevert', expected: 'Tắt, 3 phút sau bật lại' }
};

async function main() {
    const ruleId = parseInt(process.argv[2]);

    if (!ruleId || !RULES[ruleId as keyof typeof RULES]) {
        console.log('═'.repeat(60));
        console.log('📋 DANH SÁCH QUY TẮC TEST');
        console.log('═'.repeat(60));
        Object.entries(RULES).forEach(([id, info]) => {
            console.log(`\n   ID ${id}: ${info.name}`);
            console.log(`   Field: ${info.field}`);
            console.log(`   Expected: ${info.expected}`);
        });
        console.log('\n' + '═'.repeat(60));
        console.log('Usage: npx tsx scripts/test_fix_rules.ts <rule_id>');
        console.log('VD: npx tsx scripts/test_fix_rules.ts 14');
        return;
    }

    const rule = RULES[ruleId as keyof typeof RULES];
    console.log('═'.repeat(60));
    console.log(`🧪 TEST: ${rule.name}`);
    console.log(`📊 Field: ${rule.field}`);
    console.log(`✅ Expected: ${rule.expected}`);
    console.log('═'.repeat(60));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/execute-automation-rule`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ruleId })
    });

    console.log('\n📡 Response status:', response.status);
    const data = await response.json();

    console.log('\n📊 Kết quả:');
    console.log('   Matched:', data.matchedCount);

    if (data.results) {
        for (const result of data.results) {
            console.log(`\n   📌 ${result.objectName}`);
            console.log(`      Action: ${result.action}`);
            console.log(`      Status: ${result.status || result.result}`);
            if (result.reason) console.log(`      Reason: ${result.reason}`);
            if (result.details) console.log(`      Details: ${JSON.stringify(result.details)}`);
        }
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Test hoàn thành!');
    if (ruleId === 18) {
        console.log('\n⏰ Đợi 3 phút rồi chạy: npx tsx scripts/trigger_reverts.ts');
        console.log('   để kiểm tra adset có tự động bật lại không');
    }
}

main().catch(console.error);
