/**
 * Tạo 4 quy tắc thực tế từ yêu cầu của anh:
 * 
 * Rule 1: spend >= 100k AND results = 0 → turn_off
 * Rule 2: results = 2 AND cost_per_result < 40k → increase 30%
 * Rule 3: cost_per_result < 20k AND results >= 4 → increase 30%
 * Rule 4: spend >= 80k AND results = 0 → decrease 20%
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const USER_ID = '3b69c215-7c27-479f-92ef-74e5e8f9a5d4';
const TABLES = { AUTOMATED_RULES: 'mp8nib5rn4l0mb4' };

// Target label - anh cần gắn nhãn này cho adset 200k
const TARGET_LABEL_ID = '9'; // TEST-GIAM

async function nocoPost(data: any) {
    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records`, {
        method: 'POST',
        headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await res.json();
}

async function main() {
    console.log('═'.repeat(60));
    console.log('📋 TẠO 4 QUY TẮC THỰC TẾ');
    console.log('═'.repeat(60));

    const rules = [
        {
            rule_name: 'REAL-1: 100K không kết quả → TẮT',
            conditions: JSON.stringify([
                { id: 'c1a', metric: 'spend', operator: 'greater_than_or_equal', value: 100000 },
                { id: 'c1b', metric: 'results', operator: 'equals', value: 0 }
            ]),
            condition_logic: 'all', // AND
            actions: JSON.stringify([{ id: 'a1', type: 'turn_off' }]),
            advanced_settings: JSON.stringify({ maxExecutionsPerObject: 1 })
        },
        {
            rule_name: 'REAL-2: 2 KQ + CPR<40K → TĂNG 30%',
            conditions: JSON.stringify([
                { id: 'c2a', metric: 'results', operator: 'equals', value: 2 },
                { id: 'c2b', metric: 'cost_per_result', operator: 'less_than', value: 40000 }
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a2', type: 'increase_budget', value: 30, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({ maxExecutionsPerObject: 1, maxBudgetDailySpend: 500000 })
        },
        {
            rule_name: 'REAL-3: CPR<20K + 4KQ → TĂNG 30%',
            conditions: JSON.stringify([
                { id: 'c3a', metric: 'cost_per_result', operator: 'less_than', value: 20000 },
                { id: 'c3b', metric: 'results', operator: 'greater_than_or_equal', value: 4 }
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a3', type: 'increase_budget', value: 30, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({ maxExecutionsPerObject: 1, maxBudgetDailySpend: 500000 })
        },
        {
            rule_name: 'REAL-4: 80K không KQ → GIẢM 20%',
            conditions: JSON.stringify([
                { id: 'c4a', metric: 'spend', operator: 'greater_than_or_equal', value: 80000 },
                { id: 'c4b', metric: 'results', operator: 'equals', value: 0 }
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([{ id: 'a4', type: 'decrease_budget', value: 20, valueType: 'percentage' }]),
            advanced_settings: JSON.stringify({ maxExecutionsPerObject: 1, cooldownHours: 1 })
        }
    ];

    console.log('\n📋 Đang tạo...\n');

    for (const rule of rules) {
        const result = await nocoPost({
            ...rule,
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: `["${TARGET_LABEL_ID}"]`,
            user_id: USER_ID
        });
        console.log(`✅ ${rule.rule_name}`);
        console.log(`   ID: ${result.Id || result.id}`);
        console.log(`   Conditions: ${rule.conditions}`);
        console.log('');
    }

    console.log('═'.repeat(60));
    console.log('📝 LOGIC CÁC QUY TẮC:');
    console.log('═'.repeat(60));
    console.log(`
┌─────────────────────────────────────────────────────────────┐
│ RULE         │ ĐIỀU KIỆN                │ HÀNH ĐỘNG         │
├──────────────┼──────────────────────────┼───────────────────┤
│ REAL-1       │ spend>=100K AND KQ=0     │ TẮT               │
│ REAL-2       │ KQ=2 AND CPR<40K         │ TĂNG 30%          │
│ REAL-3       │ CPR<20K AND KQ>=4        │ TĂNG 30%          │
│ REAL-4       │ spend>=80K AND KQ=0      │ GIẢM 20%          │
└──────────────┴──────────────────────────┴───────────────────┘

⚠️ LƯU Ý THỨ TỰ ƯU TIÊN:
- REAL-1 (100K) sẽ TẮT trước khi REAL-4 (80K) GIẢM
- Nếu adset đã tắt, các rule khác sẽ không chạy

📌 Để test: Gắn nhãn TEST-GIAM (ID:9) cho adset 200K
`);
}

main().catch(console.error);
