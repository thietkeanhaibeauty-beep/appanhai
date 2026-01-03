/**
 * Script để tạo các nhãn test và quy tắc test cho việc kiểm tra automation rules
 * Bao gồm các test case cho:
 * 1. Giới hạn thực thi (maxExecutionsPerObject, cooldownHours)
 * 2. Giới hạn an toàn (maxBudgetDailySpend, minRoasThreshold)
 * 3. Auto-revert (tắt + bật lại sau X phút)
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const USER_ID = 'da95e518-1d4d-4638-9498-b5bc074fec07';

const TABLES = {
    CAMPAIGN_LABELS: 'm7diwqt7ckjrlq1',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

async function nocoRequest(tableId: string, method: string, data?: any) {
    const url = `${NOCODB_BASE_URL}/api/v2/tables/${tableId}/records`;
    const options: any = {
        method,
        headers: {
            'xc-token': NOCODB_API_TOKEN,
            'Content-Type': 'application/json'
        }
    };
    if (data) options.body = JSON.stringify(data);
    const res = await fetch(url, options);
    return { status: res.status, data: await res.json() };
}

async function main() {
    console.log('═'.repeat(60));
    console.log('📋 TẠO NHÃN VÀ QUY TẮC TEST');
    console.log('═'.repeat(60));

    // 1. Tạo các nhãn test
    console.log('\n📌 Tạo nhãn test...');

    const labels = [
        { label_name: 'TEST-TANG-10%', label_color: '#22c55e', description: 'Test tăng ngân sách 10%' },
        { label_name: 'TEST-GIAM-VND', label_color: '#f59e0b', description: 'Test giảm 50K VND' },
        { label_name: 'TEST-LIMIT-1', label_color: '#ef4444', description: 'Test giới hạn 1 lần thực thi' },
        { label_name: 'TEST-COOLDOWN', label_color: '#8b5cf6', description: 'Test cooldown 1 giờ' },
        { label_name: 'TEST-ROAS', label_color: '#06b6d4', description: 'Test ROAS threshold' },
    ];

    const createdLabels: any[] = [];
    for (const label of labels) {
        const result = await nocoRequest(TABLES.CAMPAIGN_LABELS, 'POST', {
            ...label,
            user_id: USER_ID
        });
        console.log(`   ✅ ${label.label_name}: ID = ${result.data.Id}`);
        createdLabels.push({ ...label, Id: result.data.Id });
    }

    // 2. Tạo các quy tắc test
    console.log('\n📋 Tạo quy tắc test...');

    const rules = [
        {
            rule_name: 'TEST-TANG-10%-LIMIT-1',
            description: 'Tăng 10% budget, tối đa 1 lần, cooldown 24h',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: JSON.stringify([createdLabels[0].Id.toString()]), // TEST-TANG-10%
            conditions: JSON.stringify([{ id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{
                id: crypto.randomUUID(),
                type: 'increase_budget',
                value: 10,
                valueType: 'percentage'
            }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                enableSafeGuards: true,
                maxBudgetDailySpend: 500000, // Max 500K VND
                maxExecutionsPerObject: 1,
                cooldownHours: 24
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'TEST-GIAM-50K-VND',
            description: 'Giảm 50K VND, không giới hạn',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: JSON.stringify([createdLabels[1].Id.toString()]), // TEST-GIAM-VND
            conditions: JSON.stringify([{ id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{
                id: crypto.randomUUID(),
                type: 'decrease_budget',
                value: 50000,
                valueType: 'amount'
            }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                maxExecutionsPerObject: 3, // Cho phép 3 lần
                cooldownHours: 0
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'TEST-TAT-BAT-LAI-3-PHUT',
            description: 'Tắt + tự động bật lại sau 3 phút',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: JSON.stringify([createdLabels[2].Id.toString()]), // TEST-LIMIT-1
            conditions: JSON.stringify([{ id: crypto.randomUUID(), metric: 'spend', operator: 'greater_than', value: 1 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{
                id: crypto.randomUUID(),
                type: 'turn_off',
                autoRevert: true,
                revertAction: 'turn_on',
                revertAfterHours: 0.05 // 3 phút = 0.05 giờ
            }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                maxExecutionsPerObject: 1
            }),
            user_id: USER_ID
        },
        {
            rule_name: 'TEST-ROAS-THRESHOLD',
            description: 'Tăng 20% nếu ROAS >= 1.5',
            scope: 'adset',
            time_range: 'today',
            is_active: true,
            target_labels: JSON.stringify([createdLabels[4].Id.toString()]), // TEST-ROAS
            conditions: JSON.stringify([{ id: crypto.randomUUID(), metric: 'roas', operator: 'greater_than_or_equal', value: 1.5 }]),
            condition_logic: 'all',
            actions: JSON.stringify([{
                id: crypto.randomUUID(),
                type: 'increase_budget',
                value: 20,
                valueType: 'percentage'
            }]),
            advanced_settings: JSON.stringify({
                enableAutoSchedule: true,
                checkFrequency: 5,
                enableSafeGuards: true,
                minRoasThreshold: 1.5, // Chỉ tăng nếu ROAS >= 1.5
                maxBudgetDailySpend: 1000000,
                maxExecutionsPerObject: 2
            }),
            user_id: USER_ID
        }
    ];

    const createdRules: any[] = [];
    for (const rule of rules) {
        const result = await nocoRequest(TABLES.AUTOMATED_RULES, 'POST', rule);
        console.log(`   ✅ ${rule.rule_name}: ID = ${result.data.Id}`);
        createdRules.push({ ...rule, Id: result.data.Id });
    }

    // 3. Tổng kết
    console.log('\n' + '═'.repeat(60));
    console.log('📊 TỔNG KẾT - SẴN SÀNG TEST');
    console.log('═'.repeat(60));

    console.log('\n📌 NHÃN ĐÃ TẠO:');
    for (const label of createdLabels) {
        console.log(`   - ${label.label_name} (ID: ${label.Id})`);
    }

    console.log('\n📋 QUY TẮC ĐÃ TẠO:');
    for (let i = 0; i < createdRules.length; i++) {
        console.log(`\n   ${i + 1}. ${createdRules[i].rule_name} (ID: ${createdRules[i].Id})`);
        console.log(`      Nhãn: ${createdLabels[i < 3 ? i : 4].label_name}`);
        console.log(`      Mô tả: ${rules[i].description}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📝 HƯỚNG DẪN TEST:');
    console.log('═'.repeat(60));
    console.log(`
1. Vào Báo cáo Ads, chọn 1-2 adset để test
2. Gắn nhãn tương ứng cho adset đó
3. Đợi cron chạy (mỗi 5 phút) hoặc trigger thủ công
4. Kiểm tra kết quả trong UI

Gợi ý test:
- TEST-TANG-10%: Gắn vào adset, chạy 1 lần → budget tăng 10%, lần sau skip
- TEST-GIAM-VND: Gắn vào adset, chạy 3 lần liên tiếp → mỗi lần giảm 50K
- TEST-LIMIT-1: Gắn vào adset ON, chạy → tắt, 3 phút sau tự bật
- TEST-ROAS: Gắn vào adset có ROAS >= 1.5 → tăng 20%
`);
}

main().catch(console.error);
