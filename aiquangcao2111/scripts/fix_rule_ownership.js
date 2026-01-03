const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

const TABLES = {
    CAMPAIGN_LABELS: 'm37ye177g4m98st',
    CAMPAIGN_LABEL_ASSIGNMENTS: 'myjgw4ial5s6zrw',
    AUTOMATED_RULES: 'mp8nib5rn4l0mb4'
};

const CORRECT_USER_ID = 'e9ed2435-1a36-435b-82e0-ff7eb4afc839';
const WRONG_USER_ID = 'fc1be8c2-3052-4fc1-9371-8627db5a4f8a';

async function updateTable(tableName, tableId) {
    console.log(`Updating ${tableName}...`);
    const url = `${NOCODB_API_URL}/api/v2/tables/${tableId}/records?where=(user_id,eq,${WRONG_USER_ID})&limit=100`;
    const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
    const data = await response.json();

    if (data.list.length === 0) {
        console.log(`No records found for wrong user in ${tableName}.`);
        return;
    }

    console.log(`Found ${data.list.length} records to update in ${tableName}.`);

    for (const record of data.list) {
        const updateUrl = `${NOCODB_API_URL}/api/v2/tables/${tableId}/records`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers: { 'xc-token': NOCODB_API_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify([{ Id: record.Id, user_id: CORRECT_USER_ID }])
        });
        console.log(`Updated record ${record.Id}`);
    }
}

async function main() {
    try {
        await updateTable('AUTOMATED_RULES', TABLES.AUTOMATED_RULES);
        await updateTable('CAMPAIGN_LABELS', TABLES.CAMPAIGN_LABELS);
        await updateTable('CAMPAIGN_LABEL_ASSIGNMENTS', TABLES.CAMPAIGN_LABEL_ASSIGNMENTS);
        console.log('Ownership fix completed.');
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
