/**
 * Create Test Rules for Automation
 * This script creates test rules to verify:
 * 1. Decrease budget (percentage mode)
 * 2. Scheduled turn off with auto-revert
 * 
 * Run with: npx tsx scripts/create_test_rules.ts
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    CAMPAIGN_LABELS: 'm37ye177g4m98st'
};

async function createRule(rule: any) {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records`, {
        method: 'POST',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(rule)
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create rule: ${error}`);
    }

    return response.json();
}

async function getLabels() {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records?limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    return (await response.json()).list || [];
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           CREATE TEST RULES FOR AUTOMATION                     ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get existing labels
    console.log('📋 Fetching existing labels...');
    const labels = await getLabels();
    console.log(`Found ${labels.length} labels:`);
    labels.forEach((l: any) => console.log(`  - ID: ${l.Id}, Name: ${l.label_name}`));

    // Use the first available label or create instruction
    if (labels.length === 0) {
        console.log('\n⚠️ No labels found! Please create a label first in the app.');
        return;
    }

    const testLabelId = labels[0].Id;
    console.log(`\n📌 Using label ID ${testLabelId} for test rules\n`);

    // Get current time for scheduling
    const now = new Date();
    const scheduleTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() + 2).padStart(2, '0')}`; // 2 mins from now
    const revertTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes() + 5).padStart(2, '0')}`; // 5 mins from now

    // Test Rule 1: Decrease Budget by 20%
    console.log('1️⃣ Creating "Test: Giảm 20%" rule...');
    try {
        const decreaseRule = await createRule({
            user_id: 'test-user',
            rule_name: 'Test: Giảm 20%',
            scope: 'adset',
            time_range: 'today',
            is_active: false, // Start inactive for safety
            conditions: JSON.stringify([
                { id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than_or_equal', value: 50000 }
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([
                {
                    id: crypto.randomUUID(),
                    type: 'decrease_budget',
                    value: 20,
                    valueType: 'percentage' // Frontend field
                }
            ]),
            target_labels: JSON.stringify([testLabelId]),
            advanced_settings: JSON.stringify({})
        });
        console.log(`   ✅ Created with ID: ${decreaseRule.Id}`);
    } catch (error) {
        console.error(`   ❌ Failed:`, error);
    }

    // Test Rule 2: Scheduled Turn Off with Auto-Revert
    console.log('\n2️⃣ Creating "Test: Hẹn giờ tắt + bật lại" rule...');
    try {
        const scheduledRule = await createRule({
            user_id: 'test-user',
            rule_name: 'Test: Hẹn giờ tắt + bật lại',
            scope: 'adset',
            time_range: 'today',
            is_active: false, // Start inactive for safety
            conditions: JSON.stringify([
                { id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than_or_equal', value: 1 } // Very low threshold for testing
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([
                {
                    id: crypto.randomUUID(),
                    type: 'turn_off',
                    executeAt: scheduleTime, // Execute at specific time
                    autoRevert: true,
                    revertAtTime: revertTime, // Revert at specific time
                    revertAction: 'turn_on'
                }
            ]),
            target_labels: JSON.stringify([testLabelId]),
            advanced_settings: JSON.stringify({})
        });
        console.log(`   ✅ Created with ID: ${scheduledRule.Id}`);
        console.log(`   📅 Scheduled to turn off at: ${scheduleTime}`);
        console.log(`   🔄 Scheduled to revert (turn on) at: ${revertTime}`);
    } catch (error) {
        console.error(`   ❌ Failed:`, error);
    }

    // Test Rule 3: Decrease Budget by Fixed Amount
    console.log('\n3️⃣ Creating "Test: Giảm 50.000₫" rule...');
    try {
        const decreaseAbsoluteRule = await createRule({
            user_id: 'test-user',
            rule_name: 'Test: Giảm 50.000₫',
            scope: 'adset',
            time_range: 'today',
            is_active: false, // Start inactive for safety
            conditions: JSON.stringify([
                { id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than_or_equal', value: 50000 }
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([
                {
                    id: crypto.randomUUID(),
                    type: 'decrease_budget',
                    value: 50000,
                    valueType: 'amount' // Absolute amount
                }
            ]),
            target_labels: JSON.stringify([testLabelId]),
            advanced_settings: JSON.stringify({})
        });
        console.log(`   ✅ Created with ID: ${decreaseAbsoluteRule.Id}`);
    } catch (error) {
        console.error(`   ❌ Failed:`, error);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                      NEXT STEPS                                ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`
1. Các quy tắc được tạo với is_active = false (chưa kích hoạt)
2. Vào app, gắn nhãn ID ${testLabelId} cho adset muốn test
3. Kích hoạt quy tắc cần test
4. Chờ cron chạy hoặc bấm "Chạy thủ công"
5. Kiểm tra logs để xem kết quả

⚠️ LƯU Ý: Các quy tắc này sẽ thay đổi THẬT trên Facebook Ads!
`);
}

main().catch(console.error);
