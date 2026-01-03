// Delete duplicates specifically for TODAY (2025-12-11)
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FACEBOOK_INSIGHTS_AUTO = 'm17gyigy8jqlaoz';

async function deleteTodayDuplicates() {
    console.log('🔍 Finding duplicates for TODAY (2025-12-11)...\n');

    const today = '2025-12-11';
    const whereClause = encodeURIComponent(`(date_start,eq,${today})`);
    const url = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?where=${whereClause}&limit=1000`;

    const response = await fetch(url, {
        headers: {
            'xc-token': NOCODB_TOKEN,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    const records = data.list || [];

    console.log(`📊 Total records for ${today}: ${records.length}`);

    // Group by unique key (adset_id + date_start)
    const groups = {};

    records.forEach(r => {
        const key = `${r.adset_id || r.campaign_id || r.ad_id}_${r.date_start}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(r);
    });

    // Find duplicates
    const duplicatesToDelete = [];

    Object.entries(groups).forEach(([key, items]) => {
        if (items.length > 1) {
            console.log(`🔄 ${key}: ${items.length} records`);
            items.slice(1).forEach(item => {
                duplicatesToDelete.push(item.Id);
            });
        }
    });

    console.log(`\n📋 Duplicates to delete: ${duplicatesToDelete.length}`);

    if (duplicatesToDelete.length === 0) {
        console.log('✅ No duplicates found for today!');
        return;
    }

    // Delete
    console.log('\n🗑️ Deleting...');
    let deleted = 0;

    for (const id of duplicatesToDelete) {
        const deleteRes = await fetch(`${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records`, {
            method: 'DELETE',
            headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ Id: id })
        });

        if (deleteRes.ok) {
            deleted++;
            process.stdout.write(`\r   Deleted: ${deleted}/${duplicatesToDelete.length}`);
        }
    }

    console.log(`\n\n✅ Done! Deleted ${deleted} duplicates for today.`);

    // Verify specific adset
    console.log('\n📊 Verifying adset 120240709129460334...');
    const verifyWhere = encodeURIComponent(`(adset_id,eq,120240709129460334)~and(date_start,eq,${today})`);
    const verifyRes = await fetch(`${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?where=${verifyWhere}`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const verifyData = await verifyRes.json();
    console.log(`   Records for target adset: ${verifyData.list?.length || 0}`);

    if (verifyData.list?.length > 0) {
        const r = verifyData.list[0];
        console.log(`   spend: ${r.spend}`);
        console.log(`   results: ${r.results}`);
    }
}

deleteTodayDuplicates().catch(console.error);
