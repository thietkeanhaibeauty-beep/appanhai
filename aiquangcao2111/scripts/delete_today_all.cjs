const NOCODB_URL = 'https://db.hpb.edu.vn';
const NOCODB_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const FACEBOOK_INSIGHTS_AUTO = 'm17gyigy8jqlaoz';

async function deleteTodayAll() {
    console.log('🔍 Deleting ALL records for TODAY (2025-12-11)...\n');

    const today = '2025-12-11';
    const whereClause = encodeURIComponent(`(date_start,eq,${today})`);

    // Fetch all for today 
    // We loop until no more records found because deleting might affect pagination
    let hasRecs = true;
    let totalDeleted = 0;

    while (hasRecs) {
        const url = `${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records?where=${whereClause}&limit=1000&fields=Id`;
        try {
            const response = await fetch(url, { headers: { 'xc-token': NOCODB_TOKEN } });
            const data = await response.json();
            const records = data.list || [];

            if (records.length === 0) {
                hasRecs = false;
                break;
            }

            console.log(`Found ${records.length} records to delete...`);

            // Delete serially or in parallel chunks
            const chunkSize = 50;
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize);
                await Promise.all(chunk.map(async (r) => {
                    await fetch(`${NOCODB_URL}/api/v2/tables/${FACEBOOK_INSIGHTS_AUTO}/records`, {
                        method: 'DELETE',
                        headers: { 'xc-token': NOCODB_TOKEN, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Id: r.Id })
                    });
                }));
                totalDeleted += chunk.length;
                process.stdout.write(`\rDeleted: ${totalDeleted}`);
            }
            console.log('\nProcessed batch.');
        } catch (e) {
            console.error('Error:', e.message);
            break;
        }
    }
    console.log(`\n✅ Done! Total deleted: ${totalDeleted}`);
}

deleteTodayAll();
