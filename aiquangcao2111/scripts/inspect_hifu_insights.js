const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS

async function inspectHifuRecord() {
    try {
        const campaignId = '120237992160040439'; // Hifu 18/11
        const whereClause = encodeURIComponent(`(campaign_id,eq,${campaignId})`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=1&sort=-date_start`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        if (data.list.length > 0) {
            console.log('Hifu Record found:');
            console.log(`User ID: ${data.list[0].user_id}`);
            console.log(`Campaign Name: ${data.list[0].campaign_name}`);
            console.log(`Spend: ${data.list[0].spend}`);
            console.log(`Results: ${data.list[0].results}`);
            console.log(`Date: ${data.list[0].date_start}`);
        } else {
            console.log('No Hifu records found.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

inspectHifuRecord();
