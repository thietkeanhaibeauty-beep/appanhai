/**
 * Check if adset exists in insights table
 */
const NOCODB_BASE_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function main() {
    // Check for adset 120237109526540772
    const adsetId = '120237109526540772';

    console.log(`Checking insights for adset: ${adsetId}\n`);

    const res = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/m17gyigy8jqlaoz/records?where=${encodeURIComponent(`(adset_id,eq,${adsetId})`)}&limit=10`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });

    const data = await res.json();
    console.log(`Found ${data.list?.length || 0} records for this adset:\n`);

    for (const r of data.list || []) {
        console.log(`  Date: ${r.date_start}, Level: ${r.level}, Spend: ${r.spend}, Status: ${r.status}`);
    }

    // Also check what adsets exist for user
    console.log('\n\nChecking all adsets in insights table:');
    const allRes = await fetch(`${NOCODB_BASE_URL}/api/v2/tables/m17gyigy8jqlaoz/records?where=${encodeURIComponent(`(level,eq,adset)~and(date_start,eq,2025-12-08)`)}&limit=10`, {
        headers: { 'xc-token': NOCODB_API_TOKEN }
    });
    const allData = await allRes.json();
    console.log(`Found ${allData.list?.length || 0} adset records for today:\n`);
    for (const r of allData.list || []) {
        console.log(`  Adset: ${r.adset_id}, Name: ${r.adset_name}, Spend: ${r.spend}`);
    }
}

main().catch(console.error);
