/**
 * Check account_id mismatch
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    // 1. Check active ad account
    console.log('═'.repeat(60));
    console.log('1. Active Ad Account (is_active=1):');
    const accRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/mfj39y0jmfqbxgx/records?where=${encodeURIComponent('(is_active,eq,1)')}&limit=5`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const accData = await accRes.json();
    for (const acc of accData.list || []) {
        console.log(`   Account ID: ${acc.account_id}, Name: ${acc.account_name}, User: ${acc.user_id}`);
    }

    // 2. Check account_id in insight for adset 120237109526540772
    console.log('\n' + '═'.repeat(60));
    console.log('2. Insight record for adset 120237109526540772:');
    const insightRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/m17gyigy8jqlaoz/records?where=${encodeURIComponent('(adset_id,eq,120237109526540772)~and(level,eq,adset)')}&limit=1`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const insightData = await insightRes.json();
    for (const insight of insightData.list || []) {
        console.log(`   Account ID: ${insight.account_id}`);
        console.log(`   User ID: ${insight.user_id}`);
        console.log(`   Adset ID: ${insight.adset_id}`);
        console.log(`   Adset Name: ${insight.adset_name}`);
        console.log(`   Date: ${insight.date_start}`);
    }

    // 3. Comparison
    console.log('\n' + '═'.repeat(60));
    console.log('3. COMPARISON:');
    const activeAccount = accData.list?.[0];
    const insightAccount = insightData.list?.[0];

    console.log(`   Active account_id:  ${activeAccount?.account_id}`);
    console.log(`   Insight account_id: ${insightAccount?.account_id}`);
    console.log(`   Match: ${activeAccount?.account_id === insightAccount?.account_id ? '✅ YES' : '❌ NO - THIS IS THE PROBLEM!'}`);
}

main().catch(console.error);
