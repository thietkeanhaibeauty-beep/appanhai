
const BASE_URL = 'https://db.hpb.edu.vn';
const API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CATEGORIES: 'mlw2prb1ql9lk6a',
    CAMPAIGNS: 'mdkamd44wgyo1v4',
    ADSETS: 'm9t6lf1q7r4iml2',
    ADS: 'mzv53xbkdg4yu61'
};

const headers = {
    'xc-token': API_TOKEN,
    'Content-Type': 'application/json'
};

async function createRelation(type, tableId, relatedTableId, alias) {
    console.log(`Creating relation ${alias} (${type}) between ${tableId} and ${relatedTableId}...`);
    const res = await fetch(`${BASE_URL}/api/v2/meta/tables/${tableId}/columns`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            title: alias,
            uidt: 'Links',
            type: type, // Added type
            parentId: tableId,
            childId: relatedTableId, // Added childId
            colOptions: {
                type: type,
                fk_related_model_id: relatedTableId
            }
        })
    });
    const data = await res.json();
    if (data.id) {
        console.log(`✅ Created relation ${alias}`);
        return data;
    } else {
        console.error(`❌ Failed to create relation:`, data);
        return null;
    }
}

async function getChildFkColumn(childTableId, parentTableId) {
    // Fetch columns of child table to find the FK column pointing to parent
    const res = await fetch(`${BASE_URL}/api/v2/meta/tables/${childTableId}`, { headers });
    const data = await res.json();

    if (data.columns) {
        // Find the BelongsTo column
        const btCol = data.columns.find(c =>
            c.uidt === 'LinkToAnotherRecord' &&
            c.meta?.colOptions?.fk_related_model_id === parentTableId
        );

        if (btCol) {
            const fkColId = btCol.meta.colOptions.fk_child_column_id; // This is the ID of the actual FK column
            const fkCol = data.columns.find(c => c.id === fkColId);
            if (fkCol) {
                return fkCol.column_name || fkCol.title;
            }
        }
    }
    return null;
}

async function run() {
    try {
        // 1. Campaign Belongs To Category
        await createRelation('bt', TABLES.CAMPAIGNS, TABLES.CATEGORIES, 'Category');

        // 2. AdSet Belongs To Campaign
        await createRelation('bt', TABLES.ADSETS, TABLES.CAMPAIGNS, 'Campaign');

        // 3. Ad Belongs To AdSet
        await createRelation('bt', TABLES.ADS, TABLES.ADSETS, 'AdSet');

        console.log('\n--- FINDING FOREIGN KEYS ---');

        const campFk = await getChildFkColumn(TABLES.CAMPAIGNS, TABLES.CATEGORIES);
        console.log(`DraftCampaigns FK to Category: ${campFk}`);

        const adSetFk = await getChildFkColumn(TABLES.ADSETS, TABLES.CAMPAIGNS);
        console.log(`DraftAdSets FK to Campaign: ${adSetFk}`);

        const adFk = await getChildFkColumn(TABLES.ADS, TABLES.ADSETS);
        console.log(`DraftAds FK to AdSet: ${adFk}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

run();
