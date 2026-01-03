
// Inline config to avoid import issues
const NOCODB_CONFIG = {
    BASE_URL: 'https://db.hpb.edu.vn',
    API_TOKEN: '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_',
    TABLES: {
        CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    }
};

const getNocoDBHeaders = () => ({
    'xc-token': NOCODB_CONFIG.API_TOKEN,
    'Content-Type': 'application/json',
});

const getNocoDBUrl = (tableId: string) => {
    return `${NOCODB_CONFIG.BASE_URL}/api/v2/tables/${tableId}/records`;
};

async function debugLabelAssignments() {
    console.log('🔍 Starting Debug Label Assignments...');

    try {
        // 1. Fetch ALL assignments (limit 10) to see structure
        console.log('\n--- 1. Fetching first 10 assignments ---');
        const urlAll = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS)}?limit=10`;
        console.log('URL:', urlAll);

        const responseAll = await fetch(urlAll, {
            headers: getNocoDBHeaders()
        });

        if (!responseAll.ok) {
            throw new Error(`Failed to fetch all: ${responseAll.status} ${responseAll.statusText}`);
        }

        const dataAll = await responseAll.json();
        console.log('Response Structure:', Object.keys(dataAll));
        console.log('Total Records:', dataAll.pageInfo?.totalRows);

        const list = dataAll.list || [];
        if (list.length === 0) {
            console.log('⚠️ No assignments found in table!');
            return;
        }

        console.log('First Record:', JSON.stringify(list[0], null, 2));

        // 2. Pick a campaign_id from the first record (if available) to test filtering
        const sampleRecord = list.find((r: any) => r.campaign_id);

        if (sampleRecord) {
            const testCampaignId = sampleRecord.campaign_id;
            console.log(`\n--- 2. Testing Filter by campaign_id: ${testCampaignId} ---`);
            console.log('Type of campaign_id in record:', typeof testCampaignId);

            const whereClause = `(campaign_id,in,${testCampaignId})`;
            const urlFilter = `${getNocoDBUrl(NOCODB_CONFIG.TABLES.CAMPAIGN_LABEL_ASSIGNMENTS)}?where=${encodeURIComponent(whereClause)}`;
            console.log('Filter URL:', urlFilter);

            const responseFilter = await fetch(urlFilter, {
                headers: getNocoDBHeaders()
            });

            const dataFilter = await responseFilter.json();
            console.log('Filtered Count:', dataFilter.list?.length);
            if (dataFilter.list?.length > 0) {
                console.log('✅ Filter working correctly!');
                console.log('Filtered Record:', dataFilter.list[0]);
            } else {
                console.error('❌ Filter returned 0 results! Check "where" clause syntax or data type.');
            }
        } else {
            console.log('⚠️ No record with campaign_id found to test filtering.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugLabelAssignments();
