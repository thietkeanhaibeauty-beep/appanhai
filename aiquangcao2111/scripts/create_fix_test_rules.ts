/**
 * Tạo 5 quy tắc test để verify từng trường đã fix
 * 
 * Test 1: maxExecutionsPerObject = 1
 * Test 2: cooldownHours = 0.0167 (1 phút để test nhanh)
 * Test 3: maxBudgetDailySpend = 300000
 * Test 4: minRoasThreshold = 1.5
 * Test 5: autoRevert + revertAfterHours = 0.05 (3 phút)
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

// User từ rule 12 đã hoạt động
const USER_ID = '3b69c215-7c27-479f-92ef-74e5e8f9a5d4';

const TABLES = {
    CAMPAIGN_LABELS: 'm7diwqt7ckjrlq1',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

async function nocoPost(tableId: string, data: any) {
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records`, {
        method: 'POST',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return await res.json();
}

async function main() {
    console.log('═'.repeat(60));
    console.log('📋 TẠO 5 QUY TẮC TEST');
    console.log('═'.repeat(60));

    // Sử dụng nhãn ID từ labels đã có (TEST-GIAM = 9, TEST-TAT = 10)
    // Tạo các rules mới với target_labels khác nhau

    const testRules = [
        {
            rule_name: 'FIX-TEST-1: maxExecutions=1',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: '["9"]', // TEST-GIAM
            conditions: JSON.stringify([{ id: 't1', metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a1', type: 'decrease_budget', value: 10, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                maxExecutionsPerObject: 1,  // ← TEST FIELD
                cooldownHours: 0
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'FIX-TEST-2: cooldown=1min',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: '["9"]',
            conditions: JSON.stringify([{ id: 't2', metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a2', type: 'decrease_budget', value: 5, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                maxExecutionsPerObject: 10,
                cooldownHours: 0.0167  // ← 1 PHÚT để test nhanh
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'FIX-TEST-3: maxBudget=300K',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: '["9"]',
            conditions: JSON.stringify([{ id: 't3', metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a3', type: 'increase_budget', value: 100, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                enableSafeGuards: true,
                maxBudgetDailySpend: 300000,  // ← TEST FIELD
                maxExecutionsPerObject: 3
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'FIX-TEST-4: minROAS=1.5',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: '["9"]',
            conditions: JSON.stringify([{ id: 't4', metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a4', type: 'increase_budget', value: 20, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                enableSafeGuards: true,
                minRoasThreshold: 1.5,  // ← TEST FIELD (chỉ tăng nếu ROAS >= 1.5)
                maxExecutionsPerObject: 2
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'FIX-TEST-5: autoRevert=3min',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: '["10"]', // TEST-TAT
            conditions: JSON.stringify([{ id: 't5', metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{
                id: 'a5',
                type: 'turn_off',
                autoRevert: true,  // ← TEST FIELD
                revertAction: 'turn_on',
                revertAfterHours: 0.05  // ← 3 PHÚT
            }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                maxExecutionsPerObject: 1
            }),
            user_id: USER_ID
        }
    ];

    console.log('\n📋 Đang tạo quy tắc...\n');

    for (const rule of testRules) {
        const result = await nocoPost(TABLES.AUTOMATED_RULES, rule);
        console.log(`✅ ${rule.rule_name}`);
        console.log(`   ID: ${result.Id || result.id || 'N/A'}`);
        console.log(`   Field test: ${rule.rule_name.split(': ')[1]}`);
        console.log('');
    }

    console.log('═'.repeat(60));
    console.log('📝 HƯỚNG DẪN TEST');
    console.log('═'.repeat(60));
    console.log(`
Mỗi quy tắc test 1 field đã fix:

┌─────────────────────────────────────────────────────────────┐
│ RULE                    │ TEST FIELD         │ NHÃN        │
├─────────────────────────┼────────────────────┼─────────────┤
│ FIX-TEST-1              │ maxExecutions=1    │ TEST-GIAM   │
│ FIX-TEST-2              │ cooldown=1min      │ TEST-GIAM   │
│ FIX-TEST-3              │ maxBudget=300K     │ TEST-GIAM   │
│ FIX-TEST-4              │ minROAS=1.5        │ TEST-GIAM   │
│ FIX-TEST-5              │ autoRevert=3min    │ TEST-TAT    │
└─────────────────────────┴────────────────────┴─────────────┘

Cách test:
1. Gắn nhãn TEST-GIAM hoặc TEST-TAT cho 1 adset
2. Chạy: npx tsx scripts/test_fix_rules.ts <ID>
3. Kiểm tra kết quả trong logs
`);
}

main().catch(console.error);
