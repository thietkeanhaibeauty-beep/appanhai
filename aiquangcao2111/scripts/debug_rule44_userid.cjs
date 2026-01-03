const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    FACEBOOK_INSIGHTS: 'm17gyigy8jqlaoz',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4',
    FACEBOOK_AD_ACCOUNTS: 'ms3iubpejoynr9a',
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
    console.log('🔍 DEBUG RULE 44 - CHECKING USER_ID MISMATCH\n');

    // Get rule
    const rules = await fetchNocoDB(TABLES.AUTOMATED_RULES, '(Id,eq,44)');
    const rule = rules[0];
    console.log('📋 Rule 44:');
    console.log('   user_id:', rule.user_id);

    // Get ad account
    const accounts = await fetchNocoDB(TABLES.FACEBOOK_AD_ACCOUNTS, '(is_active,eq,1)');
    const account = accounts[0];
    console.log('\n📋 Active Ad Account:');
    console.log('   account_id:', account.account_id);
    console.log('   user_id:', account.user_id);

    // Get label assignment
    const assignments = await fetchNocoDB(TABLES.CAMPAIGN_LABEL_ASSIGNMENTS, '(label_id,eq,25)');
    console.log('\n📋 Label Assignment (label 25):');
    if (assignments.length > 0) {
        console.log('   adset_id:', assignments[0].adset_id);
        console.log('   user_id:', assignments[0].user_id);
    }

    // Get the insight
    const insights = await fetchNocoDB(TABLES.FACEBOOK_INSIGHTS, '(adset_id,eq,120237109895570772)~and(level,eq,adset)');
    console.log('\n📋 Insight for adset 120237109895570772:');
    if (insights.length > 0) {
        console.log('   user_id:', insights[0].user_id);
        console.log('   account_id:', insights[0].account_id);
        console.log('   date_start:', insights[0].date_start);
    }

    // Compare
    console.log('\n📊 COMPARISON:');
    console.log(`   Rule user_id:       ${rule.user_id}`);
    console.log(`   Assignment user_id: ${assignments[0]?.user_id}`);
    console.log(`   Insight user_id:    ${insights[0]?.user_id}`);
    console.log(`   Insight account_id: ${insights[0]?.account_id}`);
    console.log(`   Account account_id: ${account.account_id}`);

    // Check matches
    const userIdMatch = rule.user_id === assignments[0]?.user_id && assignments[0]?.user_id === insights[0]?.user_id;
    const accountIdMatch = insights[0]?.account_id === account.account_id;

    console.log('\n🔍 CHECKS:');
    console.log(`   User IDs match: ${userIdMatch ? '✅' : '❌'}`);
    console.log(`   Account IDs match: ${accountIdMatch ? '✅' : '❌'}`);

    if (!userIdMatch) {
        console.log('\n❌ BUG FOUND: user_id MISMATCH!');
        console.log('   The Edge Function filters by user_id, but they don\'t match.');
    }
    if (!accountIdMatch) {
        console.log('\n❌ BUG FOUND: account_id MISMATCH!');
    }
}

run();
