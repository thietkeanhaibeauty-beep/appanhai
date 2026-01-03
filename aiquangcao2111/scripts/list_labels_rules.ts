/**
 * Script đơn giản để lấy danh sách nhãn và quy tắc hiện có cho test
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const USER_ID = 'da95e518-1d4d-4638-9498-b5bc074fec07';

const TABLES = {
    CAMPAIGN_LABELS: 'm7diwqt7ckjrlq1',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

async function main() {
    console.log('═'.repeat(60));
    console.log('📋 DANH SÁCH NHÃN VÀ QUY TẮC HIỆN CÓ');
    console.log('═'.repeat(60));

    // 1. Fetch labels
    console.log('\n📌 NHÃN:');
    const labelsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records?where=(user_id,eq,${USER_ID})&limit=50`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const labels = (await labelsRes.json()).list || [];

    for (const label of labels) {
        console.log(`   ID: ${label.Id} | ${label.label_name} | ${label.label_color}`);
    }

    // 2. Fetch rules
    console.log('\n📋 QUY TẮC:');
    const rulesRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=(user_id,eq,${USER_ID})&limit=50`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const rules = (await rulesRes.json()).list || [];

    for (const rule of rules) {
        const targetLabels = typeof rule.target_labels === 'string'
            ? JSON.parse(rule.target_labels || '[]')
            : (rule.target_labels || []);
        const actions = typeof rule.actions === 'string'
            ? JSON.parse(rule.actions || '[]')
            : (rule.actions || []);
        const advSettings = typeof rule.advanced_settings === 'string'
            ? JSON.parse(rule.advanced_settings || '{}')
            : (rule.advanced_settings || {});

        console.log(`\n   📋 Rule ID: ${rule.Id} | ${rule.rule_name} | Active: ${rule.is_active}`);
        console.log(`      Scope: ${rule.scope} | Time: ${rule.time_range}`);
        console.log(`      Target Labels: ${JSON.stringify(targetLabels)}`);
        console.log(`      Actions: ${actions.map((a: any) => a.type).join(', ')}`);
        console.log(`      Max Executions: ${advSettings.maxExecutionsPerObject || 'unlimited'}`);
        console.log(`      Cooldown: ${advSettings.cooldownHours || 0}h`);
        if (advSettings.maxBudgetDailySpend) console.log(`      Max Budget: ${advSettings.maxBudgetDailySpend}`);
        if (advSettings.minRoasThreshold) console.log(`      Min ROAS: ${advSettings.minRoasThreshold}`);
    }

    console.log('\n' + '═'.repeat(60));
    console.log('📝 HƯỚNG DẪN:');
    console.log('═'.repeat(60));
    console.log(`
Để test quy tắc:
1. Vào Báo cáo Ads
2. Gắn nhãn tương ứng cho adset muốn test
3. Đợi cron hoặc chạy: npx tsx scripts/test_rule_v3.ts
`);
}

main().catch(console.error);
