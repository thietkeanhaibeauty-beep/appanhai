const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS

async function inspectRecord() {
    try {
        const accountId = 'act_724813253053178';
        const whereClause = encodeURIComponent(`(account_id,eq,${accountId})`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=1&sort=-date_start`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list.length > 0) {
            console.log('Record found:');
            console.log(JSON.stringify(data.list[0], null, 2));
        } else {
            console.log('No records found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectRecord();
