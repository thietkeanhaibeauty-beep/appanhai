/**
 * Fetch ALL labels and rules (no user filter)
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABELS: 'm7diwqt7ckjrlq1',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

async function main() {
    console.log('═'.repeat(60));
    console.log('📋 TẤT CẢ NHÃN VÀ QUY TẮC');
    console.log('═'.repeat(60));

    // 1. Fetch ALL labels
    console.log('\n📌 TẤT CẢ NHÃN:');
    const labelsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.CAMPAIGN_LABELS}/records?limit=50`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const labels = (await labelsRes.json()).list || [];

    for (const label of labels) {
        console.log(`   ID: ${label.Id} | ${label.label_name} | user: ${label.user_id}`);
    }
    console.log(`   Total: ${labels.length} labels`);

    // 2. Fetch ALL rules
    console.log('\n📋 TẤT CẢ QUY TẮC:');
    const rulesRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?limit=50`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const rules = (await rulesRes.json()).list || [];

    for (const rule of rules) {
        console.log(`   ID: ${rule.Id} | ${rule.rule_name} | user: ${rule.user_id?.substring(0, 8)}...`);
    }
    console.log(`   Total: ${rules.length} rules`);
}

main().catch(console.error);
