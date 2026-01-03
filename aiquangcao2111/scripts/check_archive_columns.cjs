const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const ARCHIVE_TABLE_ID = 'mso84k5fpiwtph1'; // FACEBOOK_INSIGHTS_ARCHIVE

async function checkArchive() {
    console.log(`\n🔍 Checking FACEBOOK_INSIGHTS_ARCHIVE (${ARCHIVE_TABLE_ID})...`);
    try {
        const res = await fetch(`${NOCODB_URL}/api/v2/tables/${ARCHIVE_TABLE_ID}/records?limit=1`, {
            headers: { 'xc-token': NOCODB_TOKEN }
        });
        const data = await res.json();
        const item = data.list?.[0];

        if (item) {
            console.log('✅ Found record in Archive. Keys:', Object.keys(item).join(', '));
            if (item.insight_key) {
                console.log('✅ insight_key exists in Archive:', item.insight_key);
            } else {
                console.log('❌ insight_key MISSING in Archive record!');
            }
        } else {
            // If no records, we can't be sure about columns easily via records API, 
            // but we can assume if sync didn't throw error (checked in step 458), likely it's ok OR sync to archive didn't happen for today yet.
            console.log('⚠️ No records found in Archive. Cannot confirm schema via data.');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkArchive();
