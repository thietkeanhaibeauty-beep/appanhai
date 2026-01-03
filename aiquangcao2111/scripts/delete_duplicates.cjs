// Delete duplicate records from FACEBOOK_INSIGHTS_AUTO
const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FACEBOOK_INSIGHTS_AUTO = 'm17gyigy8jqlaoz';

async function deleteDuplicates() {
    console.log('🔍 Finding duplicate records in FACEBOOK_INSIGHTS_AUTO...\n');

    // Fetch all records
    const url = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?limit=2000`;

    const response = await fetch(url, {
        headers: {
            'xc-token': NOCODB_TOKEN,
            'Content-Type': 'application/json'
        }
    });

    const data = await response.json();
    const records = data.list || [];

    console.log(`📊 Total records: ${records.length}`);

    // Group by unique key (adset_id + date_start)
    const groups = {};

    records.forEach(r => {
        // Create unique key
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
            console.log(`\n🔄 Found ${items.length} duplicates for ${key}:`);

            // Keep the first one, mark others for deletion
            items.slice(1).forEach(item => {
                console.log(`   - Will delete Id: ${item.Id}`);
                duplicatesToDelete.push(item.Id);
            });
        }
    });

    console.log(`\n📋 Total duplicates to delete: ${duplicatesToDelete.length}`);

    if (duplicatesToDelete.length === 0) {
        console.log('✅ No duplicates found!');
        return;
    }

    // Delete duplicates
    console.log('\n🗑️ Deleting duplicates...');

    let deleted = 0;
    let failed = 0;

    for (const id of duplicatesToDelete) {
        try {
            const deleteUrl = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records`;
            const deleteRes = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'xc-token': NOCODB_TOKEN,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ Id: id })
            });

            if (deleteRes.ok) {
                deleted++;
                process.stdout.write(`\r   Deleted: ${deleted}/${duplicatesToDelete.length}`);
            } else {
                failed++;
                const errText = await deleteRes.text();
                console.log(`\n   ❌ Failed to delete Id ${id}: ${errText}`);
            }
        } catch (err) {
            failed++;
            console.log(`\n   ❌ Error deleting Id ${id}: ${err.message}`);
        }
    }

    console.log(`\n\n✅ Done! Deleted: ${deleted}, Failed: ${failed}`);

    // Verify
    console.log('\n📊 Verifying...');
    const verifyRes = await fetch(`${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?limit=10`, {
        headers: { 'xc-token': NOCODB_TOKEN }
    });
    const verifyData = await verifyRes.json();
    console.log(`   Remaining records (sample): ${verifyData.list?.length || 0}`);
}

deleteDuplicates().catch(console.error);
