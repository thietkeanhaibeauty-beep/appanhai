const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    FACEBOOK_INSIGHTS: 'm17gyigy8jqlaoz', // AUTO table
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
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

async function run() {
    console.log('🔍 DEBUG RULE 44 (tắt)\n');

    // Step 1: Check label 25
    console.log('📋 Step 1: Check label 25...');
    const labels = await fetchNocoDB(TABLES.CAMPAIGN_LABELS, '(Id,eq,25)');
    if (labels.length > 0) {
        console.log('  Label found:', labels[0].name);
    } else {
        console.log('  ❌ Label 25 not found!');
    }

    // Step 2: Get assignments for label 25
    console.log('\n📋 Step 2: Get label assignments...');
    const assignments = await fetchNocoDB(TABLES.CAMPAIGN_LABEL_ASSIGNMENTS, '(label_id,eq,25)');
    console.log(`  Found ${assignments.length} assignments for label 25`);

    if (assignments.length === 0) {
        console.log('  ❌ No adsets assigned to label 25!');
        console.log('  👉 This is why rule says "không có đối tượng thỏa mãn"');
        return;
    }

    const adsetIds = assignments.map(a => a.adset_id).filter(Boolean);
    console.log('  Adset IDs:', adsetIds);

    // Step 3: Get insights for today
    console.log('\n📋 Step 3: Get insights (today)...');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    console.log(`  Today: ${today}`);

    const allInsights = await fetchNocoDB(TABLES.FACEBOOK_INSIGHTS, `(level,eq,adset)`);
    console.log(`  Found ${allInsights.length} adset-level insights total`);

    // Filter to today
    const todayInsights = allInsights.filter(i => i.date_start?.startsWith(today));
    console.log(`  Filtered to ${todayInsights.length} insights for today`);

    // Filter to labeled adsets
    const myInsights = todayInsights.filter(i => adsetIds.includes(i.adset_id));
    console.log(`  Filtered to ${myInsights.length} insights for labeled adsets`);

    if (myInsights.length === 0) {
        console.log('\n  ❌ No insights found for labeled adsets!');
        console.log('  👉 This is why rule says "không có đối tượng thỏa mãn"');

        // Debug: What adset_ids are in today's insights?
        const todayAdsetIds = [...new Set(todayInsights.map(i => i.adset_id).filter(Boolean))];
        console.log('\n  📊 Adset IDs in today insights (sample 5):', todayAdsetIds.slice(0, 5));
        console.log('  📊 Looking for:', adsetIds);

        // Check if adset_ids match format
        if (adsetIds.length > 0 && todayAdsetIds.length > 0) {
            console.log('\n  🔍 Format comparison:');
            console.log('    Label assignment adset_id:', typeof adsetIds[0], adsetIds[0]);
            console.log('    Insight adset_id:', typeof todayAdsetIds[0], todayAdsetIds[0]);
        }
        return;
    }

    // Step 4: Check metrics
    console.log('\n📋 Step 4: Check metrics of matched insights...');
    myInsights.forEach(insight => {
        const spend = parseFloat(insight.spend || 0);
        const results = parseInt(insight.results || 0);
        const costPerResult = results > 0 ? spend / results : 0;

        console.log(`\n  📊 AdSet: ${insight.adset_name || insight.name}`);
        console.log(`     adset_id: ${insight.adset_id}`);
        console.log(`     spend (raw): ${insight.spend}`);
        console.log(`     spend (parsed): ${spend}`);
        console.log(`     results: ${results}`);
        console.log(`     cost_per_result (calculated): ${costPerResult}`);
        console.log(`     cost_per_result (from DB): ${insight.cost_per_result}`);

        // Evaluate conditions
        const cond1 = costPerResult >= 90000;
        const cond2 = results === 1;
        console.log(`     Condition 1 (cost_per_result >= 90000): ${cond1 ? '✅' : '❌'} (${costPerResult} >= 90000)`);
        console.log(`     Condition 2 (results = 1): ${cond2 ? '✅' : '❌'} (${results} = 1)`);
        console.log(`     FINAL: ${cond1 && cond2 ? '✅ MATCHED' : '❌ NOT MATCHED'}`);
    });
}

run();
