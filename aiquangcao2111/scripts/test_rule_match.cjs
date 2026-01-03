// Test rule that SHOULD match current data
// Data: cost_per_result = 51,530đ, results = 3
// Condition: cost_per_result >= 50000 AND results >= 3

const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FACEBOOK_INSIGHTS_AUTO = 'm17gyigy8jqlaoz';
const CAMPAIGN_LABEL_ASSIGNMENTS = 'myjgw4ial5s6zrw';

async function fetchNocoDB(tableId, where = '', limit = 1000) {
    let url = `${NOCODB_URL}/api/v2/tables/${tableId}/records?limit=${limit}`;
    if (where) url += `&where=${encodeURIComponent(where)}`;

    const res = await fetch(url, {
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data.list || [];
}

function evaluateSingleCondition(value, operator, conditionValue) {
    const numValue = Number(value);
    if (isNaN(numValue)) return false;

    switch (operator) {
        case "greater_than": return numValue > conditionValue;
        case "less_than": return numValue < conditionValue;
        case "equals": return numValue === conditionValue;
        case "greater_than_or_equal": return numValue >= conditionValue;
        case "less_than_or_equal": return numValue <= conditionValue;
        default: return false;
    }
}

async function testRule() {
    console.log('🧪 TESTING RULE: Turn off when cost_per_result >= 50000 AND results >= 3\n');

    const adsetId = '120240709129460334';
    const today = '2025-12-11';

    // Get today's insights for this adset
    console.log('📋 Step 1: Fetching insights...');
    const insights = await fetchNocoDB(FACEBOOK_INSIGHTS_AUTO, `(adset_id,eq,${adsetId})~and(date_start,eq,${today})`);

    if (insights.length === 0) {
        console.log('❌ No insights found for adset!');
        return;
    }

    // Aggregate (in case of multiple records)
    let totalSpend = 0, totalResults = 0;
    insights.forEach(i => {
        totalSpend += parseFloat(i.spend || 0);
        totalResults += parseInt(i.results || 0);
    });

    const cost_per_result = totalResults > 0 ? totalSpend / totalResults : 0;

    console.log(`\n📊 Adset Data (${insights.length} record(s)):`);
    console.log(`   adset_name: ${insights[0].adset_name}`);
    console.log(`   spend: ${totalSpend.toLocaleString()}đ`);
    console.log(`   results: ${totalResults}`);
    console.log(`   cost_per_result: ${cost_per_result.toLocaleString()}đ`);

    // Evaluate conditions
    console.log('\n📋 Step 2: Evaluating conditions...');

    const conditions = [
        { metric: 'cost_per_result', operator: 'greater_than_or_equal', value: 50000 },
        { metric: 'results', operator: 'greater_than_or_equal', value: 3 }
    ];

    const data = { cost_per_result, results: totalResults, spend: totalSpend };

    let allPass = true;
    conditions.forEach(c => {
        const val = data[c.metric];
        const pass = evaluateSingleCondition(val, c.operator, c.value);
        console.log(`   ${c.metric} (${val?.toLocaleString()}) ${c.operator} ${c.value} = ${pass ? '✅ TRUE' : '❌ FALSE'}`);
        if (!pass) allPass = false;
    });

    console.log(`\n🎯 FINAL RESULT: ${allPass ? '✅ RULE MATCHED - Would execute TURN_OFF' : '❌ RULE NOT MATCHED'}`);

    if (allPass) {
        console.log('\n✅ HỆ THỐNG HOẠT ĐỘNG ĐÚNG!');
        console.log('   Nếu tạo Rule với điều kiện trên và gắn Label vào adset này,');
        console.log('   Rule sẽ tắt adset khi chạy.');
    }
}

testRule().catch(console.error);
