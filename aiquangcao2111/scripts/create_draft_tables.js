


const BASE_URL = 'https://db.hpb.edu.vn';
const API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const PROJECT_ID = 'p0lvt22fuj3opkl'; // From previous context

const headers = {
    'xc-token': API_TOKEN,
    'Content-Type': 'application/json'
};

async function createTable(tableName, columns) {
    console.log(`Creating table: ${tableName}...`);
    const res = await fetch(`${BASE_URL}/api/v2/meta/bases/${PROJECT_ID}/tables`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: tableName,
            columns: columns
        })
    });
    const data = await res.json();
    if (data.id) {
        console.log(`✅ Created ${tableName} (ID: ${data.id})`);
        return data.id;
    } else {
        console.error(`❌ Failed to create ${tableName}:`, data);
        return null;
    }
}

async function createRelation(type, tableId, relatedTableId, alias) {
    // type: 'hm' (Has Many), 'bt' (Belongs To)
    // We will create 'hm' on the Parent table.
    console.log(`Creating relation ${alias} (${type}) between ${tableId} and ${relatedTableId}...`);
    const res = await fetch(`${BASE_URL}/api/v2/meta/tables/${tableId}/columns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: alias,
            uidt: 'Links',
            colOptions: {
                type: type,
                fk_related_model_id: relatedTableId
            }
        })
    });
    const data = await res.json();
    if (data.id) {
        console.log(`✅ Created relation ${alias}`);
    } else {
        console.error(`❌ Failed to create relation:`, data);
    }
}

async function run() {
    try {
        // 1. DraftCategories
        const catId = await createTable('DraftCategories_v3', [
            { title: 'Id', uidt: 'ID', pk: true },
            { title: 'Name', uidt: 'SingleLineText' },
            { title: 'Description', uidt: 'LongText' }
        ]);
        if (!catId) return;

        // 2. DraftCampaigns
        const campId = await createTable('DraftCampaigns_v3', [
            { title: 'Id', uidt: 'ID', pk: true },
            { title: 'Name', uidt: 'SingleLineText' },
            { title: 'Objective', uidt: 'SingleLineText' },
            { title: 'BuyingType', uidt: 'SingleLineText' },
            { title: 'Status', uidt: 'SingleSelect', dt: 'text', colOptions: { options: [{ title: 'DRAFT' }, { title: 'PUBLISHED' }] } }
        ]);
        if (!campId) return;

        // 3. DraftAdSets
        const adSetId = await createTable('DraftAdSets_v3', [
            { title: 'Id', uidt: 'ID', pk: true },
            { title: 'Name', uidt: 'SingleLineText' },
            { title: 'DailyBudget', uidt: 'Number' },
            { title: 'BidStrategy', uidt: 'SingleLineText' },
            { title: 'Targeting', uidt: 'JSON' },
            { title: 'Status', uidt: 'SingleLineText' }
        ]);
        if (!adSetId) return;

        // 4. DraftAds
        const adId = await createTable('DraftAds_v3', [
            { title: 'Id', uidt: 'ID', pk: true },
            { title: 'Name', uidt: 'SingleLineText' },
            { title: 'CreativeType', uidt: 'SingleLineText' },
            { title: 'PostId', uidt: 'SingleLineText' },
            { title: 'CreativeData', uidt: 'JSON' },
            { title: 'Status', uidt: 'SingleLineText' }
        ]);
        if (!adId) return;

        // 5. Create Relationships (Has Many)
        // Category Has Many Campaigns
        await createRelation('hm', catId, campId, 'Campaigns');

        // Campaign Has Many AdSets
        await createRelation('hm', campId, adSetId, 'AdSets');

        // AdSet Has Many Ads
        await createRelation('hm', adSetId, adId, 'Ads');

        console.log('\n--- NEW TABLE IDs (Update config.ts) ---');
        console.log(`DRAFT_CATEGORIES: '${catId}',`);
        console.log(`DRAFT_CAMPAIGNS: '${campId}',`);
        console.log(`DRAFT_ADSETS: '${adSetId}',`);
        console.log(`DRAFT_ADS: '${adId}',`);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
