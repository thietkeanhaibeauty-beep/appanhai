const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS

async function debugFetch() {
    try {
        const userId = 'e9ed2435-1a36-435b-82e0-ff7eb4afc839';
        const accountId = 'act_724813253053178';
        const campaignId = '120237992160040439'; // Hifu 18/11

        const whereClause = encodeURIComponent(
            `(user_id,eq,${userId})~and(account_id,eq,${accountId})~and(campaign_id,in,${campaignId})`
        );

        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=1000&sort=-date_start`;

        console.log(`Fetching URL: ${url}`);

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        console.log(`Found ${data.list.length} records.`);
        if (data.list.length > 0) {
            console.log('Sample record:', JSON.stringify(data.list[0], null, 2));
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

debugFetch();
