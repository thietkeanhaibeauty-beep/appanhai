// Full simulation of execute-automation-rule logic
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    FACEBOOK_INSIGHTS: 'm17gyigy8jqlaoz', // AUTO table
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
};

async function fetchNocoDB(tableId, where = '', limit = 1000) {
    let url = `${NOCODB_URL}/api/v2/tables/${tableId}/records?limit=${limit}`;
    if (where) url += `&where=${encodeURIComponent(where)}`;

    const res = await fetch(url, {
        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    return data.list || [];
}

function aggregateByScope(insights, scope) {
    const grouped = {};

    insights.forEach((insight) => {
        let key, name;

        if (scope === "campaign") {
            key = insight.campaign_id;
            name = insight.campaign_name || insight.name || `Campaign ${key}`;
        } else if (scope === "adset") {
            key = insight.adset_id;
            name = insight.adset_name || insight.name || `Ad Set ${key}`;
        } else {
            key = insight.ad_id;
            name = insight.ad_name || insight.name || `Ad ${key}`;
        }

        if (!key) return;

        if (!grouped[key]) {
            grouped[key] = { id: key, name, level: scope, spend: 0, impressions: 0, clicks: 0, reach: 0, results: 0 };
        }

        // ✅ NO /100 - spend is already in VND
        grouped[key].spend += parseFloat(insight.spend || 0);
        grouped[key].impressions += parseInt(insight.impressions || 0);
        grouped[key].clicks += parseInt(insight.clicks || 0);
        grouped[key].reach = Math.max(grouped[key].reach, parseInt(insight.reach || 0));
        grouped[key].results += parseInt(insight.results || 0);
    });

    // Calculate derived metrics
    return Object.values(grouped).map((obj) => ({
        ...obj,
        ctr: obj.impressions > 0 ? (obj.clicks / obj.impressions) * 100 : 0,
        cpc: obj.clicks > 0 ? obj.spend / obj.clicks : 0,
        cpm: obj.impressions > 0 ? (obj.spend / obj.impressions) * 1000 : 0,
        cost_per_result: obj.results > 0 ? obj.spend / obj.results : 0,
        frequency: obj.reach > 0 ? obj.impressions / obj.reach : 0,
    }));
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

function evaluateConditions(obj, conditions, logic = "all") {
    const results = conditions.map((condition) => {
        const value = obj[condition.metric];
        return evaluateSingleCondition(value, condition.operator, condition.value);
    });
    return logic === "all" ? results.every((r) => r) : results.some((r) => r);
}

async function simulateRule() {
    console.log('🔄 SIMULATING RULE 43 (60k 1 kết quả tắt) EXECUTION...\n');

    // Step 1: Get rule
    console.log('📋 Step 1: Get rule details...');
    const rules = await fetchNocoDB(TABLES.AUTOMATED_RULES, `(Id,eq,43)`);
    if (rules.length === 0) {
        console.log('❌ Rule 43 not found!');
        return;
    }
    const rule = rules[0];
    const conditions = JSON.parse(rule.conditions);
    const targetLabels = JSON.parse(rule.target_labels);

    console.log('  Rule:', rule.name || 'Unnamed');
    console.log('  Scope:', rule.scope);
    console.log('  Target Labels:', targetLabels);
    console.log('  Conditions:', JSON.stringify(conditions, null, 2));

    // Step 2: Get label assignments
    console.log('\n📋 Step 2: Get label assignments...');
    const labelIds = targetLabels.join(',');
    const assignments = await fetchNocoDB(TABLES.CAMPAIGN_LABEL_ASSIGNMENTS, `(label_id,in,${labelIds})`);
    console.log(`  Found ${assignments.length} assignments for labels [${labelIds}]`);

    if (assignments.length === 0) {
        console.log('❌ No label assignments found!');
        return;
    }

    // Get adset IDs
    const adsetIds = assignments.map(a => a.adset_id).filter(Boolean);
    console.log('  Adset IDs:', adsetIds);

    // Step 3: Get insights for today
    console.log('\n📋 Step 3: Get insights (today)...');
    const today = '2025-12-11';
    const insights = await fetchNocoDB(TABLES.FACEBOOK_INSIGHTS, `(date_start,eq,${today})`);
    console.log(`  Found ${insights.length} total insights for ${today}`);

    // Filter to only labeled adsets
    const filteredInsights = insights.filter(i => adsetIds.includes(i.adset_id));
    console.log(`  Filtered to ${filteredInsights.length} insights for labeled adsets`);

    if (filteredInsights.length === 0) {
        console.log('❌ No insights found for labeled adsets!');
        console.log('   This is why rule says "không có đối tượng thỏa mãn"');

        // Debug: check what adset_ids exist in insights
        const insightAdsetIds = [...new Set(insights.map(i => i.adset_id).filter(Boolean))];
        console.log('\n   📊 Adset IDs in insights table (sample):', insightAdsetIds.slice(0, 5));
        console.log('   📊 Looking for:', adsetIds);

        return;
    }

    // Step 4: Aggregate
    console.log('\n📋 Step 4: Aggregate by scope...');
    const aggregated = aggregateByScope(filteredInsights, rule.scope);
    console.log(`  Aggregated to ${aggregated.length} objects`);

    aggregated.forEach(obj => {
        console.log(`\n  📊 ${obj.name} (${obj.id}):`);
        console.log(`     spend: ${obj.spend}`);
        console.log(`     results: ${obj.results}`);
        console.log(`     cost_per_result: ${obj.cost_per_result}`);
    });

    // Step 5: Evaluate conditions
    console.log('\n📋 Step 5: Evaluate conditions...');
    const matched = aggregated.filter(obj => {
        const match = evaluateConditions(obj, conditions, 'all');
        console.log(`  ${obj.name}: ${match ? '✅ MATCHED' : '❌ NOT MATCHED'}`);

        conditions.forEach(c => {
            const val = obj[c.metric];
            const result = evaluateSingleCondition(val, c.operator, c.value);
            console.log(`    - ${c.metric} (${val}) ${c.operator} ${c.value} = ${result}`);
        });

        return match;
    });

    console.log(`\n🎯 RESULT: ${matched.length} objects matched conditions`);
    if (matched.length > 0) {
        console.log('   Would execute: turn_off');
    } else {
        console.log('   No action taken');
    }
}

simulateRule();
