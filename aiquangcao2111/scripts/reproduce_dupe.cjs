const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz';

// Mock Data mimicking what sync-ads-cron produces
const mockRecord = {
    user_id: 'test_user_123',
    account_id: 'act_123456789',
    campaign_id: 'camp_111',
    adset_id: 'adset_222',
    ad_id: 'ad_333',
    date_start: '2025-12-11',
    insight_key: 'test_user_123_act_123456789_camp_111_adset_222_ad_333_2025-12-11',
    spend: 100,
    impressions: 1000,
    level: 'ad'
};

async function checkAndUpsert(record) {
    console.log(`\n🔄 Attempting Upsert for Key: ${record.insight_key}`);

    // 1. Check Existence
    const where = encodeURIComponent(`(insight_key,eq,${record.insight_key})`);
    console.log(`   Checking URL param: where=${where}`);

    const checkRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&fields=Id&limit=1`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });

    const checkData = await checkRes.json();
    const found = checkData.list?.[0];

    if (found) {
        console.log(`   ✅ Found Existing Record ID: ${found.Id}. Performing UPDATE.`);
        // UPDATE
        const updateRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`, {
            method: 'PATCH',
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify([{ Id: found.Id, ...record, spend: record.spend + 1 }]) // Increment spend to show change
        });
        console.log(`   Update Status: ${updateRes.status}`);
    } else {
        console.log(`   ❌ Not Found. Performing INSERT.`);
        // INSERT
        const insertRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records`, {
            method: 'POST',
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify([record])
        });
        const insertData = await insertRes.json();
        console.log(`   Insert Status: ${insertRes.status}`, insertData);
    }
}

async function main() {
    // Run twice to simulate duplicate issue
    console.log('--- Run 1 ---');
    await checkAndUpsert(mockRecord);

    console.log('\n--- Run 2 ---');
    await checkAndUpsert(mockRecord);

    // Check duplicates in DB for this key
    console.log('\n--- Verify Duplicates ---');
    const verifyLimit = 5;
    const where = encodeURIComponent(`(insight_key,eq,${mockRecord.insight_key})`);
    const finalRes = await fetch(`${NOCODB_URL}/api/v2/tables/${TABLE_ID}/records?where=${where}&limit=${verifyLimit}`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const finalData = await finalRes.json();
    console.log(`Total records found for key: ${finalData.list?.length}`);
    finalData.list?.forEach(r => console.log(`- ID: ${r.Id}, Spend: ${r.spend}`));
}

main();
