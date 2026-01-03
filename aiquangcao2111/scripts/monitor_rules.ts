/**
 * MONITORING MODE - Theo dõi trạng thái các quy tắc
 * 
 * Hiển thị:
 * - 🔄 Đang đợi: Điều kiện chưa đạt
 * - ✅ Đã thực thi: Điều kiện đạt + action chạy
 * - ⏸️ Đã chạy: Đạt giới hạn thực thi
 */

const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0OTM0MDcsImV4cCI6MjA0NzA2OTQwN30.tFz7Wh5FEszl7rDQC_ByLOFDBKoYMZdZFKF2_5AFZNA';

const TABLES = {
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    FACEBOOK_INSIGHTS: 'mxpxdkn4dy4p5nu',
    EXECUTION_LOGS: 'mq7r0pxsfb0cz7h'
};

// 4 quy tắc thực tế
const REAL_RULES = [19, 20, 21, 22];

interface RuleCondition {
    metric: string;
    operator: string;
    value: number;
}

function evaluateCondition(actualValue: number, operator: string, threshold: number): boolean {
    switch (operator) {
        case 'greater_than': return actualValue > threshold;
        case 'greater_than_or_equal': return actualValue >= threshold;
        case 'less_than': return actualValue < threshold;
        case 'less_than_or_equal': return actualValue <= threshold;
        case 'equals': return actualValue === threshold;
        case 'not_equals': return actualValue !== threshold;
        default: return false;
    }
}

function formatNumber(n: number): string {
    return n.toLocaleString('vi-VN');
}

function getOperatorSymbol(op: string): string {
    const map: Record<string, string> = {
        'greater_than': '>',
        'greater_than_or_equal': '>=',
        'less_than': '<',
        'less_than_or_equal': '<=',
        'equals': '=',
        'not_equals': '!='
    };
    return map[op] || op;
}

async function main() {
    console.log('═'.repeat(70));
    console.log('📊 MONITORING MODE - Theo dõi 4 quy tắc thực tế');
    console.log('═'.repeat(70));
    console.log(`⏰ Thời điểm: ${new Date().toLocaleString('vi-VN')}\n`);

    // 1. Fetch rules
    const rulesRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.AUTOMATED_RULES}/records?where=(Id,in,${REAL_RULES.join(',')})`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const rules = (await rulesRes.json()).list || [];

    // 2. Fetch insights (today)
    const today = new Date().toISOString().split('T')[0];
    const insightsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.FACEBOOK_INSIGHTS}/records?where=(date_start,eq,${today})~and(level,eq,adset)&limit=100`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const insights = (await insightsRes.json()).list || [];

    // 3. Fetch execution logs
    const logsRes = await fetch(
        `${NOCODB_BASE_URL}/api/v2/tables/${TABLES.EXECUTION_LOGS}/records?where=(rule_id,in,${REAL_RULES.join(',')})&sort=-executed_at&limit=50`,
        { headers: { 'xc-token': NOCODB_API_TOKEN } }
    );
    const logs = (await logsRes.json()).list || [];

    console.log(`📦 Dữ liệu: ${insights.length} adsets hôm nay, ${logs.length} logs`);
    console.log('');

    // 4. Process each rule
    for (const rule of rules) {
        const conditions: RuleCondition[] = typeof rule.conditions === 'string'
            ? JSON.parse(rule.conditions)
            : (rule.conditions || []);
        const actions = typeof rule.actions === 'string'
            ? JSON.parse(rule.actions)
            : (rule.actions || []);
        const advSettings = typeof rule.advanced_settings === 'string'
            ? JSON.parse(rule.advanced_settings)
            : (rule.advanced_settings || {});
        const targetLabels = typeof rule.target_labels === 'string'
            ? JSON.parse(rule.target_labels)
            : (rule.target_labels || []);

        console.log('─'.repeat(70));
        console.log(`\n📋 RULE ${rule.Id}: ${rule.rule_name}`);
        console.log(`   Nhãn mục tiêu: ${targetLabels.join(', ') || 'Không có'}`);
        console.log(`   Action: ${actions.map((a: any) => a.type).join(', ')}`);
        console.log(`   Max executions: ${advSettings.maxExecutionsPerObject || 'unlimited'}`);
        console.log('');

        // Hiển thị điều kiện
        console.log('   📐 ĐIỀU KIỆN:');
        for (const cond of conditions) {
            console.log(`      - ${cond.metric} ${getOperatorSymbol(cond.operator)} ${formatNumber(cond.value)}`);
        }

        // Check logs for this rule
        const ruleLogs = logs.filter((l: any) => String(l.rule_id) === String(rule.Id));
        const successLogs = ruleLogs.filter((l: any) => l.status === 'success');

        // Simulated adset check (từ insights có label match)
        // Trong thực tế cần cross-reference với CAMPAIGN_LABEL_ASSIGNMENTS
        const sampleAdset = insights[0];

        if (sampleAdset) {
            const spend = sampleAdset.spend || 0;
            const results = sampleAdset.results || 0;
            const cpr = results > 0 ? spend / results : 0;

            console.log(`\n   📊 Mẫu Adset: ${sampleAdset.adset_name || sampleAdset.adset_id}`);
            console.log(`      spend: ${formatNumber(spend)} | results: ${results} | CPR: ${formatNumber(Math.round(cpr))}`);

            // Evaluate conditions
            let allMet = true;
            const condResults: string[] = [];

            for (const cond of conditions) {
                let actualValue = 0;
                if (cond.metric === 'spend') actualValue = spend;
                else if (cond.metric === 'results') actualValue = results;
                else if (cond.metric === 'cost_per_result') actualValue = cpr;

                const met = evaluateCondition(actualValue, cond.operator, cond.value);
                allMet = allMet && met;

                const status = met ? '✅' : '🔄';
                condResults.push(`${status} ${cond.metric}: ${formatNumber(Math.round(actualValue))} ${getOperatorSymbol(cond.operator)} ${formatNumber(cond.value)}`);
            }

            console.log(`\n   📋 TRẠNG THÁI:`);
            for (const r of condResults) {
                console.log(`      ${r}`);
            }

            if (allMet) {
                if (successLogs.length > 0 && advSettings.maxExecutionsPerObject &&
                    successLogs.length >= advSettings.maxExecutionsPerObject) {
                    console.log(`\n   ⏸️ ĐÃ ĐẠT GIỚI HẠN: Đã chạy ${successLogs.length}/${advSettings.maxExecutionsPerObject} lần`);
                } else {
                    console.log(`\n   ✅ ĐIỀU KIỆN ĐẠT → Sẵn sàng thực thi action: ${actions[0]?.type}`);
                }
            } else {
                console.log(`\n   🔄 ĐANG ĐỢI: Điều kiện chưa đạt, tiếp tục theo dõi...`);
            }
        } else {
            console.log(`\n   ⚠️ Không có dữ liệu insights hôm nay`);
        }

        console.log('');
    }

    console.log('═'.repeat(70));
    console.log('📝 HƯỚNG DẪN:');
    console.log('   - 🔄 Đang đợi: Điều kiện chưa đạt, cron sẽ tiếp tục theo dõi');
    console.log('   - ✅ Điều kiện đạt: Action sẽ được thực thi khi cron chạy');
    console.log('   - ⏸️ Đạt giới hạn: Rule đã chạy đủ số lần cho phép');
    console.log('');
    console.log('   Chạy lại: npx tsx scripts/monitor_rules.ts');
    console.log('═'.repeat(70));
}

main().catch(console.error);
