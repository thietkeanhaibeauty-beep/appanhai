
const BASE_URL = 'https://db.hpb.edu.vn';
const API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CATEGORIES: 'm15skixqxwnjv0m',
    CAMPAIGNS: 'm9z7w26pfk9mvna',
    ADSETS: 'mwk0gn0l3fmfxsh',
    ADS: 'me44i3pifma3m2i'
};

const headers = {
    'xc-token': API_TOKEN,
    'Content-Type': 'application/json'
};

async function createColumn(tableId, columnName) {
    console.log(`Creating column ${columnName} in ${tableId}...`);
    const res = await fetch(`${BASE_URL}/api/v2/meta/tables/${tableId}/columns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: columnName,
            uidt: 'SingleLineText' // Using Text for ID to be safe
        })
    });
    const data = await res.json();
    if (data.id) {
        console.log(`✅ Created column ${columnName}`);
    } else {
        console.error(`❌ Failed to create column:`, data);
    }
}

async function run() {
    try {
        // 1. Add CategoryId to Campaigns
        await createColumn(TABLES.CAMPAIGNS, 'CategoryId');

        // 2. Add CampaignId to AdSets
        await createColumn(TABLES.ADSETS, 'CampaignId');

        // 3. Add AdSetId to Ads
        await createColumn(TABLES.ADS, 'AdSetId');

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
