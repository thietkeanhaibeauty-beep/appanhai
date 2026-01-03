const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';

async function checkColumnType(tableId, tableName) {
    try {
        console.log(`Fetching columns for ${tableName} (${tableId})...`);
        const url = `${NOCODB_API_URL}/api/v1/db/meta/tables/${tableId}/columns`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list) {
            const campaignIdCol = data.list.find(c => c.title === 'campaign_id');
            if (campaignIdCol) {
                console.log(`Column 'campaign_id' in ${tableName}: ${campaignIdCol.uidt} (Type: ${campaignIdCol.dt})`);
            } else {
                console.log(`Column 'campaign_id' not found in ${tableName}.`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

async function main() {
    await checkColumnType('myjgw4ial5s6zrw', 'CAMPAIGN_LABEL_ASSIGNMENTS');
    await checkColumnType('m17gyigy8jqlaoz', 'FACEBOOK_INSIGHTS');
}

main();
