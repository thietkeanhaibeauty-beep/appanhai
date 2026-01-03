// Full test: Sync data, verify no duplicates, test rule
const SUPABASE_URL = 'https://jtaekxrkubhwtqgodvtx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0YWVreHJrdWJod3RxZ29kdnR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI3MTkxMTcsImV4cCI6MjA0ODI5NTExN30.iRHg-xJRqcRy1kYCCxLpBM3s67b49Yn2tXd33_fclQM';

const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FACEBOOK_INSIGHTS_AUTO = 'm17gyigy8jqlaoz';

async function triggerSync() {
    console.log('🔄 Step 1: Triggering sync-ads-cron...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/sync-ads-cron`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
            date_preset: 'today'
        })
    });

    const status = response.status;
    let data;
    try {
        data = await response.json();
    } catch {
        data = await response.text();
    }

    console.log(`   Status: ${status}`);
    console.log(`   Response: ${JSON.stringify(data).substring(0, 200)}...`);

    return status === 200;
}

async function verifyNoDuplicates() {
    console.log('\n🔍 Step 2: Verifying no duplicates...');

    const today = '2025-12-11';
    const url = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?where=${encodeURIComponent(`(date_start,eq,${today})`)}&limit=1000`;

    const response = await fetch(url, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });

    const data = await response.json();
    const records = data.list || [];

    console.log(`   Total records for ${today}: ${records.length}`);

    // Group by insight_key to find duplicates
    const keyGroups = {};
    records.forEach(r => {
        const key = r.insight_key;
        if (!keyGroups[key]) keyGroups[key] = [];
        keyGroups[key].push(r);
    });

    // Check for duplicates
    let duplicateCount = 0;
    Object.entries(keyGroups).forEach(([key, items]) => {
        if (items.length > 1) {
            console.log(`   ⚠️ DUPLICATE: ${key} has ${items.length} records`);
            duplicateCount += items.length - 1;
        }
    });

    if (duplicateCount === 0) {
        console.log('   ✅ No duplicates found!');
    } else {
        console.log(`   ❌ Found ${duplicateCount} duplicate records`);
    }

    // Verify insight_key format includes user_id
    if (records.length > 0) {
        const sampleKey = records[0].insight_key;
        const sampleUserId = records[0].user_id;
        console.log(`\n   📋 Sample insight_key: ${sampleKey}`);
        console.log(`   📋 Sample user_id: ${sampleUserId}`);

        if (sampleKey && sampleKey.includes(sampleUserId)) {
            console.log('   ✅ insight_key includes user_id (new format)');
        } else {
            console.log('   ⚠️ insight_key does NOT include user_id (old format)');
        }
    }

    return { records, duplicateCount };
}

async function testRuleLogic(records) {
    console.log('\n🧪 Step 3: Testing Rule Logic...');

    // Find adset 120240709129460334 (Em sáng 6/12)
    const targetAdset = '120240709129460334';
    const adsetRecords = records.filter(r => r.adset_id === targetAdset);

    if (adsetRecords.length === 0) {
        console.log(`   ❌ Adset ${targetAdset} not found in today's data`);
        return;
    }

    // Aggregate
    let spend = 0, results = 0;
    adsetRecords.forEach(r => {
        spend += parseFloat(r.spend || 0);
        results += parseInt(r.results || 0);
    });

    const cost_per_result = results > 0 ? spend / results : 0;

    console.log(`\n   📊 Adset: ${adsetRecords[0].adset_name}`);
    console.log(`   📊 Records: ${adsetRecords.length}`);
    console.log(`   📊 spend: ${spend.toLocaleString()}đ`);
    console.log(`   📊 results: ${results}`);
    console.log(`   📊 cost_per_result: ${cost_per_result.toLocaleString()}đ`);

    // Test condition: cost_per_result >= 50000 AND results >= 3
    console.log('\n   📋 Testing condition: cost_per_result >= 50000 AND results >= 3');
    const c1 = cost_per_result >= 50000;
    const c2 = results >= 3;
    console.log(`      cost_per_result >= 50000: ${c1 ? '✅' : '❌'} (${cost_per_result.toLocaleString()} >= 50000)`);
    console.log(`      results >= 3: ${c2 ? '✅' : '❌'} (${results} >= 3)`);
    console.log(`\n   🎯 RULE RESULT: ${c1 && c2 ? '✅ MATCHED - Would TURN OFF' : '❌ NOT MATCHED'}`);
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   FULL TEST: Sync → Verify No Duplicates → Test Rule');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Step 1: Trigger Sync
    const syncSuccess = await triggerSync();
    if (!syncSuccess) {
        console.log('⚠️ Sync may have failed, continuing to verify...');
    }

    // Wait a bit for sync to complete
    console.log('\n⏳ Waiting 5 seconds for sync to complete...');
    await new Promise(r => setTimeout(r, 5000));

    // Step 2: Verify no duplicates
    const { records, duplicateCount } = await verifyNoDuplicates();

    // Step 3: Test rule logic
    await testRuleLogic(records);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
