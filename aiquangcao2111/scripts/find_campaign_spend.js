const NOCODB_API_URL = 'https://db.hpb.edu.vn';
const NOCODB_API_TOKEN = '8m1N0qDkakGPT_Xq4MXBaA2gw5hWrTAkZVKJ3Wd_';
const TABLE_ID = 'm17gyigy8jqlaoz'; // FACEBOOK_INSIGHTS

async function findCampaignSpend() {
    try {
        const campaignNames = ['Hifu 18/11', 'Hifu 19'];
        console.log(`Searching for campaigns: ${campaignNames.join(', ')}...`);

        // Fetch all records for today/recent to find these campaigns
        // Since we don't have exact match filter easily with OR, we fetch by account and filter in JS
        const accountId = 'act_724813253053178';
        const whereClause = encodeURIComponent(`(account_id,eq,${accountId})`);
        const url = `${NOCODB_API_URL}/api/v2/tables/${TABLE_ID}/records?where=${whereClause}&limit=100&sort=-date_start`;

        const response = await fetch(url, { headers: { 'xc-token': NOCODB_API_TOKEN } });
        const data = await response.json();

        const targets = data.list.filter(r => campaignNames.some(name => r.campaign_name && r.campaign_name.includes(name)));

        if (targets.length > 0) {
            console.log('Found campaigns:');
            targets.forEach(r => {
                console.log('------------------------------------------------');
                console.log(`Campaign Name: ${r.campaign_name}`);
                console.log(`Campaign ID: ${r.campaign_id}`);
                console.log(`Spend: ${r.spend}`);
                console.log(`Results: ${r.results}`);
                console.log(`Date: ${r.date_start}`);
            });
        } else {
            console.log('No matching campaigns found in recent records.');
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

findCampaignSpend();
