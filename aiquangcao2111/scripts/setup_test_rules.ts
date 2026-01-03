/**
 * Setup Test Rules for Automation Testing
 * This script:
 * 1. Creates test labels
 * 2. Creates test rules with proper conditions
 * 3. Activates rules for testing
 * 
 * Run with: npx tsx scripts/setup_test_rules.ts
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    AUTOMATION_RULE_EXECUTION_LOGS: 'masstbinn3h8hkr'
};

// ================== API HELPERS ==================

async function createLabel(name: string, color: string) {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records`, {
        method: 'POST',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            label_name: name,
            label_color: color,
            user_id: 'test-user'
        })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create label: ${error}`);
    }

    return response.json();
}

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

async function updateRule(id: number, updates: any) {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records`, {
        method: 'PATCH',
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ Id: id, ...updates })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to update rule: ${error}`);
    }

    return response.json();
}

async function getLabels() {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records?limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    return (await response.json()).list || [];
}

async function getRules() {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?limit=50`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    return (await response.json()).list || [];
}

async function getRecentLogs(limit = 10) {
    const response = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATION_RULE_EXECUTION_LOGS}/records?limit=${limit}&sort=-executed_at`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    return (await response.json()).list || [];
}

// ================== MAIN ==================

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('           SETUP TEST RULES FOR AUTOMATION                      ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Step 1: Check/Create test labels
    console.log('📋 Step 1: Checking existing labels...\n');
    const existingLabels = await getLabels();
    console.log(`Found ${existingLabels.length} labels:`);
    existingLabels.forEach((l: any) => console.log(`  - ID: ${l.Id}, Name: "${l.label_name}", Color: ${l.label_color}`));

    let testGiamLabel = existingLabels.find((l: any) => l.label_name === 'TEST-GIAM');
    let testTatLabel = existingLabels.find((l: any) => l.label_name === 'TEST-TAT');

    if (!testGiamLabel) {
        console.log('\n🏷️ Creating label "TEST-GIAM"...');
        testGiamLabel = await createLabel('TEST-GIAM', '#FF6B6B');
        console.log(`   ✅ Created with ID: ${testGiamLabel.Id}`);
    } else {
        console.log(`\n🏷️ Label "TEST-GIAM" already exists with ID: ${testGiamLabel.Id}`);
    }

    if (!testTatLabel) {
        console.log('🏷️ Creating label "TEST-TAT"...');
        testTatLabel = await createLabel('TEST-TAT', '#4ECDC4');
        console.log(`   ✅ Created with ID: ${testTatLabel.Id}`);
    } else {
        console.log(`🏷️ Label "TEST-TAT" already exists with ID: ${testTatLabel.Id}`);
    }

    // Step 2: Check existing test rules
    console.log('\n📋 Step 2: Checking existing rules...\n');
    const existingRules = await getRules();

    const testGiamRule = existingRules.find((r: any) => r.rule_name === 'TEST-GIAM-20%');
    const testTatRule = existingRules.find((r: any) => r.rule_name === 'TEST-TAT-BAT-LAI');

    // Step 3: Create/Update test rules
    console.log('\n📋 Step 3: Creating test rules...\n');

    // Rule 1: Giảm 20% - với điều kiện KHÔNG đạt trước (để test case 1)
    if (!testGiamRule) {
        console.log('📝 Creating rule "TEST-GIAM-20%"...');
        const rule1 = await createRule({
            user_id: 'test-user',
            rule_name: 'TEST-GIAM-20%',
            scope: 'adset',
            time_range: 'today',
            is_active: true, // Active để test
            conditions: JSON.stringify([
                { id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than_or_equal', value: 999999999 } // Điều kiện rất cao - KHÔNG ĐẠT
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([
                {
                    id: crypto.randomUUID(),
                    type: 'decrease_budget',
                    value: 20,
                    valueType: 'percentage'
                }
            ]),
            target_labels: JSON.stringify([testGiamLabel.Id]),
            advanced_settings: JSON.stringify({})
        });
        console.log(`   ✅ Created with ID: ${rule1.Id}`);
        console.log(`   📌 Điều kiện: spend >= 999,999,999₫ (KHÔNG ĐẠT - để test case 1)`);
    } else {
        console.log(`📝 Rule "TEST-GIAM-20%" already exists with ID: ${testGiamRule.Id}`);
    }

    // Rule 2: Tắt + Bật lại sau 5 phút
    if (!testTatRule) {
        console.log('\n📝 Creating rule "TEST-TAT-BAT-LAI"...');
        const rule2 = await createRule({
            user_id: 'test-user',
            rule_name: 'TEST-TAT-BAT-LAI',
            scope: 'adset',
            time_range: 'today',
            is_active: false, // Inactive ban đầu
            conditions: JSON.stringify([
                { id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than_or_equal', value: 1 } // Điều kiện dễ đạt
            ]),
            condition_logic: 'all',
            actions: JSON.stringify([
                {
                    id: crypto.randomUUID(),
                    type: 'turn_off',
                    autoRevert: true,
                    revertAfterHours: 0.083, // 5 phút = 0.083 giờ
                    revertAction: 'turn_on'
                }
            ]),
            target_labels: JSON.stringify([testTatLabel.Id]),
            advanced_settings: JSON.stringify({})
        });
        console.log(`   ✅ Created with ID: ${rule2.Id}`);
        console.log(`   📌 Hành động: Tắt + Bật lại sau 5 phút`);
    } else {
        console.log(`📝 Rule "TEST-TAT-BAT-LAI" already exists with ID: ${testTatRule.Id}`);
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                        SETUP COMPLETE                          ');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`
📌 LABELS CREATED:
   - TEST-GIAM (ID: ${testGiamLabel.Id}) - Màu đỏ
   - TEST-TAT (ID: ${testTatLabel.Id}) - Màu xanh

📌 RULES CREATED:
   1. TEST-GIAM-20% - Giảm ngân sách 20%
      - Điều kiện: spend >= 999,999,999₫ (KHÔNG ĐẠT)
      - Trạng thái: ACTIVE
      - Nhãn: TEST-GIAM
   
   2. TEST-TAT-BAT-LAI - Tắt + Bật lại sau 5 phút
      - Điều kiện: spend >= 1₫ (DỄ ĐẠT)
      - Trạng thái: INACTIVE (chờ kích hoạt)
      - Nhãn: TEST-TAT

📌 BƯỚC TIẾP THEO:
   1. Vào app, gắn nhãn TEST-GIAM và TEST-TAT vào 2 adsets khác nhau
   2. Chờ cron chạy (mỗi 5 phút)
   3. Xem logs để xác nhận rule chạy đúng
`);
}

main().catch(console.error);
